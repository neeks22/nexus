/**
 * AlertEngine — evaluates alert rules against system context and produces events.
 *
 * Ships with 5 predefined rules:
 *   1. circuit_breaker_open — fires when any circuit breaker is OPEN
 *   2. compliance_failure — fires on compliance check failures
 *   3. slow_response — fires when latency exceeds 60 seconds
 *   4. high_error_rate — fires when error rate exceeds 10%
 *   5. queue_depth_high — fires when queue depth exceeds 50
 *
 * Custom rules can be added via addRule().
 */

import type {
  AlertRule,
  AlertEvent,
  AlertContext,
  SlackBlock,
  SlackMessage,
} from './types.js';

// ---------------------------------------------------------------------------
// Thresholds (named constants per CLAUDE.md)
// ---------------------------------------------------------------------------

const SLOW_RESPONSE_THRESHOLD_MS = 60_000;
const HIGH_ERROR_RATE_THRESHOLD = 0.10;
const QUEUE_DEPTH_HIGH_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// Predefined rules
// ---------------------------------------------------------------------------

const PREDEFINED_RULES: readonly AlertRule[] = [
  {
    name: 'circuit_breaker_open',
    condition: (ctx: AlertContext): boolean => ctx.circuitBreakerOpen === true,
    channel: 'slack',
    messageTemplate:
      'Circuit breaker is OPEN. External service is unreachable. Automatic recovery will be attempted in 60s.',
  },
  {
    name: 'compliance_failure',
    condition: (ctx: AlertContext): boolean => ctx.complianceFailure === true,
    channel: 'slack',
    messageTemplate:
      'Compliance pre-flight check FAILED. Details: {{details}}. Message was blocked before sending.',
  },
  {
    name: 'slow_response',
    condition: (ctx: AlertContext): boolean =>
      typeof ctx.latencyMs === 'number' && ctx.latencyMs > SLOW_RESPONSE_THRESHOLD_MS,
    channel: 'slack',
    messageTemplate:
      'Slow AI response detected: {{latencyMs}}ms (threshold: 60000ms). Investigate model performance.',
  },
  {
    name: 'high_error_rate',
    condition: (ctx: AlertContext): boolean =>
      typeof ctx.errorRate === 'number' && ctx.errorRate > HIGH_ERROR_RATE_THRESHOLD,
    channel: 'pagerduty',
    messageTemplate:
      'High error rate detected: {{errorRate}}% (threshold: 10%). Immediate investigation required.',
  },
  {
    name: 'queue_depth_high',
    condition: (ctx: AlertContext): boolean =>
      typeof ctx.queueDepth === 'number' && ctx.queueDepth > QUEUE_DEPTH_HIGH_THRESHOLD,
    channel: 'slack',
    messageTemplate:
      'Queue depth is high: {{queueDepth}} items (threshold: 50). Check Activix API health and processing pipeline.',
  },
];

// ---------------------------------------------------------------------------
// AlertEngine
// ---------------------------------------------------------------------------

export class AlertEngine {
  private readonly rules: AlertRule[];

  constructor() {
    this.rules = [...PREDEFINED_RULES];
  }

  /**
   * Add a custom alert rule.
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * Returns the current set of rules (read-only).
   */
  getRules(): readonly AlertRule[] {
    return this.rules;
  }

  /**
   * Evaluate all rules against the provided context.
   * Returns an AlertEvent for each rule whose condition is met.
   */
  evaluate(context: AlertContext): AlertEvent[] {
    const events: AlertEvent[] = [];
    const now = new Date();

    for (const rule of this.rules) {
      let triggered = false;
      try {
        triggered = rule.condition(context);
      } catch {
        // Swallow condition evaluation errors — never crash the alert engine
        continue;
      }

      if (triggered) {
        const details = this.interpolateTemplate(rule.messageTemplate, context);
        events.push({
          ruleName: rule.name,
          timestamp: now,
          details,
          notified: true,
        });
      }
    }

    return events;
  }

  /**
   * Format an AlertEvent into a Slack Block Kit message.
   */
  formatSlackMessage(event: AlertEvent): SlackMessage {
    const severityEmoji = this.getSeverityEmoji(event.ruleName);
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji} Alert: ${event.ruleName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: event.details,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Triggered at: ${event.timestamp.toISOString()}`,
          },
        ],
      },
    ];

    return { blocks };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private interpolateTemplate(template: string, context: AlertContext): string {
    let result = template;
    if (context.complianceDetails !== undefined) {
      result = result.replace('{{details}}', context.complianceDetails);
    }
    if (context.latencyMs !== undefined) {
      result = result.replace('{{latencyMs}}', String(context.latencyMs));
    }
    if (context.errorRate !== undefined) {
      result = result.replace('{{errorRate}}', String(Math.round(context.errorRate * 100)));
    }
    if (context.queueDepth !== undefined) {
      result = result.replace('{{queueDepth}}', String(context.queueDepth));
    }
    return result;
  }

  private getSeverityEmoji(ruleName: string): string {
    switch (ruleName) {
      case 'circuit_breaker_open':
      case 'high_error_rate':
        return '\u{1F6A8}'; // rotating light
      case 'compliance_failure':
        return '\u{26D4}'; // no entry
      case 'slow_response':
        return '\u{26A0}\u{FE0F}'; // warning
      case 'queue_depth_high':
        return '\u{1F4E5}'; // inbox tray
      default:
        return '\u{2757}'; // exclamation mark
    }
  }
}

// Export thresholds for testing
export {
  SLOW_RESPONSE_THRESHOLD_MS,
  HIGH_ERROR_RATE_THRESHOLD,
  QUEUE_DEPTH_HIGH_THRESHOLD,
};
