import { describe, it, expect, beforeEach } from 'vitest';
import {
  TraceLogger,
  AlertEngine,
  HealthDashboard,
  SLOW_RESPONSE_THRESHOLD_MS,
  HIGH_ERROR_RATE_THRESHOLD,
  QUEUE_DEPTH_HIGH_THRESHOLD,
  ACTIVIX_ERROR_RATE_YELLOW,
  ACTIVIX_ERROR_RATE_RED,
  TWILIO_DELIVERY_YELLOW,
  TWILIO_DELIVERY_RED,
  AI_ERROR_RATE_YELLOW,
  AI_ERROR_RATE_RED,
  QUEUE_DEPTH_YELLOW,
  QUEUE_DEPTH_RED,
} from '../../../packages/nexus-observability/src/index.js';
import type {
  TraceEntry,
  AlertContext,
  AlertEvent,
  AlertRule,
  HealthContext,
  DateRange,
} from '../../../packages/nexus-observability/src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrace(overrides: Partial<Omit<TraceEntry, 'traceId'>> = {}): Omit<TraceEntry, 'traceId'> {
  return {
    tenantId: 'tenant-1',
    timestamp: new Date('2026-03-25T10:00:00Z'),
    model: 'claude-sonnet-4',
    inputTokens: 1000,
    outputTokens: 500,
    latencyMs: 2500,
    status: 'success',
    agentType: 'instant_response',
    ...overrides,
  };
}

function makeHealthyContext(): HealthContext {
  return {
    activixCircuitBreakerOpen: false,
    activixErrorRate: 0.01,
    twilioDeliveryRate: 0.99,
    aiErrorRate: 0.02,
    queueDepth: 3,
  };
}

// ---------------------------------------------------------------------------
// TraceLogger
// ---------------------------------------------------------------------------

