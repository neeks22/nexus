// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Code Review Team — Terminal Display
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type {
  TranscriptEntry,
  HealingSummary,
  TokenUsage,
  HealthState,
} from '../../../packages/nexus-core/src/types.js';

// ── Color resolver ────────────────────────────────

type ChalkColor =
  | 'cyan'
  | 'magenta'
  | 'red'
  | 'yellow'
  | 'white'
  | 'green'
  | 'blue'
  | 'gray';

function applyColor(text: string, color: string): string {
  const c = color as ChalkColor;
  switch (c) {
    case 'cyan':    return chalk.cyan(text);
    case 'magenta': return chalk.magenta(text);
    case 'red':     return chalk.red(text);
    case 'yellow':  return chalk.yellow(text);
    case 'white':   return chalk.white(text);
    case 'green':   return chalk.green(text);
    case 'blue':    return chalk.blue(text);
    case 'gray':    return chalk.gray(text);
    default:        return chalk.white(text);
  }
}

// ── Active spinners store ─────────────────────────

const activeSpinners = new Map<string, Ora>();

// ── Banner ────────────────────────────────────────

export function showBanner(): void {
  const width = 60;
  const title = 'NEXUS  CODE  REVIEW  TEAM';
  const subtitle = 'Security · Style · Logic · Synthesis';
  const pad = (s: string): string =>
    s.padStart(Math.floor((width + s.length) / 2)).padEnd(width);

  console.log();
  console.log(chalk.bold.hex('#6366f1')('╔' + '═'.repeat(width) + '╗'));
  console.log(chalk.bold.hex('#6366f1')('║') + ' '.repeat(width) + chalk.bold.hex('#6366f1')('║'));
  console.log(
    chalk.bold.hex('#6366f1')('║') +
      chalk.bold.white(pad(title)) +
      chalk.bold.hex('#6366f1')('║'),
  );
  console.log(
    chalk.bold.hex('#6366f1')('║') +
      chalk.dim(pad(subtitle)) +
      chalk.bold.hex('#6366f1')('║'),
  );
  console.log(chalk.bold.hex('#6366f1')('║') + ' '.repeat(width) + chalk.bold.hex('#6366f1')('║'));
  console.log(chalk.bold.hex('#6366f1')('╚' + '═'.repeat(width) + '╝'));
  console.log();
}

// ── Target display ────────────────────────────────

export function showTarget(target: string, isFile: boolean): void {
  const label = chalk.bold.hex('#6366f1')('  TARGET  ');
  const typeTag = chalk.dim(isFile ? '  [file]' : '  [inline code]');
  console.log(chalk.hex('#6366f1')('┌─') + label + chalk.hex('#6366f1')('─────────────────────────────────────────────┐'));
  console.log(chalk.hex('#6366f1')('│') + '  ' + chalk.bold.white(target) + typeTag + '  ' + chalk.hex('#6366f1')('│'));
  console.log(chalk.hex('#6366f1')('└─────────────────────────────────────────────────────────────┘'));
  console.log(chalk.dim('  3 reviewers in parallel · orchestrator synthesizes · self-healing enabled'));
  console.log();
}

// ── Phase header ──────────────────────────────────

export function showPhaseHeader(phase: 1 | 2): void {
  if (phase === 1) {
    const tag = '  ROUND 1 — PARALLEL REVIEW  ';
    const dashes = '━'.repeat(Math.max(0, Math.floor((54 - tag.length) / 2)));
    console.log();
    console.log(
      chalk.bold.hex('#f59e0b')(dashes) +
        chalk.bold.bgHex('#f59e0b').black(tag) +
        chalk.bold.hex('#f59e0b')(dashes),
    );
    console.log(chalk.dim('  Security Auditor, Style Reviewer, and Logic Auditor reviewing simultaneously…'));
  } else {
    const tag = '  ROUND 2 — ORCHESTRATION  ';
    const dashes = '━'.repeat(Math.max(0, Math.floor((54 - tag.length) / 2)));
    console.log();
    console.log(
      chalk.bold.hex('#10b981')(dashes) +
        chalk.bold.bgHex('#10b981').black(tag) +
        chalk.bold.hex('#10b981')(dashes),
    );
    console.log(chalk.dim('  Orchestrator synthesizing all reviewer feedback…'));
  }
  console.log();
}

// ── Agent thinking spinner ────────────────────────

export function showAgentThinking(agentName: string, icon: string, color: string): Ora {
  const label = applyColor(`${icon}  ${agentName} is reviewing…`, color);
  const spinner = ora({
    text: label,
    spinner: 'dots',
    color: 'white',
  }).start();
  activeSpinners.set(agentName, spinner);
  return spinner;
}

export function stopAgentThinking(agentName: string): void {
  const spinner = activeSpinners.get(agentName);
  if (spinner) {
    spinner.stop();
    spinner.clear();
    activeSpinners.delete(agentName);
  }
}

// ── Agent response card ───────────────────────────

