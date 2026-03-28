// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Exporter — Converts StoredRun to JSON / Markdown / HTML
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { AgentConfig, HealthScore, TranscriptEntry } from '../types.js';
import { StoredRun } from './store.js';

// ── Client Report Context ─────────────────────────

export interface ClientReportContext {
  clientName: string;
  projectName: string;
  preparedBy: string;
  companyName?: string;
  logoUrl?: string;
  monthlyRetainer?: number;
  hoursReduced?: number;
  incidentsPrevented?: number;
}

// ── Internal helpers ──────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1_000);
  return `${mins}m ${secs}s`;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function groupByRound(entries: TranscriptEntry[]): Map<number, TranscriptEntry[]> {
  const map = new Map<number, TranscriptEntry[]>();
  for (const entry of entries) {
    const bucket = map.get(entry.round) ?? [];
    bucket.push(entry);
    map.set(entry.round, bucket);
  }
  return map;
}

function healthStateLabel(score: HealthScore): string {
  return score.state;
}

function healthPercent(score: HealthScore): number {
  return Math.round(score.overall * 100);
}

// ── Exporter ──────────────────────────────────────

export class Exporter {
  // ── JSON ─────────────────────────────────────

  toJSON(run: StoredRun): string {
    return JSON.stringify(run, null, 2);
  }

  // ── Markdown ──────────────────────────────────

