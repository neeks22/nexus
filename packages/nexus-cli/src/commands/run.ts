// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  nexus-cli — `nexus run debate <topic>` command
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Command } from 'commander';
import chalk from 'chalk';
import { Agent } from '../../../nexus-core/src/agent/agent.js';
import { Transcript } from '../../../nexus-core/src/transcript/transcript.js';
import type {
  AgentConfig,
  AgentRunResult,
  HealingSummary,
  HealthScore,
  TokenUsage,
  TranscriptEntry,
} from '../../../nexus-core/src/types.js';
import {
  showBanner,
  showTopic,
  showRoundHeader,
  showAgentThinking,
  showAgentResponse,
  showHealingReport,
  showDebateComplete,
} from '../display/debate.js';

// ── Debate agent configs (inlined from debate-arena) ──

const DEBATE_AGENTS: AgentConfig[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔬',
    color: 'cyan',
    systemPrompt:
      'You are The Researcher, an empirical investigator who demands evidence for every claim. ' +
      'Ground arguments in concrete data, studies, technical docs. ' +
      "When others theorize, ask: where's the proof? " +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'philosopher',
    name: 'Philosopher',
    icon: '🏛️',
    color: 'magenta',
    systemPrompt:
      'You are The Philosopher, a first-principles thinker. ' +
      'Break down problems to foundational axioms. ' +
      'Question assumptions others take for granted. ' +
      'Use Socratic questioning. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    icon: '🔥',
    color: 'red',
    systemPrompt:
      "You are The Contrarian, a devil's advocate. " +
      'Deliberately oppose forming consensus. ' +
      'Find the weakest link and attack with counterexamples. ' +
      'Steelman the opposition. ' +
      'Be provocative but intellectually honest. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    icon: '🛠️',
    color: 'yellow',
    systemPrompt:
      'You are The Pragmatist, a real-world implementer. ' +
      'Evaluate through cost, timeline, human behavior, second-order effects. ' +
      'Ask: will it ship? What does this cost? ' +
      'Be direct and slightly impatient with abstraction. ' +
      'Keep to 3-5 sentences. ' +
      'In rounds after the first, address at least one other agent by name.',
  },
  {
    id: 'synthesizer',
    name: 'Synthesizer',
    icon: '🧬',
    color: 'white',
    systemPrompt:
      'You are The Synthesizer, a pattern finder who speaks last. ' +
      'Find unexpected connections between arguments. ' +
      "Identify where disagreements are actually different framings of the same truth. " +
      'Name who made the strongest point. ' +
      'Reference at least TWO agents by name. ' +
      'Keep to 3-5 sentences.',
  },
];

// ── Dry-run mock responses ────────────────────────

const DRY_RUN_RESPONSES: Record<string, string[]> = {
  researcher: [
    'According to recent meta-analyses, the empirical evidence strongly supports a nuanced position here. Three peer-reviewed studies from 2023 show conflicting results, suggesting the effect size is context-dependent. The Pragmatist\'s cost framing lacks citations — show me the data before we accept it as given.',
    "Researcher here: the Philosopher raises a valid first-principles challenge, but axioms without measurement are just assumptions. The Contrarian's counterexample is the strongest empirical anchor in this debate so far.",
  ],
  philosopher: [
    'Before we can evaluate this question, we must ask what we mean by the terms themselves. What is the foundational assumption beneath our disagreement — is it about ends or means? I challenge the Researcher to specify which metric constitutes success before citing studies.',
    'The Contrarian has exposed a genuine tension: we are arguing about a local optimum while ignoring whether the entire frame is correct. Consider — what would Socrates say about a system that optimises for measurability at the expense of meaning?',
  ],
  contrarian: [
    "Every argument made so far assumes the premise is well-posed, which it is not. The Researcher cites data from contexts nothing like ours; the Philosopher's axioms are doing a lot of work without scrutiny. The strongest counterexample: history shows that every consensus on this topic has later been reversed.",
    "The Pragmatist wants to ship — but shipping the wrong thing faster is worse than not shipping. I challenge the Synthesizer to name a single case where the 'practical' solution didn't accumulate crippling long-term debt.",
  ],
  pragmatist: [
    "Abstract principles are fine, but what does this cost and when does it ship? The Philosopher's axiomatic approach would still be in committee six months from now. Give me a working prototype over a perfect theory every time.",
    'Researcher and Philosopher are both right in theory, but neither has accounted for the human behaviour problem. Teams will work around any system that adds friction, regardless of its theoretical merits. Pragmatist priority: reduce friction first.',
  ],
  synthesizer: [
    "Stepping back, the Researcher and the Philosopher are not actually disagreeing — they are measuring different layers of the same phenomenon. The Contrarian's attack landed, but it also revealed that the Pragmatist's cost objection is the crux everyone else is dancing around.",
    "Connecting the threads: the Philosopher's frame and the Researcher's data are complementary lenses, not opposites. The Contrarian has served a useful function by exposing the hidden assumption in the emerging consensus. Synthesis: success here requires the Pragmatist's execution discipline applied to the Philosopher's reframed question.",
  ],
};

// ── Helpers ───────────────────────────────────────

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

