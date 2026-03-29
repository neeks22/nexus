/**
 * TraceLogger — records and queries LLM call traces for observability.
 *
 * Stores every agent execution with input/output tokens, latency, status,
 * and provides aggregation methods for dashboards and alerting.
 */

import { randomUUID } from 'node:crypto';
import type { TraceEntry, TraceFilters, DateRange } from './types.js';

function generateTraceId(): string {
  return `trace-${randomUUID()}`;
}

export class TraceLogger {
  private readonly traces: TraceEntry[] = [];

  /**
   * Log a new trace entry. If traceId is not provided, one is generated.
   */
  logTrace(entry: Omit<TraceEntry, 'traceId'> & { traceId?: string }): TraceEntry {
    const trace: TraceEntry = {
      traceId: entry.traceId ?? generateTraceId(),
      tenantId: entry.tenantId,
      timestamp: entry.timestamp,
      model: entry.model,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      latencyMs: entry.latencyMs,
      status: entry.status,
      agentType: entry.agentType,
      ...(entry.error !== undefined ? { error: entry.error } : {}),
    };
    this.traces.push(trace);
    return trace;
  }

  /**
   * Retrieve traces for a tenant, optionally filtered by date range and other criteria.
   */
  getTraces(tenantId: string, filters?: TraceFilters): readonly TraceEntry[] {
    let result = this.traces.filter((t) => t.tenantId === tenantId);

    if (filters) {
      if (filters.startDate) {
        const start = filters.startDate.getTime();
        result = result.filter((t) => t.timestamp.getTime() >= start);
      }
      if (filters.endDate) {
        const end = filters.endDate.getTime();
        result = result.filter((t) => t.timestamp.getTime() <= end);
      }
      if (filters.status) {
        result = result.filter((t) => t.status === filters.status);
      }
      if (filters.agentType) {
        result = result.filter((t) => t.agentType === filters.agentType);
      }
      if (filters.model) {
        result = result.filter((t) => t.model === filters.model);
      }
    }

    return result;
  }

  /**
   * Average latency (ms) for a tenant's traces, optionally within a date range.
   * Returns 0 if no traces exist.
   */
  getAverageLatency(tenantId: string, range?: DateRange): number {
    const traces = this.getTraces(tenantId, range ? { startDate: range.start, endDate: range.end } : undefined);
    if (traces.length === 0) return 0;
    const total = traces.reduce((sum, t) => sum + t.latencyMs, 0);
    return total / traces.length;
  }

  /**
   * Error rate (0-1) for a tenant's traces, optionally within a date range.
   * Returns 0 if no traces exist.
   */
  getErrorRate(tenantId: string, range?: DateRange): number {
    const traces = this.getTraces(tenantId, range ? { startDate: range.start, endDate: range.end } : undefined);
    if (traces.length === 0) return 0;
    const errors = traces.filter((t) => t.status === 'error' || t.status === 'timeout').length;
    return errors / traces.length;
  }

  /**
   * Total token usage for a tenant, optionally within a date range.
   */
  getTokenUsage(
    tenantId: string,
    range?: DateRange,
  ): { inputTokens: number; outputTokens: number; totalTokens: number } {
    const traces = this.getTraces(tenantId, range ? { startDate: range.start, endDate: range.end } : undefined);
    const inputTokens = traces.reduce((sum, t) => sum + t.inputTokens, 0);
    const outputTokens = traces.reduce((sum, t) => sum + t.outputTokens, 0);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  /**
   * Total number of traces stored (all tenants).
   */
  get traceCount(): number {
    return this.traces.length;
  }

  /**
   * Clear all traces (for testing).
   */
  clear(): void {
    this.traces.length = 0;
  }
}
