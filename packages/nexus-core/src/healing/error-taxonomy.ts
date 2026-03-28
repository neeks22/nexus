// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Error Taxonomy — Classify errors and map to recovery strategies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ErrorClassification, InfraErrorType, OutputErrorType, ErrorType } from '../types.js';
import {
  RETRY_RATE_LIMIT_MAX,
  RETRY_RATE_LIMIT_BACKOFF_MS,
  RETRY_OVERLOADED_MAX,
  RETRY_OVERLOADED_BACKOFF_MS,
  RETRY_TIMEOUT_MAX,
  RETRY_TIMEOUT_BACKOFF_MS,
  RETRY_CONTEXT_OVERFLOW_MAX,
  RETRY_CONTEXT_OVERFLOW_BACKOFF_MS,
  RETRY_SERVER_ERROR_MAX,
  RETRY_SERVER_ERROR_BACKOFF_MS,
  RETRY_NETWORK_MAX,
  RETRY_NETWORK_BACKOFF_MS,
  RETRY_OUTPUT_QUALITY_MAX,
  RETRY_OUTPUT_QUALITY_BACKOFF_MS,
} from '../config/thresholds.js';

// ── Infrastructure Error Taxonomy ─────────────────

const INFRA_CLASSIFICATIONS: Record<InfraErrorType, ErrorClassification> = {
  rate_limit: {
    type: 'rate_limit',
    category: 'infrastructure',
    strategy: 'exponential_backoff_with_jitter',
    maxRetries: RETRY_RATE_LIMIT_MAX,
    backoffBaseMs: RETRY_RATE_LIMIT_BACKOFF_MS,
    description: 'API rate limit hit — back off and retry with jitter',
  },
  api_overloaded: {
    type: 'api_overloaded',
    category: 'infrastructure',
    strategy: 'exponential_backoff',
    maxRetries: RETRY_OVERLOADED_MAX,
    backoffBaseMs: RETRY_OVERLOADED_BACKOFF_MS,
    description: 'API is overloaded — exponential backoff',
  },
  api_timeout: {
    type: 'api_timeout',
    category: 'infrastructure',
    strategy: 'retry_after_delay',
    maxRetries: RETRY_TIMEOUT_MAX,
    backoffBaseMs: RETRY_TIMEOUT_BACKOFF_MS,
    description: 'Request timed out — retry after short delay',
  },
  context_overflow: {
    type: 'context_overflow',
    category: 'infrastructure',
    strategy: 'truncate_and_retry',
    maxRetries: RETRY_CONTEXT_OVERFLOW_MAX,
    backoffBaseMs: RETRY_CONTEXT_OVERFLOW_BACKOFF_MS,
    description: 'Context window exceeded — truncate and retry',
  },
  server_error: {
    type: 'server_error',
    category: 'infrastructure',
    strategy: 'retry_with_backoff',
    maxRetries: RETRY_SERVER_ERROR_MAX,
    backoffBaseMs: RETRY_SERVER_ERROR_BACKOFF_MS,
    description: 'Server-side error (5xx) — retry with backoff',
  },
  auth_error: {
    type: 'auth_error',
    category: 'infrastructure',
    strategy: 'tombstone',
    maxRetries: 0,
    backoffBaseMs: 0,
    description: 'Authentication failure — immediately tombstone, do not retry',
  },
  network_error: {
    type: 'network_error',
    category: 'infrastructure',
    strategy: 'exponential_backoff_with_jitter',
    maxRetries: RETRY_NETWORK_MAX,
    backoffBaseMs: RETRY_NETWORK_BACKOFF_MS,
    description: 'Network connectivity issue — retry with jitter',
  },
};

// ── Output Quality Error Taxonomy ─────────────────

const OUTPUT_CLASSIFICATIONS: Record<OutputErrorType, ErrorClassification> = {
  empty_response: {
    type: 'empty_response',
    category: 'output_quality',
    strategy: 'reprompt_with_instruction',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Agent returned empty content — reprompt with explicit instruction',
  },
  malformed_response: {
    type: 'malformed_response',
    category: 'output_quality',
    strategy: 'reprompt_with_format_hint',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Response is malformed or unparseable — reprompt with format hint',
  },
  off_topic: {
    type: 'off_topic',
    category: 'output_quality',
    strategy: 'reprompt_with_topic_reminder',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Response diverged from topic — reprompt with topic reminder',
  },
  too_long: {
    type: 'too_long',
    category: 'output_quality',
    strategy: 'reprompt_with_length_hint',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Response exceeds length limit — reprompt with conciseness hint',
  },
  too_short: {
    type: 'too_short',
    category: 'output_quality',
    strategy: 'reprompt_with_length_hint',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Response is too brief — reprompt with elaboration hint',
  },
  refusal: {
    type: 'refusal',
    category: 'output_quality',
    strategy: 'reprompt_with_reframe',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Agent refused the request — reprompt with reframed context',
  },
  no_agent_reference: {
    type: 'no_agent_reference',
    category: 'output_quality',
    strategy: 'reprompt_with_instruction',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Agent failed to reference prior agents — reprompt with instruction',
  },
  repetition: {
    type: 'repetition',
    category: 'output_quality',
    strategy: 'reprompt_with_novelty_hint',
    maxRetries: RETRY_OUTPUT_QUALITY_MAX,
    backoffBaseMs: RETRY_OUTPUT_QUALITY_BACKOFF_MS,
    description: 'Agent repeated prior content — reprompt with novelty hint',
  },
};

