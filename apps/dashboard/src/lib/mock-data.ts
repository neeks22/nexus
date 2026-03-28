// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Mock Data — mirrors the real types from nexus-core
//  Replace with JSON file reads in v0.2
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type HealthState = 'HEALTHY' | 'DEGRADED' | 'RECOVERING' | 'FAILED';

export interface AgentHealth {
  id: string;
  name: string;
  model: string;
  state: HealthState;
  overall: number;       // 0–1
  successRate: number;   // 0–1
  avgLatencyMs: number;
  qualityScore: number;  // 0–1
  recoveryRate: number;  // 0–1
  totalCalls: number;
  lastSeen: string;
}

export interface DebateRecord {
  id: string;
  topic: string;
  date: string;
  protocol: string;
  agents: string[];
  rounds: number;
  totalTokens: number;
  totalCost: number;
  outcome: 'completed' | 'partial' | 'failed';
}

export interface DashboardStats {
  totalDebates: number;
  totalAgents: number;
  avgHealthScore: number;
  totalCost: number;
  costDelta: number;       // % change vs last period
  debatesDelta: number;
  uptimePct: number;
}

// ── Mock Agents ───────────────────────────────────

export const MOCK_AGENTS: AgentHealth[] = [
  {
    id: 'agent-strategist',
    name: 'Strategist',
    model: 'claude-sonnet-4-20250514',
    state: 'HEALTHY',
    overall: 0.94,
    successRate: 0.97,
    avgLatencyMs: 1840,
    qualityScore: 0.93,
    recoveryRate: 0.91,
    totalCalls: 248,
    lastSeen: '2 min ago',
  },
  {
    id: 'agent-critic',
    name: 'Critic',
    model: 'claude-sonnet-4-20250514',
    state: 'HEALTHY',
    overall: 0.89,
    successRate: 0.92,
    avgLatencyMs: 2310,
    qualityScore: 0.88,
    recoveryRate: 0.87,
    totalCalls: 231,
    lastSeen: '2 min ago',
  },
  {
    id: 'agent-researcher',
    name: 'Researcher',
    model: 'claude-haiku-4-5-20251001',
    state: 'DEGRADED',
    overall: 0.62,
    successRate: 0.74,
    avgLatencyMs: 8740,
    qualityScore: 0.61,
    recoveryRate: 0.52,
    totalCalls: 187,
    lastSeen: '14 min ago',
  },
  {
    id: 'agent-synthesizer',
    name: 'Synthesizer',
    model: 'claude-sonnet-4-20250514',
    state: 'RECOVERING',
    overall: 0.31,
    successRate: 0.48,
    avgLatencyMs: 14200,
    qualityScore: 0.29,
    recoveryRate: 0.22,
    totalCalls: 94,
    lastSeen: '1 hr ago',
  },
  {
    id: 'agent-auditor',
    name: 'Auditor',
    model: 'claude-haiku-4-5-20251001',
    state: 'FAILED',
    overall: 0.08,
    successRate: 0.11,
    avgLatencyMs: 30000,
    qualityScore: 0.05,
    recoveryRate: 0.03,
    totalCalls: 42,
    lastSeen: '3 hr ago',
  },
  {
    id: 'agent-planner',
    name: 'Planner',
    model: 'claude-sonnet-4-20250514',
    state: 'HEALTHY',
    overall: 0.91,
    successRate: 0.95,
    avgLatencyMs: 2100,
    qualityScore: 0.90,
    recoveryRate: 0.88,
    totalCalls: 312,
    lastSeen: 'just now',
  },
];

// ── Mock Debates ──────────────────────────────────

export const MOCK_DEBATES: DebateRecord[] = [
  {
    id: 'debate-001',
    topic: 'Optimal microservices decomposition strategy for e-commerce platform',
    date: '2026-03-28 09:41',
    protocol: 'debate',
    agents: ['Strategist', 'Critic', 'Planner'],
    rounds: 3,
    totalTokens: 48200,
    totalCost: 0.52,
    outcome: 'completed',
  },
  {
    id: 'debate-002',
    topic: 'Should we use GraphQL or REST for the public API?',
    date: '2026-03-28 08:15',
    protocol: 'parallel-then-synthesize',
    agents: ['Researcher', 'Critic', 'Synthesizer'],
    rounds: 2,
    totalTokens: 31800,
    totalCost: 0.34,
    outcome: 'partial',
  },
  {
    id: 'debate-003',
    topic: 'Infrastructure cost optimization — AWS vs GCP vs self-hosted',
    date: '2026-03-27 17:22',
    protocol: 'debate',
    agents: ['Strategist', 'Researcher', 'Auditor', 'Planner'],
    rounds: 4,
    totalTokens: 72400,
    totalCost: 0.89,
    outcome: 'completed',
  },
  {
    id: 'debate-004',
    topic: 'AI-assisted code review: trust boundaries and human oversight',
    date: '2026-03-27 14:05',
    protocol: 'sequential',
    agents: ['Critic', 'Auditor'],
    rounds: 1,
    totalTokens: 18900,
    totalCost: 0.21,
    outcome: 'failed',
  },
  {
    id: 'debate-005',
    topic: 'Pricing model evaluation: usage-based vs subscription tiers',
    date: '2026-03-27 11:48',
    protocol: 'debate',
    agents: ['Strategist', 'Critic', 'Researcher'],
    rounds: 3,
    totalTokens: 54600,
    totalCost: 0.61,
    outcome: 'completed',
  },
];

// ── Computed Stats ────────────────────────────────

export const DASHBOARD_STATS: DashboardStats = {
  totalDebates: 5,
  totalAgents: MOCK_AGENTS.length,
  avgHealthScore:
    Math.round(
      (MOCK_AGENTS.reduce((s, a) => s + a.overall, 0) / MOCK_AGENTS.length) * 100
    ) / 100,
  totalCost: MOCK_DEBATES.reduce((s, d) => s + d.totalCost, 0),
  costDelta: -12.4,
  debatesDelta: 25,
  uptimePct: 99.1,
};