export function showAgentResponse(
  entry: TranscriptEntry,
  color: string,
  icon: string,
): void {
  const nameBar = applyColor(`${icon}  ${entry.agentName.toUpperCase()}`, color);
  const latencyTag =
    entry.metadata?.latencyMs !== undefined
      ? chalk.dim(` · ${Number(entry.metadata.latencyMs).toFixed(0)}ms`)
      : '';
  const cachedTag =
    entry.metadata?.cached === true ? chalk.hex('#10b981')(' · ⚡ cached') : '';
  const tombstoneTag = entry.tombstone
    ? chalk.red(' · ☠ tombstoned')
    : '';

  const divider = applyColor('│', color);

  console.log(
    applyColor('┌──── ', color) +
      nameBar +
      latencyTag +
      cachedTag +
      tombstoneTag,
  );

  if (entry.tombstone) {
    const reason = entry.tombstone.reason.replace(/_/g, ' ');
    const msg = `  [Agent failed: ${reason}. Self-healing exhausted.]`;
    console.log(divider + chalk.red(msg));
  } else {
    // Word-wrap the content at ~72 chars, prefixed with the divider
    const words = entry.content.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if (current.length + word.length + 1 > 72) {
        lines.push(current.trimEnd());
        current = word + ' ';
      } else {
        current += word + ' ';
      }
    }
    if (current.trim().length > 0) {
      lines.push(current.trimEnd());
    }
    for (const line of lines) {
      console.log(divider + '  ' + chalk.white(line));
    }
  }

  console.log(applyColor('└' + '─'.repeat(72), color));
  console.log();
}

// ── Healing report ────────────────────────────────

function healthBar(score: number, width: number = 20): string {
  const filled = Math.round(score * width);
  const empty = width - filled;
  let color: string;
  if (score >= 0.85) color = '#10b981';
  else if (score >= 0.4) color = '#f59e0b';
  else if (score >= 0.15) color = '#f97316';
  else color = '#ef4444';

  const bar = chalk.hex(color)('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  return bar;
}

function healthStateLabel(state: HealthState): string {
  switch (state) {
    case 'HEALTHY':    return chalk.bold.hex('#10b981')('HEALTHY   ');
    case 'DEGRADED':   return chalk.bold.hex('#f59e0b')('DEGRADED  ');
    case 'RECOVERING': return chalk.bold.hex('#f97316')('RECOVERING');
    case 'FAILED':     return chalk.bold.hex('#ef4444')('FAILED    ');
    default:           return chalk.dim('UNKNOWN   ');
  }
}

export function showHealingReport(summary: HealingSummary): void {
  const width = 60;
  const successRate = summary.totalCalls > 0
    ? ((summary.successfulCalls / summary.totalCalls) * 100).toFixed(1)
    : '0.0';

  console.log();
  console.log(chalk.bold.hex('#6366f1')('╔' + '═'.repeat(width) + '╗'));
  console.log(
    chalk.bold.hex('#6366f1')('║') +
      chalk.bold.white('  SELF-HEALING REPORT'.padEnd(width)) +
      chalk.bold.hex('#6366f1')('║'),
  );
  console.log(chalk.bold.hex('#6366f1')('╠' + '═'.repeat(width) + '╣'));

  const statsLine = `  Calls: ${summary.totalCalls}  ✓ ${summary.successfulCalls}  ✗ ${summary.failedCalls}  ↺ ${summary.recoveryCalls}  Rate: ${successRate}%`;
  console.log(
    chalk.bold.hex('#6366f1')('║') +
      chalk.white(statsLine.padEnd(width)) +
      chalk.bold.hex('#6366f1')('║'),
  );

  if (summary.tombstones.length > 0) {
    console.log(
      chalk.bold.hex('#6366f1')('║') +
        chalk.red(`  ☠  ${summary.tombstones.length} tombstone(s) recorded`.padEnd(width)) +
        chalk.bold.hex('#6366f1')('║'),
    );
  }

  console.log(chalk.bold.hex('#6366f1')('╠' + '═'.repeat(width) + '╣'));
  console.log(
    chalk.bold.hex('#6366f1')('║') +
      chalk.bold.white('  AGENT HEALTH'.padEnd(width)) +
      chalk.bold.hex('#6366f1')('║'),
  );
  console.log(chalk.bold.hex('#6366f1')('╠' + '═'.repeat(width) + '╣'));

  for (const [agentId, health] of Object.entries(summary.agentHealths)) {
    const name = agentId.padEnd(14);
    const bar  = healthBar(health.overall, 18);
    const pct  = (health.overall * 100).toFixed(0).padStart(3) + '%';
    const state = healthStateLabel(health.state);
    const latency = health.avgLatencyMs > 0
      ? chalk.dim(` ${health.avgLatencyMs.toFixed(0)}ms avg`)
      : '';

    const line = `  ${chalk.bold.white(name)} ${bar} ${pct}  ${state}${latency}`;
    console.log(
      chalk.bold.hex('#6366f1')('║') +
        line.padEnd(width + 30) +
        chalk.bold.hex('#6366f1')('║'),
    );
  }

  console.log(chalk.bold.hex('#6366f1')('╚' + '═'.repeat(width) + '╝'));
  console.log();
}

// ── Review complete ───────────────────────────────

export function showReviewComplete(totalMs: number, totalTokens: TokenUsage): void {
  const secs = (totalMs / 1000).toFixed(1);
  const totalTok = totalTokens.inputTokens + totalTokens.outputTokens;
  const cacheHit = totalTokens.cacheReadTokens > 0
    ? ` · ${totalTokens.cacheReadTokens.toLocaleString()} cache-read tokens`
    : '';

  console.log(chalk.bold.hex('#10b981')('✓ Code review complete'));
  console.log(
    chalk.dim(`  Duration: ${secs}s  ·  Tokens: ${totalTok.toLocaleString()}${cacheHit}`),
  );
  if (totalTokens.cacheWriteTokens > 0) {
    console.log(
      chalk.dim(`  Cache written: ${totalTokens.cacheWriteTokens.toLocaleString()} tokens`),
    );
  }
  console.log();
}
