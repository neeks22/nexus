// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ReportGenerator — Structured reports from team runs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  TeamRunResult,
  TranscriptEntry,
  HealingSummary,
  HealthScore,
  TokenUsage,
} from '../types.js';
import { CostCalculator } from './cost-calculator.js';
import { DEFAULT_MODEL } from '../config/thresholds.js';

// ── Report interfaces ────────────────────────────

export interface AgentReport {
  agentId: string;
  agentName: string;
  health: HealthScore;
  responsesDelivered: number;
  tombstones: number;
  avgLatencyMs: number;
  tokensUsed: TokenUsage;
}

export interface NexusReport {
  id: string;
  timestamp: number;
  type: 'debate' | 'review' | 'team_run';
  topic: string;
  summary: {
    totalAgents: number;
    activeAgents: number;
    failedAgents: number;
    totalRounds: number;
    totalLatencyMs: number;
    totalCost: number;
    tokens: TokenUsage;
  };
  agentReports: AgentReport[];
  healingSummary: HealingSummary;
  transcript: TranscriptEntry[];
}

// ── Config for report generation ─────────────────

export interface ReportConfig {
  type: 'debate' | 'review' | 'team_run';
  topic: string;
  model?: string;
}

// ── ReportGenerator ──────────────────────────────

export class ReportGenerator {
  private readonly report: NexusReport;
  private readonly costCalculator: CostCalculator;
  private readonly model: string;

  constructor(teamResult: TeamRunResult, config: ReportConfig) {
    this.costCalculator = new CostCalculator();
    this.model = config.model ?? DEFAULT_MODEL;
    this.report = this.buildReport(teamResult, config);
  }

  // ── Factory ──────────────────────────────────────

  static generateReport(
    teamResult: TeamRunResult,
    config: ReportConfig,
  ): ReportGenerator {
    return new ReportGenerator(teamResult, config);
  }

  // ── Private builders ─────────────────────────────

  private buildReport(
    teamResult: TeamRunResult,
    config: ReportConfig,
  ): NexusReport {
    const agentReports = this.buildAgentReports(teamResult);
    const totalRounds = this.computeTotalRounds(teamResult.transcript);

    const totalAgents = agentReports.length;
    const failedAgents = agentReports.filter(
      (a) => a.health.state === 'FAILED',
    ).length;
    const activeAgents = totalAgents - failedAgents;

    return {
      id: randomUUID(),
      timestamp: Date.now(),
      type: config.type,
      topic: config.topic,
      summary: {
        totalAgents,
        activeAgents,
        failedAgents,
        totalRounds,
        totalLatencyMs: teamResult.totalLatencyMs,
        totalCost: teamResult.totalCost,
        tokens: teamResult.totalTokens,
      },
      agentReports,
      healingSummary: teamResult.healingSummary,
      transcript: teamResult.transcript,
    };
  }

  private buildAgentReports(teamResult: TeamRunResult): AgentReport[] {
    // Group transcript entries by agentId
    const byAgent = new Map<string, TranscriptEntry[]>();
    for (const entry of teamResult.transcript) {
      const bucket = byAgent.get(entry.agentId) ?? [];
      bucket.push(entry);
      byAgent.set(entry.agentId, bucket);
    }

    const reports: AgentReport[] = [];

    for (const [agentId, entries] of byAgent) {
      const agentName = entries[0]?.agentName ?? agentId;
      const health =
        teamResult.healingSummary.agentHealths[agentId] ??
        this.defaultHealth();

      const tombstones = entries.filter((e) => e.tombstone != null).length;
      const responsesDelivered = entries.filter(
        (e) => e.tombstone == null,
      ).length;

      // Aggregate latency from metadata if present, else fall back to 0
      const latencies = entries
        .map((e) => {
          const meta = e.metadata;
          if (
            meta != null &&
            typeof meta['latencyMs'] === 'number'
          ) {
            return meta['latencyMs'] as number;
          }
          return 0;
        })
        .filter((ms) => ms > 0);

      const avgLatencyMs =
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0;

      // Aggregate token usage from metadata
      const tokensUsed = this.aggregateTokens(entries);

      reports.push({
        agentId,
        agentName,
        health,
        responsesDelivered,
        tombstones,
        avgLatencyMs,
        tokensUsed,
      });
    }

    return reports;
  }

  private aggregateTokens(entries: TranscriptEntry[]): TokenUsage {
    const zero: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };

