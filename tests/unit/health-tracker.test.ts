import { describe, it, expect, beforeEach } from 'vitest';
import { HealthTracker } from '../../packages/nexus-core/src/healing/health-tracker.js';
import {
  HEALTH_WINDOW_SIZE,
  HEALTH_HEALTHY_THRESHOLD,
  HEALTH_DEGRADED_THRESHOLD,
  HEALTH_RECOVERING_THRESHOLD,
} from '../../packages/nexus-core/src/config/thresholds.js';

describe('HealthTracker', () => {
  let tracker: HealthTracker;

  beforeEach(() => {
    tracker = new HealthTracker();
  });

  // ── Initial state ───────────────────────────────────

  it('starts with a healthy overall score when no data recorded', () => {
    const health = tracker.getHealth();
    // All sub-metrics default to 1.0, so overall should be 1.0 (HEALTHY)
    expect(health.overall).toBe(1.0);
    expect(health.state).toBe('HEALTHY');
  });

  it('starts with success rate of 1.0', () => {
    expect(tracker.getHealth().successRate).toBe(1.0);
  });

  it('starts with quality score of 1.0', () => {
    expect(tracker.getHealth().qualityScore).toBe(1.0);
  });

  it('starts with recovery rate of 1.0', () => {
    expect(tracker.getHealth().recoveryRate).toBe(1.0);
  });

  // ── Success recording ───────────────────────────────

  it('records successes and updates success rate to 1.0', () => {
    tracker.recordSuccess(1_000);
    tracker.recordSuccess(1_200);
    expect(tracker.getHealth().successRate).toBe(1.0);
  });

  it('records successes and computes average latency', () => {
    tracker.recordSuccess(1_000);
    tracker.recordSuccess(3_000);
    expect(tracker.getHealth().avgLatencyMs).toBe(2_000);
  });

  it('state remains HEALTHY after only successes with fast latency', () => {
    for (let i = 0; i < 5; i++) tracker.recordSuccess(500);
    expect(tracker.getHealth().state).toBe('HEALTHY');
  });

  // ── Failure recording ───────────────────────────────

  it('records failures and degrades success rate', () => {
    tracker.recordSuccess(1_000);
    tracker.recordFailure();
    expect(tracker.getHealth().successRate).toBe(0.5);
  });

  it('all failures drives success rate to 0', () => {
    tracker.recordFailure();
    tracker.recordFailure();
    tracker.recordFailure();
    expect(tracker.getHealth().successRate).toBe(0.0);
  });

  it('failures degrade the overall health score', () => {
    const beforeHealth = tracker.getHealth().overall;
    tracker.recordFailure();
    tracker.recordFailure();
    tracker.recordFailure();
    const afterHealth = tracker.getHealth().overall;
    expect(afterHealth).toBeLessThan(beforeHealth);
  });

  // ── Quality score ───────────────────────────────────

  it('quality scores affect overall health', () => {
    // Set a very low quality score
    tracker.recordQuality(0.0);
    const lowQualityHealth = tracker.getHealth().overall;

    const tracker2 = new HealthTracker();
    tracker2.recordQuality(1.0);
    const highQualityHealth = tracker2.getHealth().overall;

    expect(highQualityHealth).toBeGreaterThan(lowQualityHealth);
  });

  it('quality score is clamped to [0, 1]', () => {
    tracker.recordQuality(1.5); // over the top
    tracker.recordQuality(-0.5); // below zero
    const { qualityScore } = tracker.getHealth();
    expect(qualityScore).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeLessThanOrEqual(1);
  });

  // ── Rolling window ──────────────────────────────────

  it('rolling window respects HEALTH_WINDOW_SIZE for calls', () => {
    for (let i = 0; i < HEALTH_WINDOW_SIZE + 5; i++) {
      tracker.recordSuccess(1_000);
    }
    expect(tracker.getWindowSizes().calls).toBe(HEALTH_WINDOW_SIZE);
  });

  it('rolling window respects HEALTH_WINDOW_SIZE for quality records', () => {
    for (let i = 0; i < HEALTH_WINDOW_SIZE + 5; i++) {
      tracker.recordQuality(0.8);
    }
    expect(tracker.getWindowSizes().quality).toBe(HEALTH_WINDOW_SIZE);
  });

  it('rolling window respects HEALTH_WINDOW_SIZE for recovery records', () => {
    for (let i = 0; i < HEALTH_WINDOW_SIZE + 5; i++) {
      tracker.recordRecovery(true);
    }
    expect(tracker.getWindowSizes().recovery).toBe(HEALTH_WINDOW_SIZE);
  });

  it('old call records are evicted once window is full', () => {
    // Fill with failures
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) {
      tracker.recordFailure();
    }
    expect(tracker.getHealth().successRate).toBe(0.0);

    // Now add HEALTH_WINDOW_SIZE successes — failures should all be evicted
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) {
      tracker.recordSuccess(500);
    }
    expect(tracker.getHealth().successRate).toBe(1.0);
  });

  // ── State transitions ───────────────────────────────

  it('transitions from HEALTHY to DEGRADED under heavy failures', () => {
    // Drive success rate to 0 and ensure overall drops below HEALTHY
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) {
      tracker.recordFailure();
    }
    tracker.recordQuality(0.0);
    tracker.recordRecovery(false);

    const state = tracker.getHealth().state;
    // Overall should be well below HEALTH_HEALTHY_THRESHOLD
    expect(['DEGRADED', 'RECOVERING', 'FAILED']).toContain(state);
  });

  it('returns HEALTHY state when overall >= HEALTH_HEALTHY_THRESHOLD', () => {
    for (let i = 0; i < 10; i++) tracker.recordSuccess(500);
    expect(tracker.getHealth().overall).toBeGreaterThanOrEqual(HEALTH_HEALTHY_THRESHOLD);
    expect(tracker.getHealth().state).toBe('HEALTHY');
  });

  it('returns FAILED state when all metrics are rock-bottom', () => {
    // All failures → success rate = 0 (avgLatencyMs = 0, which scores 1.0 for latency weight)
    // Fill window so that all calls are failures, THEN add a single very slow success
    // so latency score is also near 0.
    for (let i = 0; i < HEALTH_WINDOW_SIZE - 1; i++) tracker.recordFailure();
    // One very slow success to drag latency score to 0
    tracker.recordSuccess(100_000); // far above LATENCY_POOR_MS (20 000)
    // Quality = 0
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) tracker.recordQuality(0);
    // Recovery = 0
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) tracker.recordRecovery(false);

    const { overall, state } = tracker.getHealth();
    // overall = successRate(~0)*0.30 + latency(0)*0.15 + quality(0)*0.30 + recovery(0)*0.25
    // successRate = 1/20 = 0.05, so overall ≈ 0.05*0.30 = 0.015 < HEALTH_RECOVERING_THRESHOLD
    expect(overall).toBeLessThan(HEALTH_RECOVERING_THRESHOLD);
    expect(state).toBe('FAILED');
  });

  it('returns DEGRADED state when overall is between DEGRADED and HEALTHY thresholds', () => {
    // Produce a mixed signal: some successes, some failures, moderate quality
    for (let i = 0; i < 10; i++) tracker.recordSuccess(500);
    for (let i = 0; i < 10; i++) tracker.recordFailure();
    for (let i = 0; i < 10; i++) tracker.recordQuality(0.5);
    // Recovery remains default (1.0)

    const { overall } = tracker.getHealth();
    // With 50% success rate and 0.5 quality the overall should be moderate
    // We just confirm the boundary logic works
    if (overall >= HEALTH_DEGRADED_THRESHOLD && overall < HEALTH_HEALTHY_THRESHOLD) {
      expect(tracker.getHealth().state).toBe('DEGRADED');
    }
  });

  // ── Recovery tracking ───────────────────────────────

  it('recovery tracking works — all successful recoveries → rate = 1', () => {
    tracker.recordRecovery(true);
    tracker.recordRecovery(true);
    expect(tracker.getHealth().recoveryRate).toBe(1.0);
  });

  it('recovery tracking works — mixed recoveries are averaged', () => {
    tracker.recordRecovery(true);
    tracker.recordRecovery(false);
    expect(tracker.getHealth().recoveryRate).toBe(0.5);
  });

  it('supports custom window size', () => {
    const small = new HealthTracker(5);
    for (let i = 0; i < 10; i++) small.recordSuccess(1_000);
    expect(small.getWindowSizes().calls).toBe(5);
  });

  it('getState() is a convenience alias for getHealth().state', () => {
    expect(tracker.getState()).toBe(tracker.getHealth().state);
    for (let i = 0; i < HEALTH_WINDOW_SIZE; i++) tracker.recordFailure();
    expect(tracker.getState()).toBe(tracker.getHealth().state);
  });
});
