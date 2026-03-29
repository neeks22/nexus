/**
 * Dashboard types for the Nexus dealership client portal.
 *
 * Interfaces follow CLAUDE.md rules: prefer interfaces, no `any`, explicit return types.
 */

// ---------------------------------------------------------------------------
// Core dashboard configuration
// ---------------------------------------------------------------------------

export interface DashboardView {
  readonly viewId: string;
  readonly title: string;
  readonly description: string;
  readonly dataSource: string;
  readonly refreshIntervalSec: number;
}

export interface DashboardConfig {
  readonly tenantId: string;
  readonly views: readonly DashboardView[];
  readonly auth: DashboardAuth;
}

export interface DashboardAuth {
  readonly username: string;
  readonly passwordHash: string;
  readonly role: 'admin' | 'staff' | 'readonly';
  readonly lastLogin?: Date;
}

// ---------------------------------------------------------------------------
// View 1: Daily Summary
// ---------------------------------------------------------------------------

export interface DailySummary {
  readonly date: Date;
  readonly leadsHandled: number;
  readonly appointmentsBooked: number;
  readonly escalations: number;
  readonly avgResponseTimeSec: number;
}

// ---------------------------------------------------------------------------
// View 2: Conversation Browser
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  readonly role: 'ai' | 'customer' | 'system';
  readonly content: string;
  readonly timestamp: Date;
  readonly channel: 'sms' | 'email';
}

export interface ConversationEntry {
  readonly leadId: string;
  readonly leadName: string;
  readonly messages: readonly ConversationMessage[];
  readonly startedAt: Date;
  readonly channel: 'sms' | 'email';
  readonly intent?: string;
  readonly handedOff: boolean;
}

export interface ConversationFilters {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly channel?: 'sms' | 'email';
  readonly intent?: string;
  readonly handedOffOnly?: boolean;
  readonly searchQuery?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ---------------------------------------------------------------------------
// View 3: Performance Trends
// ---------------------------------------------------------------------------

export interface WeeklyDataPoint {
  readonly week: string;
  readonly leadVolume: number;
  readonly replyRate: number;
  readonly handoffRate: number;
  readonly appointmentRate: number;
}

export interface PerformanceTrends {
  readonly weeklyData: readonly WeeklyDataPoint[];
}

// ---------------------------------------------------------------------------
// View 4: Settings (Layer 3 client-editable fields)
// ---------------------------------------------------------------------------

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export interface DashboardSettings {
  readonly activePromotions: readonly string[];
  readonly inventoryHighlights: readonly string[];
  readonly blacklistedTopics: readonly string[];
  readonly customFaq: readonly FaqEntry[];
  readonly hours: string;
}

// ---------------------------------------------------------------------------
// Date range utility
// ---------------------------------------------------------------------------

export interface DateRange {
  readonly start: Date;
  readonly end: Date;
}
