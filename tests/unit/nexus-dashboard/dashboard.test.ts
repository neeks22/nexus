import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryDashboardProvider,
  DEFAULT_VIEWS,
} from '../../../packages/nexus-dashboard/src/index.js';
import type {
  DailySummary,
  ConversationEntry,
  ConversationMessage,
  DashboardSettings,
  DateRange,
  DashboardView,
  ConversationFilters,
  FaqEntry,
} from '../../../packages/nexus-dashboard/src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSummary(overrides: Partial<DailySummary> = {}): DailySummary {
  return {
    date: new Date('2026-03-25T00:00:00Z'),
    leadsHandled: 15,
    appointmentsBooked: 3,
    escalations: 2,
    avgResponseTimeSec: 12.5,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    role: 'ai',
    content: 'Hello! I see you are interested in the 2024 CR-V.',
    timestamp: new Date('2026-03-25T10:00:00Z'),
    channel: 'sms',
    ...overrides,
  };
}

function makeConversation(overrides: Partial<ConversationEntry> = {}): ConversationEntry {
  return {
    leadId: 'lead-100',
    leadName: 'John Smith',
    messages: [
      makeMessage(),
      makeMessage({ role: 'customer', content: 'Yes, what colors are available?' }),
    ],
    startedAt: new Date('2026-03-25T10:00:00Z'),
    channel: 'sms',
    handedOff: false,
    ...overrides,
  };
}

