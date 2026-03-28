// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  nexus-cli — `nexus health` command
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { HealthScore, HealthState } from '../../../nexus-core/src/types.js';

// ── Mock health data ──────────────────────────────
// In a future version this will read from saved agent state (e.g. ~/.nexus/state.json).

interface AgentHealthEntry {
  id: string;
  name: string;
  icon: string;
  health: HealthScore;
}

const MOCK_HEALTH_DATA: AgentHealthEntry[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    health: {
      overall: 0.94,
      successRate: 0.97,
      avgLatencyMs: 1240,
      qualityScore: 0.91,
      recoveryRate: 1.0,
      state: 'HEALTHY',
    },
  },
  {
    id: 'philosopher',
    name: 'Philosopher',
    icon: '🏛️',
    health: {
      overall: 0.88,
      successRate: 0.92,
      avgLatencyMs: 1530,
      qualityScore: 0.87,
      recoveryRate: 0.95,
      state: 'HEALTHY',
    },
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    icon: '🔥',
    health: {
      overall: 0.61,
      successRate: 0.78,
      avgLatencyMs: 2100,
      qualityScore: 0.55,
      recoveryRate: 0.7,
      state: 'DEGRADED',
    },
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    icon: '🛠️',
    health: {
      overall: 0.82,
      successRate: 0.89,
      avgLatencyMs: 980,
      qualityScore: 0.79,
      recoveryRate: 0.88,
      state: 'HEALTHY',
    },
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    icon: '🧬',
    health: {
      overall: 0.31,
      successRate: 0.55,
      avgLatencyMs: 3200,
      qualityScore: 0.28,
      recoveryRate: 0.4,
      state: 'RECOVERING',
    },
  },
];

// ── Formatters ────────────────────────────────────

function stateLabel(state: HealthState): string {
  switch (state) {
    case 'HEALTHY':    return chalk.bold.hex('#10b981')('● HEALTHY');
    case 'DEGRADED':   return chalk.bold.hex('#f59e0b')('● DEGRADED');
    case 'RECOVERING': return chalk.bold.hex('#f97316')('● RECOVERING');
    case 'FAILED':     return chalk.bold.hex('#ef4444')('● FAILED');
    default:           return chalk.dim('● UNKNOWN');
  }
}

function scoreBar(score: number, width: number = 12): string {
  const filled = Math.round(score * width);
  const empty = width - filled;
  let color: string;
  if (score >= 0.85) color = '#10b981';
  else if (score >= 0.4) color = '#f59e0b';
  else if (score >= 0.15) color = '#f97316';
  else color = '#ef4444';

  return chalk.hex(color)('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

function pct(n: number): string {
  return (n * 100).toFixed(0) + '%';
}

function latency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms.toFixed(0) + 'ms';
}

// ── Summary footer ────────────────────────────────

function printSummary(entries: AgentHealthEntry[]): void {
  const healthy    = entries.filter((e) => e.health.state === 'HEALTHY').length;
  const degraded   = entries.filter((e) => e.health.state === 'DEGRADED').length;
  const recovering = entries.filter((e) => e.health.state === 'RECOVERING').length;
  const failed     = entries.filter((e) => e.health.state === 'FAILED').length;

  const avgOverall = entries.reduce((sum, e) => sum + e.health.overall, 0) / entries.length;

  console.log();
  console.log(chalk.dim('  ─────────────────────────────────────────────'));
  console.log(
    chalk.dim('  Fleet: ') +
    chalk.bold.hex('#10b981')(`${healthy} healthy`) + chalk.dim('  ') +
    chalk.bold.hex('#f59e0b')(`${degraded} degraded`) + chalk.dim('  ') +
    chalk.bold.hex('#f97316')(`${recovering} recovering`) + chalk.dim('  ') +
    chalk.bold.hex('#ef4444')(`${failed} failed`),
  );
  console.log(
    chalk.dim(`  Fleet avg health: `) +
    scoreBar(avgOverall, 16) +
    chalk.dim(` ${pct(avgOverall)}`),
  );
  console.log();
}

// ── Command builder ───────────────────────────────

export function buildHealthCommand(): Command {
  return new Command('health')
    .description('Show agent health dashboard')
    .option('--verbose', 'show detailed health scores', false)
    .action((opts: { verbose: boolean }) => {
      const entries = MOCK_HEALTH_DATA;

      console.log();
      console.log(
        chalk.bold.hex('#6366f1')('  NEXUS HEALTH DASHBOARD') +
          chalk.dim('  (mock data — run a debate to populate live state)'),
      );
      console.log();

      const table = new Table({
        head: [
          chalk.bold.white('Agent'),
          chalk.bold.white('State'),
          chalk.bold.white('Health'),
          chalk.bold.white('Success'),
          chalk.bold.white('Latency'),
          ...(opts.verbose
            ? [chalk.bold.white('Quality'), chalk.bold.white('Recovery')]
            : []),
        ],
        style: {
          head: [],
          border: ['gray'],
        },
        chars: {
          top: '─',
          'top-mid': '┬',
          'top-left': '┌',
          'top-right': '┐',
          bottom: '─',
          'bottom-mid': '┴',
          'bottom-left': '└',
          'bottom-right': '┘',
          left: '│',
          'left-mid': '├',
          mid: '─',
          'mid-mid': '┼',
          right: '│',
          'right-mid': '┤',
          middle: '│',
        },
      });

      for (const entry of entries) {
        const { health } = entry;
        const row = [
          `${entry.icon}  ${chalk.bold.white(entry.name)}`,
          stateLabel(health.state),
          scoreBar(health.overall, 12) + chalk.dim(` ${pct(health.overall)}`),
          chalk.white(pct(health.successRate)),
          chalk.white(latency(health.avgLatencyMs)),
        ];

        if (opts.verbose) {
          row.push(
            chalk.white(pct(health.qualityScore)),
            chalk.white(pct(health.recoveryRate)),
          );
        }

        table.push(row);
      }

      console.log(table.toString());
      printSummary(entries);
    });
}