  toMarkdown(run: StoredRun): string {
    const lines: string[] = [];
    const date = formatDate(run.timestamp);

    // ── Header
    lines.push(`# Nexus Debate Report`);
    lines.push('');
    lines.push(`**Topic:** ${run.topic}`);
    lines.push(`**Date:** ${date}`);
    lines.push(`**Type:** ${run.type}`);
    lines.push(`**Duration:** ${formatDuration(run.durationMs)}`);
    lines.push(`**Total Cost:** ${formatCost(run.cost)}`);
    lines.push('');

    // ── Participants
    lines.push('## Participants');
    lines.push('');
    for (const agent of run.config.agents) {
      const icon = agent.icon ?? '🤖';
      const model = agent.model ?? 'default';
      lines.push(`- ${icon} **${agent.name}** (\`${agent.id}\`) — model: \`${model}\``);
    }
    lines.push('');

    // ── Rounds
    const rounds = groupByRound(run.transcript);
    const sortedRoundNumbers = [...rounds.keys()].sort((a, b) => a - b);

    lines.push('## Transcript');
    lines.push('');

    for (const roundNum of sortedRoundNumbers) {
      lines.push(`### Round ${roundNum}`);
      lines.push('');

      const entries = rounds.get(roundNum) ?? [];
      for (const entry of entries) {
        const ts = new Date(entry.timestamp).toISOString();
        const tombstoneTag = entry.tombstone ? ' *(tombstoned)*' : '';
        lines.push(`#### ${entry.agentName}${tombstoneTag}`);
        lines.push(`*${ts}*`);
        lines.push('');
        lines.push(entry.content);
        lines.push('');
      }
    }

    // ── Health summary
    lines.push('## Health Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Calls | ${run.healingSummary.totalCalls} |`);
    lines.push(`| Successful | ${run.healingSummary.successfulCalls} |`);
    lines.push(`| Failed | ${run.healingSummary.failedCalls} |`);
    lines.push(`| Recovery Calls | ${run.healingSummary.recoveryCalls} |`);
    lines.push(`| Tombstones | ${run.healingSummary.tombstones.length} |`);
    lines.push('');

    const agentIds = Object.keys(run.healingSummary.agentHealths);
    if (agentIds.length > 0) {
      lines.push('### Agent Health Scores');
      lines.push('');
      lines.push('| Agent | State | Overall | Success Rate | Avg Latency |');
      lines.push('|-------|-------|---------|--------------|-------------|');

      for (const agentId of agentIds) {
        const h = run.healingSummary.agentHealths[agentId];
        if (h === undefined) continue;
        const agent = run.config.agents.find((a) => a.id === agentId);
        const name = agent?.name ?? agentId;
        lines.push(
          `| ${name} | ${h.state} | ${healthPercent(h)}% | ${Math.round(h.successRate * 100)}% | ${Math.round(h.avgLatencyMs)}ms |`,
        );
      }
      lines.push('');
    }

    if (run.healingSummary.tombstones.length > 0) {
      lines.push('### Tombstones');
      lines.push('');
      for (const t of run.healingSummary.tombstones) {
        const agent = run.config.agents.find((a) => a.id === t.agentId);
        const name = agent?.name ?? t.agentId;
        lines.push(`- **${name}** — \`${t.reason}\` (step: \`${t.stepId}\`)`);
      }
      lines.push('');
    }

    // ── Token / cost breakdown
    lines.push('## Token Usage');
    lines.push('');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    lines.push(`| Input Tokens | ${run.tokens.inputTokens.toLocaleString()} |`);
    lines.push(`| Output Tokens | ${run.tokens.outputTokens.toLocaleString()} |`);
    lines.push(`| Cache Read Tokens | ${run.tokens.cacheReadTokens.toLocaleString()} |`);
    lines.push(`| Cache Write Tokens | ${run.tokens.cacheWriteTokens.toLocaleString()} |`);
    lines.push(`| **Total Cost** | **${formatCost(run.cost)}** |`);
    lines.push('');

    lines.push('---');
    lines.push('*Generated by Nexus — Self-Healing Multi-Agent Orchestration Framework*');

    return lines.join('\n');
  }

  // ── HTML ──────────────────────────────────────

  toHTML(run: StoredRun): string {
    const date = formatDate(run.timestamp);
    const rounds = groupByRound(run.transcript);
    const sortedRoundNumbers = [...rounds.keys()].sort((a, b) => a - b);

    // Build a stable colour map for agents
    const AGENT_COLORS = [
      '#4f9cf9', // blue
      '#f97316', // orange
      '#22c55e', // green
      '#a78bfa', // purple
      '#f43f5e', // rose
      '#06b6d4', // cyan
      '#eab308', // yellow
      '#ec4899', // pink
    ];

    const agentColorMap = new Map<string, string>();
    run.config.agents.forEach((agent, i) => {
      agentColorMap.set(agent.id, AGENT_COLORS[i % AGENT_COLORS.length] ?? '#4f9cf9');
    });

    // ── Participant cards
    const participantCards = run.config.agents
      .map((agent: AgentConfig) => {
        const color = agentColorMap.get(agent.id) ?? '#4f9cf9';
        const icon = agent.icon ?? '🤖';
        const model = agent.model ?? 'default';
        return `
      <div class="participant-card" style="border-left: 4px solid ${color};">
        <span class="agent-icon">${escapeHtml(icon)}</span>
        <div class="agent-info">
          <strong>${escapeHtml(agent.name)}</strong>
          <span class="agent-model">${escapeHtml(model)}</span>
        </div>
      </div>`;
      })
      .join('\n');

    // ── Transcript rounds
    const roundsHtml = sortedRoundNumbers
      .map((roundNum) => {
        const entries = rounds.get(roundNum) ?? [];
        const entriesHtml = entries
          .map((entry) => {
            const color = agentColorMap.get(entry.agentId) ?? '#4f9cf9';
            const ts = new Date(entry.timestamp).toISOString();
            const tombstoneBadge = entry.tombstone
              ? `<span class="badge badge-tombstone">TOMBSTONED: ${escapeHtml(entry.tombstone.reason)}</span>`
              : '';
            return `
          <div class="message" style="border-left: 4px solid ${color};">
            <div class="message-header">
              <span class="agent-name" style="color: ${color};">${escapeHtml(entry.agentName)}</span>
              ${tombstoneBadge}
              <span class="message-ts">${escapeHtml(ts)}</span>
            </div>
            <div class="message-body">${escapeHtml(entry.content)}</div>
          </div>`;
          })
          .join('\n');

        return `
      <div class="round">
        <div class="round-header">Round ${roundNum}</div>
        ${entriesHtml}
      </div>`;
      })
      .join('\n');

    // ── Agent health rows
    const agentHealthRows = Object.entries(run.healingSummary.agentHealths)
      .map(([agentId, h]) => {
        const agent = run.config.agents.find((a) => a.id === agentId);
        const name = agent?.name ?? agentId;
        const color = agentColorMap.get(agentId) ?? '#4f9cf9';
        const pct = healthPercent(h);
        const stateClass = h.state.toLowerCase();

        return `
        <div class="health-row">
          <div class="health-agent-name" style="color: ${color};">${escapeHtml(name)}</div>
          <div class="health-bar-wrap">
            <div class="health-bar" style="width: ${pct}%; background: ${color};"></div>
          </div>
          <div class="health-stats">
            <span class="health-state ${stateClass}">${escapeHtml(h.state)}</span>
            <span>${pct}% overall</span>
            <span>${Math.round(h.successRate * 100)}% success</span>
            <span>${Math.round(h.avgLatencyMs)}ms avg</span>
          </div>
        </div>`;
      })
      .join('\n');

    // ── Tombstone rows
    const tombstoneRows =
      run.healingSummary.tombstones.length === 0
        ? '<p class="muted">No tombstones recorded — all agents completed successfully.</p>'
        : run.healingSummary.tombstones
            .map((t) => {
              const agent = run.config.agents.find((a) => a.id === t.agentId);
              const name = agent?.name ?? t.agentId;
              return `
          <div class="tombstone-row">
            <span class="tombstone-agent">${escapeHtml(name)}</span>
            <span class="badge badge-tombstone">${escapeHtml(t.reason)}</span>
            <span class="tombstone-step">step: ${escapeHtml(t.stepId)}</span>
          </div>`;
            })
            .join('\n');

    const totalTokens =
      run.tokens.inputTokens +
      run.tokens.outputTokens +
      run.tokens.cacheReadTokens +
      run.tokens.cacheWriteTokens;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexus Report — ${escapeHtml(run.topic)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0d0f14;
      color: #d1d5db;
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    a { color: #4f9cf9; }

    .container {
      max-width: 860px;
      margin: 0 auto;
    }

    /* ── Header ──────────────────────────────── */
    .report-header {
      background: linear-gradient(135deg, #1a1d27 0%, #0d0f14 100%);
      border: 1px solid #2a2d3a;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .report-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f9fafb;
      margin-bottom: 0.5rem;
    }

    .report-topic {
      font-size: 1.1rem;
      color: #9ca3af;
      margin-bottom: 1.5rem;
    }

    .report-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .meta-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
    }

    .meta-value {
      font-size: 1rem;
      font-weight: 600;
      color: #e5e7eb;
    }

    .meta-value.cost { color: #22c55e; }

    /* ── Section ─────────────────────────────── */
    .section {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #2a2d3a;
    }

    /* ── Participants ─────────────────────────── */
    .participants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .participant-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #0d0f14;
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .agent-icon { font-size: 1.5rem; line-height: 1; }

    .agent-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .agent-info strong { color: #f9fafb; font-size: 0.9rem; }

    .agent-model {
      font-size: 0.75rem;
      color: #6b7280;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }

    /* ── Rounds / Messages ───────────────────── */
    .round {
      margin-bottom: 1.5rem;
    }

    .round-header {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .round-header::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #2a2d3a;
    }

    .message {
      background: #0d0f14;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
    }

    .message-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .agent-name {
      font-weight: 700;
      font-size: 0.9rem;
    }

    .message-ts {
      font-size: 0.72rem;
      color: #4b5563;
      font-family: 'SFMono-Regular', Consolas, monospace;
      margin-left: auto;
    }

    .message-body {
      font-size: 0.9rem;
      color: #d1d5db;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ── Badges ──────────────────────────────── */
    .badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }

    .badge-tombstone {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }

    /* ── Health bars ─────────────────────────── */
    .health-row {
      margin-bottom: 1rem;
    }

    .health-agent-name {
      font-weight: 600;
      font-size: 0.88rem;
      margin-bottom: 0.35rem;
    }

    .health-bar-wrap {
      background: #0d0f14;
      border-radius: 999px;
      height: 8px;
      margin-bottom: 0.4rem;
      overflow: hidden;
    }

    .health-bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .health-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.78rem;
      color: #6b7280;
    }

    .health-state {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.72rem;
    }

    .health-state.healthy  { color: #22c55e; }
    .health-state.degraded { color: #eab308; }
    .health-state.recovering { color: #f97316; }
    .health-state.failed   { color: #f43f5e; }

    /* ── Tombstones ──────────────────────────── */
    .tombstone-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid #2a2d3a;
      font-size: 0.88rem;
    }

    .tombstone-row:last-child { border-bottom: none; }

    .tombstone-agent { font-weight: 600; color: #e5e7eb; }

    .tombstone-step {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 0.78rem;
      color: #6b7280;
      margin-left: auto;
    }

    /* ── Token / cost table ──────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .stat-card {
      background: #0d0f14;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .stat-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
    }

    .stat-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f9fafb;
    }

    .stat-value.green { color: #22c55e; }

    /* ── Misc ─────────────────────────────────── */
    .muted { color: #4b5563; font-size: 0.88rem; }

    .footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.78rem;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- ── Header ───────────────────────────────── -->
    <div class="report-header">
      <div class="report-title">Nexus Debate Report</div>
      <div class="report-topic">${escapeHtml(run.topic)}</div>
      <div class="report-meta">
        <div class="meta-item">
          <span class="meta-label">Date</span>
          <span class="meta-value">${escapeHtml(date)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Type</span>
          <span class="meta-value">${escapeHtml(run.type)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Duration</span>
          <span class="meta-value">${escapeHtml(formatDuration(run.durationMs))}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Agents</span>
          <span class="meta-value">${run.config.agents.length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Total Cost</span>
          <span class="meta-value cost">${escapeHtml(formatCost(run.cost))}</span>
        </div>
      </div>
    </div>

    <!-- ── Participants ──────────────────────────── -->
    <div class="section">
      <div class="section-title">Participants</div>
      <div class="participants-grid">
        ${participantCards}
      </div>
    </div>

    <!-- ── Transcript ────────────────────────────── -->
    <div class="section">
      <div class="section-title">Transcript</div>
      ${roundsHtml}
    </div>

    <!-- ── Health Summary ────────────────────────── -->
    <div class="section">
      <div class="section-title">Health Summary</div>
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <span class="stat-label">Total Calls</span>
          <span class="stat-value">${run.healingSummary.totalCalls}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Successful</span>
          <span class="stat-value green">${run.healingSummary.successfulCalls}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Failed</span>
          <span class="stat-value" style="color: ${run.healingSummary.failedCalls > 0 ? '#f43f5e' : '#22c55e'};">${run.healingSummary.failedCalls}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Recovery Calls</span>
          <span class="stat-value">${run.healingSummary.recoveryCalls}</span>
        </div>
      </div>
      ${agentHealthRows || '<p class="muted">No per-agent health data available.</p>'}
    </div>

    <!-- ── Tombstones ────────────────────────────── -->
    <div class="section">
      <div class="section-title">Tombstones</div>
      ${tombstoneRows}
    </div>

    <!-- ── Token Usage & Cost ────────────────────── -->
    <div class="section">
      <div class="section-title">Token Usage &amp; Cost</div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Input Tokens</span>
          <span class="stat-value">${run.tokens.inputTokens.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Output Tokens</span>
          <span class="stat-value">${run.tokens.outputTokens.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Cache Read</span>
          <span class="stat-value">${run.tokens.cacheReadTokens.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Cache Write</span>
          <span class="stat-value">${run.tokens.cacheWriteTokens.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Tokens</span>
          <span class="stat-value">${totalTokens.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Cost</span>
          <span class="stat-value green">${escapeHtml(formatCost(run.cost))}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by <strong>Nexus</strong> — Self-Healing Multi-Agent Orchestration Framework
    </div>

  </div>
</body>
</html>`;
  }

  // ── Client Report ─────────────────────────────

  toClientReport(run: StoredRun, ctx?: ClientReportContext): string {
    const date = formatDate(run.timestamp);
    const generatedAt = formatDate(Date.now());
    const rounds = groupByRound(run.transcript);
    const sortedRoundNumbers = [...rounds.keys()].sort((a, b) => a - b);

    // ── Derived stats
    const { totalCalls, successfulCalls, failedCalls, recoveryCalls, tombstones, agentHealths } =
      run.healingSummary;
    const successRate =
      totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100;
    const successRateColor =
      successRate > 95 ? '#22c55e' : successRate > 80 ? '#eab308' : '#f43f5e';

    // Average latency across all agents
    const agentHealthEntries = Object.values(agentHealths);
    const avgLatencyMs =
      agentHealthEntries.length > 0
        ? Math.round(
            agentHealthEntries.reduce((sum, h) => sum + h.avgLatencyMs, 0) /
              agentHealthEntries.length,
          )
        : 0;

    // Recovery strategies tally from tombstone reasons + general recovery info
    const strategyTally = new Map<string, number>();
    for (const t of tombstones) {
      const key = t.reason ?? 'unknown';
      strategyTally.set(key, (strategyTally.get(key) ?? 0) + 1);
    }

    // Cache savings estimate: cache read tokens at ~$0.30/MTok vs input at ~$3/MTok
    const cacheSavingsRaw =
      (run.tokens.cacheReadTokens / 1_000_000) * (3.0 - 0.3);
    const cacheSavings = cacheSavingsRaw.toFixed(2);

    // ── Executive summary text
    const clientName = ctx?.clientName ?? 'Valued Client';
    const projectName = ctx?.projectName ?? run.topic;
    const preparedBy = ctx?.preparedBy ?? 'Nexus';
    const companyName = ctx?.companyName ?? 'Nexus';

    const summaryText =
      `${escapeHtml(projectName)} deployed ${run.config.agents.length} AI agent${run.config.agents.length !== 1 ? 's' : ''} ` +
      `using Nexus self-healing orchestration. ` +
      `Over this session, agents made ${totalCalls} API calls with a ${successRate}% success rate. ` +
      `Self-healing recovered ${recoveryCalls} failure${recoveryCalls !== 1 ? 's' : ''} automatically, ` +
      `preventing ${tombstones.length} potential service disruption${tombstones.length !== 1 ? 's' : ''}. ` +
      `Estimated cost savings from prompt caching: $${cacheSavings}.`;

    // ── Agent performance table rows
    const agentTableRows = run.config.agents
      .map((agent: AgentConfig) => {
        const h = agentHealths[agent.id];
        if (!h) return '';
        const pct = healthPercent(h);
        const stateClass = h.state.toLowerCase();
        const stateBg: Record<string, string> = {
          healthy: 'rgba(34,197,94,0.15)',
          degraded: 'rgba(234,179,8,0.15)',
          recovering: 'rgba(249,115,22,0.15)',
          failed: 'rgba(244,63,94,0.15)',
        };
        const stateColor: Record<string, string> = {
          healthy: '#22c55e',
          degraded: '#eab308',
          recovering: '#f97316',
          failed: '#f43f5e',
        };
        const bg = stateBg[stateClass] ?? 'rgba(79,156,249,0.15)';
        const color = stateColor[stateClass] ?? '#4f9cf9';

        // Count responses delivered by this agent
        const responsesDelivered = run.transcript.filter(
          (e) => e.agentId === agent.id && !e.tombstone,
        ).length;

        return `
            <tr>
              <td class="cr-td">
                <span style="font-size:1.1rem;margin-right:0.5rem;">${escapeHtml(agent.icon ?? '🤖')}</span>
                <strong style="color:#f9fafb;">${escapeHtml(agent.name)}</strong>
              </td>
              <td class="cr-td">
                <div class="cr-bar-wrap">
                  <div class="cr-bar" style="width:${pct}%;background:${color};"></div>
                </div>
                <span style="font-size:0.75rem;color:#9ca3af;">${pct}%</span>
              </td>
              <td class="cr-td" style="color:${color};font-weight:700;">${Math.round(h.successRate * 100)}%</td>
              <td class="cr-td" style="color:#9ca3af;">${Math.round(h.avgLatencyMs)}ms</td>
              <td class="cr-td" style="color:#f9fafb;font-weight:600;">${responsesDelivered}</td>
              <td class="cr-td">
                <span class="cr-badge" style="background:${bg};color:${color};border:1px solid ${color}40;">${escapeHtml(h.state)}</span>
              </td>
            </tr>`;
      })
      .join('\n');

    // ── Recovery strategy rows
    const recoveryStrategyRows =
      strategyTally.size === 0
        ? `<p class="cr-muted">No recovery strategies triggered — all agents ran cleanly.</p>`
        : [...strategyTally.entries()]
            .map(
              ([strategy, count]) => `
            <div class="cr-strategy-row">
              <span class="cr-strategy-name">${escapeHtml(strategy)}</span>
              <span class="cr-strategy-count">${count}×</span>
            </div>`,
            )
            .join('\n');

    // ── Tombstone detail rows
    const tombstoneDetailRows =
      tombstones.length === 0
        ? `<div class="cr-callout cr-callout-green">
            <span class="cr-callout-icon">✓</span>
            <span>Zero tombstones — every agent completed its mission successfully.</span>
          </div>`
        : tombstones
            .map((t) => {
              const agent = run.config.agents.find((a) => a.id === t.agentId);
              const name = agent?.name ?? t.agentId;
              return `
            <div class="cr-tombstone-row">
              <span class="cr-tombstone-agent">${escapeHtml(name)}</span>
              <span class="cr-badge cr-badge-tombstone">${escapeHtml(t.reason)}</span>
              <span class="cr-tombstone-step">step: ${escapeHtml(t.stepId)}</span>
            </div>`;
            })
            .join('\n');

    // ── Value delivered section
    let valueSection = '';
    if (ctx) {
      const retainer = ctx.monthlyRetainer ?? 0;
      const hours = ctx.hoursReduced ?? 0;
      const incidents = ctx.incidentsPrevented ?? 0;
      const hourValue = hours * 75;
      const incidentValue = incidents * 500;
      const totalValue = hourValue + incidentValue + cacheSavingsRaw;
      const roi =
        retainer > 0 ? Math.round(((totalValue - retainer) / retainer) * 100) : null;

      const retainerSection =
        retainer > 0
          ? `
          <div class="cr-retainer-header">Your <span class="cr-highlight">$${retainer.toLocaleString()}/month</span> retainer delivered:</div>
          <div class="cr-value-grid">
            <div class="cr-value-item">
              <div class="cr-value-num">${hours}</div>
              <div class="cr-value-label">Hours of manual monitoring eliminated</div>
            </div>
            <div class="cr-value-item">
              <div class="cr-value-num">${incidents}</div>
              <div class="cr-value-label">Incidents prevented by self-healing</div>
            </div>
            <div class="cr-value-item">
              <div class="cr-value-num">$${hourValue.toLocaleString()}</div>
              <div class="cr-value-label">Value from hours saved (${hours}h × $75/hr)</div>
            </div>
            <div class="cr-value-item">
              <div class="cr-value-num">$${incidentValue.toLocaleString()}</div>
              <div class="cr-value-label">Value from incidents prevented (${incidents} × $500)</div>
            </div>
          </div>
          ${
            roi !== null
              ? `<div class="cr-roi-row">
            <span>Return on Investment:</span>
            <span class="cr-roi-value" style="color:${roi >= 0 ? '#22c55e' : '#f43f5e'};">${roi >= 0 ? '+' : ''}${roi}%</span>
          </div>`
              : ''
          }`
          : '';

      valueSection = `
    <!-- ── Value Delivered ───────────────────────────── -->
    <div class="cr-section">
      <div class="cr-section-title">
        <span class="cr-section-icon">💰</span>
        Value Delivered
      </div>
      ${retainerSection}
      <div class="cr-cache-row">
        <span>Prompt caching savings this session:</span>
        <span class="cr-highlight">$${cacheSavings} saved</span>
      </div>
      <div class="cr-net-value">
        Net value delivered this period:
        <span class="cr-net-value-num">$${totalValue.toFixed(2)}</span>
      </div>
    </div>`;
    } else {
      // No context — show a simpler cache savings row
      valueSection = `
    <!-- ── Value Delivered ───────────────────────────── -->
    <div class="cr-section">
      <div class="cr-section-title">
        <span class="cr-section-icon">💰</span>
        Value Delivered
      </div>
      <div class="cr-cache-row">
        <span>Prompt caching savings this session:</span>
        <span class="cr-highlight">$${cacheSavings} saved</span>
      </div>
    </div>`;
    }

    // ── Transcript (collapsible)
    const transcriptHtml = sortedRoundNumbers
      .map((roundNum) => {
        const entries = rounds.get(roundNum) ?? [];
        const entriesHtml = entries
          .map((entry) => {
            const ts = new Date(entry.timestamp).toISOString();
            const tombstoneBadge = entry.tombstone
              ? `<span class="cr-badge cr-badge-tombstone" style="margin-left:0.5rem;">TOMBSTONED: ${escapeHtml(entry.tombstone.reason)}</span>`
              : '';
            return `
              <div class="cr-tx-message">
                <div class="cr-tx-header">
                  <span class="cr-tx-agent">${escapeHtml(entry.agentName)}</span>
                  ${tombstoneBadge}
                  <span class="cr-tx-ts">${escapeHtml(ts)}</span>
                </div>
                <div class="cr-tx-body">${escapeHtml(entry.content)}</div>
              </div>`;
          })
          .join('\n');
        return `
            <div class="cr-round">
              <div class="cr-round-label">Round ${roundNum}</div>
              ${entriesHtml}
            </div>`;
      })
      .join('\n');

    // ── Logo or wordmark
    const logoHtml = ctx?.logoUrl
      ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${escapeHtml(companyName)} logo" class="cr-logo" />`
      : `<div class="cr-wordmark">${escapeHtml(companyName)}</div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(projectName)} — AI Operations Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #07090f;
      color: #d1d5db;
      line-height: 1.6;
      padding: 2.5rem 1rem 4rem;
    }

    .cr-container {
      max-width: 920px;
      margin: 0 auto;
    }

    /* ── Top bar ───────────────────────────────── */
    .cr-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #1e2130;
    }

    .cr-logo {
      height: 40px;
      object-fit: contain;
    }

    .cr-wordmark {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #f9fafb;
      background: linear-gradient(90deg, #4f9cf9, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cr-topbar-right {
      text-align: right;
      font-size: 0.78rem;
      color: #4b5563;
      line-height: 1.5;
    }

    .cr-topbar-right strong {
      color: #9ca3af;
      display: block;
      font-size: 0.85rem;
    }

    /* ── Executive Summary ─────────────────────── */
    .cr-exec-box {
      background: linear-gradient(135deg, #0e1120 0%, #121624 100%);
      border: 1px solid #2a2d3a;
      border-left: 4px solid #4f9cf9;
      border-radius: 12px;
      padding: 2rem 2.25rem;
      margin-bottom: 2rem;
    }

    .cr-exec-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #4f9cf9;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .cr-exec-heading {
      font-size: 1.6rem;
      font-weight: 800;
      color: #f9fafb;
      margin-bottom: 0.25rem;
      letter-spacing: -0.01em;
    }

    .cr-exec-subheading {
      font-size: 0.95rem;
      color: #6b7280;
      margin-bottom: 1.25rem;
    }

    .cr-exec-divider {
      height: 1px;
      background: #1e2130;
      margin-bottom: 1.25rem;
    }

    .cr-exec-summary {
      font-size: 0.95rem;
      color: #9ca3af;
      line-height: 1.75;
    }

    .cr-exec-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #1e2130;
    }

    .cr-exec-meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .cr-exec-meta-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #4b5563;
    }

    .cr-exec-meta-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #e5e7eb;
    }

    /* ── Key Metrics cards ─────────────────────── */
    .cr-metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 700px) {
      .cr-metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .cr-metric-card {
      background: #0e1120;
      border: 1px solid #1e2130;
      border-radius: 12px;
      padding: 1.4rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      position: relative;
      overflow: hidden;
    }

    .cr-metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: var(--accent, #4f9cf9);
      border-radius: 12px 12px 0 0;
    }

    .cr-metric-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #4b5563;
      font-weight: 600;
    }

    .cr-metric-value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--accent, #4f9cf9);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .cr-metric-sub {
      font-size: 0.75rem;
      color: #4b5563;
    }

    /* ── Generic section ───────────────────────── */
    .cr-section {
      background: #0e1120;
      border: 1px solid #1e2130;
      border-radius: 12px;
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
    }

    .cr-section-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      margin-bottom: 1.5rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #1e2130;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cr-section-icon { font-size: 1rem; }

    /* ── Agent performance table ───────────────── */
    .cr-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .cr-th {
      text-align: left;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #4b5563;
      font-weight: 600;
      padding: 0 0.75rem 0.75rem;
      border-bottom: 1px solid #1e2130;
    }

    .cr-td {
      padding: 0.85rem 0.75rem;
      border-bottom: 1px solid #1a1d2a;
      vertical-align: middle;
    }

    tr:last-child .cr-td { border-bottom: none; }

    .cr-bar-wrap {
      background: #07090f;
      border-radius: 999px;
      height: 6px;
      width: 80px;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-right: 0.5rem;
    }

    .cr-bar {
      height: 100%;
      border-radius: 999px;
    }

    /* ── Badges ────────────────────────────────── */
    .cr-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .cr-badge-tombstone {
      background: rgba(244,63,94,0.12);
      color: #f43f5e;
      border: 1px solid rgba(244,63,94,0.25);
    }

    /* ── Self-healing section ──────────────────── */
    .cr-healing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    @media (max-width: 600px) {
      .cr-healing-grid { grid-template-columns: 1fr; }
    }

    .cr-healing-stat {
      background: #07090f;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .cr-healing-num {
      font-size: 1.75rem;
      font-weight: 800;
      color: #4f9cf9;
      letter-spacing: -0.02em;
    }

    .cr-healing-desc {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .cr-strategy-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0;
      border-bottom: 1px solid #1a1d2a;
      font-size: 0.875rem;
    }

    .cr-strategy-row:last-child { border-bottom: none; }

    .cr-strategy-name { color: #d1d5db; }

    .cr-strategy-count {
      font-weight: 700;
      color: #f97316;
      font-size: 0.95rem;
    }

    .cr-tombstone-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0;
      border-bottom: 1px solid #1a1d2a;
      font-size: 0.875rem;
    }

    .cr-tombstone-row:last-child { border-bottom: none; }

    .cr-tombstone-agent {
      font-weight: 600;
      color: #e5e7eb;
      min-width: 120px;
    }

    .cr-tombstone-step {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 0.75rem;
      color: #4b5563;
      margin-left: auto;
    }

    .cr-disruption-callout {
      margin-top: 1.25rem;
      padding: 1rem 1.25rem;
      background: rgba(249,115,22,0.07);
      border: 1px solid rgba(249,115,22,0.2);
      border-radius: 8px;
      font-size: 0.875rem;
      color: #f97316;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .cr-callout {
      padding: 1rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .cr-callout-green {
      background: rgba(34,197,94,0.07);
      border: 1px solid rgba(34,197,94,0.2);
      color: #22c55e;
    }

    .cr-callout-icon { font-size: 1.1rem; }

    /* ── Value Delivered section ───────────────── */
    .cr-retainer-header {
      font-size: 1rem;
      color: #9ca3af;
      margin-bottom: 1.25rem;
    }

    .cr-highlight {
      color: #22c55e;
      font-weight: 700;
    }

    .cr-value-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    @media (max-width: 600px) {
      .cr-value-grid { grid-template-columns: 1fr; }
    }

    .cr-value-item {
      background: #07090f;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }

    .cr-value-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #22c55e;
      letter-spacing: -0.02em;
      margin-bottom: 0.2rem;
    }

    .cr-value-label {
      font-size: 0.78rem;
      color: #6b7280;
    }

    .cr-roi-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #07090f;
      border-radius: 8px;
      padding: 0.85rem 1.25rem;
      font-size: 0.9rem;
      color: #9ca3af;
      margin-bottom: 1rem;
    }

    .cr-roi-value {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .cr-cache-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-top: 1px solid #1e2130;
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .cr-net-value {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(34,197,94,0.06);
      border: 1px solid rgba(34,197,94,0.18);
      border-radius: 8px;
      font-size: 0.9rem;
      color: #9ca3af;
      font-weight: 600;
    }

    .cr-net-value-num {
      font-size: 1.75rem;
      font-weight: 800;
      color: #22c55e;
      letter-spacing: -0.02em;
    }

    /* ── Collapsible transcript ────────────────── */
    .cr-transcript-summary {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      list-style: none;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #1e2130;
      margin-bottom: 1.25rem;
      user-select: none;
    }

    .cr-transcript-summary::-webkit-details-marker { display: none; }

    details[open] .cr-transcript-chevron { transform: rotate(180deg); }

    .cr-transcript-chevron {
      transition: transform 0.2s ease;
      color: #4b5563;
      font-size: 0.9rem;
    }

    .cr-round {
      margin-bottom: 1.25rem;
    }

    .cr-round-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #4b5563;
      margin-bottom: 0.6rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .cr-round-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #1a1d2a;
    }

    .cr-tx-message {
      background: #07090f;
      border-radius: 8px;
      padding: 0.85rem 1rem;
      margin-bottom: 0.6rem;
      border-left: 3px solid #1e2130;
    }

    .cr-tx-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }

    .cr-tx-agent {
      font-weight: 700;
      font-size: 0.85rem;
      color: #9ca3af;
    }

    .cr-tx-ts {
      font-size: 0.68rem;
      color: #374151;
      font-family: 'SFMono-Regular', Consolas, monospace;
      margin-left: auto;
    }

    .cr-tx-body {
      font-size: 0.85rem;
      color: #9ca3af;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ── Misc ──────────────────────────────────── */
    .cr-muted { color: #4b5563; font-size: 0.85rem; }

    .cr-footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #1e2130;
    }

    .cr-footer-brand {
      font-size: 0.78rem;
      color: #374151;
      margin-bottom: 0.35rem;
    }

    .cr-footer-brand strong {
      background: linear-gradient(90deg, #4f9cf9, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .cr-footer-ts {
      font-size: 0.7rem;
      color: #1f2937;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }
  </style>
</head>
<body>
  <div class="cr-container">

    <!-- ── Top bar ───────────────────────────────── -->
    <div class="cr-topbar">
      ${logoHtml}
      <div class="cr-topbar-right">
        <strong>AI Operations Report</strong>
        Prepared by ${escapeHtml(preparedBy)} &nbsp;·&nbsp; ${escapeHtml(date)}
      </div>
    </div>

    <!-- ── Executive Summary ────────────────────── -->
    <div class="cr-exec-box">
      <div class="cr-exec-label">Executive Summary</div>
      <div class="cr-exec-heading">Prepared for ${escapeHtml(clientName)}</div>
      <div class="cr-exec-subheading">${escapeHtml(projectName)}</div>
      <div class="cr-exec-divider"></div>
      <div class="cr-exec-summary">${summaryText}</div>
      <div class="cr-exec-meta">
        <div class="cr-exec-meta-item">
          <span class="cr-exec-meta-label">Report Date</span>
          <span class="cr-exec-meta-value">${escapeHtml(date)}</span>
        </div>
        <div class="cr-exec-meta-item">
          <span class="cr-exec-meta-label">Project</span>
          <span class="cr-exec-meta-value">${escapeHtml(projectName)}</span>
        </div>
        <div class="cr-exec-meta-item">
          <span class="cr-exec-meta-label">Duration</span>
          <span class="cr-exec-meta-value">${escapeHtml(formatDuration(run.durationMs))}</span>
        </div>
        <div class="cr-exec-meta-item">
          <span class="cr-exec-meta-label">Agents Deployed</span>
          <span class="cr-exec-meta-value">${run.config.agents.length}</span>
        </div>
        <div class="cr-exec-meta-item">
          <span class="cr-exec-meta-label">Session Cost</span>
          <span class="cr-exec-meta-value" style="color:#22c55e;">${escapeHtml(formatCost(run.cost))}</span>
        </div>
      </div>
    </div>

    <!-- ── Key Metrics ───────────────────────────── -->
    <div class="cr-metrics-grid">
      <div class="cr-metric-card" style="--accent:${successRateColor};">
        <div class="cr-metric-label">Success Rate</div>
        <div class="cr-metric-value">${successRate}%</div>
        <div class="cr-metric-sub">${successfulCalls} of ${totalCalls} calls</div>
      </div>
      <div class="cr-metric-card" style="--accent:#4f9cf9;">
        <div class="cr-metric-label">Avg Response Time</div>
        <div class="cr-metric-value">${avgLatencyMs > 999 ? (avgLatencyMs / 1000).toFixed(1) + 's' : avgLatencyMs + 'ms'}</div>
        <div class="cr-metric-sub">across all agents</div>
      </div>
      <div class="cr-metric-card" style="--accent:#f97316;">
        <div class="cr-metric-label">Self-Healing Recoveries</div>
        <div class="cr-metric-value">${recoveryCalls}</div>
        <div class="cr-metric-sub">auto-recovered failures</div>
      </div>
      <div class="cr-metric-card" style="--accent:#22c55e;">
        <div class="cr-metric-label">Cost This Session</div>
        <div class="cr-metric-value">${escapeHtml(formatCost(run.cost))}</div>
        <div class="cr-metric-sub">incl. cache savings</div>
      </div>
    </div>

    <!-- ── Agent Performance ─────────────────────── -->
    <div class="cr-section">
      <div class="cr-section-title">
        <span class="cr-section-icon">🤖</span>
        Agent Performance
      </div>
      <table class="cr-table">
        <thead>
          <tr>
            <th class="cr-th">Agent</th>
            <th class="cr-th">Health Score</th>
            <th class="cr-th">Success Rate</th>
            <th class="cr-th">Avg Latency</th>
            <th class="cr-th">Responses</th>
            <th class="cr-th">Status</th>
          </tr>
        </thead>
        <tbody>
          ${agentTableRows || `<tr><td class="cr-td cr-muted" colspan="6">No per-agent data available.</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- ── Self-Healing Stats ─────────────────────── -->
    <div class="cr-section">
      <div class="cr-section-title">
        <span class="cr-section-icon">🛡️</span>
        Self-Healing Performance
      </div>
      <div class="cr-healing-grid">
        <div class="cr-healing-stat">
          <div class="cr-healing-num">${recoveryCalls}</div>
          <div class="cr-healing-desc">Errors caught &amp; recovered</div>
        </div>
        <div class="cr-healing-stat">
          <div class="cr-healing-num">${totalCalls > 0 ? Math.round((recoveryCalls / totalCalls) * 100) : 0}%</div>
          <div class="cr-healing-desc">Auto-recovery rate</div>
        </div>
        <div class="cr-healing-stat">
          <div class="cr-healing-num">${failedCalls}</div>
          <div class="cr-healing-desc">Circuit breaker activations</div>
        </div>
        <div class="cr-healing-stat">
          <div class="cr-healing-num">${tombstones.length}</div>
          <div class="cr-healing-desc">Tombstones (terminal failures)</div>
        </div>
      </div>

      ${
        tombstones.length > 0
          ? `<div style="margin-bottom:1rem;">
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#4b5563;margin-bottom:0.6rem;">Tombstone Detail</div>
          ${tombstoneDetailRows}
        </div>`
          : tombstoneDetailRows
      }

      ${
        strategyTally.size > 0
          ? `<div style="margin-top:1.25rem;">
          <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;color:#4b5563;margin-bottom:0.6rem;">Recovery Strategies Fired</div>
          ${recoveryStrategyRows}
        </div>`
          : ''
      }

      ${
        recoveryCalls > 0 || tombstones.length > 0
          ? `<div class="cr-disruption-callout">
          <span>⚡</span>
          <span>Without Nexus self-healing, these <strong>${recoveryCalls + tombstones.length}</strong> failure${recoveryCalls + tombstones.length !== 1 ? 's' : ''} would have caused service disruption.</span>
        </div>`
          : `<div class="cr-callout cr-callout-green" style="margin-top:0.75rem;">
          <span class="cr-callout-icon">✓</span>
          <span>All systems ran without interruption this session.</span>
        </div>`
      }
    </div>

    ${valueSection}

    <!-- ── Transcript ────────────────────────────── -->
    <div class="cr-section">
      <details>
        <summary class="cr-transcript-summary">
          <span><span class="cr-section-icon">📋</span> &nbsp;Full Transcript (${run.transcript.length} entries)</span>
          <span class="cr-transcript-chevron">▾</span>
        </summary>
        ${transcriptHtml || '<p class="cr-muted">No transcript entries recorded.</p>'}
      </details>
    </div>

    <!-- ── Footer ────────────────────────────────── -->
    <div class="cr-footer">
      <div class="cr-footer-brand">
        Powered by <strong>Nexus</strong> — Self-Healing Multi-Agent Orchestration
      </div>
      <div class="cr-footer-ts">Report generated: ${escapeHtml(generatedAt)}</div>
    </div>

  </div>
</body>
</html>`;
  }
}

// ── HTML escape ───────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
