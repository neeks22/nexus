import { describe, it, expect, beforeEach } from 'vitest';
import {
  CostLogger,
  InMemoryCostStore,
  CostReporter,
} from '../../../packages/nexus-billing/src/index.js';
import type {
  ApiCostEntry,
  TwilioCostEntry,
  DateRange,
  CostStore,
} from '../../../packages/nexus-billing/src/index.js';

// --- Helpers ---

function makeApiEntry(overrides: Partial<Omit<ApiCostEntry, 'id'>> = {}): Omit<ApiCostEntry, 'id'> {
  return {
    tenantId: 'tenant-1',
    timestamp: new Date('2026-03-15T10:00:00Z'),
    model: 'claude-sonnet-4',
    inputTokens: 1000,
    outputTokens: 500,
    costUsd: CostLogger.calculateCost('claude-sonnet-4', 1000, 500),
    operationType: 'instant_response',
    ...overrides,
  };
}

function makeTwilioEntry(overrides: Partial<Omit<TwilioCostEntry, 'id'>> = {}): Omit<TwilioCostEntry, 'id'> {
  return {
    tenantId: 'tenant-1',
    timestamp: new Date('2026-03-15T10:00:00Z'),
    channel: 'sms',
    costUsd: 0.0079,
    messageId: 'SM_abc123',
    ...overrides,
  };
}

// --- Cost Calculation Tests ---

