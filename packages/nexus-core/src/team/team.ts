// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Team — Ergonomic multi-agent orchestration layer
//
//  Protocols: sequential | parallel | debate | parallel-then-synthesize
//  Transcript is IMMUTABLE (append-only). Graceful degradation always.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Agent } from '../agent/agent.js';
import { Transcript } from '../transcript/transcript.js';
import type {
  AgentRunResult,
  HealingSummary,
  HealthScore,
  TeamConfig,
  TeamRunInput,
  TeamRunResult,
  TokenUsage,
  Tombstone,
} from '../types.js';
import { DEFAULT_DEBATE_ROUNDS } from '../config/thresholds.js';

// ── Helpers ────────────────────────────────────────

function addTokenUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
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

/**
 * Compute cost estimate in USD from token usage.
 * Uses Claude Sonnet pricing: $3/1M input, $15/1M output,
 * $0.30/1M cache-read, $3.75/1M cache-write.
 */
function estimateCost(tokens: TokenUsage): number {
  return (
    (tokens.inputTokens / 1_000_000) * 3.0 +
    (tokens.outputTokens / 1_000_000) * 15.0 +
    (tokens.cacheReadTokens / 1_000_000) * 0.3 +
    (tokens.cacheWriteTokens / 1_000_000) * 3.75
  );
}

/**
 * Append an AgentRunResult into the transcript.
 */
function appendResult(
  transcript: Transcript,
  result: AgentRunResult,
  agentName: string,
  round: number,
): void {
  transcript.append({
    agentId: result.agentId,
    agentName,
    round,
    content: result.content,
    tombstone: result.tombstone,
    metadata: {
      latencyMs: result.latencyMs,
      cached: result.cached,
      tokensUsed: result.tokensUsed,
      health: result.health,
    },
  });
}

/**
 * Flush a Promise.allSettled result array into the transcript.
 * `agents` and `settled` are in 1:1 correspondence.
 */
function flushSettled(
  transcript: Transcript,
  agents: Agent[],
  settled: PromiseSettledResult<AgentRunResult>[],
  round: number,
): void {
  for (let i = 0; i < agents.length; i++) {
    // agents and settled are guaranteed to be the same length here
    const agent = agents[i] as Agent;
    const outcome = settled[i] as PromiseSettledResult<AgentRunResult>;

    if (outcome.status === 'fulfilled') {
      appendResult(transcript, outcome.value, agent.name, round);
    } else {
      // Agent.run() is designed to never reject — but be defensive.
      transcript.append({
        agentId: agent.id,
        agentName: agent.name,
        round,
        content: '',
        metadata: { error: String(outcome.reason) },
      });
    }
  }
}

/**
 * Build a HealingSummary from a set of agents and the full transcript.
 */
