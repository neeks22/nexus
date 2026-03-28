import { describe, it, expect } from 'vitest';
import {
  classifyError,
  classifyOutputError,
  getInfraClassification,
  getOutputClassification,
  getClassification,
} from '../../packages/nexus-core/src/healing/error-taxonomy.js';

// Helper: create a minimal Anthropic-style error object
function makeHttpError(status: number, message = ''): object {
  return { status, message };
}

describe('classifyError — HTTP status code routing', () => {
  it('classifies HTTP 429 as rate_limit', () => {
    const result = classifyError(makeHttpError(429));
    expect(result.type).toBe('rate_limit');
    expect(result.category).toBe('infrastructure');
  });

  it('classifies HTTP 529 as api_overloaded', () => {
    const result = classifyError(makeHttpError(529));
    expect(result.type).toBe('api_overloaded');
    expect(result.category).toBe('infrastructure');
  });

  it('classifies HTTP 408 as api_timeout', () => {
    const result = classifyError(makeHttpError(408));
    expect(result.type).toBe('api_timeout');
  });

  it('classifies HTTP 504 as api_timeout', () => {
    const result = classifyError(makeHttpError(504));
    expect(result.type).toBe('api_timeout');
  });

  it('classifies HTTP 500 as server_error', () => {
    const result = classifyError(makeHttpError(500));
    expect(result.type).toBe('server_error');
  });

  it('classifies HTTP 503 as server_error', () => {
    const result = classifyError(makeHttpError(503));
    expect(result.type).toBe('server_error');
  });

  it('classifies HTTP 401 as auth_error', () => {
    const result = classifyError(makeHttpError(401));
    expect(result.type).toBe('auth_error');
  });

  it('classifies HTTP 403 as auth_error', () => {
    const result = classifyError(makeHttpError(403));
    expect(result.type).toBe('auth_error');
  });
});

describe('classifyError — message-based routing', () => {
  it('classifies timeout message as api_timeout', () => {
    const result = classifyError(new Error('Request timed out after 30000ms'));
    expect(result.type).toBe('api_timeout');
  });

  it('classifies "timeout" keyword as api_timeout', () => {
    const result = classifyError(new Error('Connection timeout occurred'));
    expect(result.type).toBe('api_timeout');
  });

  it('classifies "rate limit" message as rate_limit', () => {
    const result = classifyError(new Error('You have hit the rate limit. Please slow down.'));
    expect(result.type).toBe('rate_limit');
  });

  it('classifies "too many requests" message as rate_limit', () => {
    const result = classifyError(new Error('Too many requests to the API'));
    expect(result.type).toBe('rate_limit');
  });

  it('classifies "overload" message as api_overloaded', () => {
    const result = classifyError(new Error('API is overloaded, please try again'));
    expect(result.type).toBe('api_overloaded');
  });

  it('classifies "capacity" message as api_overloaded', () => {
    const result = classifyError(new Error('System is at capacity'));
    expect(result.type).toBe('api_overloaded');
  });

  it('classifies context length message as context_overflow', () => {
    const result = classifyError(new Error('This model has a context length of 200k tokens, and you exceeded it'));
    expect(result.type).toBe('context_overflow');
  });

  it('classifies "context window" message as context_overflow', () => {
    const result = classifyError(new Error('context window exceeded'));
    expect(result.type).toBe('context_overflow');
  });

  it('classifies "unauthorized" message as auth_error', () => {
    const result = classifyError(new Error('401 Unauthorized'));
    expect(result.type).toBe('auth_error');
  });

  it('classifies "invalid api key" message as auth_error', () => {
    const result = classifyError(new Error('Invalid API Key provided'));
    expect(result.type).toBe('auth_error');
  });

  it('classifies "ECONNREFUSED" message as network_error', () => {
    const result = classifyError(new Error('connect ECONNREFUSED 127.0.0.1:443'));
    expect(result.type).toBe('network_error');
  });

  it('classifies "fetch failed" message as network_error', () => {
    const result = classifyError(new Error('fetch failed'));
    expect(result.type).toBe('network_error');
  });

  it('classifies "socket hang up" message as network_error', () => {
    const result = classifyError(new Error('socket hang up'));
    expect(result.type).toBe('network_error');
  });

  it('classifies string errors by message content', () => {
    const result = classifyError('rate limit exceeded');
    expect(result.type).toBe('rate_limit');
  });
});

describe('classifyError — unknown fallback', () => {
  it('classifies unknown errors as "unknown"', () => {
    const result = classifyError(new Error('some completely random error'));
    expect(result.type).toBe('unknown');
  });

  it('classifies null as unknown', () => {
    const result = classifyError(null);
    expect(result.type).toBe('unknown');
  });

  it('classifies number as unknown', () => {
    const result = classifyError(42);
    expect(result.type).toBe('unknown');
  });

  it('unknown classification allows 1 retry', () => {
    const result = classifyError(new Error('??'));
    expect(result.maxRetries).toBe(1);
  });
});

describe('infrastructure vs output quality split', () => {
  it('infrastructure errors have category = "infrastructure"', () => {
    const infraTypes = [
      'rate_limit',
      'api_overloaded',
      'api_timeout',
      'context_overflow',
      'server_error',
      'auth_error',
      'network_error',
    ] as const;

    for (const type of infraTypes) {
      expect(getInfraClassification(type).category).toBe('infrastructure');
    }
  });

  it('output quality errors have category = "output_quality"', () => {
    const outputTypes = [
      'empty_response',
      'malformed_response',
      'off_topic',
      'too_long',
      'too_short',
      'refusal',
      'no_agent_reference',
      'repetition',
    ] as const;

    for (const type of outputTypes) {
      expect(getOutputClassification(type).category).toBe('output_quality');
    }
  });

  it('auth_error has strategy = "tombstone" and maxRetries = 0', () => {
    const classification = getInfraClassification('auth_error');
    expect(classification.strategy).toBe('tombstone');
    expect(classification.maxRetries).toBe(0);
  });

  it('output quality errors use reprompt strategies', () => {
    const outputTypes = [
      'empty_response',
      'malformed_response',
      'off_topic',
      'too_long',
      'too_short',
      'refusal',
      'no_agent_reference',
      'repetition',
    ] as const;

    for (const type of outputTypes) {
      const cls = getOutputClassification(type);
      expect(cls.strategy).toMatch(/^reprompt/);
    }
  });
});

describe('classifyOutputError', () => {
  it('returns the correct classification for empty_response', () => {
    const cls = classifyOutputError('empty_response');
    expect(cls.type).toBe('empty_response');
    expect(cls.category).toBe('output_quality');
  });

  it('returns the correct classification for refusal', () => {
    const cls = classifyOutputError('refusal');
    expect(cls.type).toBe('refusal');
    expect(cls.strategy).toBe('reprompt_with_reframe');
  });
});

describe('getClassification', () => {
  it('routes infra types correctly', () => {
    expect(getClassification('rate_limit').category).toBe('infrastructure');
  });

  it('routes output types correctly', () => {
    expect(getClassification('too_long').category).toBe('output_quality');
  });

  it('returns unknown classification for "unknown" type', () => {
    expect(getClassification('unknown').type).toBe('unknown');
  });
});
