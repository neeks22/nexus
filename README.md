# Nexus — Orchestrate AI Agents That Fix Themselves

> Resilient agent teams for production Node.js. Multi-agent pipelines that self-heal — no oncall required.

[![npm](https://img.shields.io/npm/v/nexus-core?color=0ea5e9&label=nexus-core)](https://www.npmjs.com/package/nexus-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-vitest-729b1b)](https://vitest.dev/)

---

## The Problem

88% of AI agent projects fail before production.

When one agent crashes in a multi-agent pipeline — rate limit, timeout, malformed output, context overflow — everything falls apart. You get a stack trace and silence. Your pipeline is dead, your task is unfinished, and you have no idea which agent failed, why, or what it was doing.

You built a team of agents. They don't act like a team.

---

## The Solution

Nexus wraps every agent API call in a self-healing pipeline. Agents detect their own failures, classify them, apply the right recovery strategy, and retry — automatically. If an agent can't recover, the team continues without it and reports exactly what happened, with a structured `Tombstone` that documents the failure permanently.

You get a complete transcript, per-agent health scores, and a healing summary — every time, whether it succeeded or not.

```
[self-heal] Agent:ResearcherA timed out → redistributed to Agent:ResearcherB
[circuit-breaker] Agent:WriterC opened after 3 failures → bypassed
[tombstone] Agent:CriticD reflection_cap_breach → sealed, pipeline continued
```

---

## Quick Start

```bash
npm install nexus-core
```

```typescript
import { Team, Agent } from 'nexus-core';

const team = new Team({
  protocol: 'debate',
  rounds: 2,
  agents: [
    {
      id: 'researcher',
      name: 'Researcher',
      systemPrompt: 'You are a rigorous researcher. Cite evidence.',
      model: 'claude-sonnet-4-20250514',
    },
    {
      id: 'critic',
      name: 'Critic',
      systemPrompt: 'You are a sharp critic. Challenge every assumption.',
      model: 'claude-sonnet-4-20250514',
    },
  ],
});

const result = await team.run({ topic: 'Is TypeScript worth it for small teams?' });

console.log(result.healingSummary);
// { totalCalls: 4, successfulCalls: 4, failedCalls: 0, tombstones: [] }
```

That's it. Two agents, a structured debate, full self-healing, cost tracking, and an immutable transcript — in 10 lines.

---

## The Self-Healing Pipeline

Every single agent API call passes through this pipeline. No exceptions.

```
┌──────────────┐
│  PRE-FLIGHT  │  Token count checked before execution. Context overflow
│              │  detected and trimmed before a single token is sent.
└──────┬───────┘
       │
┌──────▼───────┐
│   EXECUTE    │  The actual API call to the model.
└──────┬───────┘
       │
┌──────▼───────┐
│   VALIDATE   │  Output checked: empty? too short? off-topic? malformed?
└──────┬───────┘
       │ failure
┌──────▼───────┐
│   DIAGNOSE   │  Error classified as infrastructure or output quality.
│              │  Selects the right recovery strategy automatically.
└──────┬───────┘
       │
┌──────▼───────┐
│   RECOVER    │  Infrastructure: exponential backoff, jitter, token reduction.
│              │  Output quality: reprompt, format hint, topic reminder.
└──────┬───────┘
       │
┌──────▼───────┐
│    RETRY     │  Re-executes with recovery applied. Tracks attempt count.
│              │  Cap reached → emit Step.tombstone. Pipeline continues.
└──────┬───────┘
       │
┌──────▼───────┐
│ UPDATE HEALTH│  Agent health score updated. Circuit breaker state advanced.
└──────────────┘
```

---

## Features

**Self-healing on every API call**
Circuit breaker (3-strike, 60s reset), health tracking across a rolling 20-call window, and a two-category error taxonomy with 15+ distinct recovery strategies.

**4 orchestration protocols**
- `sequential` — agents hand off to each other in order
- `parallel` — all agents run simultaneously, results collected
- `debate` — agents respond to each other in rounds
- `parallel-then-synthesize` — parallel execution, one agent synthesizes the results

**Immutable transcript**
Append-only. No agent can overwrite or mutate another agent's output. Debugging is reading a receipt, not doing archaeology.

**Prompt caching**
Cache breakpoints placed at the end of the system prompt block. The append-only transcript accumulates cache hits automatically. 10x input cost reduction on cached reads ($0.30/MTok vs $3.00/MTok). A 5-agent, 3-round debate: ~$0.18 uncached → ~$0.03 cached.

**Step.tombstone — the failure contract**
Every permanent failure emits a structured `Tombstone` with a named reason. A step that ends without resolution or tombstone is an architectural violation. The pipeline always knows what happened and why.

**Beautiful terminal output**
Colored agent names, real-time streaming, health indicators, and a healing summary table at the end.

**TypeScript-first, strict mode**
Full type safety throughout. `unknown` instead of `any`. Every interface exported. IDE autocomplete that actually works.

**`--dry-run` mode**
Run the full pipeline with mock responses. No API key required. Perfect for testing failure paths and CI.

---

## The Debate Arena Demo

```bash
# No API key needed
npx nexus-cli run debate --dry-run

# With your Anthropic key
ANTHROPIC_API_KEY=sk-... npx nexus-cli run debate

# Check agent health
npx nexus-cli health
```

The debate arena spins up 5 agents across 3 rounds, deliberately introduces failures mid-run, and shows the self-healing system recover in real time. It's the fastest way to understand what Nexus does.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  nexus-cli                       │
│   nexus run debate | nexus health | nexus init   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│                 nexus-core                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   Team   │  │  Graph   │  │  Transcript   │  │
│  │ (ergonomic│  │(topology │  │ (append-only) │  │
│  │  surface)│  │ control) │  │               │  │
│  └─────┬────┘  └────┬─────┘  └───────────────┘  │
│        │            │                            │
│  ┌─────▼────────────▼──────────────────────────┐ │
│  │          SelfHealingEngine                  │ │
│  │  CircuitBreaker · HealthTracker             │ │
│  │  ErrorClassifier · ReflectionLoop           │ │
│  │  OutputValidator · RecoveryStrategies        │ │
│  └─────────────────────┬───────────────────────┘ │
│                        │                         │
│  ┌─────────────────────▼───────────────────────┐ │
│  │           AnthropicProvider                 │ │
│  │  Prompt caching · Token counting            │ │
│  │  Streaming · Batch guard                    │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Team** is the ergonomic API. Give it agents and a protocol, call `team.run()`.

**Graph** is the execution model underneath. Agents are nodes, edges carry handoff conditions. Use Graph when you need explicit topology control.

**Transcript** is the shared memory. Append-only, immutable, structured as `TranscriptEntry[]`. Every agent reads the full transcript; only the system writes to it.

**SelfHealingEngine** wraps every API call. You never call the provider directly.

---

## vs The Competition

| Feature | Nexus | CrewAI | LangGraph | Mastra |
|---|---|---|---|---|
| Self-healing on every call | **Yes** | No | No | No |
| Circuit breaker | **Yes** | No | No | No |
| Error taxonomy (15+ types) | **Yes** | Basic | Basic | No |
| Immutable transcript | **Yes** | No | No | No |
| Step.tombstone contract | **Yes** | No | No | No |
| Prompt caching built-in | **Yes** | No | No | No |
| Pre-flight token counting | **Yes** | No | No | No |
| TypeScript-first | **Yes** | No (Python) | Partial | Yes |
| `--dry-run` (no API key) | **Yes** | No | No | No |
| Named constant thresholds | **Yes** | No | No | No |
| Production-ready v0.1 | **Yes** | Partial | Partial | Partial |

CrewAI and LangGraph are powerful for Python teams building research workflows. Mastra is excellent for authoring individual agents. Nexus is for running agent teams at scale in Node.js without them dying on you.

---

## Documentation

- [Quickstart](docs/QUICKSTART.md) — npm install to running a debate in 5 minutes
- [Architecture](docs/ARCHITECTURE.md) — System design with mermaid diagrams
- [Self-Healing Deep Dive](docs/SELF-HEALING.md) — Error taxonomy, circuit breaker, health scoring, recovery strategies

---

## License

MIT
