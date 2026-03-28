// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Code Review Team — Main Entry Point
//
//  Round 1: SecurityAgent + StyleAgent + LogicAgent in parallel
//  Round 2: Orchestrator synthesizes all three reviews
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fs from 'node:fs';
import path from 'node:path';
import { Agent } from '../../../packages/nexus-core/src/agent/agent.js';
import { Transcript } from '../../../packages/nexus-core/src/transcript/transcript.js';
import type {
  AgentConfig,
  AgentRunResult,
  HealingSummary,
  HealthScore,
  TokenUsage,
  TranscriptEntry,
} from '../../../packages/nexus-core/src/types.js';
import { REVIEWER_AGENTS, ORCHESTRATOR_AGENT } from './agents.js';
import {
  showBanner,
  showTarget,
  showPhaseHeader,
  showAgentThinking,
  showAgentResponse,
  showHealingReport,
  showReviewComplete,
} from './display.js';

// ── CLI parsing ───────────────────────────────────

interface CliArgs {
  input: string;
  isFile: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return null;
  }

  let dryRun = false;
  const positional: string[] = [];

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    return null;
  }

  const rawInput = positional.join(' ');

  // If it looks like a file path and the file exists, treat as file
  const resolved = path.resolve(rawInput);
  const isFile = fs.existsSync(resolved) && fs.statSync(resolved).isFile();

  return { input: rawInput, isFile, dryRun };
}

function printUsage(): void {
  console.log('');
  console.log('  Usage:');
  console.log('    npm run review <file-path>    Review a source file');
  console.log('    npm run review "<code>"       Review an inline code snippet');
  console.log('');
  console.log('  Options:');
  console.log('    --dry-run    Run without making API calls (demo mode)');
  console.log('');
  console.log('  Examples:');
  console.log('    npm run review src/auth.ts');
  console.log('    npm run review "function add(a, b) { return a + b }"');
  console.log('    npm run review src/index.ts --dry-run');
  console.log('');
}

// ── Code loading ──────────────────────────────────

function loadCode(args: CliArgs): string {
  if (args.isFile) {
    const resolved = path.resolve(args.input);
    return fs.readFileSync(resolved, 'utf-8');
  }
  return args.input;
}

// ── Dry-run mock responses ────────────────────────

const DRY_RUN_RESPONSES: Record<string, string> = {
  security:
    'CRITICAL (line 12): The SQL query uses string interpolation directly from user input — ' +
    'this is a textbook SQL injection vulnerability; use parameterized queries immediately. ' +
    'HIGH: The API key is hardcoded as a string literal on line 3 and will be exposed in version control. ' +
    'MEDIUM: Error messages on line 28 leak internal stack traces to the caller, which aids attackers in reconnaissance. ' +
    'Recommend rotating the exposed key and auditing all database interactions before this ships.',

  style:
    'The function `processData` on line 8 does three unrelated things — validation, transformation, and persistence — ' +
    'violating Single Responsibility; split into three focused functions. ' +
    'Variable names like `d`, `tmp`, and `x` on lines 15-17 are cryptic; rename to describe intent. ' +
    'The pattern in lines 22-30 is duplicated verbatim from lines 44-52; extract a shared utility. ' +
    'TypeScript strict mode would catch the implicit `any` on line 19 — add an explicit type annotation.',

  logic:
    'The loop on line 20 uses `i <= arr.length` instead of `i < arr.length`, causing an off-by-one error ' +
    'that reads past the array bounds on the final iteration. ' +
    'The async function on line 35 does not await the inner promise, so errors are swallowed silently. ' +
    'Null is never checked before the `.value` access on line 41 — this will throw a TypeError on any missing record. ' +
    'The early return on line 8 bypasses cleanup logic on line 50, leaving resources dangling on the error path.',

  orchestrator:
    'After reviewing all three specialist reports, here is the unified verdict. ' +
    'MUST FIX: Security Auditor flagged a critical SQL injection on line 12 and an exposed hardcoded API key on line 3 — ' +
    'both are blockers that must be resolved before any deployment. ' +
    'Logic Auditor identified an off-by-one error on line 20 and a missing null check on line 41 that will cause runtime crashes. ' +
    'SHOULD FIX: Logic Auditor also found a silent async error on line 35 and a dangling resource on the error path — ' +
    'these are reliability issues that belong in the same PR. ' +
    'Style Reviewer correctly notes the God function on line 8 and duplicate code blocks; address these to reduce maintenance burden. ' +
    'NICE TO HAVE: Rename the cryptic variables and add explicit TypeScript types as Style Reviewer suggests. ' +
    'Overall assessment: this code is not production-ready — address all MUST FIX items immediately.',
};

