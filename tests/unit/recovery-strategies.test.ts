import { describe, it, expect } from 'vitest';
import { getRecoveryAction } from '../../packages/nexus-core/src/healing/recovery-strategies.js';
import {
  getInfraClassification,
  getOutputClassification,
  classifyError,
  classifyOutputError,
} from '../../packages/nexus-core/src/healing/error-taxonomy.js';
import type { ErrorClassification } from '../../packages/nexus-core/src/types.js';

// ── Helpers ───────────────────────────────────────────

function makeClassification(overrides: Partial<ErrorClassification>): ErrorClassification {
  return {
    type: 'server_error',
    category: 'infrastructure',
    strategy: 'retry_with_backoff',
    maxRetries: 3,
    backoffBaseMs: 1_000,
    description: 'test classification',
    ...overrides,
  };
}

describe('getRecoveryAction — infrastructure errors', () => {
  it('returns retry action for rate_limit (infrastructure) error', () => {
    const cls = getInfraClassification('rate_limit');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('returns retry action for api_overloaded (infrastructure) error', () => {
    const cls = getInfraClassification('api_overloaded');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('returns retry action for server_error (infrastructure) error', () => {
    const cls = getInfraClassification('server_error');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('returns retry action for api_timeout', () => {
    const cls = getInfraClassification('api_timeout');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('returns retry action for network_error', () => {
    const cls = getInfraClassification('network_error');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('returns retry action for context_overflow', () => {
    const cls = getInfraClassification('context_overflow');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('retry actions have a numeric delayMs', () => {
    const cls = getInfraClassification('server_error');
    const action = getRecoveryAction(cls, 0);
    expect(typeof action.delayMs).toBe('number');
    expect(action.delayMs).toBeGreaterThanOrEqual(0);
  });
});

describe('getRecoveryAction — output quality errors', () => {
  it('returns reprompt action for empty_response (output quality)', () => {
    const cls = getOutputClassification('empty_response');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });

  it('returns reprompt action for malformed_response', () => {
    const cls = getOutputClassification('malformed_response');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });

  it('returns reprompt action for refusal', () => {
    const cls = getOutputClassification('refusal');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });

  it('returns reprompt action for too_long', () => {
    const cls = getOutputClassification('too_long');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });

  it('returns reprompt action for too_short', () => {
    const cls = getOutputClassification('too_short');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });

  it('reprompt actions include a modifiedPrompt string', () => {
    const cls = getOutputClassification('empty_response');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
    expect(typeof action.modifiedPrompt).toBe('string');
    expect(action.modifiedPrompt!.length).toBeGreaterThan(0);
  });

  it('reprompt actions have delayMs = 0', () => {
    const cls = getOutputClassification('too_long');
    const action = getRecoveryAction(cls, 0);
    expect(action.delayMs).toBe(0);
  });
});

describe('getRecoveryAction — tombstone when max retries exhausted', () => {
  it('returns tombstone action when attempt >= maxRetries', () => {
    const cls = makeClassification({ maxRetries: 3, strategy: 'retry_with_backoff' });
    const action = getRecoveryAction(cls, 3); // attempt 3 == maxRetries
    expect(action.action).toBe('tombstone');
    expect(action.delayMs).toBe(0);
  });

  it('returns tombstone when attempt exceeds maxRetries', () => {
    const cls = makeClassification({ maxRetries: 2, strategy: 'retry_with_backoff' });
    const action = getRecoveryAction(cls, 5);
    expect(action.action).toBe('tombstone');
  });

  it('still allows retry when attempt < maxRetries', () => {
    const cls = makeClassification({ maxRetries: 3, strategy: 'retry_with_backoff' });
    expect(getRecoveryAction(cls, 2).action).toBe('retry');
  });

  it('auth_error is immediately tombstoned regardless of attempt count', () => {
    const cls = getInfraClassification('auth_error');
    // auth_error has maxRetries = 0, but we also test the explicit short-circuit
    expect(getRecoveryAction(cls, 0).action).toBe('tombstone');
  });

  it('output quality tombstones after maxRetries exhausted', () => {
    const cls = getOutputClassification('empty_response');
    const action = getRecoveryAction(cls, cls.maxRetries);
    expect(action.action).toBe('tombstone');
  });
});

describe('getRecoveryAction — exponential backoff', () => {
  it('exponential_backoff delay increases with attempt number', () => {
    const cls = makeClassification({
      strategy: 'exponential_backoff',
      backoffBaseMs: 1_000,
      maxRetries: 10,
    });

    const delay0 = getRecoveryAction(cls, 0).delayMs; // base * 2^0 = 1000
    const delay1 = getRecoveryAction(cls, 1).delayMs; // base * 2^1 = 2000
    const delay2 = getRecoveryAction(cls, 2).delayMs; // base * 2^2 = 4000

    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it('exponential_backoff follows the formula base * 2^attempt', () => {
    const base = 1_000;
    const cls = makeClassification({
      strategy: 'exponential_backoff',
      backoffBaseMs: base,
      maxRetries: 10,
    });

    expect(getRecoveryAction(cls, 0).delayMs).toBe(base * Math.pow(2, 0)); // 1000
    expect(getRecoveryAction(cls, 1).delayMs).toBe(base * Math.pow(2, 1)); // 2000
    expect(getRecoveryAction(cls, 3).delayMs).toBe(base * Math.pow(2, 3)); // 8000
  });

  it('exponential_backoff is capped at 60 000 ms', () => {
    const cls = makeClassification({
      strategy: 'exponential_backoff',
      backoffBaseMs: 1_000,
      maxRetries: 100,
    });

    // attempt 10 would be 1000 * 2^10 = 1_024_000 — well above cap
    expect(getRecoveryAction(cls, 10).delayMs).toBe(60_000);
  });

  it('retry_with_backoff also caps at 60 000 ms', () => {
    const cls = makeClassification({
      strategy: 'retry_with_backoff',
      backoffBaseMs: 2_000,
      maxRetries: 100,
    });

    expect(getRecoveryAction(cls, 10).delayMs).toBe(60_000);
  });
});

describe('getRecoveryAction — exponential_backoff_with_jitter', () => {
  it('returns a retry action with a non-negative delay', () => {
    const cls = getInfraClassification('rate_limit'); // uses exponential_backoff_with_jitter
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
    expect(action.delayMs).toBeGreaterThanOrEqual(0);
  });

  it('jitter delay is always <= cap of 60 000 ms', () => {
    const cls = makeClassification({
      strategy: 'exponential_backoff_with_jitter',
      backoffBaseMs: 1_000,
      maxRetries: 100,
    });

    for (let attempt = 0; attempt <= 10; attempt++) {
      expect(getRecoveryAction(cls, attempt).delayMs).toBeLessThanOrEqual(60_000);
    }
  });
});

describe('getRecoveryAction — retry_after_delay strategy', () => {
  it('returns the base delay exactly (no backoff)', () => {
    const cls = makeClassification({
      strategy: 'retry_after_delay',
      backoffBaseMs: 5_000,
      maxRetries: 5,
    });

    // All attempts should return exactly the base delay
    expect(getRecoveryAction(cls, 0).delayMs).toBe(5_000);
    expect(getRecoveryAction(cls, 1).delayMs).toBe(5_000);
    expect(getRecoveryAction(cls, 2).delayMs).toBe(5_000);
  });
});

describe('getRecoveryAction — tombstone strategy', () => {
  it('returns tombstone action for tombstone strategy regardless of attempt', () => {
    const cls = makeClassification({
      strategy: 'tombstone',
      maxRetries: 5, // even if maxRetries not exhausted
    });
    expect(getRecoveryAction(cls, 0).action).toBe('tombstone');
    expect(getRecoveryAction(cls, 2).action).toBe('tombstone');
  });
});

describe('getRecoveryAction — integrated flow', () => {
  it('classifyError + getRecoveryAction gives retry for HTTP 500', () => {
    const cls = classifyError({ status: 500, message: 'Internal Server Error' });
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('retry');
  });

  it('classifyError + getRecoveryAction gives tombstone for HTTP 401', () => {
    const cls = classifyError({ status: 401 });
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('tombstone');
  });

  it('classifyOutputError + getRecoveryAction gives reprompt for empty_response', () => {
    const cls = classifyOutputError('empty_response');
    const action = getRecoveryAction(cls, 0);
    expect(action.action).toBe('reprompt');
  });
});
