// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Health Tracker — Rolling window composite health score
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { HealthScore, HealthState } from '../types.js';
import {
  HEALTH_WINDOW_SIZE,
  HEALTH_HEALTHY_THRESHOLD,
  HEALTH_DEGRADED_THRESHOLD,
  HEALTH_RECOVERING_THRESHOLD,
  HEALTH_WEIGHT_SUCCESS_RATE,
  HEALTH_WEIGHT_LATENCY,
  HEALTH_WEIGHT_QUALITY,
  HEALTH_WEIGHT_RECOVERY,
  LATENCY_EXCELLENT_MS,
  LATENCY_GOOD_MS,
  LATENCY_ACCEPTABLE_MS,
  LATENCY_POOR_MS,
} from '../config/thresholds.js';

interface CallRecord {
  kind: 'success' | 'failure';
  latencyMs: number;
}

interface QualityRecord {
  score: number;
}

interface RecoveryRecord {
  success: boolean;
}

export class HealthTracker {
  private readonly windowSize: number;
  private callWindow: CallRecord[] = [];
  private qualityWindow: QualityRecord[] = [];
  private recoveryWindow: RecoveryRecord[] = [];

  constructor(windowSize: number = HEALTH_WINDOW_SIZE) {
    this.windowSize = windowSize;
  }

  // ── Public recording API ────────────────────────

  recordSuccess(latencyMs: number): void {
    this.pushCall({ kind: 'success', latencyMs });
  }

  recordFailure(): void {
    this.pushCall({ kind: 'failure', latencyMs: 0 });
  }

  recordQuality(score: number): void {
    this.qualityWindow.push({ score: Math.max(0, Math.min(1, score)) });
    if (this.qualityWindow.length > this.windowSize) {
      this.qualityWindow.shift();
    }
  }

  recordRecovery(success: boolean): void {
    this.recoveryWindow.push({ success });
    if (this.recoveryWindow.length > this.windowSize) {
      this.recoveryWindow.shift();
    }
  }

  // ── Health computation ──────────────────────────

  getHealth(): HealthScore {
    const successRate = this.computeSuccessRate();
    const latencyScore = this.computeLatencyScore();
    const qualityScore = this.computeQualityScore();
    const recoveryRate = this.computeRecoveryRate();

    const overall =
      successRate * HEALTH_WEIGHT_SUCCESS_RATE +
      latencyScore * HEALTH_WEIGHT_LATENCY +
      qualityScore * HEALTH_WEIGHT_QUALITY +
      recoveryRate * HEALTH_WEIGHT_RECOVERY;

    const avgLatencyMs = this.computeAvgLatencyMs();

    return {
      overall,
      successRate,
      avgLatencyMs,
      qualityScore,
      recoveryRate,
      state: this.scoreToState(overall),
    };
  }

  getState(): HealthState {
    return this.getHealth().state;
  }

  // ── Private helpers ─────────────────────────────

  private pushCall(record: CallRecord): void {
    this.callWindow.push(record);
    if (this.callWindow.length > this.windowSize) {
      this.callWindow.shift();
    }
  }

  private computeSuccessRate(): number {
    if (this.callWindow.length === 0) return 1.0;
    const successes = this.callWindow.filter((r) => r.kind === 'success').length;
    return successes / this.callWindow.length;
  }

  private computeAvgLatencyMs(): number {
    const successCalls = this.callWindow.filter((r) => r.kind === 'success');
    if (successCalls.length === 0) return 0;
    const total = successCalls.reduce((sum, r) => sum + r.latencyMs, 0);
    return total / successCalls.length;
  }

  /**
   * Latency score: 1.0 for excellent, degrades linearly between breakpoints,
   * floor of 0.0 above LATENCY_POOR_MS.
   */
  private computeLatencyScore(): number {
    const avg = this.computeAvgLatencyMs();
    if (avg === 0) return 1.0; // No data yet — assume excellent

    if (avg <= LATENCY_EXCELLENT_MS) return 1.0;
    if (avg <= LATENCY_GOOD_MS) {
      return 0.75 + 0.25 * (1 - (avg - LATENCY_EXCELLENT_MS) / (LATENCY_GOOD_MS - LATENCY_EXCELLENT_MS));
    }
    if (avg <= LATENCY_ACCEPTABLE_MS) {
      return 0.50 + 0.25 * (1 - (avg - LATENCY_GOOD_MS) / (LATENCY_ACCEPTABLE_MS - LATENCY_GOOD_MS));
    }
    if (avg <= LATENCY_POOR_MS) {
      return 0.25 * (1 - (avg - LATENCY_ACCEPTABLE_MS) / (LATENCY_POOR_MS - LATENCY_ACCEPTABLE_MS));
    }
    return 0.0;
  }

  private computeQualityScore(): number {
    if (this.qualityWindow.length === 0) return 1.0;
    const total = this.qualityWindow.reduce((sum, r) => sum + r.score, 0);
    return total / this.qualityWindow.length;
  }

  private computeRecoveryRate(): number {
    if (this.recoveryWindow.length === 0) return 1.0;
    const successes = this.recoveryWindow.filter((r) => r.success).length;
    return successes / this.recoveryWindow.length;
  }

  private scoreToState(overall: number): HealthState {
    if (overall >= HEALTH_HEALTHY_THRESHOLD) return 'HEALTHY';
    if (overall >= HEALTH_DEGRADED_THRESHOLD) return 'DEGRADED';
    if (overall >= HEALTH_RECOVERING_THRESHOLD) return 'RECOVERING';
    return 'FAILED';
  }

  /** Expose raw window lengths — useful for testing */
  getWindowSizes(): { calls: number; quality: number; recovery: number } {
    return {
      calls: this.callWindow.length,
      quality: this.qualityWindow.length,
      recovery: this.recoveryWindow.length,
    };
  }
}
