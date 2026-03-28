# Quickstart — 5 Minutes to Your First Debate

You're impatient. Good. Here's the shortest path from zero to a running multi-agent debate with self-healing.

---

## Step 1 — Install

```bash
npm install nexus-core
```

TypeScript types included. No `@types/` package needed.

---

## Step 2 — Try it without an API key

The fastest way to see Nexus in action is `--dry-run`. It runs the full self-healing pipeline with mock responses — no credentials, no cost.

```bash
npx nexus-cli run debate --dry-run
```

You'll see:
- 5 agents spinning up
- Round-by-round responses with colored agent names
- At least one deliberate failure, caught and recovered
- A healing summary table at the end

If you don't have `nexus-cli` installed globally:

```bash
npm install -g nexus-cli
nexus run debate --dry-run
```

---

## Step 3 — Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or add it to your `.env` file if you're using dotenv.

---

## Step 4 — Your first team (2 agents, 10 lines)

```typescript
import { Team } from 'nexus-core';

const team = new Team({
  protocol: 'debate',
  rounds: 2,
  agents: [
    {
      id: 'researcher',
      name: 'Researcher',
      systemPrompt: 'You are a rigorous researcher. Every claim needs evidence.',
      model: 'claude-sonnet-4-20250514',
    },
    {
      id: 'critic',
      name: 'Critic',
      systemPrompt: 'You are a sharp critic. Challenge every assumption aggressively.',
      model: 'claude-sonnet-4-20250514',
    },
  ],
});

const result = await team.run({
  topic: 'Is TypeScript worth it for a 3-person startup?',
});

console.log(result.healingSummary);
```

Run it:

```bash
npx tsx your-file.ts
```

---

## Step 5 — Read the result

`result` is a `TeamRunResult`:

```typescript
{
  transcript: TranscriptEntry[];   // every agent response, in order, immutable
  healingSummary: {
    totalCalls: number;            // how many API calls were made
    successfulCalls: number;
    failedCalls: number;
    recoveryCalls: number;         // how many retries/reprompts happened
    tombstones: Tombstone[];       // permanent failures (empty = perfect run)
    agentHealths: {
      researcher: { overall: 0.97, state: 'HEALTHY', ... },
      critic:     { overall: 0.91, state: 'HEALTHY', ... },
    }
  };
  totalLatencyMs: number;
  totalTokens: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;       // tokens served from cache (cheap)
    cacheWriteTokens: number;
  };
  totalCost: number;               // USD
}
```

The `transcript` is append-only. Every `TranscriptEntry` has the agent name, round number, content, timestamp, and an optional `tombstone` if that agent permanently failed. You can replay the entire conversation from this array.

---

## Step 6 — Try the other protocols

**Sequential** — agent B sees agent A's output:

```typescript
const team = new Team({
  protocol: 'sequential',
  agents: [researcherConfig, writerConfig, editorConfig],
});
```

**Parallel** — all agents run simultaneously:

```typescript
const team = new Team({
  protocol: 'parallel',
  agents: [analyst1Config, analyst2Config, analyst3Config],
});
```

**Parallel-then-synthesize** — run in parallel, one agent summarizes:

```typescript
const team = new Team({
  protocol: 'parallel-then-synthesize',
  synthesizerAgentId: 'synthesizer',
  agents: [analyst1Config, analyst2Config, synthesizerConfig],
});
```

---

## Step 7 — Watch it self-heal

Run the debate demo with a live API key:

```bash
nexus run debate
```

Midway through, one agent will hit a deliberate failure. Watch the terminal:

```
[self-heal] Agent:ResearcherA — rate_limit detected
[recovery]  strategy: exponential_backoff_with_jitter (attempt 1/5)
[self-heal] Agent:ResearcherA — recovered after 2.3s
```

Or if it can't recover:

```
[tombstone] Agent:CriticD — reflection_cap_breach after 2 retries
[pipeline]  Continuing without Agent:CriticD
```

The pipeline doesn't stop. It documents the failure and moves on.

---

## Step 8 — Check agent health

```bash
nexus health
```

Shows a table of all agents from the last run: health score, state (HEALTHY / DEGRADED / RECOVERING / FAILED), success rate, average latency, and recovery rate.

---

## What's next

- [Architecture](ARCHITECTURE.md) — understand the system design before you build on it
- [Self-Healing Deep Dive](SELF-HEALING.md) — the error taxonomy, circuit breaker, and tombstone contract in detail
- Graph API — when `Team` isn't enough and you need explicit topology control (see `packages/nexus-core/src/graph/`)