describe('TraceLogger', () => {
  let logger: TraceLogger;

  beforeEach(() => {
    logger = new TraceLogger();
  });

  describe('logTrace', () => {
    it('should log a trace and return it with a generated traceId', () => {
      const trace = logger.logTrace(makeTrace());
      expect(trace.traceId).toBeTruthy();
      expect(trace.traceId.startsWith('trace-')).toBe(true);
      expect(trace.tenantId).toBe('tenant-1');
    });

    it('should use provided traceId when given', () => {
      const trace = logger.logTrace({ ...makeTrace(), traceId: 'custom-id-42' });
      expect(trace.traceId).toBe('custom-id-42');
    });

    it('should generate unique traceIds', () => {
      const t1 = logger.logTrace(makeTrace());
      const t2 = logger.logTrace(makeTrace());
      expect(t1.traceId).not.toBe(t2.traceId);
    });

    it('should preserve all fields', () => {
      const trace = logger.logTrace(
        makeTrace({
          model: 'claude-opus-4',
          inputTokens: 5000,
          outputTokens: 2000,
          latencyMs: 8000,
          status: 'error',
          agentType: 'cold_warming',
          error: 'rate_limit',
        }),
      );
      expect(trace.model).toBe('claude-opus-4');
      expect(trace.inputTokens).toBe(5000);
      expect(trace.outputTokens).toBe(2000);
      expect(trace.latencyMs).toBe(8000);
      expect(trace.status).toBe('error');
      expect(trace.agentType).toBe('cold_warming');
      expect(trace.error).toBe('rate_limit');
    });

    it('should increment traceCount', () => {
      expect(logger.traceCount).toBe(0);
      logger.logTrace(makeTrace());
      logger.logTrace(makeTrace());
      expect(logger.traceCount).toBe(2);
    });
  });

  describe('getTraces', () => {
    it('should return empty array for unknown tenant', () => {
      logger.logTrace(makeTrace());
      const result = logger.getTraces('unknown-tenant');
      expect(result).toEqual([]);
    });

    it('should return all traces for a tenant', () => {
      logger.logTrace(makeTrace({ tenantId: 'tenant-1' }));
      logger.logTrace(makeTrace({ tenantId: 'tenant-1' }));
      logger.logTrace(makeTrace({ tenantId: 'tenant-2' }));
      const result = logger.getTraces('tenant-1');
      expect(result).toHaveLength(2);
    });

    it('should filter by status', () => {
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'error', error: 'rate_limit' }));
      logger.logTrace(makeTrace({ status: 'timeout', error: 'api_timeout' }));
      const result = logger.getTraces('tenant-1', { status: 'error' });
      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe('error');
    });

    it('should filter by agentType', () => {
      logger.logTrace(makeTrace({ agentType: 'instant_response' }));
      logger.logTrace(makeTrace({ agentType: 'cold_warming' }));
      logger.logTrace(makeTrace({ agentType: 'classification' }));
      const result = logger.getTraces('tenant-1', { agentType: 'cold_warming' });
      expect(result).toHaveLength(1);
    });

    it('should filter by date range', () => {
      logger.logTrace(makeTrace({ timestamp: new Date('2026-03-20T10:00:00Z') }));
      logger.logTrace(makeTrace({ timestamp: new Date('2026-03-25T10:00:00Z') }));
      logger.logTrace(makeTrace({ timestamp: new Date('2026-03-28T10:00:00Z') }));
      const result = logger.getTraces('tenant-1', {
        startDate: new Date('2026-03-24'),
        endDate: new Date('2026-03-26'),
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by model', () => {
      logger.logTrace(makeTrace({ model: 'claude-sonnet-4' }));
      logger.logTrace(makeTrace({ model: 'claude-opus-4' }));
      const result = logger.getTraces('tenant-1', { model: 'claude-opus-4' });
      expect(result).toHaveLength(1);
      expect(result[0]!.model).toBe('claude-opus-4');
    });

    it('should combine multiple filters', () => {
      logger.logTrace(makeTrace({ status: 'success', agentType: 'instant_response' }));
      logger.logTrace(makeTrace({ status: 'error', agentType: 'instant_response', error: 'x' }));
      logger.logTrace(makeTrace({ status: 'success', agentType: 'cold_warming' }));
      const result = logger.getTraces('tenant-1', {
        status: 'success',
        agentType: 'instant_response',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getAverageLatency', () => {
    it('should return 0 for no traces', () => {
      expect(logger.getAverageLatency('tenant-1')).toBe(0);
    });

    it('should return correct average for single trace', () => {
      logger.logTrace(makeTrace({ latencyMs: 3000 }));
      expect(logger.getAverageLatency('tenant-1')).toBe(3000);
    });

    it('should return correct average for multiple traces', () => {
      logger.logTrace(makeTrace({ latencyMs: 1000 }));
      logger.logTrace(makeTrace({ latencyMs: 2000 }));
      logger.logTrace(makeTrace({ latencyMs: 3000 }));
      expect(logger.getAverageLatency('tenant-1')).toBe(2000);
    });

    it('should scope by date range', () => {
      logger.logTrace(makeTrace({ latencyMs: 1000, timestamp: new Date('2026-03-20') }));
      logger.logTrace(makeTrace({ latencyMs: 5000, timestamp: new Date('2026-03-25') }));
      const range: DateRange = {
        start: new Date('2026-03-24'),
        end: new Date('2026-03-26'),
      };
      expect(logger.getAverageLatency('tenant-1', range)).toBe(5000);
    });
  });

  describe('getErrorRate', () => {
    it('should return 0 for no traces', () => {
      expect(logger.getErrorRate('tenant-1')).toBe(0);
    });

    it('should return 0 for all-success traces', () => {
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'success' }));
      expect(logger.getErrorRate('tenant-1')).toBe(0);
    });

    it('should count errors correctly', () => {
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'error', error: 'rate_limit' }));
      expect(logger.getErrorRate('tenant-1')).toBe(0.5);
    });

    it('should count timeouts as errors', () => {
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'timeout', error: 'api_timeout' }));
      expect(logger.getErrorRate('tenant-1')).toBe(0.5);
    });

    it('should count mixed errors and timeouts', () => {
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'success' }));
      logger.logTrace(makeTrace({ status: 'error', error: 'x' }));
      logger.logTrace(makeTrace({ status: 'timeout', error: 'y' }));
      expect(logger.getErrorRate('tenant-1')).toBe(0.5);
    });

    it('should scope by date range', () => {
      logger.logTrace(makeTrace({ status: 'error', error: 'x', timestamp: new Date('2026-03-20') }));
      logger.logTrace(makeTrace({ status: 'success', timestamp: new Date('2026-03-25') }));
      const range: DateRange = {
        start: new Date('2026-03-24'),
        end: new Date('2026-03-26'),
      };
      expect(logger.getErrorRate('tenant-1', range)).toBe(0);
    });
  });

  describe('getTokenUsage', () => {
    it('should return zeros for no traces', () => {
      const usage = logger.getTokenUsage('tenant-1');
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });

    it('should sum tokens correctly', () => {
      logger.logTrace(makeTrace({ inputTokens: 1000, outputTokens: 500 }));
      logger.logTrace(makeTrace({ inputTokens: 2000, outputTokens: 800 }));
      const usage = logger.getTokenUsage('tenant-1');
      expect(usage.inputTokens).toBe(3000);
      expect(usage.outputTokens).toBe(1300);
      expect(usage.totalTokens).toBe(4300);
    });

    it('should scope by date range', () => {
      logger.logTrace(makeTrace({ inputTokens: 9999, outputTokens: 9999, timestamp: new Date('2026-03-20') }));
      logger.logTrace(makeTrace({ inputTokens: 100, outputTokens: 50, timestamp: new Date('2026-03-25') }));
      const range: DateRange = {
        start: new Date('2026-03-24'),
        end: new Date('2026-03-26'),
      };
      const usage = logger.getTokenUsage('tenant-1', range);
      expect(usage.inputTokens).toBe(100);
      expect(usage.outputTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
    });
  });

  describe('clear', () => {
    it('should remove all traces', () => {
      logger.logTrace(makeTrace());
      logger.logTrace(makeTrace());
      expect(logger.traceCount).toBe(2);
      logger.clear();
      expect(logger.traceCount).toBe(0);
      expect(logger.getTraces('tenant-1')).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// AlertEngine
// ---------------------------------------------------------------------------

describe('AlertEngine', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine();
  });

  describe('predefined rules', () => {
    it('should have exactly 5 predefined rules', () => {
      expect(engine.getRules()).toHaveLength(5);
    });

    it('should include circuit_breaker_open rule', () => {
      const rule = engine.getRules().find((r) => r.name === 'circuit_breaker_open');
      expect(rule).toBeDefined();
      expect(rule!.channel).toBe('slack');
    });

    it('should include compliance_failure rule', () => {
      const rule = engine.getRules().find((r) => r.name === 'compliance_failure');
      expect(rule).toBeDefined();
      expect(rule!.channel).toBe('slack');
    });

    it('should include slow_response rule', () => {
      const rule = engine.getRules().find((r) => r.name === 'slow_response');
      expect(rule).toBeDefined();
    });

    it('should include high_error_rate rule', () => {
      const rule = engine.getRules().find((r) => r.name === 'high_error_rate');
      expect(rule).toBeDefined();
      expect(rule!.channel).toBe('pagerduty');
    });

    it('should include queue_depth_high rule', () => {
      const rule = engine.getRules().find((r) => r.name === 'queue_depth_high');
      expect(rule).toBeDefined();
    });
  });

  describe('evaluate — circuit_breaker_open', () => {
    it('should trigger when circuitBreakerOpen is true', () => {
      const events = engine.evaluate({ circuitBreakerOpen: true });
      const cb = events.find((e) => e.ruleName === 'circuit_breaker_open');
      expect(cb).toBeDefined();
      expect(cb!.notified).toBe(true);
    });

    it('should not trigger when circuitBreakerOpen is false', () => {
      const events = engine.evaluate({ circuitBreakerOpen: false });
      const cb = events.find((e) => e.ruleName === 'circuit_breaker_open');
      expect(cb).toBeUndefined();
    });
  });

  describe('evaluate — compliance_failure', () => {
    it('should trigger when complianceFailure is true', () => {
      const events = engine.evaluate({
        complianceFailure: true,
        complianceDetails: 'CASL consent expired',
      });
      const cf = events.find((e) => e.ruleName === 'compliance_failure');
      expect(cf).toBeDefined();
      expect(cf!.details).toContain('CASL consent expired');
    });

    it('should not trigger when complianceFailure is false', () => {
      const events = engine.evaluate({ complianceFailure: false });
      const cf = events.find((e) => e.ruleName === 'compliance_failure');
      expect(cf).toBeUndefined();
    });
  });

  describe('evaluate — slow_response', () => {
    it('should trigger when latencyMs exceeds threshold', () => {
      const events = engine.evaluate({ latencyMs: SLOW_RESPONSE_THRESHOLD_MS + 1 });
      const sr = events.find((e) => e.ruleName === 'slow_response');
      expect(sr).toBeDefined();
      expect(sr!.details).toContain(String(SLOW_RESPONSE_THRESHOLD_MS + 1));
    });

    it('should not trigger when latencyMs equals threshold', () => {
      const events = engine.evaluate({ latencyMs: SLOW_RESPONSE_THRESHOLD_MS });
      const sr = events.find((e) => e.ruleName === 'slow_response');
      expect(sr).toBeUndefined();
    });

    it('should not trigger when latencyMs is below threshold', () => {
      const events = engine.evaluate({ latencyMs: 5000 });
      const sr = events.find((e) => e.ruleName === 'slow_response');
      expect(sr).toBeUndefined();
    });
  });

  describe('evaluate — high_error_rate', () => {
    it('should trigger when errorRate exceeds threshold', () => {
      const events = engine.evaluate({ errorRate: HIGH_ERROR_RATE_THRESHOLD + 0.01 });
      const he = events.find((e) => e.ruleName === 'high_error_rate');
      expect(he).toBeDefined();
    });

    it('should not trigger when errorRate equals threshold', () => {
      const events = engine.evaluate({ errorRate: HIGH_ERROR_RATE_THRESHOLD });
      const he = events.find((e) => e.ruleName === 'high_error_rate');
      expect(he).toBeUndefined();
    });

    it('should not trigger at low error rate', () => {
      const events = engine.evaluate({ errorRate: 0.02 });
      const he = events.find((e) => e.ruleName === 'high_error_rate');
      expect(he).toBeUndefined();
    });
  });

  describe('evaluate — queue_depth_high', () => {
    it('should trigger when queueDepth exceeds threshold', () => {
      const events = engine.evaluate({ queueDepth: QUEUE_DEPTH_HIGH_THRESHOLD + 1 });
      const qd = events.find((e) => e.ruleName === 'queue_depth_high');
      expect(qd).toBeDefined();
      expect(qd!.details).toContain(String(QUEUE_DEPTH_HIGH_THRESHOLD + 1));
    });

    it('should not trigger when queueDepth equals threshold', () => {
      const events = engine.evaluate({ queueDepth: QUEUE_DEPTH_HIGH_THRESHOLD });
      const qd = events.find((e) => e.ruleName === 'queue_depth_high');
      expect(qd).toBeUndefined();
    });

    it('should not trigger at low queue depth', () => {
      const events = engine.evaluate({ queueDepth: 5 });
      const qd = events.find((e) => e.ruleName === 'queue_depth_high');
      expect(qd).toBeUndefined();
    });
  });

  describe('evaluate — multiple rules', () => {
    it('should trigger multiple rules at once', () => {
      const events = engine.evaluate({
        circuitBreakerOpen: true,
        latencyMs: 90_000,
        queueDepth: 100,
      });
      const names = events.map((e) => e.ruleName);
      expect(names).toContain('circuit_breaker_open');
      expect(names).toContain('slow_response');
      expect(names).toContain('queue_depth_high');
    });

    it('should return empty array when no rules triggered', () => {
      const events = engine.evaluate({
        circuitBreakerOpen: false,
        complianceFailure: false,
        latencyMs: 1000,
        errorRate: 0.01,
        queueDepth: 2,
      });
      expect(events).toHaveLength(0);
    });

    it('should set timestamp on all events', () => {
      const events = engine.evaluate({ circuitBreakerOpen: true, latencyMs: 90_000 });
      for (const event of events) {
        expect(event.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('addRule — custom rules', () => {
    it('should add a custom rule that triggers correctly', () => {
      const customRule: AlertRule = {
        name: 'custom_test',
        condition: (ctx: AlertContext): boolean => ctx.queueDepth !== undefined && ctx.queueDepth > 10,
        channel: 'email',
        messageTemplate: 'Custom alert: queue at {{queueDepth}}',
      };
      engine.addRule(customRule);
      expect(engine.getRules()).toHaveLength(6);

      const events = engine.evaluate({ queueDepth: 15 });
      const custom = events.find((e) => e.ruleName === 'custom_test');
      expect(custom).toBeDefined();
      expect(custom!.details).toContain('15');
    });
  });

  describe('evaluate — error resilience', () => {
    it('should not crash when a rule condition throws', () => {
      const badRule: AlertRule = {
        name: 'bad_rule',
        condition: (): boolean => {
          throw new Error('kaboom');
        },
        channel: 'slack',
        messageTemplate: 'Should never fire',
      };
      engine.addRule(badRule);
      // Should not throw, and other rules should still evaluate
      const events = engine.evaluate({ circuitBreakerOpen: true });
      expect(events.find((e) => e.ruleName === 'circuit_breaker_open')).toBeDefined();
      expect(events.find((e) => e.ruleName === 'bad_rule')).toBeUndefined();
    });
  });

  describe('formatSlackMessage', () => {
    it('should return valid Slack blocks', () => {
      const event: AlertEvent = {
        ruleName: 'circuit_breaker_open',
        timestamp: new Date('2026-03-25T10:00:00Z'),
        details: 'Circuit breaker is OPEN.',
        notified: true,
      };
      const msg = engine.formatSlackMessage(event);
      expect(msg.blocks).toHaveLength(3);
      expect(msg.blocks[0]!.type).toBe('header');
      expect(msg.blocks[1]!.type).toBe('section');
      expect(msg.blocks[2]!.type).toBe('context');
    });

    it('should include rule name in header', () => {
      const event: AlertEvent = {
        ruleName: 'slow_response',
        timestamp: new Date(),
        details: 'Slow response detected',
        notified: true,
      };
      const msg = engine.formatSlackMessage(event);
      const headerText = msg.blocks[0]!.text!.text;
      expect(headerText).toContain('slow_response');
    });

    it('should include details in section', () => {
      const event: AlertEvent = {
        ruleName: 'compliance_failure',
        timestamp: new Date(),
        details: 'CASL consent expired for lead-42',
        notified: true,
      };
      const msg = engine.formatSlackMessage(event);
      const sectionText = msg.blocks[1]!.text!.text;
      expect(sectionText).toContain('CASL consent expired for lead-42');
    });

    it('should include ISO timestamp in context', () => {
      const ts = new Date('2026-03-25T10:30:00Z');
      const event: AlertEvent = {
        ruleName: 'high_error_rate',
        timestamp: ts,
        details: 'Error rate at 15%',
        notified: true,
      };
      const msg = engine.formatSlackMessage(event);
      const contextText = msg.blocks[2]!.elements![0]!.text;
      expect(contextText).toContain('2026-03-25');
    });
  });
});

// ---------------------------------------------------------------------------
// HealthDashboard
// ---------------------------------------------------------------------------

describe('HealthDashboard', () => {
  let dashboard: HealthDashboard;

  beforeEach(() => {
    dashboard = new HealthDashboard();
  });

  describe('all green', () => {
    it('should return all green for healthy context', () => {
      const health = dashboard.getSystemHealth('tenant-1', makeHealthyContext());
      expect(health.activixApi).toBe('green');
      expect(health.twilioDelivery).toBe('green');
      expect(health.aiErrorRate).toBe('green');
      expect(health.queueDepth).toBe('green');
      expect(health.overallStatus).toBe('green');
    });
  });

  describe('activixApi', () => {
    it('should be red when circuit breaker is open', () => {
      const ctx = { ...makeHealthyContext(), activixCircuitBreakerOpen: true };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.activixApi).toBe('red');
    });

    it('should be red when error rate exceeds red threshold', () => {
      const ctx = { ...makeHealthyContext(), activixErrorRate: ACTIVIX_ERROR_RATE_RED + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.activixApi).toBe('red');
    });

    it('should be yellow when error rate exceeds yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), activixErrorRate: ACTIVIX_ERROR_RATE_YELLOW + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.activixApi).toBe('yellow');
    });

    it('should be green when error rate is below yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), activixErrorRate: ACTIVIX_ERROR_RATE_YELLOW - 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.activixApi).toBe('green');
    });
  });

  describe('twilioDelivery', () => {
    it('should be red when delivery rate below red threshold', () => {
      const ctx = { ...makeHealthyContext(), twilioDeliveryRate: TWILIO_DELIVERY_RED - 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.twilioDelivery).toBe('red');
    });

    it('should be yellow when delivery rate below yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), twilioDeliveryRate: TWILIO_DELIVERY_YELLOW - 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.twilioDelivery).toBe('yellow');
    });

    it('should be green when delivery rate above yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), twilioDeliveryRate: TWILIO_DELIVERY_YELLOW + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.twilioDelivery).toBe('green');
    });
  });

  describe('aiErrorRate', () => {
    it('should be red when error rate exceeds red threshold', () => {
      const ctx = { ...makeHealthyContext(), aiErrorRate: AI_ERROR_RATE_RED + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.aiErrorRate).toBe('red');
    });

    it('should be yellow when error rate exceeds yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), aiErrorRate: AI_ERROR_RATE_YELLOW + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.aiErrorRate).toBe('yellow');
    });

    it('should be green when error rate is low', () => {
      const ctx = { ...makeHealthyContext(), aiErrorRate: 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.aiErrorRate).toBe('green');
    });
  });

  describe('queueDepth', () => {
    it('should be red when queue depth exceeds red threshold', () => {
      const ctx = { ...makeHealthyContext(), queueDepth: QUEUE_DEPTH_RED + 1 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.queueDepth).toBe('red');
    });

    it('should be yellow when queue depth exceeds yellow threshold', () => {
      const ctx = { ...makeHealthyContext(), queueDepth: QUEUE_DEPTH_YELLOW + 1 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.queueDepth).toBe('yellow');
    });

    it('should be green when queue depth is low', () => {
      const ctx = { ...makeHealthyContext(), queueDepth: 5 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.queueDepth).toBe('green');
    });
  });

  describe('overallStatus', () => {
    it('should be red if any component is red', () => {
      const ctx = { ...makeHealthyContext(), activixCircuitBreakerOpen: true };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.overallStatus).toBe('red');
    });

    it('should be yellow if any component is yellow and none red', () => {
      const ctx = { ...makeHealthyContext(), aiErrorRate: AI_ERROR_RATE_YELLOW + 0.01 };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.overallStatus).toBe('yellow');
    });

    it('should be green only when all components are green', () => {
      const health = dashboard.getSystemHealth('t1', makeHealthyContext());
      expect(health.overallStatus).toBe('green');
    });

    it('should be red when multiple components are degraded', () => {
      const ctx: HealthContext = {
        activixCircuitBreakerOpen: true,
        activixErrorRate: 0.5,
        twilioDeliveryRate: 0.5,
        aiErrorRate: 0.5,
        queueDepth: 200,
      };
      const health = dashboard.getSystemHealth('t1', ctx);
      expect(health.activixApi).toBe('red');
      expect(health.twilioDelivery).toBe('red');
      expect(health.aiErrorRate).toBe('red');
      expect(health.queueDepth).toBe('red');
      expect(health.overallStatus).toBe('red');
    });
  });
});
