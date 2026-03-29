/**
 * HealthDashboard — provides a system-wide health status view per tenant.
 *
 * Combines signals from Activix API health, Twilio delivery, AI error rate,
 * and queue depth into a single green/yellow/red dashboard.
 */

import type { SystemHealth, HealthContext, HealthStatus } from './types.js';

// ---------------------------------------------------------------------------
// Thresholds (named constants per CLAUDE.md)
// ---------------------------------------------------------------------------

/** Activix error rate above this is yellow. */
const ACTIVIX_ERROR_RATE_YELLOW = 0.05;
/** Activix error rate above this is red. */
const ACTIVIX_ERROR_RATE_RED = 0.15;

/** Twilio delivery rate below this is yellow. */
const TWILIO_DELIVERY_YELLOW = 0.95;
/** Twilio delivery rate below this is red. */
const TWILIO_DELIVERY_RED = 0.85;

/** AI error rate above this is yellow. */
const AI_ERROR_RATE_YELLOW = 0.05;
/** AI error rate above this is red. */
const AI_ERROR_RATE_RED = 0.10;

/** Queue depth above this is yellow. */
const QUEUE_DEPTH_YELLOW = 20;
/** Queue depth above this is red. */
const QUEUE_DEPTH_RED = 50;

// ---------------------------------------------------------------------------
// HealthDashboard
// ---------------------------------------------------------------------------

export class HealthDashboard {
  /**
   * Compute the full system health for a tenant given the current context.
   */
  getSystemHealth(_tenantId: string, context: HealthContext): SystemHealth {
    const activixApi = this.evaluateActivix(context);
    const twilioDelivery = this.evaluateTwilio(context);
    const aiErrorRate = this.evaluateAiErrorRate(context);
    const queueDepth = this.evaluateQueueDepth(context);
    const overallStatus = this.computeOverall(activixApi, twilioDelivery, aiErrorRate, queueDepth);

    return {
      activixApi,
      twilioDelivery,
      aiErrorRate,
      queueDepth,
      overallStatus,
    };
  }

  // -----------------------------------------------------------------------
  // Individual evaluators
  // -----------------------------------------------------------------------

  private evaluateActivix(context: HealthContext): HealthStatus {
    if (context.activixCircuitBreakerOpen) return 'red';
    if (context.activixErrorRate > ACTIVIX_ERROR_RATE_RED) return 'red';
    if (context.activixErrorRate > ACTIVIX_ERROR_RATE_YELLOW) return 'yellow';
    return 'green';
  }

  private evaluateTwilio(context: HealthContext): HealthStatus {
    if (context.twilioDeliveryRate < TWILIO_DELIVERY_RED) return 'red';
    if (context.twilioDeliveryRate < TWILIO_DELIVERY_YELLOW) return 'yellow';
    return 'green';
  }

  private evaluateAiErrorRate(context: HealthContext): HealthStatus {
    if (context.aiErrorRate > AI_ERROR_RATE_RED) return 'red';
    if (context.aiErrorRate > AI_ERROR_RATE_YELLOW) return 'yellow';
    return 'green';
  }

  private evaluateQueueDepth(context: HealthContext): HealthStatus {
    if (context.queueDepth > QUEUE_DEPTH_RED) return 'red';
    if (context.queueDepth > QUEUE_DEPTH_YELLOW) return 'yellow';
    return 'green';
  }

  // -----------------------------------------------------------------------
  // Overall status: worst of all components
  // -----------------------------------------------------------------------

  private computeOverall(...statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('red')) return 'red';
    if (statuses.includes('yellow')) return 'yellow';
    return 'green';
  }
}

// Export thresholds for testing
export {
  ACTIVIX_ERROR_RATE_YELLOW,
  ACTIVIX_ERROR_RATE_RED,
  TWILIO_DELIVERY_YELLOW,
  TWILIO_DELIVERY_RED,
  AI_ERROR_RATE_YELLOW,
  AI_ERROR_RATE_RED,
  QUEUE_DEPTH_YELLOW,
  QUEUE_DEPTH_RED,
};