async function dryRunAgent(
  config: AgentConfig,
  round: number,
): Promise<AgentRunResult> {
  const latencyMs = 400 + Math.random() * 800;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  const content =
    DRY_RUN_RESPONSES[config.id] ??
    `[${config.name}] Dry-run placeholder review for round ${round}.`;

  return {
    agentId: config.id,
    content,
    health: {
      overall: 0.95,
      successRate: 1.0,
      avgLatencyMs: latencyMs,
      qualityScore: 0.92,
      recoveryRate: 1.0,
      state: 'HEALTHY',
    },
    latencyMs,
    cached: round === 2 && Math.random() > 0.5,
    tokensUsed: {
      inputTokens: 900 + Math.floor(Math.random() * 300),
      outputTokens: 140 + Math.floor(Math.random() * 80),
      cacheReadTokens: round === 2 ? 700 + Math.floor(Math.random() * 200) : 0,
      cacheWriteTokens: round === 1 ? 900 : 0,
    },
  };
}

// ── Token usage helpers ───────────────────────────

const ZERO_TOKENS: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

function addTokens(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

// ── Transcript helpers ────────────────────────────

function appendResult(
  transcript: Transcript,
  result: AgentRunResult,
  config: AgentConfig,
  round: number,
): TranscriptEntry {
  return transcript.append({
    agentId: result.agentId,
    agentName: config.name,
    round,
    content: result.content,
    tombstone: result.tombstone,
    metadata: {
      latencyMs: result.latencyMs,
      cached: result.cached,
      health: result.health,
    },
  });
}

// ── Healing summary builder ───────────────────────

function buildHealingSummary(
  results: AgentRunResult[],
  agents: Agent[],
  dryRun: boolean,
): HealingSummary {
  const agentHealths: Record<string, HealthScore> = {};

  if (dryRun) {
    // Use health from the most recent result per agent
    for (const result of results) {
      agentHealths[result.agentId] = result.health;
    }
  } else {
    for (const agent of agents) {
      agentHealths[agent.id] = agent.getHealth();
    }
  }

  const tombstones = results
    .filter((r) => r.tombstone !== undefined)
    .map((r) => r.tombstone!);

  return {
    totalCalls: results.length,
    successfulCalls: results.filter((r) => !r.tombstone).length,
    failedCalls: tombstones.length,
    recoveryCalls: 0,
    tombstones,
    agentHealths,
  };
}

// ── Single-agent runner ───────────────────────────

async function runOneAgent(
  agent: Agent,
  config: AgentConfig,
  prompt: string,
  context: string,
  round: number,
  dryRun: boolean,
): Promise<AgentRunResult> {
  if (dryRun) {
    return dryRunAgent(config, round);
  }
  return agent.run(prompt, context, round);
}

// ── Main ──────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args === null) {
    showBanner();
    printUsage();
    process.exit(0);
  }

  const { dryRun } = args;

  // Load code to review
  const code = loadCode(args);
  const targetLabel = args.isFile ? path.resolve(args.input) : '(inline snippet)';

  // Build prompt — same for all reviewers
  const reviewPrompt = args.isFile
    ? `Review the following code from file \`${path.basename(args.input)}\`:\n\n\`\`\`\n${code}\n\`\`\``
    : `Review the following code:\n\n\`\`\`\n${code}\n\`\`\``;

  // Instantiate agents
  const allConfigs: AgentConfig[] = [...REVIEWER_AGENTS, ORCHESTRATOR_AGENT];
  const agents = allConfigs.map((c) => new Agent(c));
  const agentMap = new Map<string, Agent>(
    allConfigs.map((c, i) => [c.id, agents[i]!]),
  );

  const transcript = new Transcript();
  let totalTokens: TokenUsage = { ...ZERO_TOKENS };
  const allResults: AgentRunResult[] = [];

  const startMs = Date.now();

  showBanner();
  showTarget(targetLabel, args.isFile);

  if (dryRun) {
    console.log('  [dry-run mode — no API calls will be made]\n');
  }

  // ── Round 1: all reviewers in parallel ────────────

  showPhaseHeader(1);

  // Start all three spinners immediately
  const reviewerSpinners = REVIEWER_AGENTS.map((c) =>
    showAgentThinking(c.name, c.icon ?? '🔍', c.color ?? 'white'),
  );

  // Fire all three reviewers simultaneously, tagging each with its index
  const round1Settled = await Promise.allSettled(
    REVIEWER_AGENTS.map((config, i) =>
      runOneAgent(
        agentMap.get(config.id)!,
        config,
        reviewPrompt,
        transcript.toContext(),
        1,
        dryRun,
      ).then((result) => ({ result, idx: i })),
    ),
  );

  // Collect results preserving order
  const reviewerResults: AgentRunResult[] = new Array(REVIEWER_AGENTS.length);
  for (const outcome of round1Settled) {
    if (outcome.status === 'fulfilled') {
      const { result, idx } = outcome.value;
      reviewerResults[idx] = result;
    } else {
      // Agent.run() never rejects, but be defensive
      const cfg = REVIEWER_AGENTS[round1Settled.indexOf(outcome)]!;
      reviewerResults[round1Settled.indexOf(outcome)] = {
        agentId: cfg.id,
        content: '',
        health: {
          overall: 0,
          successRate: 0,
          avgLatencyMs: 0,
          qualityScore: 0,
          recoveryRate: 0,
          state: 'FAILED',
        },
        latencyMs: 0,
        cached: false,
        tokensUsed: { ...ZERO_TOKENS },
      };
    }
  }

  // Stop all spinners, then display in order
  for (let i = 0; i < REVIEWER_AGENTS.length; i++) {
    reviewerSpinners[i]!.stop();
    reviewerSpinners[i]!.clear();
    const config = REVIEWER_AGENTS[i]!;
    const result = reviewerResults[i]!;
    const entry = appendResult(transcript, result, config, 1);
    showAgentResponse(entry, config.color ?? 'white', config.icon ?? '🔍');
    allResults.push(result);
    totalTokens = addTokens(totalTokens, result.tokensUsed);
  }

  // ── Round 2: orchestrator synthesizes ─────────────

  showPhaseHeader(2);

  const orchSpinner = showAgentThinking(
    ORCHESTRATOR_AGENT.name,
    ORCHESTRATOR_AGENT.icon ?? '📋',
    ORCHESTRATOR_AGENT.color ?? 'white',
  );

  // Orchestrator sees the full transcript of all three reviews as context
  const orchContext = transcript.toContext();
  const orchResult = await runOneAgent(
    agentMap.get(ORCHESTRATOR_AGENT.id)!,
    ORCHESTRATOR_AGENT,
    reviewPrompt,
    orchContext,
    2,
    dryRun,
  );

  orchSpinner.stop();
  orchSpinner.clear();

  const orchEntry = appendResult(transcript, orchResult, ORCHESTRATOR_AGENT, 2);
  showAgentResponse(
    orchEntry,
    ORCHESTRATOR_AGENT.color ?? 'white',
    ORCHESTRATOR_AGENT.icon ?? '📋',
  );
  allResults.push(orchResult);
  totalTokens = addTokens(totalTokens, orchResult.tokensUsed);

  // ── Final report ──────────────────────────────────

  const totalMs = Date.now() - startMs;
  const healingSummary = buildHealingSummary(allResults, agents, dryRun);

  showHealingReport(healingSummary);
  showReviewComplete(totalMs, totalTokens);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