async function dryRunAgent(config: AgentConfig, round: number): Promise<AgentRunResult> {
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

async function runOneAgent(
  agent: Agent,
  config: AgentConfig,
  topic: string,
  transcript: Transcript,
  round: number,
  dryRun: boolean,
): Promise<AgentRunResult> {
  if (dryRun) {
    return dryRunAgent(config, round);
  }

  const prompt = round === 1
    ? `Debate topic: ${topic}\n\nGive your opening position.`
    : `Debate topic: ${topic}\n\nThis is round ${round}. Engage with what has been said.`;

  return agent.run(prompt, transcript.toContext(), round);
}

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

function buildHealingSummary(
  results: AgentRunResult[],
  agentHealths: Record<string, HealthScore>,
): HealingSummary {
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

// ── Debate runner ─────────────────────────────────

async function runDebate(topic: string, rounds: number, dryRun: boolean): Promise<void> {
  const configs = DEBATE_AGENTS;
  const agents = configs.map((c) => new Agent(c));
  const agentMap = new Map<string, Agent>(
    agents.map((a, i) => [configs[i]!.id, a]),
  );

  const transcript = new Transcript();
  let totalTokens: TokenUsage = { ...ZERO_TOKENS };
  const allResults: AgentRunResult[] = [];

  const startMs = Date.now();

  showBanner();
  showTopic(topic, rounds);

  if (dryRun) {
    console.log(chalk.dim('  [dry-run mode — no API calls will be made]\n'));
  }

  const panelConfigs = configs.slice(0, 4);
  const synthConfig  = configs[4]!;

  for (let round = 1; round <= rounds; round++) {
    showRoundHeader(round, rounds);

    if (round === 1) {
      // Round 1: all 5 in parallel
      const spinners = configs.map((c) =>
        showAgentThinking(c.name, c.icon ?? '🤖', c.color ?? 'white'),
      );

      const settled = await Promise.allSettled(
        configs.map((config, i) =>
          runOneAgent(agentMap.get(config.id)!, config, topic, transcript, round, dryRun)
            .then((result) => ({ result, idx: i })),
        ),
      );

      const resultsByIdx: AgentRunResult[] = new Array(configs.length);
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          const { result, idx } = outcome.value;
          resultsByIdx[idx] = result;
        } else {
          const idx = settled.indexOf(outcome);
          const cfg = configs[idx]!;
          resultsByIdx[idx] = {
            agentId: cfg.id,
            content: '',
            health: { overall: 0, successRate: 0, avgLatencyMs: 0, qualityScore: 0, recoveryRate: 0, state: 'FAILED' },
            latencyMs: 0,
            cached: false,
            tokensUsed: { ...ZERO_TOKENS },
          };
        }
      }

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
      // Rounds 2+: panel in parallel, then synthesizer
      const panelSpinners = panelConfigs.map((c) =>
        showAgentThinking(c.name, c.icon ?? '🤖', c.color ?? 'white'),
      );

      const panelSettled = await Promise.allSettled(
        panelConfigs.map((config, i) =>
          runOneAgent(agentMap.get(config.id)!, config, topic, transcript, round, dryRun)
            .then((result) => ({ result, idx: i })),
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
        const result = panelResults[i];
        if (result === undefined) continue;
        const entry = appendResult(transcript, result, config, round);
        showAgentResponse(entry, config.color ?? 'white', config.icon ?? '🤖');
        allResults.push(result);
        totalTokens = addTokens(totalTokens, result.tokensUsed);
      }

      // Synthesizer runs last
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
      showAgentResponse(synthEntry, synthConfig.color ?? 'white', synthConfig.icon ?? '🧬');
      allResults.push(synthResult);
      totalTokens = addTokens(totalTokens, synthResult.tokensUsed);
    }
  }

  const totalMs = Date.now() - startMs;

  const agentHealths: Record<string, HealthScore> = {};

  if (dryRun) {
    for (const config of configs) {
      const lastResult = [...allResults].reverse().find((r) => r.agentId === config.id);
      if (lastResult) {
        agentHealths[config.id] = lastResult.health;
      }
    }
  } else {
    for (const agent of agents) {
      agentHealths[agent.id] = agent.getHealth();
    }
  }

  const healingSummary = buildHealingSummary(allResults, agentHealths);
  showHealingReport(healingSummary);
  showDebateComplete(totalMs, totalTokens);
}

// ── Command builder ───────────────────────────────

export function buildRunCommand(): Command {
  const run = new Command('run')
    .description('Run a multi-agent protocol');

  run
    .command('debate <topic>')
    .description('Run a 5-agent debate on a topic')
    .option('--dry-run', 'simulate without making API calls', false)
    .option('--rounds <n>', 'number of debate rounds (1-10)', '3')
    .action(async (topic: string, opts: { dryRun: boolean; rounds: string }) => {
      const rounds = Math.min(10, Math.max(1, parseInt(opts.rounds, 10) || 3));

      try {
        await runDebate(topic, rounds, opts.dryRun);
      } catch (err: unknown) {
        console.error(
          chalk.red('Error:'),
          err instanceof Error ? err.message : String(err),
        );
        process.exit(1);
      }
    });

  return run;
}