function buildHealingSummary(
  agents: Agent[],
  transcript: Transcript,
): HealingSummary {
  const agentHealths: Record<string, HealthScore> = {};
  for (const agent of agents) {
    agentHealths[agent.id] = agent.getHealth();
  }

  const tombstones: Tombstone[] = [...transcript.tombstones()];
  const allEntries = transcript.entries();
  const totalCalls = allEntries.length;
  const failedCalls = tombstones.length;
  const successfulCalls = totalCalls - failedCalls;

  // Recovery calls: non-tombstone entries where the agent was in RECOVERING state
  const recoveryCalls = allEntries.filter((e) => {
    if (e.tombstone) return false;
    const meta = e.metadata as Record<string, unknown> | undefined;
    const health = meta?.['health'] as HealthScore | undefined;
    return health?.state === 'RECOVERING';
  }).length;

  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    recoveryCalls,
    tombstones,
    agentHealths,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Team
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class Team {
  readonly config: TeamConfig;
  private readonly agents: Agent[];
  private readonly agentMap: Map<string, Agent>;

  constructor(config: TeamConfig) {
    this.config = config;
    this.agents = config.agents.map((ac) => new Agent(ac));
    this.agentMap = new Map(this.agents.map((a) => [a.id, a]));
  }

  // ── Public API ───────────────────────────────────

  async run(input: TeamRunInput): Promise<TeamRunResult> {
    const wallStart = Date.now();
    const transcript = new Transcript();

    switch (this.config.protocol) {
      case 'sequential':
        await this.runSequential(input, transcript);
        break;
      case 'parallel':
        await this.runParallel(input, transcript);
        break;
      case 'debate':
        await this.runDebate(input, transcript);
        break;
      case 'parallel-then-synthesize':
        await this.runParallelThenSynthesize(input, transcript);
        break;
    }

    const entries = transcript.entries();
    const totalTokens = entries.reduce<TokenUsage>((acc, e) => {
      const meta = e.metadata as Record<string, unknown> | undefined;
      const t = meta?.['tokensUsed'] as TokenUsage | undefined;
      return t ? addTokenUsage(acc, t) : acc;
    }, { ...ZERO_TOKENS });

    return {
      transcript: [...entries],
      healingSummary: buildHealingSummary(this.agents, transcript),
      totalLatencyMs: Date.now() - wallStart,
      totalTokens,
      totalCost: estimateCost(totalTokens),
    };
  }

  // ── Protocol: sequential ─────────────────────────

  /**
   * Run agents one at a time in order. Each agent sees the full transcript
   * accumulated so far as context.
   */
  private async runSequential(
    input: TeamRunInput,
    transcript: Transcript,
  ): Promise<void> {
    const prompt = this.buildPrompt(input);

    for (const agent of this.agents) {
      const context = transcript.toContext();
      const result = await agent.run(prompt, context, 1);
      appendResult(transcript, result, agent.name, 1);
    }
  }

  // ── Protocol: parallel ───────────────────────────

  /**
   * Run all agents simultaneously. Each sees the same starting context
   * (empty transcript, since they all start at the same time).
   */
  private async runParallel(
    input: TeamRunInput,
    transcript: Transcript,
  ): Promise<void> {
    const prompt = this.buildPrompt(input);
    const context = transcript.toContext();

    const settled = await Promise.allSettled(
      this.agents.map((agent) => agent.run(prompt, context, 1)),
    );

    flushSettled(transcript, this.agents, settled, 1);
  }

  // ── Protocol: debate ─────────────────────────────

  /**
   * Multi-round debate:
   * - Round 1: all agents in parallel
   * - Round 2..N: debaters in parallel, then synthesizer LAST
   *   (sees all round responses before generating its own)
   * - Tombstoned agents are gracefully skipped with a logged note.
   */
  private async runDebate(
    input: TeamRunInput,
    transcript: Transcript,
  ): Promise<void> {
    const totalRounds = this.config.rounds ?? DEFAULT_DEBATE_ROUNDS;
    const prompt = this.buildPrompt(input);
    const synthId = this.config.synthesizerAgentId;

    // Determine synthesizer and debaters
    let synthesizer: Agent | undefined;
    let debaters: Agent[];

    if (synthId) {
      synthesizer = this.agentMap.get(synthId);
      debaters = this.agents.filter((a) => a.id !== synthId);
    } else {
      // Default: last agent is the synthesizer
      synthesizer = this.agents[this.agents.length - 1];
      debaters = this.agents.slice(0, -1);
    }

    // Round 1: everyone in parallel (including the synthesizer)
    const round1Agents: Agent[] = [
      ...debaters,
      ...(synthesizer !== undefined ? [synthesizer] : []),
    ];
    await this.runDebateRoundParallel(round1Agents, prompt, transcript, 1);

    // Rounds 2..N: debaters parallel, synthesizer last
    for (let round = 2; round <= totalRounds; round++) {
      if (debaters.length > 0) {
        await this.runDebateRoundParallel(debaters, prompt, transcript, round);
      }

      if (synthesizer !== undefined) {
        if (this.isAgentTombstoned(synthesizer.id, transcript)) {
          transcript.append({
            agentId: synthesizer.id,
            agentName: synthesizer.name,
            round,
            content: `[note: ${synthesizer.name} was previously tombstoned and is skipped for round ${round}]`,
          });
        } else {
          const context = transcript.toContext();
          const result = await synthesizer.run(prompt, context, round);
          appendResult(transcript, result, synthesizer.name, round);
        }
      }
    }
  }

  /**
   * Run a subset of agents in parallel for a single debate round.
   * Already-tombstoned agents are skipped and a note is logged.
   */
  private async runDebateRoundParallel(
    agents: Agent[],
    prompt: string,
    transcript: Transcript,
    round: number,
  ): Promise<void> {
    // Snapshot context before any agent in this round runs
    const context = transcript.toContext();

    // Partition into active vs. already-tombstoned
    const active: Agent[] = [];
    const skipped: Agent[] = [];

    for (const agent of agents) {
      if (this.isAgentTombstoned(agent.id, transcript)) {
        skipped.push(agent);
      } else {
        active.push(agent);
      }
    }

    // Log skipped agents
    for (const agent of skipped) {
      transcript.append({
        agentId: agent.id,
        agentName: agent.name,
        round,
        content: `[note: ${agent.name} was previously tombstoned and is skipped for round ${round}]`,
      });
    }

    if (active.length === 0) return;

    const settled = await Promise.allSettled(
      active.map((agent) => agent.run(prompt, context, round)),
    );

    flushSettled(transcript, active, settled, round);
  }

  // ── Protocol: parallel-then-synthesize ───────────

  /**
   * Round 1: all agents in parallel.
   * Round 2: synthesizerAgentId alone, seeing all round-1 responses.
   */
  private async runParallelThenSynthesize(
    input: TeamRunInput,
    transcript: Transcript,
  ): Promise<void> {
    const prompt = this.buildPrompt(input);
    const context = transcript.toContext();

    // Round 1: all agents in parallel
    const round1 = await Promise.allSettled(
      this.agents.map((agent) => agent.run(prompt, context, 1)),
    );
    flushSettled(transcript, this.agents, round1, 1);

    // Round 2: synthesizer only
    const synthId = this.config.synthesizerAgentId;
    if (!synthId) return;

    const synthesizer = this.agentMap.get(synthId);
    if (synthesizer === undefined) return;

    const context2 = transcript.toContext();
    const result = await synthesizer.run(prompt, context2, 2);
    appendResult(transcript, result, synthesizer.name, 2);
  }

  // ── Private utilities ────────────────────────────

  /**
   * Build the full user-facing prompt from TeamRunInput.
   */
  private buildPrompt(input: TeamRunInput): string {
    const topic = this.config.topic ?? input.topic;
    const parts: string[] = [`Topic: ${topic}`];
    if (input.context) {
      parts.push(`\nContext:\n${input.context}`);
    }
    return parts.join('\n');
  }

  /**
   * Return true if the agent has been tombstoned in any prior transcript entry.
   */
  private isAgentTombstoned(agentId: string, transcript: Transcript): boolean {
    return transcript
      .entries()
      .some((e) => e.agentId === agentId && e.tombstone !== undefined);
  }
}
