// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Agent — Full self-healing pipeline wrapper
//  PRE-FLIGHT → EXECUTE → VALIDATE →
//    [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { AnthropicProvider } from '../provider/anthropic.js';
import { CircuitBreaker } from '../healing/circuit-breaker.js';
import { HealthTracker } from '../healing/health-tracker.js';
import { classifyError, classifyOutputError } from '../healing/error-taxonomy.js';
import { getRecoveryAction } from '../healing/recovery-strategies.js';
import { validateOutput } from '../healing/output-validator.js';
import { createTombstone } from '../healing/tombstone.js';
import type {
  AgentConfig,
  AgentRunResult,
  HealthScore,
  Tombstone,
  ProviderRequest,
  ProviderResponse,
  TokenUsage,
  OutputErrorType,
} from '../types.js';
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS, RETRY_OUTPUT_QUALITY_MAX } from '../config/thresholds.js';

// ── Token ceiling for pre-flight truncation (chars) ─
// Rough heuristic: 1 token ≈ 4 chars.
// We truncate context to stay comfortably under the
// model's context window before counting exact tokens.
const CONTEXT_CHAR_BUDGET = 60_000;

// ── Empty token usage sentinel ─────────────────────
const ZERO_TOKENS: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

// ── Helpers ────────────────────────────────────────

function resolveModel(config: AgentConfig): string {
  return config.model ?? DEFAULT_MODEL;
}

function resolveMaxTokens(config: AgentConfig): number {
  return config.maxTokens ?? DEFAULT_MAX_TOKENS;
}

/**
 * Build a ProviderRequest from an AgentConfig, user prompt, and transcript
 * context string.  Keeps the shape clean and testable.
 */
function buildProviderRequest(
  config: AgentConfig,
  prompt: string,
  transcriptContext: string,
): ProviderRequest {
  const userContent =
    transcriptContext.trim().length > 0
      ? `${transcriptContext.trim()}\n\n${prompt}`
      : prompt;

  return {
    model: resolveModel(config),
    systemPrompt: config.systemPrompt,
    messages: [{ role: 'user', content: userContent }],
    maxTokens: resolveMaxTokens(config),
    tools: config.tools,
    cacheBreakpoints: true,
  };
}

/**
 * Build a reprompt request that appends a recovery hint to the original
 * prompt so the model has guidance on what went wrong.
 */
function buildRepromptRequest(
  config: AgentConfig,
  prompt: string,
  transcriptContext: string,
  hint: string,
): ProviderRequest {
  const base = buildProviderRequest(config, prompt, transcriptContext);
  const lastMessage = base.messages[base.messages.length - 1];
  if (lastMessage !== undefined) {
    lastMessage.content = `${lastMessage.content}\n\n[Self-healing hint: ${hint}]`;
  }
  return base;
}

