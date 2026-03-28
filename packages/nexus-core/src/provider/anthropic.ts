// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AnthropicProvider — Wraps @anthropic-ai/sdk
//  All API calls funnel through here.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import Anthropic from '@anthropic-ai/sdk';
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk/error';
import type {
  MessageCreateParamsNonStreaming,
  MessageCountTokensParams,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages/messages';
import type {
  ProviderRequest,
  ProviderResponse,
  TokenUsage,
} from '../types.js';
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from '../config/thresholds.js';

// ── NexusProviderError ────────────────────────────
// A structured error that carries enough information
// for the error-taxonomy module to classify and route.

export interface NexusProviderErrorInfo {
  httpStatus: number | undefined;
  errorType: string;
  message: string;
  originalError: unknown;
}

export class NexusProviderError extends Error {
  readonly httpStatus: number | undefined;
  readonly errorType: string;
  readonly originalError: unknown;

  constructor(info: NexusProviderErrorInfo) {
    super(info.message);
    this.name = 'NexusProviderError';
    this.httpStatus = info.httpStatus;
    this.errorType = info.errorType;
    this.originalError = info.originalError;
  }
}

// ── AnthropicProvider ─────────────────────────────

export class AnthropicProvider {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    // Resolve the API key: explicit argument > ANTHROPIC_API_KEY env var.
    // We read env via globalThis to stay compatible with strict TS configs
    // that do not include @types/node in their lib/types fields.
    const resolvedKey =
      apiKey ??
      (typeof (globalThis as Record<string, unknown>)['process'] === 'object'
        ? (
            (globalThis as Record<string, unknown>)['process'] as {
              env: Record<string, string | undefined>;
            }
          ).env['ANTHROPIC_API_KEY']
        : undefined);

    this.client = new Anthropic({ apiKey: resolvedKey });
  }

  // ── createMessage ───────────────────────────────

  async createMessage(request: ProviderRequest): Promise<ProviderResponse> {
    const startMs = Date.now();

    const payload = this.buildPayload(request);

    let rawResponse: Anthropic.Message;
    try {
      rawResponse = await this.client.messages.create(payload);
    } catch (err: unknown) {
      throw this.classifyError(err);
    }

    const latencyMs = Date.now() - startMs;

    // Extract text content from the response — tool_use blocks are skipped
    // because the orchestration layer handles tool dispatch separately.
    const content = rawResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const usage = rawResponse.usage;

    const tokensUsed: TokenUsage = {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      // cache_creation_input_tokens counts tokens written to cache this turn.
      // The SDK exposes it as a nullable number on Usage.
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    };

    // A response is considered "cached" when Anthropic served at least some
    // tokens from the prompt cache rather than re-processing them.
    const cached = tokensUsed.cacheReadTokens > 0;

    return {
      content,
      tokensUsed,
      cached,
      latencyMs,
      stopReason: rawResponse.stop_reason ?? 'unknown',
    };
  }

  // ── countTokens ─────────────────────────────────

  async countTokens(request: ProviderRequest): Promise<number> {
    const countParams = this.buildCountTokensParams(request);

    let result: Anthropic.MessageTokensCount;
    try {
      result = await this.client.messages.countTokens(countParams);
    } catch (err: unknown) {
      throw this.classifyError(err);
    }

    return result.input_tokens;
  }

  // ── buildPayload ─────────────────────────────────

  private buildPayload(request: ProviderRequest): MessageCreateParamsNonStreaming {
    const systemBlocks = this.buildSystemBlocks(request.systemPrompt, request.cacheBreakpoints ?? true);
    const messages = this.buildMessages(request);
    const tools = this.buildTools(request);

    const payload: MessageCreateParamsNonStreaming = {
      model: request.model || DEFAULT_MODEL,
      max_tokens: request.maxTokens || DEFAULT_MAX_TOKENS,
      system: systemBlocks,
      messages,
      stream: false,
    };

    if (tools.length > 0) {
      payload.tools = tools;
    }

    return payload;
  }

  // ── buildCountTokensParams ───────────────────────

  private buildCountTokensParams(request: ProviderRequest): MessageCountTokensParams {
    const systemBlocks = this.buildSystemBlocks(request.systemPrompt, request.cacheBreakpoints ?? true);
    const messages = this.buildMessages(request);
    const tools = this.buildTools(request);

    const params: MessageCountTokensParams = {
      model: request.model || DEFAULT_MODEL,
      system: systemBlocks,
      messages,
    };

    if (tools.length > 0) {
      params.tools = tools;
    }

    return params;
  }

  // ── buildSystemBlocks ────────────────────────────
  // Wraps the system prompt string in a TextBlockParam array.
  // When caching is enabled the last block gets cache_control: { type: "ephemeral" }
  // which instructs Anthropic to pin this prefix across calls.

  private buildSystemBlocks(
    systemPrompt: string,
    enableCache: boolean,
  ): Array<TextBlockParam> {
    const block: TextBlockParam = {
      type: 'text',
      text: systemPrompt,
    };

    if (enableCache) {
      block.cache_control = { type: 'ephemeral' };
    }

    return [block];
  }

  // ── buildMessages ────────────────────────────────

  private buildMessages(request: ProviderRequest): Anthropic.MessageParam[] {
    return request.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  // ── buildTools ───────────────────────────────────
  // Converts Nexus Tool definitions to the SDK's Tool shape.
  // input_schema must include a "type" field — default to "object" when absent.

  private buildTools(request: ProviderRequest): Anthropic.Tool[] {
    if (!request.tools || request.tools.length === 0) {
      return [];
    }

    return request.tools.map((tool) => {
      const schema = tool.inputSchema as Record<string, unknown>;

      // The SDK requires input_schema.type to be the literal "object".
      // We spread the Nexus schema so all additional JSON Schema fields
      // (properties, required, …) are preserved.
      const inputSchema: Anthropic.Tool['input_schema'] = {
        type: 'object',
        ...(schema as Omit<typeof schema, 'type'>),
      };

      const sdkTool: Anthropic.Tool = {
        name: tool.name,
        description: tool.description,
        input_schema: inputSchema,
      };

      return sdkTool;
    });
  }

  // ── classifyError ────────────────────────────────
  // Converts an Anthropic SDK error into a NexusProviderError
  // with a machine-readable errorType that maps directly to
  // the InfraErrorType union in types.ts.

  private classifyError(err: unknown): NexusProviderError {
    if (err instanceof AuthenticationError) {
      return new NexusProviderError({
        httpStatus: err.status,
        errorType: 'auth_error',
        message: `Authentication failed (HTTP ${err.status}): ${err.message}`,
        originalError: err,
      });
    }

    if (err instanceof RateLimitError) {
      return new NexusProviderError({
        httpStatus: err.status,
        errorType: 'rate_limit',
        message: `Rate limit exceeded (HTTP ${err.status}): ${err.message}`,
        originalError: err,
      });
    }

    if (err instanceof APIConnectionTimeoutError) {
      return new NexusProviderError({
        httpStatus: undefined,
        errorType: 'api_timeout',
        message: `API request timed out: ${err.message}`,
        originalError: err,
      });
    }

    if (err instanceof APIConnectionError) {
      return new NexusProviderError({
        httpStatus: undefined,
        errorType: 'network_error',
        message: `Network error reaching Anthropic API: ${err.message}`,
        originalError: err,
      });
    }

    if (err instanceof InternalServerError) {
      // HTTP 529 is Anthropic's "overloaded" status code.
      const isOverloaded = err.status === 529;
      return new NexusProviderError({
        httpStatus: err.status,
        errorType: isOverloaded ? 'api_overloaded' : 'server_error',
        message: `${isOverloaded ? 'API overloaded' : 'Internal server error'} (HTTP ${err.status}): ${err.message}`,
        originalError: err,
      });
    }

    if (err instanceof APIError) {
      // Catch-all for any other mapped HTTP error (400, 403, 404, 422, …).
      // HTTP 400 with a context-length error message indicates overflow.
      const isContextOverflow =
        err.status === 400 &&
        typeof err.message === 'string' &&
        /context|token.*limit|too long/i.test(err.message);

      return new NexusProviderError({
        httpStatus: err.status,
        errorType: isContextOverflow ? 'context_overflow' : 'server_error',
        message: `API error (HTTP ${err.status}): ${err.message}`,
        originalError: err,
      });
    }

    // Unknown / unexpected error — wrap and pass through.
    const message =
      err instanceof Error ? err.message : String(err);

    return new NexusProviderError({
      httpStatus: undefined,
      errorType: 'network_error',
      message: `Unexpected error from provider: ${message}`,
      originalError: err,
    });
  }
}
