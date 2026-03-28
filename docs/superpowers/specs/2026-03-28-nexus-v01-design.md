# Nexus v0.1 — Design Specification

## Overview

Nexus is a TypeScript framework for building multi-agent AI systems with built-in self-healing. Developers define agents with personalities and tools, organize them into teams, and run collaborative workflows (debates, reviews, research) where agents recover from failures automatically without human intervention.

**Target user**: TypeScript/Node.js developers building production agent systems.
**Differentiator**: Self-healing pipeline on every API call. Agents don't crash — they degrade gracefully, recover, and report.
**Positioning**: "Orchestrate AI Agents That Fix Themselves"

---

## Architecture

### Monorepo Structure

```
nexus/
├── packages/
│   ├── nexus-core/          # Framework (npm: nexus-agents)
│   │   ├── src/
│   │   │   ├── agent/       # Agent class
│   │   │   ├── team/        # Team orchestrator (ergonomic layer)
│   │   │   ├── graph/       # Graph execution model (topology layer)
│   │   │   ├── transcript/  # Immutable append-only transcript
│   │   │   ├── healing/     # Self-healing engine
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── health-tracker.ts
│   │   │   │   ├── error-taxonomy.ts
│   │   │   │   ├── recovery-strategies.ts
│   │   │   │   ├── reflection-loop.ts
│   │   │   │   └── output-validator.ts
│   │   │   ├── provider/    # LLM providers
│   │   │   │   └── anthropic.ts
│   │   │   ├── config/      # Named constants, thresholds
│   │   │   └── types.ts     # All TypeScript interfaces
│   │   └── tests/
│   └── nexus-cli/           # CLI tool (npm: nexus-cli)
│       └── src/
│           ├── commands/
│           │   ├── run.ts
│           │   ├── health.ts
│           │   └── init.ts
│           └── index.ts
├── apps/
│   ├── debate-arena/        # 5-agent debate demo
│   └── code-review-team/    # 3-agent code review demo
├── docs/
├── scripts/ralph/
├── PRD.md
├── DESIGN-DECISIONS.md
├── progress.txt
└── README.md
```

### Core Abstractions

#### Agent
A single AI entity with identity, a system prompt, optional tools, and a self-healing wrapper around every API call.

```typescript
interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  model?: string;           // defaults to claude-sonnet-4-20250514
  tools?: Tool[];
  maxTokens?: number;
  color?: string;           // terminal output color
  icon?: string;            // emoji identifier
}
```

#### Team (Ergonomic Layer)
The day-one developer API. Configures a group of agents with an execution protocol.

```typescript
const team = new Team({
  agents: [researcher, philosopher, contrarian, pragmatist, synthesizer],
  protocol: 'debate',       // 'sequential' | 'parallel' | 'debate' | 'parallel-then-synthesize'
  rounds: 3,
  transcript: new Transcript(),
});

const result = await team.run({ topic: 'Should AI systems self-regulate?' });
```

#### Graph (Topology Layer)
For developers who need explicit control over execution topology. Agents are nodes, edges carry conditions.

```typescript
const graph = new Graph();
graph.addNode('triage', triageAgent);
graph.addNode('specialist', specialistAgent);
graph.addNode('reviewer', reviewerAgent);

graph.addEdge('triage', 'specialist', { when: (ctx) => ctx.confidence < 0.8 });
graph.addEdge('specialist', 'reviewer');

const result = await graph.run(input);
```

#### Transcript (Immutable, Append-Only)
The shared conversation log. Once an entry is written, it cannot be modified. Every agent reads the full transcript; new entries are appended.

```typescript
interface TranscriptEntry {
  id: string;
  agentId: string;
  round: number;
  content: string;
  timestamp: number;
  tombstone?: Tombstone;    // present only if step failed terminally
  metadata?: Record<string, unknown>;
}

class Transcript {
  append(entry: TranscriptEntry): void;    // only way to add
  entries(): ReadonlyArray<TranscriptEntry>;
  toMessages(): Message[];                  // for API calls
  serialize(): string;                      // for persistence
  static deserialize(data: string): Transcript;
}
```

### Self-Healing Pipeline

Every agent API call flows through this pipeline:

```
PRE-FLIGHT → EXECUTE → VALIDATE → [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH
     │            │          │           │           │                    │
  Token count  API call   Schema +    Classify    Apply           Rolling score
  via count    with       Quality     error via   recovery        via
  endpoint     timeout    check via   taxonomy    strategy        HealthTracker
  + cache      guard      Output
  check                   Validator                               Step.tombstone
                          + Reflection                            on terminal
                          Loop (cap 2)                            failure
```

#### Pre-Flight
1. Count tokens via `/v1/messages/count_tokens` (~50-200ms)
2. If exceeds model context: truncate oldest non-system Transcript entries
3. Verify circuit breaker is not OPEN
4. Verify agent health is not FAILED
5. Set cache breakpoint at end of system prompt (stable prefix)

#### Execute
1. Call Anthropic Messages API with prompt caching enabled
2. Timeout guard (configurable, default 30s)
3. On streaming: pipe chunks to terminal output

#### Validate
1. **OutputValidator** (sync): schema check, length check, empty check
2. **ReflectionLoop** (async, cap 2): cheap model call assesses quality
   - On quality pass: proceed
   - On quality fail + retries remaining: reprompt with reflection feedback
   - On cap breach: emit `Step.tombstone { reason: "reflection_cap_breach" }`

#### Diagnose
Classify error using taxonomy:

**Infrastructure errors** (retry/backoff):
| Error | Strategy |
|-------|----------|
| rate_limit (429) | exponential_backoff |
| api_overloaded (529) | exponential_backoff_with_jitter |
| api_timeout | retry_with_reduced_tokens |
| context_overflow | truncate_and_retry (should be caught pre-flight) |
| server_error (5xx) | retry_after_delay |
| auth_error (401/403) | tombstone (unrecoverable) |
| network_error | retry_with_backoff |

