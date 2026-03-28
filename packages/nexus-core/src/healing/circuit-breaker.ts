// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Circuit Breaker — CLOSED → OPEN → HALF_OPEN state machine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { CircuitBreakerState } from '../types.js';
import {
  CIRCUIT_BREAKER_FAILURE_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
} from '../config/thresholds.js';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private openedAt: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetMs: number;
  #probeInFlight: boolean = false;

  constructor(
    failureThreshold: number = CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    resetMs: number = CIRCUIT_BREAKER_RESET_MS,
  ) {
    this.failureThreshold = failureThreshold;
    this.resetMs = resetMs;
  }

  /**
   * Check whether a call is permitted.
   * - CLOSED: always allowed
   * - OPEN: only allowed after resetMs has elapsed (transitions to HALF_OPEN)
   * - HALF_OPEN: one probe call is allowed
   */
  canCall(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (this.openedAt !== null && Date.now() - this.openedAt >= this.resetMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN — allow only one probe at a time
    if (this.#probeInFlight) {
      return false;
    }
    this.#probeInFlight = true;
    return true;
  }

  /**
   * Record a successful call.
   * Resets failure count and moves breaker back to CLOSED from any state.
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.openedAt = null;
    this.state = 'CLOSED';
    this.#probeInFlight = false;
  }

  /**
   * Record a failed call.
   * In CLOSED: increments counter; opens breaker after threshold.
   * In HALF_OPEN: re-opens immediately (probe failed).
   * In OPEN: no-op (already open).
   */
  recordFailure(): void {
    if (this.state === 'OPEN') {
      return;
    }

    this.failureCount += 1;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
    this.#probeInFlight = false;
  }

  getState(): CircuitBreakerState {
    // Lazily transition OPEN → HALF_OPEN when time has elapsed, without
    // consuming the probe — callers still need to call canCall() explicitly.
    if (
      this.state === 'OPEN' &&
      this.openedAt !== null &&
      Date.now() - this.openedAt >= this.resetMs
    ) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  /** Remaining milliseconds before the breaker can be probed. 0 when callable. */
  getRemainingCooldownMs(): number {
    if (this.state !== 'OPEN' || this.openedAt === null) {
      return 0;
    }
    const elapsed = Date.now() - this.openedAt;
    return Math.max(0, this.resetMs - elapsed);
  }

  /** Hard reset — useful in tests. */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.openedAt = null;
    this.#probeInFlight = false;
  }
}
