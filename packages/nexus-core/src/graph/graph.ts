// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Graph — Topology-based agent execution
//
//  Walk from startNodeId, following edges where
//  conditions are met, building a transcript as we go.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Agent } from '../agent/agent.js';
import { Transcript } from '../transcript/transcript.js';
import type {
  AgentConfig,
  GraphContext,
  GraphEdge,
  GraphNode,
  HealingSummary,
  HealthScore,
  TeamRunResult,
  TokenUsage,
  Tombstone,
} from '../types.js';

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
 * $3 / 1M input, $15 / 1M output, $0.30 / 1M cache-read, $3.75 / 1M cache-write.
 */
function estimateCost(tokens: TokenUsage): number {
  return (
    (tokens.inputTokens / 1_000_000) * 3.0 +
    (tokens.outputTokens / 1_000_000) * 15.0 +
    (tokens.cacheReadTokens / 1_000_000) * 0.3 +
    (tokens.cacheWriteTokens / 1_000_000) * 3.75
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Graph
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class Graph {
  private readonly nodes: Map<string, GraphNode> = new Map();
  private readonly edges: Map<string, GraphEdge[]> = new Map();
  // Instantiated agents, keyed by node id
  private readonly agentInstances: Map<string, Agent> = new Map();

  // ── Graph construction ───────────────────────────

  /**
   * Register an agent node in the graph.
   * Creates the Agent instance eagerly so it retains health state
   * across the full graph execution.
   */
  addNode(id: string, agentConfig: AgentConfig): void {
    if (this.nodes.has(id)) {
      throw new Error(`Graph.addNode: node "${id}" already exists`);
    }

    const node: GraphNode = { id, agentConfig };
    this.nodes.set(id, node);
    this.agentInstances.set(id, new Agent(agentConfig));
  }

  /**
   * Add a directed edge from one node to another.
   * An optional condition predicate can gate traversal.
   */
  addEdge(
    from: string,
    to: string,
    condition?: (ctx: GraphContext) => boolean,
  ): void {
    if (!this.nodes.has(from)) {
      throw new Error(`Graph.addEdge: source node "${from}" does not exist`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Graph.addEdge: target node "${to}" does not exist`);
    }

    const edge: GraphEdge = { from, to, condition };

    const existing = this.edges.get(from);
    if (existing) {
      existing.push(edge);
    } else {
      this.edges.set(from, [edge]);
    }
  }

  // ── Execution ────────────────────────────────────

  /**
   * Execute the graph starting at `startNodeId`.
   *
   * Walks the DAG by:
   * 1. Running the current node's agent with the accumulated transcript as context.
   * 2. Appending the result to the transcript.
   * 3. Evaluating all outgoing edges in registration order.
   * 4. Following the first edge whose condition returns true (or the first
   *    unconditional edge if none have conditions).
   * 5. Stopping when no eligible outgoing edge exists (sink node reached).
   *
   * Cycle guard: each node may be visited at most once per run.
   */
  async run(input: {
    prompt: string;
    startNodeId: string;
  }): Promise<TeamRunResult> {
    const { prompt, startNodeId } = input;
    const wallStart = Date.now();
    const transcript = new Transcript();

    if (!this.nodes.has(startNodeId)) {
      throw new Error(`Graph.run: startNodeId "${startNodeId}" not found`);
    }

    const visited = new Set<string>();
    const metadata: Record<string, unknown> = {};
    let currentNodeId: string | null = startNodeId;
    let stepIndex = 0;

    while (currentNodeId !== null) {
      if (visited.has(currentNodeId)) {
        // Cycle detected — stop to prevent infinite loop
        transcript.append({
          agentId: currentNodeId,
          agentName: currentNodeId,
          round: stepIndex,
          content: `[graph-cycle-guard: node "${currentNodeId}" was already visited — stopping traversal]`,
          metadata: { cycleGuard: true },
        });
        break;
      }

      visited.add(currentNodeId);
      stepIndex += 1;

      const node = this.nodes.get(currentNodeId);
      const agent = this.agentInstances.get(currentNodeId);

      // Both should always be defined given the node map is consistent
      if (!node || !agent) {
        throw new Error(`Graph.run: node "${currentNodeId}" is inconsistent`);
      }

      // Run the agent for this step
      const context = transcript.toContext();
      const result = await agent.run(prompt, context, stepIndex);

      // Append to transcript
      transcript.append({
        agentId: result.agentId,
        agentName: node.agentConfig.name,
        round: stepIndex,
        content: result.content,
        tombstone: result.tombstone,
        metadata: {
          latencyMs: result.latencyMs,
          cached: result.cached,
          tokensUsed: result.tokensUsed,
          health: result.health,
          nodeId: currentNodeId,
        },
      });

      // Build the GraphContext for edge evaluation
      const graphContext: GraphContext = {
        transcript: [...transcript.entries()],
        currentStepId: currentNodeId,
        metadata,
      };

      // Find the next node to visit
      currentNodeId = this.resolveNextNode(currentNodeId, graphContext);
    }

    // Aggregate totals
    const entries = transcript.entries();
    const totalTokens = entries.reduce<TokenUsage>((acc, e) => {
      const meta = e.metadata as Record<string, unknown> | undefined;
      const t = meta?.['tokensUsed'] as TokenUsage | undefined;
      return t ? addTokenUsage(acc, t) : acc;
    }, { ...ZERO_TOKENS });

    return {
      transcript: [...entries],
      healingSummary: this.buildHealingSummary(transcript),
      totalLatencyMs: Date.now() - wallStart,
      totalTokens,
      totalCost: estimateCost(totalTokens),
    };
  }

  // ── Private helpers ──────────────────────────────

  /**
   * Evaluate outgoing edges from `nodeId` and return the id of the
   * next node to visit, or null if no eligible edge exists.
   *
   * Resolution order:
   * 1. Conditional edges are evaluated in registration order; the first
   *    edge whose condition returns true is taken.
   * 2. If no conditional edge matches, the first unconditional edge is taken.
   * 3. If there are no edges at all, return null (sink reached).
   */
  private resolveNextNode(
    nodeId: string,
    ctx: GraphContext,
  ): string | null {
    const outgoing = this.edges.get(nodeId);
    if (!outgoing || outgoing.length === 0) return null;

    // Evaluate conditional edges first (in order)
    for (const edge of outgoing) {
      if (edge.condition !== undefined) {
        let conditionResult = false;
        try {
          conditionResult = edge.condition(ctx);
        } catch {
          // Condition threw — treat as false, continue evaluating other edges
          conditionResult = false;
        }
        if (conditionResult) {
          return edge.to;
        }
      }
    }

    // Fall back to first unconditional edge
    for (const edge of outgoing) {
      if (edge.condition === undefined) {
        return edge.to;
      }
    }

    return null;
  }

  /**
   * Build a HealingSummary from agent instances and the completed transcript.
   */
  private buildHealingSummary(transcript: Transcript): HealingSummary {
    const agentHealths: Record<string, HealthScore> = {};
    for (const [nodeId, agent] of this.agentInstances) {
      agentHealths[nodeId] = agent.getHealth();
    }

    const tombstones: Tombstone[] = [...transcript.tombstones()];
    const allEntries = transcript.entries();
    const totalCalls = allEntries.filter(
      (e) => !(e.metadata as Record<string, unknown> | undefined)?.['cycleGuard'],
    ).length;
    const failedCalls = tombstones.length;
    const successfulCalls = totalCalls - failedCalls;

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
}