**Output quality errors** (reprompt/reflect):
| Error | Strategy |
|-------|----------|
| empty_response | reprompt |
| malformed_response | reprompt_with_format_hint |
| off_topic | reprompt_with_topic_reminder |
| too_long / too_short | reprompt_with_length_hint |
| refusal | reprompt_with_reframe |
| no_agent_reference | reprompt_with_instruction |
| repetition | reprompt_with_novelty_hint |

#### Recover
Apply recovery strategy from taxonomy. Each has max retries (named constant).

#### Update Health
```typescript
interface HealthScore {
  overall: number;          // 0.0 - 1.0 composite
  successRate: number;
  avgLatencyMs: number;
  qualityScore: number;
  state: 'HEALTHY' | 'DEGRADED' | 'RECOVERING' | 'FAILED';
}
```

Thresholds (named constants in `config/thresholds.ts`):
- HEALTHY: >= 0.85
- DEGRADED: >= 0.40
- RECOVERING: >= 0.15
- FAILED: < 0.15

#### Step.tombstone
Mandatory terminal failure state. Every step that fails permanently must emit one.

```typescript
interface Tombstone {
  stepId: string;
  agentId: string;
  reason: 'reflection_cap_breach' | 'circuit_breaker_open' | 'total_timeout'
        | 'auth_failure' | 'unrecoverable_error';
  timestamp: number;
  lastAttempt: unknown;
  retriesExhausted: number;
}
```

#### Circuit Breaker
Three states: CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing)

```typescript
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;   // consecutive failures to open
const CIRCUIT_BREAKER_RESET_MS = 60_000;        // time before half-open probe
```

### Provider: Anthropic

```typescript
class AnthropicProvider {
  async createMessage(params: MessageParams): Promise<Message>;
  async countTokens(params: MessageParams): Promise<{ input_tokens: number }>;
  async createMessageStream(params: MessageParams): AsyncIterable<StreamEvent>;
}
```

Prompt caching implementation:
- Cache breakpoint at end of system prompt block (`cache_control: { type: "ephemeral" }`)
- Immutable Transcript prefix stays cached — growing tail accumulates hits
- Cache write premium: 1.25x (breaks even after 1 read)
- Cache read discount: 0.1x (10x cheaper than uncached)

### CLI

```bash
# Run the debate arena demo
nexus run debate "Should AI regulate itself?" --rounds=3 --verbose

# Run with mock responses (no API key needed)
nexus run debate "Test topic" --dry-run

# Show agent health dashboard
nexus health

# Scaffold a new Nexus project
nexus init my-agent-team
```

`--dry-run` behavior:
1. Skips API key validation entirely
2. Returns mock responses that exercise the full pipeline
3. Fires the tombstone contract on simulated failures
4. Validates that the failure path works end-to-end

### Demo Apps

#### Debate Arena (5 agents)
- Researcher (cyan, web_search tool), Philosopher (magenta), Contrarian (red), Pragmatist (yellow), Synthesizer (white/bold)
- Round 1: all 5 parallel via Promise.allSettled
- Round 2+: agents 1-4 parallel, Synthesizer last
- Final round: sequential for chain-of-response
- Terminal output: agent colors, spinners, health bars
- End-of-debate: self-healing report (tombstones, recoveries, health scores)

#### Code Review Team (3 agents)
- SecurityAgent: scans for vulnerabilities
- StyleAgent: checks conventions
- LogicAgent: audits business rules
- Orchestrator synthesizes final verdict
- Demonstrates: disagreement with purpose, real async task decomposition

### Developer Experience

**First 5 minutes:**
1. `npm install nexus-agents`
2. `npx nexus-agents init my-team` → scaffolds project with example
3. Edit agent prompts
4. `npx nexus-agents run debate "topic"` → see it work
5. Or `--dry-run` first if no API key yet

**Minimum code** (~25 lines):
```typescript
import { Agent, Team, Transcript } from 'nexus-agents';

const researcher = new Agent({
  id: 'researcher',
  name: 'The Researcher',
  systemPrompt: 'You are an empirical researcher...',
  icon: '🔬',
});

const pragmatist = new Agent({
  id: 'pragmatist',
  name: 'The Pragmatist',
  systemPrompt: 'You are a pragmatic engineer...',
  icon: '🛠️',
});

const team = new Team({
  agents: [researcher, pragmatist],
  protocol: 'debate',
  rounds: 2,
});

const result = await team.run({ topic: 'Is TDD worth the overhead?' });
console.log(result.transcript.entries());
```

### Testing Strategy

- **Unit tests**: Each healing component in isolation (CircuitBreaker, HealthTracker, ErrorTaxonomy, etc.)
- **Integration tests**: Full pipeline with mock provider (no real API calls)
- **Dry-run tests**: Exercise tombstone contract and failure paths
- **Cost tests**: Verify caching reduces token usage by expected amount (mock token counts)
- **Framework**: vitest

### Dependencies

**nexus-core:**
- `@anthropic-ai/sdk` — Claude API
- `eventemitter3` — lightweight event bus
- `zod` — runtime type validation
- `pino` — structured logging

**nexus-cli:**
- `commander` — CLI framework
- `chalk` — terminal colors
- `ora` — spinners
- `cli-table3` — health dashboard tables

---

## Non-Goals for v0.1

- No web UI or dashboard
- No Supabase integration
- No OpenAI/other provider support
- No Batch API support
- No monitoring beyond Transcript + health scores
- No cross-step failure inheritance resolution
- No flow-level tombstone for total outages
