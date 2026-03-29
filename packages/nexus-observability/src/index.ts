/**
 * nexus-observability — Tracing, alerting, and health monitoring for the Nexus dealership platform.
 */

export type {
  TraceEntry,
  TraceFilters,
  AlertRule,
  AlertEvent,
  AlertContext,
  HealthStatus,
  SystemHealth,
  HealthContext,
  DateRange,
  SlackBlock,
  SlackBlockElement,
  SlackMessage,
} from './types.js';

export { TraceLogger } from './trace-logger.js';

export {
  AlertEngine,
  SLOW_RESPONSE_THRESHOLD_MS,
  HIGH_ERROR_RATE_THRESHOLD,
  QUEUE_DEPTH_HIGH_THRESHOLD,
} from './alert-engine.js';

export {
  HealthDashboard,
  ACTIVIX_ERROR_RATE_YELLOW,
  ACTIVIX_ERROR_RATE_RED,
  TWILIO_DELIVERY_YELLOW,
  TWILIO_DELIVERY_RED,
  AI_ERROR_RATE_YELLOW,
  AI_ERROR_RATE_RED,
  QUEUE_DEPTH_YELLOW,
  QUEUE_DEPTH_RED,
} from './health-dashboard.js';
