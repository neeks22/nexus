import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../../packages/nexus-core/src/healing/circuit-breaker.js';
import {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
} from '../../packages/nexus-core/src/config/thresholds.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED');
  });

  it('canCall() returns true when CLOSED', () => {
    expect(cb.canCall()).toBe(true);
  });

  it('stays CLOSED after fewer failures than threshold', () => {
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD - 1; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canCall()).toBe(true);
    expect(cb.getFailureCount()).toBe(CIRCUIT_BREAKER_FAILURE_THRESHOLD - 1);
  });

  it('opens after CIRCUIT_BREAKER_FAILURE_THRESHOLD consecutive failures', () => {
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('OPEN');
  });

  it('blocks calls when OPEN', () => {
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canCall()).toBe(false);
  });

  it('transitions to HALF_OPEN after CIRCUIT_BREAKER_RESET_MS via canCall()', () => {
    vi.useFakeTimers();

    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('OPEN');

    // Advance time past the reset window
    vi.advanceTimersByTime(CIRCUIT_BREAKER_RESET_MS + 1);

    // canCall() lazily triggers the OPEN → HALF_OPEN transition
    expect(cb.canCall()).toBe(true);
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('transitions to HALF_OPEN after CIRCUIT_BREAKER_RESET_MS via getState()', () => {
    vi.useFakeTimers();

    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }

    vi.advanceTimersByTime(CIRCUIT_BREAKER_RESET_MS + 1);

    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('returns to CLOSED on success in HALF_OPEN state', () => {
    vi.useFakeTimers();

    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }

    vi.advanceTimersByTime(CIRCUIT_BREAKER_RESET_MS + 1);
    cb.canCall(); // triggers HALF_OPEN transition

    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getFailureCount()).toBe(0);
  });

  it('returns to OPEN on failure in HALF_OPEN state', () => {
    vi.useFakeTimers();

    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }

    vi.advanceTimersByTime(CIRCUIT_BREAKER_RESET_MS + 1);
    cb.canCall(); // triggers HALF_OPEN transition

    cb.recordFailure(); // probe failed
    expect(cb.getState()).toBe('OPEN');
  });

  it('reset() returns to initial CLOSED state', () => {
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe('OPEN');

    cb.reset();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getFailureCount()).toBe(0);
    expect(cb.canCall()).toBe(true);
  });

  it('recordSuccess() resets failure count and closes from CLOSED state', () => {
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getFailureCount()).toBe(2);

    cb.recordSuccess();
    expect(cb.getFailureCount()).toBe(0);
    expect(cb.getState()).toBe('CLOSED');
  });

  it('recordFailure() is a no-op when already OPEN', () => {
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    // failureCount is already at threshold
    const countBeforeExtra = cb.getFailureCount();
    cb.recordFailure(); // no-op per contract
    // count should not change because OPEN state returns early
    expect(cb.getFailureCount()).toBe(countBeforeExtra);
  });

  it('getRemainingCooldownMs() returns 0 when CLOSED', () => {
    expect(cb.getRemainingCooldownMs()).toBe(0);
  });

  it('getRemainingCooldownMs() returns positive ms when OPEN', () => {
    vi.useFakeTimers();
    for (let i = 0; i < CIRCUIT_BREAKER_FAILURE_THRESHOLD; i++) {
      cb.recordFailure();
    }
    expect(cb.getRemainingCooldownMs()).toBeGreaterThan(0);
    expect(cb.getRemainingCooldownMs()).toBeLessThanOrEqual(CIRCUIT_BREAKER_RESET_MS);
  });

  it('supports custom failure threshold and reset ms', () => {
    const custom = new CircuitBreaker(2, 1_000);
    custom.recordFailure();
    expect(custom.getState()).toBe('CLOSED');
    custom.recordFailure();
    expect(custom.getState()).toBe('OPEN');
  });
});