describe('CostLogger.calculateCost', () => {
  it('calculates cost correctly for claude-opus-4', () => {
    // $15/M input + $75/M output
    const cost = CostLogger.calculateCost('claude-opus-4', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(90, 5);
  });

  it('calculates cost correctly for claude-sonnet-4', () => {
    // $3/M input + $15/M output
    const cost = CostLogger.calculateCost('claude-sonnet-4', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 5);
  });

  it('calculates cost correctly for claude-haiku-3.5', () => {
    // $0.80/M input + $4/M output
    const cost = CostLogger.calculateCost('claude-haiku-3.5', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(4.80, 5);
  });

  it('calculates fractional token counts', () => {
    // 500 input tokens of sonnet = $0.0015, 200 output = $0.003
    const cost = CostLogger.calculateCost('claude-sonnet-4', 500, 200);
    expect(cost).toBeCloseTo(0.0045, 6);
  });

  it('returns 0 for unknown model', () => {
    const cost = CostLogger.calculateCost('unknown-model', 1000, 1000);
    expect(cost).toBe(0);
  });

  it('handles zero tokens', () => {
    const cost = CostLogger.calculateCost('claude-opus-4', 0, 0);
    expect(cost).toBe(0);
  });
});

// --- Cost Logging Tests ---

describe('CostLogger', () => {
  let store: InMemoryCostStore;
  let logger: CostLogger;

  beforeEach(() => {
    store = new InMemoryCostStore();
    logger = new CostLogger(store);
  });

  it('logs an API call with all fields and auto-generated ID', async () => {
    const entry = makeApiEntry();
    const result = await logger.logApiCall(entry);

    expect(result.id).toBeTruthy();
    expect(result.id).toMatch(/^cost_/);
    expect(result.tenantId).toBe('tenant-1');
    expect(result.model).toBe('claude-sonnet-4');
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(500);
    expect(result.operationType).toBe('instant_response');
    expect(result.costUsd).toBeGreaterThan(0);

    const stored = await store.getApiCosts('tenant-1');
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe(result.id);
  });

  it('logs a Twilio message with all fields and auto-generated ID', async () => {
    const entry = makeTwilioEntry();
    const result = await logger.logTwilioMessage(entry);

    expect(result.id).toBeTruthy();
    expect(result.id).toMatch(/^cost_/);
    expect(result.tenantId).toBe('tenant-1');
    expect(result.channel).toBe('sms');
    expect(result.costUsd).toBe(0.0079);
    expect(result.messageId).toBe('SM_abc123');

    const stored = await store.getTwilioCosts('tenant-1');
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe(result.id);
  });

  it('generates unique IDs for multiple entries', async () => {
    const r1 = await logger.logApiCall(makeApiEntry());
    const r2 = await logger.logApiCall(makeApiEntry());
    expect(r1.id).not.toBe(r2.id);
  });
});

// --- Cost Store Tests ---

describe('InMemoryCostStore', () => {
  let store: InMemoryCostStore;
  let logger: CostLogger;

  beforeEach(() => {
    store = new InMemoryCostStore();
    logger = new CostLogger(store);
  });

  it('filters API costs by tenant', async () => {
    await logger.logApiCall(makeApiEntry({ tenantId: 'tenant-1' }));
    await logger.logApiCall(makeApiEntry({ tenantId: 'tenant-2' }));
    await logger.logApiCall(makeApiEntry({ tenantId: 'tenant-1' }));

    const t1 = await store.getApiCosts('tenant-1');
    const t2 = await store.getApiCosts('tenant-2');
    expect(t1).toHaveLength(2);
    expect(t2).toHaveLength(1);
  });

  it('filters Twilio costs by tenant', async () => {
    await logger.logTwilioMessage(makeTwilioEntry({ tenantId: 'tenant-1' }));
    await logger.logTwilioMessage(makeTwilioEntry({ tenantId: 'tenant-2' }));

    const t1 = await store.getTwilioCosts('tenant-1');
    const t2 = await store.getTwilioCosts('tenant-2');
    expect(t1).toHaveLength(1);
    expect(t2).toHaveLength(1);
  });

  it('filters API costs by date range', async () => {
    await logger.logApiCall(makeApiEntry({ timestamp: new Date('2026-03-01T00:00:00Z') }));
    await logger.logApiCall(makeApiEntry({ timestamp: new Date('2026-03-15T00:00:00Z') }));
    await logger.logApiCall(makeApiEntry({ timestamp: new Date('2026-03-31T00:00:00Z') }));

    const range: DateRange = {
      start: new Date('2026-03-10T00:00:00Z'),
      end: new Date('2026-03-20T00:00:00Z'),
    };

    const filtered = await store.getApiCosts('tenant-1', range);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.timestamp).toEqual(new Date('2026-03-15T00:00:00Z'));
  });

  it('filters Twilio costs by date range', async () => {
    await logger.logTwilioMessage(makeTwilioEntry({ timestamp: new Date('2026-03-01T00:00:00Z') }));
    await logger.logTwilioMessage(makeTwilioEntry({ timestamp: new Date('2026-03-15T00:00:00Z') }));

    const range: DateRange = {
      start: new Date('2026-03-10T00:00:00Z'),
      end: new Date('2026-03-20T00:00:00Z'),
    };

    const filtered = await store.getTwilioCosts('tenant-1', range);
    expect(filtered).toHaveLength(1);
  });

  it('returns all entries when no date range is given', async () => {
    await logger.logApiCall(makeApiEntry({ timestamp: new Date('2026-01-01T00:00:00Z') }));
    await logger.logApiCall(makeApiEntry({ timestamp: new Date('2026-12-31T00:00:00Z') }));

    const all = await store.getApiCosts('tenant-1');
    expect(all).toHaveLength(2);
  });

  it('returns empty array for unknown tenant', async () => {
    await logger.logApiCall(makeApiEntry({ tenantId: 'tenant-1' }));
    const results = await store.getApiCosts('tenant-unknown');
    expect(results).toHaveLength(0);
  });
});

// --- Cost Reporter Tests ---

describe('CostReporter', () => {
  let store: InMemoryCostStore;
  let logger: CostLogger;
  let reporter: CostReporter;
  const dateRange: DateRange = {
    start: new Date('2026-03-01T00:00:00Z'),
    end: new Date('2026-03-31T23:59:59Z'),
  };

  beforeEach(() => {
    store = new InMemoryCostStore();
    logger = new CostLogger(store);
    reporter = new CostReporter(store);
  });

  it('generates empty report when no data exists', async () => {
    const report = await reporter.generateReport('tenant-1', dateRange);
    expect(report.totalCostUsd).toBe(0);
    expect(report.aiCostUsd).toBe(0);
    expect(report.twilioCostUsd).toBe(0);
    expect(report.totalLeadsHandled).toBe(0);
    expect(report.costPerLead).toBe(0);
    expect(report.costPerConversation).toBe(0);
    expect(report.costPerAppointment).toBe(0);
    expect(report.breakdown).toHaveLength(0);
  });

  it('generates report with correct totals for a single API entry', async () => {
    const costUsd = CostLogger.calculateCost('claude-sonnet-4', 10000, 2000);
    await logger.logApiCall(makeApiEntry({ inputTokens: 10000, outputTokens: 2000, costUsd }));

    const report = await reporter.generateReport('tenant-1', dateRange, {
      totalLeadsHandled: 1,
      totalConversations: 1,
    });

    expect(report.aiCostUsd).toBeCloseTo(costUsd, 6);
    expect(report.twilioCostUsd).toBe(0);
    expect(report.totalCostUsd).toBeCloseTo(costUsd, 6);
    expect(report.costPerLead).toBeCloseTo(costUsd, 6);
    expect(report.costPerConversation).toBeCloseTo(costUsd, 6);
  });

  it('generates report with correct totals for multiple entries', async () => {
    const apiCost1 = CostLogger.calculateCost('claude-sonnet-4', 5000, 1000);
    const apiCost2 = CostLogger.calculateCost('claude-haiku-3.5', 8000, 500);
    const twilioCost = 0.0079;

    await logger.logApiCall(makeApiEntry({
      inputTokens: 5000, outputTokens: 1000, costUsd: apiCost1,
      operationType: 'instant_response',
    }));
    await logger.logApiCall(makeApiEntry({
      model: 'claude-haiku-3.5',
      inputTokens: 8000, outputTokens: 500, costUsd: apiCost2,
      operationType: 'intent_classification',
    }));
    await logger.logTwilioMessage(makeTwilioEntry({ costUsd: twilioCost }));

    const report = await reporter.generateReport('tenant-1', dateRange, {
      totalLeadsHandled: 10,
      totalConversations: 5,
      totalAppointments: 2,
    });

    const expectedAi = apiCost1 + apiCost2;
    const expectedTotal = expectedAi + twilioCost;

    expect(report.aiCostUsd).toBeCloseTo(expectedAi, 6);
    expect(report.twilioCostUsd).toBeCloseTo(twilioCost, 6);
    expect(report.totalCostUsd).toBeCloseTo(expectedTotal, 6);
    expect(report.costPerLead).toBeCloseTo(expectedTotal / 10, 6);
    expect(report.costPerConversation).toBeCloseTo(expectedTotal / 5, 6);
    expect(report.costPerAppointment).toBeCloseTo(expectedTotal / 2, 6);
  });

  it('breaks down costs by operation type', async () => {
    await logger.logApiCall(makeApiEntry({
      inputTokens: 1000, outputTokens: 500,
      costUsd: CostLogger.calculateCost('claude-sonnet-4', 1000, 500),
      operationType: 'instant_response',
    }));
    await logger.logApiCall(makeApiEntry({
      inputTokens: 2000, outputTokens: 300,
      costUsd: CostLogger.calculateCost('claude-sonnet-4', 2000, 300),
      operationType: 'instant_response',
    }));
    await logger.logApiCall(makeApiEntry({
      inputTokens: 500, outputTokens: 100,
      costUsd: CostLogger.calculateCost('claude-sonnet-4', 500, 100),
      operationType: 'cold_warming',
    }));

    const report = await reporter.generateReport('tenant-1', dateRange);

    expect(report.breakdown).toHaveLength(2);

    const instantResponse = report.breakdown.find((b) => b.operationType === 'instant_response');
    const coldWarming = report.breakdown.find((b) => b.operationType === 'cold_warming');

    expect(instantResponse).toBeDefined();
    expect(instantResponse!.callCount).toBe(2);
    expect(instantResponse!.totalInputTokens).toBe(3000);
    expect(instantResponse!.totalOutputTokens).toBe(800);

    expect(coldWarming).toBeDefined();
    expect(coldWarming!.callCount).toBe(1);
    expect(coldWarming!.totalInputTokens).toBe(500);
    expect(coldWarming!.totalOutputTokens).toBe(100);
  });

  it('calculates correct per-lead cost', async () => {
    await logger.logApiCall(makeApiEntry({ costUsd: 0.10 }));
    await logger.logTwilioMessage(makeTwilioEntry({ costUsd: 0.02 }));

    const report = await reporter.generateReport('tenant-1', dateRange, {
      totalLeadsHandled: 4,
    });

    expect(report.costPerLead).toBeCloseTo(0.12 / 4, 6);
  });

  it('returns 0 for per-unit costs when counts are 0', async () => {
    await logger.logApiCall(makeApiEntry({ costUsd: 0.10 }));

    const report = await reporter.generateReport('tenant-1', dateRange);

    expect(report.costPerLead).toBe(0);
    expect(report.costPerConversation).toBe(0);
    expect(report.costPerAppointment).toBe(0);
  });
});

// --- Summary Generation Tests ---

describe('CostReporter.generateSummary', () => {
  let store: InMemoryCostStore;
  let logger: CostLogger;
  let reporter: CostReporter;
  const dateRange: DateRange = {
    start: new Date('2026-03-01T00:00:00Z'),
    end: new Date('2026-03-31T23:59:59Z'),
  };

  beforeEach(() => {
    store = new InMemoryCostStore();
    logger = new CostLogger(store);
    reporter = new CostReporter(store);
  });

  it('generates a human-readable summary', async () => {
    await logger.logApiCall(makeApiEntry({
      costUsd: 0.05, operationType: 'instant_response',
    }));
    await logger.logTwilioMessage(makeTwilioEntry({ costUsd: 0.01 }));

    const summary = await reporter.generateSummary('tenant-1', dateRange, {
      totalLeadsHandled: 10,
      totalConversations: 5,
      totalAppointments: 2,
    });

    expect(summary).toContain('Cost Report for Tenant: tenant-1');
    expect(summary).toContain('2026-03-01');
    expect(summary).toContain('2026-03-31');
    expect(summary).toContain('Total Cost:');
    expect(summary).toContain('AI API Cost:');
    expect(summary).toContain('Twilio Cost:');
    expect(summary).toContain('Leads Handled: 10');
    expect(summary).toContain('Conversations: 5');
    expect(summary).toContain('Appointments: 2');
    expect(summary).toContain('Cost per Lead:');
    expect(summary).toContain('Cost per Conversation:');
    expect(summary).toContain('Cost per Appointment:');
    expect(summary).toContain('instant_response');
  });

  it('generates summary without breakdown when no API costs exist', async () => {
    await logger.logTwilioMessage(makeTwilioEntry({ costUsd: 0.01 }));

    const summary = await reporter.generateSummary('tenant-1', dateRange);

    expect(summary).toContain('Cost Report for Tenant: tenant-1');
    expect(summary).toContain('Twilio Cost: $0.0100');
    expect(summary).not.toContain('Breakdown by Operation');
  });

  it('generates summary for empty data', async () => {
    const summary = await reporter.generateSummary('tenant-empty', dateRange);

    expect(summary).toContain('Cost Report for Tenant: tenant-empty');
    expect(summary).toContain('Total Cost: $0.0000');
    expect(summary).toContain('Leads Handled: 0');
  });
});
