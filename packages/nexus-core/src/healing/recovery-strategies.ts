// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Recovery Strategies — Map classifications to concrete actions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ErrorClassification } from '../types.js';

export interface RecoveryAction {
  action: 'retry' | 'reprompt' | 'tombstone';
  delayMs: number;
  modifiedPrompt?: string;
}

// ── Jitter helper ─────────────────────────────────

/**
 * Full-jitter exponential backoff.
 * delay = random(0, min(cap, base * 2^attempt))
 * Cap at 60 seconds to avoid runaway delays.
 */
function exponentialBackoffWithJitter(baseMs: number, attempt: number): number {
  const cap = 60_000;
  const ceiling = Math.min(cap, baseMs * Math.pow(2, attempt));
  return Math.floor(Math.random() * ceiling);
}

/**
 * Pure exponential backoff (no jitter) — used when precise timing matters.
 * Capped at 60 seconds.
 */
function exponentialBackoff(baseMs: number, attempt: number): number {
  const cap = 60_000;
  return Math.min(cap, baseMs * Math.pow(2, attempt));
}

// ── Reprompt builders ─────────────────────────────

function buildReprompt(
  strategy: ErrorClassification['strategy'],
  attempt: number,
): string | undefined {
  switch (strategy) {
    case 'reprompt_with_format_hint':
      return (
        'Your previous response could not be parsed. ' +
        'Please provide a clear, well-structured response in plain prose. ' +
        'Avoid special characters or encoding artifacts.'
      );

    case 'reprompt_with_topic_reminder':
      return (
        'Your previous response drifted from the assigned topic. ' +
        'Please stay strictly on the topic provided and ensure every sentence ' +
        'is directly relevant to the question asked.'
      );

    case 'reprompt_with_length_hint':
      if (attempt === 0) {
        return (
          'Your previous response was either too short or too long. ' +
          'Please provide a response between 10 and 5000 characters. ' +
          'Be thorough but concise.'
        );
      }
      return (
        'Please adjust the length of your response. ' +
        'Aim for a moderate length: detailed enough to be useful, ' +
        'but not excessively verbose.'
      );

    case 'reprompt_with_reframe':
      return (
        'Your previous response declined to engage with the request. ' +
        'Please reconsider — this is an analytical and constructive task. ' +
        'Approach the topic as a professional consultant and provide substantive content.'
      );

    case 'reprompt_with_instruction':
      return (
        'Your previous response did not meet the requirements. ' +
        'Please respond directly and completely to the task. ' +
        'Your response must be non-empty, relevant, and reference prior contributions ' +
        'from other agents if this is not the first round.'
      );

    case 'reprompt_with_novelty_hint':
      return (
        'Your previous response repeated content that was already covered. ' +
        'Please contribute new, original ideas or perspectives that have not yet ' +
        'been raised in this conversation. Build on prior points rather than restating them.'
      );

    default:
      return undefined;
  }
}

// ── Public API ────────────────────────────────────

/**
 * Determine the concrete recovery action for a given error classification
 * and attempt number (0-indexed — 0 = first retry).
 *
 * When attempt >= maxRetries, a tombstone action is returned regardless
 * of the strategy.
 */
export function getRecoveryAction(
  classification: ErrorClassification,
  attempt: number,
): RecoveryAction {
  // Exhausted all allowed retries
  if (attempt >= classification.maxRetries) {
    return { action: 'tombstone', delayMs: 0 };
  }

  // Auth errors are immediately terminal
  if (classification.type === 'auth_error') {
    return { action: 'tombstone', delayMs: 0 };
  }

  const { strategy, backoffBaseMs } = classification;

  switch (strategy) {
    // ── Infrastructure: retry with delays ──────

    case 'exponential_backoff_with_jitter': {
      const delayMs = exponentialBackoffWithJitter(backoffBaseMs, attempt);
      return { action: 'retry', delayMs };
    }

    case 'exponential_backoff': {
      const delayMs = exponentialBackoff(backoffBaseMs, attempt);
      return { action: 'retry', delayMs };
    }

    case 'retry_with_backoff': {
      const delayMs = exponentialBackoff(backoffBaseMs, attempt);
      return { action: 'retry', delayMs };
    }

    case 'retry_after_delay': {
      return { action: 'retry', delayMs: backoffBaseMs };
    }

    case 'retry_with_reduced_tokens': {
      return { action: 'retry', delayMs: backoffBaseMs };
    }

    case 'truncate_and_retry': {
      return { action: 'retry', delayMs: backoffBaseMs };
    }

    // ── Output quality: reprompt ───────────────

    case 'reprompt':
    case 'reprompt_with_format_hint':
    case 'reprompt_with_topic_reminder':
    case 'reprompt_with_length_hint':
    case 'reprompt_with_reframe':
    case 'reprompt_with_instruction':
    case 'reprompt_with_novelty_hint': {
      const modifiedPrompt = buildReprompt(strategy, attempt);
      return { action: 'reprompt', delayMs: 0, modifiedPrompt };
    }

    // ── Terminal ───────────────────────────────

    case 'tombstone':
      return { action: 'tombstone', delayMs: 0 };

    // ── Fallback for unrecognised strategies ───

    default: {
      const delayMs = exponentialBackoffWithJitter(backoffBaseMs > 0 ? backoffBaseMs : 1_000, attempt);
      return { action: 'retry', delayMs };
    }
  }
}
