/**
 * Observability types — tracing, alerting, health monitoring.
 *
 * All interfaces follow CLAUDE.md: prefer interfaces, no `any`, explicit return types.
 */

// ---------------------------------------------------------------------------
// Tracing
// ---------------------------------------------------------------------------

export interface TraceEntry {
  readonly traceId: string;
  readonly tenantId: string;
  readonly timestamp: Date;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly status: 'success' | 'error' | 'timeout';
  readonly agentType: 'instant_response' | 'cold_warming' | 'inbound_reply' | 'classification';
  readonly error?: string;
}

export interface TraceFilters {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly status?: 'success' | 'error' | 'timeout';
  readonly agentType?: TraceEntry['agentType'];
  readonly model?: string;
}

// ---------------------------------------------------------------------------
// Alerting
// ---------------------------------------------------------------------------

export interface AlertRule {
  readonly name: string;
  readonly condition: (context: AlertContext) => boolean;
  readonly channel: 'slack' | 'pagerduty' | 'email';
  readonly messageTemplate: string;
}

export interface AlertEvent {
  readonly ruleName: string;
  readonly timestamp: Date;
  readonly details: string;
  readonly notified: boolean;
}

export interface AlertContext {
  readonly circuitBreakerOpen?: boolean;
  readonly complianceFailure?: boolean;
  readonly complianceDetails?: string;
  readonly latencyMs?: number;
  readonly errorRate?: number;
  readonly queueDepth?: number;
}

// ---------------------------------------------------------------------------
// Health dashboard
// ---------------------------------------------------------------------------

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface SystemHealth {
  readonly activixApi: HealthStatus;
  readonly twilioDelivery: HealthStatus;
  readonly aiErrorRate: HealthStatus;
  readonly queueDepth: HealthStatus;
  readonly overallStatus: HealthStatus;
}

export interface HealthContext {
  readonly activixCircuitBreakerOpen: boolean;
  readonly activixErrorRate: number;
  readonly twilioDeliveryRate: number;
  readonly aiErrorRate: number;
  readonly queueDepth: number;
}

// ---------------------------------------------------------------------------
// Date range utility
// ---------------------------------------------------------------------------

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}

// ---------------------------------------------------------------------------
// Slack block formatting
// ---------------------------------------------------------------------------

export interface SlackBlock {
  readonly type: string;
  readonly text?: {
    readonly type: string;
    readonly text: string;
    readonly emoji?: boolean;
  };
  readonly elements?: readonly SlackBlockElement[];
}

export interface SlackBlockElement {
  readonly type: string;
  readonly text: string;
}

export interface SlackMessage {
  readonly blocks: readonly SlackBlock[];
}
