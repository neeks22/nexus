/**
 * Dashboard data provider — abstracts the data layer for all dashboard views.
 *
 * DashboardDataProvider is the interface; InMemoryDashboardProvider is the
 * concrete implementation used for testing and local development.
 * A Supabase-backed implementation can replace it later without changing consumers.
 */

import type {
  DailySummary,
  ConversationEntry,
  ConversationFilters,
  PerformanceTrends,
  DashboardSettings,
  DateRange,
  FaqEntry,
} from './types.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface DashboardDataProvider {
  getDailySummary(tenantId: string, date: Date): Promise<DailySummary | null>;
  getConversations(tenantId: string, filters?: ConversationFilters): Promise<readonly ConversationEntry[]>;
  getTrends(tenantId: string, dateRange: DateRange): Promise<PerformanceTrends>;
  getSettings(tenantId: string): Promise<DashboardSettings | null>;
  updateSettings(tenantId: string, settings: Partial<DashboardSettings>): Promise<DashboardSettings>;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

/** Normalizes a Date to YYYY-MM-DD for use as a Map key. */
function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Checks whether a date string falls within an ISO week string (YYYY-Wxx). */
function isoWeekOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export class InMemoryDashboardProvider implements DashboardDataProvider {
  // tenant -> dateKey -> DailySummary
  private readonly summaries: Map<string, Map<string, DailySummary>> = new Map();
  // tenant -> ConversationEntry[]
  private readonly conversations: Map<string, ConversationEntry[]> = new Map();
  // tenant -> DashboardSettings
  private readonly settings: Map<string, DashboardSettings> = new Map();

  // -----------------------------------------------------------------------
  // Write helpers (for populating test data)
  // -----------------------------------------------------------------------

  addSummary(tenantId: string, summary: DailySummary): void {
    if (!this.summaries.has(tenantId)) {
      this.summaries.set(tenantId, new Map());
    }
    const tenantMap = this.summaries.get(tenantId)!;
    tenantMap.set(dateKey(summary.date), summary);
  }

  addConversation(tenantId: string, entry: ConversationEntry): void {
    if (!this.conversations.has(tenantId)) {
      this.conversations.set(tenantId, []);
    }
    this.conversations.get(tenantId)!.push(entry);
  }

  setSettings(tenantId: string, s: DashboardSettings): void {
    this.settings.set(tenantId, s);
  }

  // -----------------------------------------------------------------------
  // DashboardDataProvider implementation
  // -----------------------------------------------------------------------

  async getDailySummary(tenantId: string, date: Date): Promise<DailySummary | null> {
    const tenantMap = this.summaries.get(tenantId);
    if (!tenantMap) return null;
    return tenantMap.get(dateKey(date)) ?? null;
  }

  async getConversations(
    tenantId: string,
    filters?: ConversationFilters,
  ): Promise<readonly ConversationEntry[]> {
    const all = this.conversations.get(tenantId) ?? [];
    let result: ConversationEntry[] = [...all];

    if (filters) {
      if (filters.startDate) {
        const start = filters.startDate.getTime();
        result = result.filter((c) => c.startedAt.getTime() >= start);
      }
      if (filters.endDate) {
        const end = filters.endDate.getTime();
        result = result.filter((c) => c.startedAt.getTime() <= end);
      }
      if (filters.channel) {
        result = result.filter((c) => c.channel === filters.channel);
      }
      if (filters.intent) {
        result = result.filter((c) => c.intent === filters.intent);
      }
      if (filters.handedOffOnly) {
        result = result.filter((c) => c.handedOff);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        result = result.filter(
          (c) =>
            c.leadName.toLowerCase().includes(query) ||
            c.messages.some((m) => m.content.toLowerCase().includes(query)),
        );
      }
      if (typeof filters.offset === 'number' && filters.offset > 0) {
        result = result.slice(filters.offset);
      }
      if (typeof filters.limit === 'number' && filters.limit > 0) {
        result = result.slice(0, filters.limit);
      }
    }

    return result;
  }

  async getTrends(tenantId: string, dateRange: DateRange): Promise<PerformanceTrends> {
    const tenantMap = this.summaries.get(tenantId);
    if (!tenantMap) {
      return { weeklyData: [] };
    }

    // Collect all summaries in range
    const inRange: DailySummary[] = [];
    for (const [key, summary] of tenantMap.entries()) {
      const d = new Date(key + 'T00:00:00Z');
      if (d.getTime() >= dateRange.start.getTime() && d.getTime() <= dateRange.end.getTime()) {
        inRange.push(summary);
      }
    }

    if (inRange.length === 0) {
      return { weeklyData: [] };
    }

    // Group by ISO week
    const weekMap = new Map<
      string,
      { leads: number; replies: number; handoffs: number; appointments: number; days: number }
    >();

    for (const s of inRange) {
      const week = isoWeekOf(s.date);
      const existing = weekMap.get(week) ?? {
        leads: 0,
        replies: 0,
        handoffs: 0,
        appointments: 0,
        days: 0,
      };
      existing.leads += s.leadsHandled;
      existing.handoffs += s.escalations;
      existing.appointments += s.appointmentsBooked;
      existing.days += 1;
      // Approximate reply count: leads minus escalations (leads that got AI replies)
      existing.replies += Math.max(0, s.leadsHandled - s.escalations);
      weekMap.set(week, existing);
    }

    const weeklyData = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        leadVolume: data.leads,
        replyRate: data.leads > 0 ? data.replies / data.leads : 0,
        handoffRate: data.leads > 0 ? data.handoffs / data.leads : 0,
        appointmentRate: data.leads > 0 ? data.appointments / data.leads : 0,
      }));

    return { weeklyData };
  }

  async getSettings(tenantId: string): Promise<DashboardSettings | null> {
    return this.settings.get(tenantId) ?? null;
  }

  async updateSettings(
    tenantId: string,
    partial: Partial<DashboardSettings>,
  ): Promise<DashboardSettings> {
    const existing = this.settings.get(tenantId);
    const defaults: DashboardSettings = {
      activePromotions: [],
      inventoryHighlights: [],
      blacklistedTopics: [],
      customFaq: [],
      hours: 'Mon-Fri 9:00-17:00',
    };

    const merged: DashboardSettings = {
      ...defaults,
      ...existing,
      ...partial,
    };

    this.settings.set(tenantId, merged);
    return merged;
  }
}

// ---------------------------------------------------------------------------
// Default views — the 4 standard dashboard views
// ---------------------------------------------------------------------------

import type { DashboardView } from './types.js';

export const DEFAULT_VIEWS: readonly DashboardView[] = [
  {
    viewId: 'daily-summary',
    title: 'Daily Summary',
    description: 'Leads handled today, appointments booked, escalations, response time avg',
    dataSource: 'lead_transcripts',
    refreshIntervalSec: 300,
  },
  {
    viewId: 'conversation-browser',
    title: 'Conversation Browser',
    description: 'Searchable list of all AI conversations with full transcript view',
    dataSource: 'lead_transcripts',
    refreshIntervalSec: 60,
  },
  {
    viewId: 'performance-trends',
    title: 'Performance Trends',
    description: 'Week-over-week charts: lead volume, reply rate, handoff rate, appointment rate',
    dataSource: 'lead_transcripts',
    refreshIntervalSec: 3600,
  },
  {
    viewId: 'settings',
    title: 'Settings',
    description: 'Client-editable Layer 3 config: promotions, inventory highlights, blacklisted topics, FAQ, hours',
    dataSource: 'tenant_config',
    refreshIntervalSec: 0,
  },
] as const;