    return entries.reduce((acc, e) => {
      const meta = e.metadata;
      if (meta == null) return acc;

      const extract = (key: string): number => {
        const v = meta[key];
        return typeof v === 'number' ? v : 0;
      };

      return {
        inputTokens: acc.inputTokens + extract('inputTokens'),
        outputTokens: acc.outputTokens + extract('outputTokens'),
        cacheReadTokens: acc.cacheReadTokens + extract('cacheReadTokens'),
        cacheWriteTokens: acc.cacheWriteTokens + extract('cacheWriteTokens'),
      };
    }, zero);
  }

  private computeTotalRounds(transcript: TranscriptEntry[]): number {
    if (transcript.length === 0) return 0;
    return Math.max(...transcript.map((e) => e.round));
  }

  private defaultHealth(): HealthScore {
    return {
      overall: 0,
      successRate: 0,
      avgLatencyMs: 0,
      qualityScore: 0,
      recoveryRate: 0,
      state: 'FAILED',
    };
  }

  // ── Public serialisation API ─────────────────────

  /** Return the raw NexusReport object. */
  getReport(): NexusReport {
    return this.report;
  }

  /** Serialise to a JSON string. */
  toJSON(): string {
    return JSON.stringify(this.report, null, 2);
  }

  /** Render a human-readable Markdown report suitable for clients. */
  toMarkdown(): string {
    const r = this.report;
    const calc = this.costCalculator;
    const lines: string[] = [];

    const ts = new Date(r.timestamp).toISOString();
    const costStr = calc.formatCost(r.summary.totalCost);

    lines.push(`# Nexus Report — ${r.topic}`);
    lines.push('');
    lines.push(`**ID:** \`${r.id}\``);
    lines.push(`**Generated:** ${ts}`);
    lines.push(`**Type:** ${r.type}`);
    lines.push('');

    // ── Executive summary ──
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Agents | ${r.summary.totalAgents} |`);
    lines.push(`| Active Agents | ${r.summary.activeAgents} |`);
    lines.push(`| Failed Agents | ${r.summary.failedAgents} |`);
    lines.push(`| Total Rounds | ${r.summary.totalRounds} |`);
    lines.push(
      `| Total Latency | ${(r.summary.totalLatencyMs / 1000).toFixed(2)}s |`,
    );
    lines.push(`| Total Cost | ${costStr} |`);
    lines.push(
      `| Input Tokens | ${r.summary.tokens.inputTokens.toLocaleString()} |`,
    );
    lines.push(
      `| Output Tokens | ${r.summary.tokens.outputTokens.toLocaleString()} |`,
    );
    lines.push(
      `| Cache Read Tokens | ${r.summary.tokens.cacheReadTokens.toLocaleString()} |`,
    );
    lines.push(
      `| Cache Write Tokens | ${r.summary.tokens.cacheWriteTokens.toLocaleString()} |`,
    );
    lines.push('');

    // ── Cache savings ──
    const savings = calc.calculateSavingsFromCaching(
      r.summary.tokens,
      this.model,
    );
    if (savings.saved > 0) {
      lines.push('## Cache Savings');
      lines.push('');
      lines.push(
        `Prompt caching saved **${calc.formatCost(savings.saved)}** ` +
          `(${savings.percentSaved.toFixed(1)}% of full cost).`,
      );
      lines.push('');
    }

    // ── Agent breakdown ──
    lines.push('## Agent Reports');
    lines.push('');
    for (const ar of r.agentReports) {
      const stateEmoji: Record<string, string> = {
        HEALTHY: 'OK',
        DEGRADED: 'WARN',
        RECOVERING: 'RCVR',
        FAILED: 'FAIL',
      };
      const badge = stateEmoji[ar.health.state] ?? ar.health.state;
      lines.push(`### ${ar.agentName} [${badge}]`);
      lines.push('');
      lines.push(
        `- **Health Score:** ${(ar.health.overall * 100).toFixed(1)}%`,
      );
      lines.push(`- **State:** ${ar.health.state}`);
      lines.push(`- **Responses Delivered:** ${ar.responsesDelivered}`);
      lines.push(`- **Tombstones:** ${ar.tombstones}`);
      lines.push(`- **Avg Latency:** ${ar.avgLatencyMs.toFixed(0)}ms`);
      lines.push('');
    }

    // ── Healing summary ──
    const h = r.healingSummary;
    lines.push('## Self-Healing Summary');
    lines.push('');
    lines.push(`| | |`);
    lines.push(`|--|--|`);
    lines.push(`| Total Calls | ${h.totalCalls} |`);
    lines.push(`| Successful | ${h.successfulCalls} |`);
    lines.push(`| Failed | ${h.failedCalls} |`);
    lines.push(`| Recovery Calls | ${h.recoveryCalls} |`);
    lines.push(`| Tombstones | ${h.tombstones.length} |`);
    lines.push('');

    if (h.tombstones.length > 0) {
      lines.push('### Tombstones');
      lines.push('');
      for (const t of h.tombstones) {
        lines.push(
          `- **${t.agentId}** — \`${t.reason}\` ` +
            `(retries exhausted: ${t.retriesExhausted})`,
        );
      }
      lines.push('');
    }

    // ── Transcript excerpt ──
    lines.push('## Transcript');
    lines.push('');
    for (const entry of r.transcript) {
      const ts2 = new Date(entry.timestamp).toISOString();
      const label = entry.tombstone
        ? `~~${entry.agentName}~~ [TOMBSTONE]`
        : entry.agentName;
      lines.push(`**[Round ${entry.round}] ${label}** _(${ts2})_`);
      lines.push('');
      lines.push(entry.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Render a CSV export of per-agent metrics. */
  toCsv(): string {
    const headers = [
      'agentId',
      'agentName',
      'healthState',
      'healthScore',
      'successRate',
      'avgLatencyMs',
      'responsesDelivered',
      'tombstones',
      'inputTokens',
      'outputTokens',
      'cacheReadTokens',
      'cacheWriteTokens',
    ];

    const escape = (value: string | number): string => {
      const s = String(value);
      // Wrap in quotes if the value contains comma, quote, or newline
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: string[] = [headers.join(',')];

    for (const ar of this.report.agentReports) {
      const row = [
        ar.agentId,
        ar.agentName,
        ar.health.state,
        ar.health.overall.toFixed(4),
        ar.health.successRate.toFixed(4),
        ar.avgLatencyMs.toFixed(2),
        ar.responsesDelivered,
        ar.tombstones,
        ar.tokensUsed.inputTokens,
        ar.tokensUsed.outputTokens,
        ar.tokensUsed.cacheReadTokens,
        ar.tokensUsed.cacheWriteTokens,
      ].map(escape);

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Save the report as JSON to `dir`.
   * Returns the absolute path of the written file.
   */
  async saveToFile(dir: string): Promise<string> {
    await fs.mkdir(dir, { recursive: true });
    const filename = `nexus-report-${this.report.id}.json`;
    const filePath = join(dir, filename);
    await fs.writeFile(filePath, this.toJSON(), 'utf8');
    return filePath;
  }
}
