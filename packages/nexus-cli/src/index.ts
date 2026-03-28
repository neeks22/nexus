#!/usr/bin/env node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  nexus-cli — Main entry point
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Command } from 'commander';
import chalk from 'chalk';
import { buildRunCommand } from './commands/run.js';
import { buildHealthCommand } from './commands/health.js';
import { buildInitCommand } from './commands/init.js';

// ── Program ───────────────────────────────────────

const program = new Command();

program
  .name('nexus')
  .version('0.1.0')
  .description(
    chalk.bold.hex('#6366f1')('Nexus') +
      chalk.dim(' — Self-healing multi-agent orchestration framework'),
  )
  // Note: --dry-run, --rounds, --verbose are defined per-subcommand so that
  // Commander does not greedily consume them before the subcommand parser sees them.
  .enablePositionalOptions(true);

// ── Sub-commands ──────────────────────────────────

program.addCommand(buildRunCommand());
program.addCommand(buildHealthCommand());
program.addCommand(buildInitCommand());

// ── Help customisation ────────────────────────────

program.addHelpText('afterAll', `
${chalk.bold('Examples:')}
  ${chalk.dim('$')} nexus run debate "Is TypeScript worth the complexity?"
  ${chalk.dim('$')} nexus run debate "Remote work vs office" --rounds 5 --dry-run
  ${chalk.dim('$')} nexus health
  ${chalk.dim('$')} nexus health --verbose
  ${chalk.dim('$')} nexus init my-agent-team
  ${chalk.dim('$')} nexus init my-agent-team --dir ~/projects
`);

// ── Parse ─────────────────────────────────────────

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(
    chalk.red('Fatal:'),
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
