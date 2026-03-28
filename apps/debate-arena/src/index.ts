// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Debate Arena — Main Entry Point
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
import { DEBATE_AGENTS } from './agents.js';
import {
  showBanner,
  showTopic,
  showRoundHeader,
  showAgentThinking,
  stopAgentThinking,
  showAgentResponse,
  showHealingReport,
  showDebateComplete,
} from './display.js';

// ── CLI parsing ───────────────────────────────────

interface CliArgs {
  topic: string;
  rounds: number;
  verbose: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return null;
  }

  let rounds = 3;
  let verbose = false;
  let dryRun = false;
  const topicParts: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--rounds=')) {
      const n = parseInt(arg.split('=')[1] ?? '3', 10);
      if (!isNaN(n) && n >= 1 && n <= 10) {
        rounds = n;
      }
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('--')) {
      topicParts.push(arg);
    }
  }

  if (topicParts.length === 0) {
    return null;
  }

  return { topic: topicParts.join(' '), rounds, verbose, dryRun };
}

function printUsage(): void {
  console.log('');
  console.log('  Usage:');
  console.log('    npm run debate "<topic>" [--rounds=N] [--verbose] [--dry-run]');
  console.log('');
  console.log('  Examples:');
  console.log('    npm run debate "Is TypeScript worth the complexity?"');
  console.log('    npm run debate "Remote work vs office" --rounds=5');
  console.log('    npm run debate "Should AI be regulated?" --dry-run');
  console.log('');
}

// ── Dry-run mock agent ────────────────────────────

const DRY_RUN_RESPONSES: Record<string, string[]> = {
  researcher: [
    "According to recent meta-analyses, the empirical evidence strongly supports a nuanced position here. Three peer-reviewed studies from 2023 show conflicting results, suggesting the effect size is context-dependent. The Pragmatist's cost framing lacks citations — show me the data before we accept it as given.",
    "Researcher here: the Philosopher raises a valid first-principles challenge, but axioms without measurement are just assumptions. The Contrarian's counterexample from the Nordic model is the strongest empirical anchor in this debate so far.",
  ],
  philosopher: [
    'Before we can evaluate this question, we must ask what we mean by the terms themselves. What is the foundational assumption beneath our disagreement — is it about ends or means? I challenge the Researcher to specify which metric constitutes success before citing studies.',
    'The Contrarian has exposed a genuine tension: we are arguing about a local optimum while ignoring whether the entire frame is correct. Consider — what would Socrates say about a system that optimises for measurability at the expense of meaning?',
  ],
  contrarian: [
    "Every argument made so far assumes the premise is well-posed, which it is not. The Researcher cites data from contexts nothing like ours; the Philosopher's axioms are doing a lot of work without scrutiny. The strongest counterexample: history shows that every consensus on this topic has later been reversed.",
    "The Pragmatist wants to ship — but shipping the wrong thing faster is worse than not shipping. I challenge the Synthesizer to name a single case where the \"practical\" solution didn't accumulate crippling long-term debt.",
  ],
  pragmatist: [
    "Abstract principles are fine, but what does this cost and when does it ship? The Philosopher's axiomatic approach would still be in committee six months from now. Give me a working prototype over a perfect theory every time — second-order effects become visible once you have something real.",
    "Researcher and Philosopher are both right in theory, but neither has accounted for the human behaviour problem. Teams will work around any system that adds friction, regardless of its theoretical merits. Pragmatist priority: reduce friction first.",
  ],
  synthesizer: [
    "Stepping back, the Researcher and the Philosopher are not actually disagreeing — they are measuring different layers of the same phenomenon. The Contrarian's attack landed, but it also revealed that the Pragmatist's cost objection is the crux everyone else is dancing around. The strongest point came from the Researcher: without baseline data, all other arguments are speculation dressed as strategy.",
    "Connecting the threads: the Philosopher's frame and the Researcher's data are complementary lenses, not opposites. The Contrarian has served a useful function by exposing the hidden assumption in the consensus forming between the Researcher and the Pragmatist. Synthesis: success here requires the Pragmatist's execution discipline applied to the Philosopher's reframed question.",
  ],
};

