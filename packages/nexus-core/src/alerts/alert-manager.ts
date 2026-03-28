// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  AlertManager — Agent health state-transition alerts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { randomUUID } from 'node:crypto';
import type { HealthScore, HealthState } from '../types.js';

// ── Alert types ──────────────────────────────────

export interface Alert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  agentId: string;
  agentName: string;
  message: string;
  healthScore: number;
  previousState: HealthState;
  currentState: HealthState;
}

export type AlertHandler = (alert: Alert) => void | Promise<void>;

// ── Transition rule definition ───────────────────

interface TransitionRule {
  from: HealthState | '*';
  to: HealthState;
  severity: 'info' | 'warning' | 'critical';
  message: (agentName: string) => string;
}

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: 'HEALTHY',
    to: 'DEGRADED',
    severity: 'warning',
    message: (n) => `${n} has degraded — health falling below threshold`,
  },
  {
    from: 'DEGRADED',
    to: 'RECOVERING',
    severity: 'info',
    message: (n) => `${n} is recovering from degraded state`,
  },
  {
    from: '*',
    to: 'FAILED',
    severity: 'critical',
    message: (n) => `${n} has FAILED — immediate attention required`,
  },
  {
    from: 'FAILED',
    to: 'RECOVERING',
    severity: 'info',
    message: (n) => `${n} is recovering after failure`,
  },
  {
    from: 'RECOVERING',
    to: 'HEALTHY',
    severity: 'info',
    message: (n) => `${n} has fully recovered — back to healthy state`,
  },
];

// ── AlertManager ─────────────────────────────────

export class AlertManager {
  private readonly handlers: AlertHandler[] = [];
  private readonly alerts: Alert[] = [];

  // ── Handler registration ─────────────────────────

  onAlert(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  // ── Health check ─────────────────────────────────

  /**
   * Evaluate `health` against `previousState`.
   * Fires alerts for any matching transition rules.
   *
   * If `previousState` is omitted the current state is used — no
   * transition alert will fire (useful for first-time registration).
   */
  checkHealth(
    agentId: string,
    agentName: string,
    health: HealthScore,
    previousState?: HealthState,
  ): void {
    const currentState = health.state;

    // No previous state means there is no transition to evaluate
    if (previousState == null || previousState === currentState) {
      return;
    }

    const rule = this.findRule(previousState, currentState);
    if (rule == null) return;

    const alert: Alert = {
      id: randomUUID(),
      timestamp: Date.now(),
      severity: rule.severity,
      agentId,
      agentName,
      message: rule.message(agentName),
      healthScore: health.overall,
      previousState,
      currentState,
    };

    this.alerts.push(alert);
    this.dispatchAlert(alert);
  }

  // ── Query ────────────────────────────────────────

  getAlerts(): ReadonlyArray<Alert> {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts.length = 0;
  }

  // ── Private helpers ──────────────────────────────

  private findRule(
    from: HealthState,
    to: HealthState,
  ): TransitionRule | undefined {
    return TRANSITION_RULES.find(
      (r) => (r.from === '*' || r.from === from) && r.to === to,
    );
  }

  private dispatchAlert(alert: Alert): void {
    for (const handler of this.handlers) {
      try {
        const result = handler(alert);
        if (result instanceof Promise) {
          result.catch((err: unknown) => {
            // Swallow handler errors — alerting must not crash the pipeline
            console.error(
              `[AlertManager] handler threw for alert ${alert.id}:`,
              err,
            );
          });
        }
      } catch (err) {
        console.error(
          `[AlertManager] synchronous handler threw for alert ${alert.id}:`,
          err,
        );
      }
    }
  }
}