/**
 * Sleep for `ms` milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Agent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class Agent {
  // ── Public identity ──────────────────────────────
  readonly id: string;
  readonly name: string;
  readonly config: AgentConfig;
  readonly icon: string;
  readonly color: string;

  // ── Private infrastructure ───────────────────────
  private readonly provider: AnthropicProvider;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly healthTracker: HealthTracker;

  constructor(config: AgentConfig, provider?: AnthropicProvider) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.icon = config.icon ?? '🤖';
    this.color = config.color ?? '#6366f1';

    this.provider = provider ?? new AnthropicProvider();
    this.circuitBreaker = new CircuitBreaker();
    this.healthTracker = new HealthTracker();
  }

  // ── Public API ───────────────────────────────────

  /**
   * Run the agent against a prompt.
   *
   * @param prompt            The user-facing prompt for this round.
   * @param transcriptContext Serialised prior transcript passed as context.
   * @param round             Current debate/sequential round number.
   * @returns                 AgentRunResult — always resolves, never rejects.
   */
  async run(
    prompt: string,
    transcriptContext: string,
    round: number,
  ): Promise<AgentRunResult> {
    const startMs = Date.now();

    // ── 1. PRE-FLIGHT ─────────────────────────────

    // 1a. Circuit-breaker gate
    if (!this.circuitBreaker.canCall()) {
      const tombstone = createTombstone(
        `${this.id}:round-${round}`,
        this.id,
        'circuit_breaker_open',
        { prompt, round },
        0,
      );
      this.healthTracker.recordFailure();
      return this.buildTombstoneResult(tombstone, Date.now() - startMs);
    }

    // 1b. FAILED health gate — agent is beyond recovery
    const preHealth = this.healthTracker.getHealth();
    if (preHealth.state === 'FAILED') {
      const tombstone = createTombstone(
        `${this.id}:round-${round}`,
        this.id,
        'unrecoverable_error',
        { prompt, round, health: preHealth },
        0,
      );
      return this.buildTombstoneResult(tombstone, Date.now() - startMs);
    }

    // 1c. Token pre-flight — truncate context if it exceeds the char budget.
    let safeContext = transcriptContext;
    if (transcriptContext.length > CONTEXT_CHAR_BUDGET) {
      safeContext = transcriptContext.slice(
        transcriptContext.length - CONTEXT_CHAR_BUDGET,
      );
    }

    // Exact token count via provider (uses /v1/messages/count_tokens)
    try {
      const tokenCheckRequest = buildProviderRequest(this.config, prompt, safeContext);
      const tokenCount = await this.provider.countTokens(tokenCheckRequest);
      const tokenLimit = resolveMaxTokens(this.config) * 4;
      if (tokenCount > tokenLimit && safeContext.length > 0) {
        safeContext = safeContext.slice(Math.floor(safeContext.length / 2));
      }
    } catch {
      // Token counting is best-effort — continue with execution.
    }

    // ── 2-4. EXECUTE → VALIDATE → DIAGNOSE/RECOVER/RETRY ─

    const maxInfraRetries = 3; // governed per-error-type by getRecoveryAction
    const maxOutputRetries = RETRY_OUTPUT_QUALITY_MAX;
    let lastError: unknown = null;
    let lastResponse: ProviderResponse | null = null;
    let totalLatencyMs = 0;
    let infraAttempt = 0;
    let outputAttempt = 0;

    // Outer loop for infrastructure retries
    while (infraAttempt <= maxInfraRetries) {
      let request: ProviderRequest;
      if (outputAttempt === 0) {
        request = buildProviderRequest(this.config, prompt, safeContext);
      } else {
        const hint = this.buildRepromptHint(lastError);
        request = buildRepromptRequest(this.config, prompt, safeContext, hint);
      }

      // ── EXECUTE ──────────────────────────────────
      const callStart = Date.now();
      let response: ProviderResponse;
      try {
        response = await this.provider.createMessage(request);
      } catch (execError) {
        totalLatencyMs += Date.now() - callStart;
        lastError = execError;

        const classification = classifyError(execError);
        const recoveryAction = getRecoveryAction(classification, infraAttempt);

        if (recoveryAction.action === 'tombstone') {
          this.circuitBreaker.recordFailure();
          this.healthTracker.recordFailure();
          const tombstone = createTombstone(
            `${this.id}:round-${round}`,
            this.id,
            this.mapErrorToTombstoneReason(classification.type),
            { request, error: String(execError) },
            infraAttempt,
          );
          return this.buildTombstoneResult(tombstone, Date.now() - startMs);
        }

        if (recoveryAction.delayMs > 0) {
          await sleep(recoveryAction.delayMs);
        }
        infraAttempt += 1;
        continue;
      }

      totalLatencyMs += Date.now() - callStart;
      lastResponse = response;

      // ── VALIDATE ────────────────────────────────
      const outputError: OutputErrorType | null = validateOutput(
        response.content,
        this.id,
        round,
      );

      if (outputError === null) {
        // ── SUCCESS PATH ─────────────────────────
        this.circuitBreaker.recordSuccess();
        this.healthTracker.recordSuccess(totalLatencyMs);

        return {
          agentId: this.id,
          content: response.content,
          health: this.healthTracker.getHealth(),
          latencyMs: totalLatencyMs,
          cached: response.cached,
          tokensUsed: response.tokensUsed,
        };
      }

      // ── DIAGNOSE output-quality failure ─────────
      lastError = new Error(`Output quality failure: ${outputError}`);
      const outputClassification = classifyOutputError(outputError);
      const recoveryAction = getRecoveryAction(outputClassification, outputAttempt);

      if (recoveryAction.action === 'tombstone' || outputAttempt >= maxOutputRetries) {
        this.circuitBreaker.recordFailure();
        this.healthTracker.recordFailure();
        const tombstone = createTombstone(
          `${this.id}:round-${round}`,
          this.id,
          'reflection_cap_breach',
          {
            request,
            response: response.content,
            outputError,
          },
          outputAttempt,
        );
        return this.buildTombstoneResult(tombstone, Date.now() - startMs);
      }

      // Reprompt — no infra backoff, just loop
      if (recoveryAction.delayMs > 0) {
        await sleep(recoveryAction.delayMs);
      }
      outputAttempt += 1;
      // Reset infra attempt counter for the fresh prompt attempt
      infraAttempt = 0;
    }

    // ── Exhausted all infrastructure retries ──────────────────────────────
    this.circuitBreaker.recordFailure();
    this.healthTracker.recordFailure();
    const tombstone = createTombstone(
      `${this.id}:round-${round}`,
      this.id,
      'unrecoverable_error',
      {
        prompt,
        lastResponse: lastResponse?.content ?? null,
        lastError: String(lastError),
      },
      infraAttempt,
    );
    return this.buildTombstoneResult(tombstone, Date.now() - startMs);
  }

  /**
   * Return the current HealthScore for this agent.
   */
  getHealth(): HealthScore {
    return this.healthTracker.getHealth();
  }

  // ── Private helpers ──────────────────────────────

  private buildTombstoneResult(
    tombstone: Tombstone,
    latencyMs: number,
  ): AgentRunResult {
    return {
      agentId: this.id,
      content: '',
      tombstone,
      health: this.healthTracker.getHealth(),
      latencyMs,
      cached: false,
      tokensUsed: { ...ZERO_TOKENS },
    };
  }

  private buildRepromptHint(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 200);
    }
    if (typeof error === 'string') {
      return error.slice(0, 200);
    }
    return 'Your previous response did not meet quality requirements. Please try again.';
  }

  private mapErrorToTombstoneReason(
    errorType: import('../types.js').ErrorType,
  ): import('../types.js').TombstoneReason {
    if (errorType === 'auth_error') return 'auth_failure';
    return 'unrecoverable_error';
  }
}