async function dryRunAgent(
  config: AgentConfig,
  round: number,
): Promise<AgentRunResult> {
  // Simulate network latency
  const latencyMs = 400 + Math.random() * 600;
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  const pool = DRY_RUN_RESPONSES[config.id] ?? [
    `[${config.name}] Dry-run placeholder response for round ${round}.`,
  ];
  const content = pool[Math.min(round - 1, pool.length - 1)] ?? pool[0] ?? '';

  return {
    agentId: config.id,
    content,
    health: {
      overall: 0.92,
      successRate: 1.0,
      avgLatencyMs: latencyMs,
      qualityScore: 0.9,
      recoveryRate: 1.0,
      state: 'HEALTHY',
    },
    latencyMs,
    cached: round > 1 && Math.random() > 0.7,
    tokensUsed: {
      inputTokens: 800 + Math.floor(Math.random() * 200),
      outputTokens: 120 + Math.floor(Math.random() * 80),
      cacheReadTokens: round > 1 ? 600 + Math.floor(Math.random() * 200) : 0,
      cacheWriteTokens: round === 1 ? 800 : 0,
    },
  };
}

// ── Token usage accumulator ───────────────────────

function addTokens(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

const ZERO_TOKENS: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

// ── Healing summary builder ───────────────────────

function buildHealingSummary(
  results: AgentRunResult[],
  agentHealths: Record<string, HealthScore>,
): HealingSummary {
  const tombstones = results
    .filter((r) => r.tombstone !== undefined)
    .map((r) => r.tombstone!);

  const successfulCalls = results.filter((r) => !r.tombstone).length;
  const failedCalls = tombstones.length;

  return {
    totalCalls: results.length,
    successfulCalls,
    failedCalls,
    recoveryCalls: 0,   // Recovery calls are internal to the agent pipeline
    tombstones,
    agentHealths,
  };
}

// ── Single-agent runner (live + dry-run) ──────────

async function runOneAgent(
  agent: Agent,
  config: AgentConfig,
  topic: string,
  transcript: Transcript,
  round: number,
  dryRun: boolean,
): Promise<AgentRunResult> {
  const prompt = round === 1
    ? `Debate topic: ${topic}\n\nGive your opening position.`
    : `Debate topic: ${topic}\n\nThis is round ${round}. Engage with what has been said.`;

  const context = transcript.toContext();

  if (dryRun) {
    return dryRunAgent(config, round);
  }

  return agent.run(prompt, context, round);
}

// ── Append result to transcript ───────────────────

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
      health: result.health.overall,
    },
  });
}