// ── Unknown / Fallback ─────────────────────────────

const UNKNOWN_CLASSIFICATION: ErrorClassification = {
  type: 'unknown',
  category: 'infrastructure',
  strategy: 'retry_with_backoff',
  maxRetries: 1,
  backoffBaseMs: 1_000,
  description: 'Unclassified error — single retry attempt',
};

// ── HTTP Status → InfraErrorType ──────────────────

function classifyByStatus(status: number): InfraErrorType | null {
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 429) return 'rate_limit';
  if (status === 408 || status === 504) return 'api_timeout';
  if (status === 529) return 'api_overloaded';
  if (status >= 500 && status < 600) return 'server_error';
  return null;
}

// ── Message → InfraErrorType ──────────────────────

function classifyByMessage(message: string): InfraErrorType | null {
  const lower = message.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('too many requests')) return 'rate_limit';
  if (lower.includes('overload') || lower.includes('capacity')) return 'api_overloaded';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'api_timeout';
  if (
    lower.includes('context length') ||
    lower.includes('context window') ||
    lower.includes('maximum context') ||
    lower.includes('too long') ||
    lower.includes('token limit')
  ) {
    return 'context_overflow';
  }
  if (
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('invalid api key') ||
    lower.includes('authentication')
  ) {
    return 'auth_error';
  }
  if (
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('fetch failed') ||
    lower.includes('connection refused') ||
    lower.includes('socket hang up')
  ) {
    return 'network_error';
  }
  if (lower.includes('internal server') || lower.includes('500')) return 'server_error';

  return null;
}

// ── Anthropic SDK Error shape ─────────────────────

interface AnthropicError {
  status?: number;
  message?: string;
  error?: { type?: string; message?: string };
}

function isAnthropicError(e: unknown): e is AnthropicError {
  return typeof e === 'object' && e !== null && ('status' in e || 'error' in e);
}

// ── Public API ────────────────────────────────────

export function classifyError(error: unknown): ErrorClassification {
  // Anthropic SDK error with status code
  if (isAnthropicError(error)) {
    if (typeof error.status === 'number') {
      const infraType = classifyByStatus(error.status);
      if (infraType !== null) {
        return INFRA_CLASSIFICATIONS[infraType];
      }
    }

    const msg =
      error.message ??
      (typeof error.error?.message === 'string' ? error.error.message : '') ??
      '';

    const infraType = classifyByMessage(msg);
    if (infraType !== null) {
      return INFRA_CLASSIFICATIONS[infraType];
    }
  }

  // Standard Error
  if (error instanceof Error) {
    const infraType = classifyByMessage(error.message);
    if (infraType !== null) {
      return INFRA_CLASSIFICATIONS[infraType];
    }
  }

  // String error
  if (typeof error === 'string') {
    const infraType = classifyByMessage(error);
    if (infraType !== null) {
      return INFRA_CLASSIFICATIONS[infraType];
    }
  }

  return UNKNOWN_CLASSIFICATION;
}

export function classifyOutputError(type: OutputErrorType): ErrorClassification {
  return OUTPUT_CLASSIFICATIONS[type];
}

export function getInfraClassification(type: InfraErrorType): ErrorClassification {
  return INFRA_CLASSIFICATIONS[type];
}

export function getOutputClassification(type: OutputErrorType): ErrorClassification {
  return OUTPUT_CLASSIFICATIONS[type];
}

export function getClassification(type: ErrorType): ErrorClassification {
  if (type in INFRA_CLASSIFICATIONS) {
    return INFRA_CLASSIFICATIONS[type as InfraErrorType];
  }
  if (type in OUTPUT_CLASSIFICATIONS) {
    return OUTPUT_CLASSIFICATIONS[type as OutputErrorType];
  }
  return UNKNOWN_CLASSIFICATION;
}