function makeSettings(overrides: Partial<DashboardSettings> = {}): DashboardSettings {
  return {
    activePromotions: ['Spring Sale - 0% financing on select models'],
    inventoryHighlights: ['2024 CR-V EX-L in Platinum White'],
    blacklistedTopics: ['competitor pricing'],
    customFaq: [{ question: 'Do you offer test drives?', answer: 'Yes, by appointment.' }],
    hours: 'Mon-Fri 9:00-18:00, Sat 10:00-16:00',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('nexus-dashboard', () => {
  let provider: InMemoryDashboardProvider;

  beforeEach(() => {
    provider = new InMemoryDashboardProvider();
  });

  // -----------------------------------------------------------------------
  // DEFAULT_VIEWS
  // -----------------------------------------------------------------------

  describe('DEFAULT_VIEWS', () => {
    it('should define exactly 4 views', () => {
      expect(DEFAULT_VIEWS).toHaveLength(4);
    });

    it('should include daily-summary view', () => {
      const view = DEFAULT_VIEWS.find((v) => v.viewId === 'daily-summary');
      expect(view).toBeDefined();
      expect(view!.title).toBe('Daily Summary');
      expect(view!.refreshIntervalSec).toBeGreaterThan(0);
    });

    it('should include conversation-browser view', () => {
      const view = DEFAULT_VIEWS.find((v) => v.viewId === 'conversation-browser');
      expect(view).toBeDefined();
      expect(view!.title).toBe('Conversation Browser');
    });

    it('should include performance-trends view', () => {
      const view = DEFAULT_VIEWS.find((v) => v.viewId === 'performance-trends');
      expect(view).toBeDefined();
      expect(view!.title).toBe('Performance Trends');
    });

    it('should include settings view', () => {
      const view = DEFAULT_VIEWS.find((v) => v.viewId === 'settings');
      expect(view).toBeDefined();
      expect(view!.title).toBe('Settings');
      expect(view!.refreshIntervalSec).toBe(0);
    });

    it('should have unique viewIds', () => {
      const ids = DEFAULT_VIEWS.map((v) => v.viewId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have dataSource on every view', () => {
      for (const view of DEFAULT_VIEWS) {
        expect(view.dataSource).toBeTruthy();
      }
    });
  });

  // -----------------------------------------------------------------------
  // getDailySummary
  // -----------------------------------------------------------------------

  describe('getDailySummary', () => {
    it('should return null for unknown tenant', async () => {
      const result = await provider.getDailySummary('unknown', new Date());
      expect(result).toBeNull();
    });

    it('should return null for unknown date', async () => {
      provider.addSummary('t1', makeSummary());
      const result = await provider.getDailySummary('t1', new Date('2026-01-01'));
      expect(result).toBeNull();
    });

    it('should return stored summary for correct tenant and date', async () => {
      const summary = makeSummary({ leadsHandled: 42, appointmentsBooked: 7 });
      provider.addSummary('t1', summary);
      const result = await provider.getDailySummary('t1', new Date('2026-03-25'));
      expect(result).not.toBeNull();
      expect(result!.leadsHandled).toBe(42);
      expect(result!.appointmentsBooked).toBe(7);
    });

    it('should isolate tenants', async () => {
      provider.addSummary('t1', makeSummary({ leadsHandled: 10 }));
      provider.addSummary('t2', makeSummary({ leadsHandled: 99 }));
      const r1 = await provider.getDailySummary('t1', new Date('2026-03-25'));
      const r2 = await provider.getDailySummary('t2', new Date('2026-03-25'));
      expect(r1!.leadsHandled).toBe(10);
      expect(r2!.leadsHandled).toBe(99);
    });

    it('should return correct escalations and avgResponseTimeSec', async () => {
      const summary = makeSummary({ escalations: 5, avgResponseTimeSec: 8.3 });
      provider.addSummary('t1', summary);
      const result = await provider.getDailySummary('t1', new Date('2026-03-25'));
      expect(result!.escalations).toBe(5);
      expect(result!.avgResponseTimeSec).toBeCloseTo(8.3);
    });
  });

  // -----------------------------------------------------------------------
  // getConversations
  // -----------------------------------------------------------------------

  describe('getConversations', () => {
    it('should return empty array for unknown tenant', async () => {
      const result = await provider.getConversations('unknown');
      expect(result).toEqual([]);
    });

    it('should return all conversations without filters', async () => {
      provider.addConversation('t1', makeConversation({ leadId: 'a' }));
      provider.addConversation('t1', makeConversation({ leadId: 'b' }));
      const result = await provider.getConversations('t1');
      expect(result).toHaveLength(2);
    });

    it('should filter by channel', async () => {
      provider.addConversation('t1', makeConversation({ leadId: 'a', channel: 'sms' }));
      provider.addConversation('t1', makeConversation({ leadId: 'b', channel: 'email' }));
      const result = await provider.getConversations('t1', { channel: 'email' });
      expect(result).toHaveLength(1);
      expect(result[0]!.channel).toBe('email');
    });

    it('should filter by intent', async () => {
      provider.addConversation('t1', makeConversation({ intent: 'PRICE_INQUIRY' }));
      provider.addConversation('t1', makeConversation({ intent: 'INFO_REQUEST' }));
      provider.addConversation('t1', makeConversation());
      const result = await provider.getConversations('t1', { intent: 'PRICE_INQUIRY' });
      expect(result).toHaveLength(1);
    });

    it('should filter by handedOffOnly', async () => {
      provider.addConversation('t1', makeConversation({ handedOff: true }));
      provider.addConversation('t1', makeConversation({ handedOff: false }));
      const result = await provider.getConversations('t1', { handedOffOnly: true });
      expect(result).toHaveLength(1);
      expect(result[0]!.handedOff).toBe(true);
    });

    it('should filter by date range', async () => {
      provider.addConversation('t1', makeConversation({ startedAt: new Date('2026-03-20') }));
      provider.addConversation('t1', makeConversation({ startedAt: new Date('2026-03-25') }));
      provider.addConversation('t1', makeConversation({ startedAt: new Date('2026-03-28') }));
      const result = await provider.getConversations('t1', {
        startDate: new Date('2026-03-24'),
        endDate: new Date('2026-03-26'),
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by search query (lead name)', async () => {
      provider.addConversation('t1', makeConversation({ leadName: 'Alice Dupont' }));
      provider.addConversation('t1', makeConversation({ leadName: 'Bob Martin' }));
      const result = await provider.getConversations('t1', { searchQuery: 'alice' });
      expect(result).toHaveLength(1);
      expect(result[0]!.leadName).toBe('Alice Dupont');
    });

    it('should filter by search query (message content)', async () => {
      provider.addConversation(
        't1',
        makeConversation({
          leadId: 'a',
          messages: [makeMessage({ content: 'Looking for a red SUV' })],
        }),
      );
      provider.addConversation(
        't1',
        makeConversation({
          leadId: 'b',
          messages: [makeMessage({ content: 'Sedan in blue' })],
        }),
      );
      const result = await provider.getConversations('t1', { searchQuery: 'SUV' });
      expect(result).toHaveLength(1);
    });

    it('should apply limit', async () => {
      for (let i = 0; i < 10; i++) {
        provider.addConversation('t1', makeConversation({ leadId: `lead-${i}` }));
      }
      const result = await provider.getConversations('t1', { limit: 3 });
      expect(result).toHaveLength(3);
    });

    it('should apply offset', async () => {
      for (let i = 0; i < 5; i++) {
        provider.addConversation('t1', makeConversation({ leadId: `lead-${i}` }));
      }
      const result = await provider.getConversations('t1', { offset: 3 });
      expect(result).toHaveLength(2);
    });

    it('should combine offset and limit', async () => {
      for (let i = 0; i < 10; i++) {
        provider.addConversation('t1', makeConversation({ leadId: `lead-${i}` }));
      }
      const result = await provider.getConversations('t1', { offset: 2, limit: 3 });
      expect(result).toHaveLength(3);
    });
  });

  // -----------------------------------------------------------------------
  // getTrends
  // -----------------------------------------------------------------------

  describe('getTrends', () => {
    it('should return empty weeklyData for unknown tenant', async () => {
      const range: DateRange = {
        start: new Date('2026-03-01'),
        end: new Date('2026-03-31'),
      };
      const result = await provider.getTrends('unknown', range);
      expect(result.weeklyData).toEqual([]);
    });

    it('should return empty weeklyData for no data in range', async () => {
      provider.addSummary('t1', makeSummary({ date: new Date('2026-01-01') }));
      const range: DateRange = {
        start: new Date('2026-03-01'),
        end: new Date('2026-03-31'),
      };
      const result = await provider.getTrends('t1', range);
      expect(result.weeklyData).toEqual([]);
    });

    it('should aggregate summaries into weekly data points', async () => {
      // Add 3 days within the same ISO week (Wed-Fri March 25-27, 2026 — all ISO week 13)
      for (let d = 25; d <= 27; d++) {
        provider.addSummary(
          't1',
          makeSummary({
            date: new Date(`2026-03-${d}T00:00:00Z`),
            leadsHandled: 10,
            appointmentsBooked: 2,
            escalations: 1,
          }),
        );
      }
      const range: DateRange = {
        start: new Date('2026-03-20'),
        end: new Date('2026-03-31'),
      };
      const result = await provider.getTrends('t1', range);
      expect(result.weeklyData.length).toBeGreaterThanOrEqual(1);
      // All 3 days should be in the same week
      const totalLeads = result.weeklyData.reduce((sum, w) => sum + w.leadVolume, 0);
      expect(totalLeads).toBe(30); // 3 days x 10
    });

    it('should compute rates as fractions between 0 and 1', async () => {
      provider.addSummary(
        't1',
        makeSummary({
          date: new Date('2026-03-25T00:00:00Z'),
          leadsHandled: 20,
          appointmentsBooked: 4,
          escalations: 3,
        }),
      );
      const range: DateRange = {
        start: new Date('2026-03-20'),
        end: new Date('2026-03-31'),
      };
      const result = await provider.getTrends('t1', range);
      const week = result.weeklyData[0]!;
      expect(week.appointmentRate).toBeCloseTo(0.2); // 4/20
      expect(week.handoffRate).toBeCloseTo(0.15); // 3/20
      expect(week.replyRate).toBeCloseTo(0.85); // (20-3)/20
    });

    it('should sort weekly data chronologically', async () => {
      // Add data in two different weeks
      provider.addSummary('t1', makeSummary({ date: new Date('2026-03-25T00:00:00Z') }));
      provider.addSummary('t1', makeSummary({ date: new Date('2026-03-16T00:00:00Z') }));
      const range: DateRange = {
        start: new Date('2026-03-01'),
        end: new Date('2026-03-31'),
      };
      const result = await provider.getTrends('t1', range);
      if (result.weeklyData.length >= 2) {
        expect(result.weeklyData[0]!.week < result.weeklyData[1]!.week).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Settings CRUD
  // -----------------------------------------------------------------------

  describe('getSettings / updateSettings', () => {
    it('should return null for unknown tenant', async () => {
      const result = await provider.getSettings('unknown');
      expect(result).toBeNull();
    });

    it('should store and retrieve settings', async () => {
      const settings = makeSettings();
      provider.setSettings('t1', settings);
      const result = await provider.getSettings('t1');
      expect(result).not.toBeNull();
      expect(result!.activePromotions).toEqual(settings.activePromotions);
      expect(result!.hours).toBe(settings.hours);
    });

    it('should update settings with partial merge', async () => {
      provider.setSettings('t1', makeSettings());
      const updated = await provider.updateSettings('t1', {
        activePromotions: ['New promo'],
        hours: 'Mon-Sun 10:00-20:00',
      });
      expect(updated.activePromotions).toEqual(['New promo']);
      expect(updated.hours).toBe('Mon-Sun 10:00-20:00');
      // Other fields should remain
      expect(updated.blacklistedTopics).toEqual(['competitor pricing']);
    });

    it('should create settings from defaults when no existing', async () => {
      const updated = await provider.updateSettings('new-tenant', {
        activePromotions: ['Grand opening!'],
      });
      expect(updated.activePromotions).toEqual(['Grand opening!']);
      expect(updated.hours).toBe('Mon-Fri 9:00-17:00'); // default
      expect(updated.customFaq).toEqual([]);
    });

    it('should persist updated settings', async () => {
      await provider.updateSettings('t1', { hours: '24/7' });
      const result = await provider.getSettings('t1');
      expect(result!.hours).toBe('24/7');
    });

    it('should handle empty arrays in settings', async () => {
      const settings = makeSettings({
        activePromotions: [],
        inventoryHighlights: [],
        blacklistedTopics: [],
        customFaq: [],
      });
      provider.setSettings('t1', settings);
      const result = await provider.getSettings('t1');
      expect(result!.activePromotions).toEqual([]);
      expect(result!.inventoryHighlights).toEqual([]);
    });

    it('should update customFaq correctly', async () => {
      provider.setSettings('t1', makeSettings());
      const newFaq: FaqEntry[] = [
        { question: 'Hours?', answer: 'Mon-Fri 9-5' },
        { question: 'Trade-ins?', answer: 'Yes we accept trade-ins' },
      ];
      const updated = await provider.updateSettings('t1', { customFaq: newFaq });
      expect(updated.customFaq).toHaveLength(2);
      expect(updated.customFaq[0]!.question).toBe('Hours?');
    });

    it('should isolate settings between tenants', async () => {
      provider.setSettings('t1', makeSettings({ hours: 'Mon-Fri' }));
      provider.setSettings('t2', makeSettings({ hours: 'Sat-Sun' }));
      const r1 = await provider.getSettings('t1');
      const r2 = await provider.getSettings('t2');
      expect(r1!.hours).toBe('Mon-Fri');
      expect(r2!.hours).toBe('Sat-Sun');
    });
  });
});