// ── Main ──────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args === null) {
    showBanner();
    printUsage();
    process.exit(0);
  }

  const { topic, rounds, dryRun } = args;

  // Instantiate agents
  const configs = DEBATE_AGENTS;
  const agents = configs.map((c) => new Agent(c));
  const agentMap = new Map<string, Agent>(
    agents.map((a, i) => [configs[i]!.id, a]),
  );
  const configMap = new Map<string, AgentConfig>(
    configs.map((c) => [c.id, c]),
  );

  // Transcript and accumulators
  const transcript = new Transcript();
  let totalTokens: TokenUsage = { ...ZERO_TOKENS };
  const allResults: AgentRunResult[] = [];

  const startMs = Date.now();

  showBanner();
  showTopic(topic, rounds);

  if (dryRun) {
    console.log('  [dry-run mode — no API calls will be made]\n');
  }

  // Separate main panel agents from synthesizer
  const panelConfigs = configs.slice(0, 4);  // researcher, philosopher, contrarian, pragmatist
  const synthConfig  = configs[4]!;           // synthesizer

  for (let round = 1; round <= rounds; round++) {
    showRoundHeader(round, rounds);

    if (round === 1) {
      // ── Round 1: all 5 in parallel ─────────────────

      // Start all spinners immediately
      const spinners = configs.map((c) =>
        showAgentThinking(c.name, c.icon ?? '🤖', c.color ?? 'white'),
      );

      // Fire all in parallel
      const settled = await Promise.allSettled(
        configs.map((config, i) =>
          runOneAgent(
            agentMap.get(config.id)!,
            config,
            topic,
            transcript,
            round,
            dryRun,
          ).then((result) => ({ result, idx: i })),
        ),
      );

      // Display in agent order as they arrived
      const resultsByIdx: AgentRunResult[] = new Array(configs.length);
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          const { result, idx } = outcome.value;
          resultsByIdx[idx] = result;
        } else {
          // Unlikely (runOneAgent never throws), but handle gracefully
          const cfg = configs[settled.indexOf(outcome)]!;
          resultsByIdx[settled.indexOf(outcome)] = {
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

      // Stop all spinners and display in order
      for (let i = 0; i < configs.length; i++) {
        spinners[i]!.stop();
        spinners[i]!.clear();
        const config = configs[i]!;
        const result = resultsByIdx[i]!;
        const entry = appendResult(transcript, result, config, round);
        showAgentResponse(entry, config.color ?? 'white', config.icon ?? '🤖');
        allResults.push(result);
        totalTokens = addTokens(totalTokens, result.tokensUsed);
      }
    } else {
      // ── Rounds 2+: panel in parallel, then synthesizer ──

      // Panel (first 4) in parallel
      const panelSpinners = panelConfigs.map((c) =>
        showAgentThinking(c.name, c.icon ?? '🤖', c.color ?? 'white'),
      );

      const panelSettled = await Promise.allSettled(
        panelConfigs.map((config, i) =>
          runOneAgent(
            agentMap.get(config.id)!,
            config,
            topic,
            transcript,
            round,
            dryRun,
          ).then((result) => ({ result, idx: i })),
        ),
      );

      const panelResults: AgentRunResult[] = new Array(panelConfigs.length);
      for (const outcome of panelSettled) {
        if (outcome.status === 'fulfilled') {
          const { result, idx } = outcome.value;
          panelResults[idx] = result;
        }
      }

      for (let i = 0; i < panelConfigs.length; i++) {
        panelSpinners[i]!.stop();
        panelSpinners[i]!.clear();
        const config = panelConfigs[i]!;
        const result = panelResults[i]!;
        if (result === undefined) continue;
        const entry = appendResult(transcript, result, config, round);
        showAgentResponse(entry, config.color ?? 'white', config.icon ?? '🤖');
        allResults.push(result);
        totalTokens = addTokens(totalTokens, result.tokensUsed);
      }

      // Synthesizer last
      const synthSpinner = showAgentThinking(
        synthConfig.name,
        synthConfig.icon ?? '🧬',
        synthConfig.color ?? 'white',
      );
      const synthResult = await runOneAgent(
        agentMap.get(synthConfig.id)!,
        synthConfig,
        topic,
        transcript,
        round,
        dryRun,
      );
      synthSpinner.stop();
      synthSpinner.clear();
      const synthEntry = appendResult(transcript, synthResult, synthConfig, round);
      showAgentResponse(
        synthEntry,
        synthConfig.color ?? 'white',
        synthConfig.icon ?? '🧬',
      );
      allResults.push(synthResult);
      totalTokens = addTokens(totalTokens, synthResult.tokensUsed);
    }
  }

  const totalMs = Date.now() - startMs;

  // Build healing summary from final agent health states
  const agentHealths: Record<string, HealthScore> = {};
  for (const agent of agents) {
    agentHealths[agent.id] = agent.getHealth();
  }

  // In dry-run we use the mock health from results
  if (dryRun) {
    for (const config of configs) {
      const lastResult = [...allResults].reverse().find((r) => r.agentId === config.id);
      if (lastResult) {
        agentHealths[config.id] = lastResult.health;
      }
    }
  }

  const healingSummary: HealingSummary = buildHealingSummary(allResults, agentHealths);

  showHealingReport(healingSummary);
  showDebateComplete(totalMs, totalTokens);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
