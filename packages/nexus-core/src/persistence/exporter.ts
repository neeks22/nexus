// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Exporter — Converts StoredRun to JSON / Markdown / HTML
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { AgentConfig, HealthScore, TranscriptEntry } from '../types.js';
import { StoredRun } from './store.js';

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
