export interface DateRange {
  start: Date;
  end: Date;
}

export type OperationType =
  | 'instant_response'
  | 'cold_warming'
  | 'intent_classification'
  | 'content_validation';

export type TwilioChannel = 'sms' | 'email' | 'voice';

export interface ApiCostEntry {
  id: string;
  tenantId: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  operationType: OperationType;
}

export interface TwilioCostEntry {
  id: string;
  tenantId: string;
  timestamp: Date;
  channel: TwilioChannel;
  costUsd: number;
  messageId: string;
}

export interface OperationBreakdown {
  operationType: OperationType;
  totalCostUsd: number;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface CostReport {
  tenantId: string;
  dateRange: DateRange;
  totalCostUsd: number;
  aiCostUsd: number;
  twilioCostUsd: number;
  totalLeadsHandled: number;
  totalConversations: number;
  totalAppointments: number;
  costPerLead: number;
  costPerConversation: number;
  costPerAppointment: number;
  breakdown: OperationBreakdown[];
}
