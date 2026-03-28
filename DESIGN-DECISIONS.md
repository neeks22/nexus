# Nexus v0.1 — Design Decisions (Post-Debate)

## Debate Summary
- **6 agents**, **4 rounds**, **24 total responses**
- Debated on: 2026-03-28
- Agents: Researcher, Philosopher, Contrarian, Pragmatist, Business Strategist, Synthesizer

---

## Confirmed Decisions

### 1. Immutable Transcript (Append-Only)
The shared conversation memory between agents is **append-only and immutable**. No agent can overwrite or mutate previous entries. This structurally eliminates silent degradation (the Contrarian's top concern) and makes debugging a matter of reading a receipt, not archaeology. Every entry is sealed once written.

### 2. Team + Graph Dual Layer
- **Team** = the ergonomic surface for day-one developers (`team.run(task)`)
- **Graph** = the underlying execution model (agents as nodes, edges carry handoff conditions)
- Developers start with Team, graduate to Graph when they need topology control
- Test: if you can't draw the system as a static diagram before running it, the abstraction failed

### 3. Step.tombstone — Mandatory Terminal Failure State
Every step in the execution graph carries an explicit terminal failure state. When a step fails permanently (cap breach, unrecoverable error, total timeout), it emits a `Step.tombstone` with a structured `reason` field. This is **not optional**. A step that ends without resolution or tombstone is an architectural violation.

```typescript
interface Tombstone {
  stepId: string;
  reason: 'reflection_cap_breach' | 'circuit_breaker_open' | 'total_timeout' | 'unrecoverable_error';
  timestamp: number;
  lastAttempt: unknown; // the last response/error before tombstoning
}
```

### 4. ReflectionLoop Hard Cap at 2
The quality-check loop (cheap model call validating agent output) retries a maximum of 2 times. This is a **named constant** (`REFLECTION_MAX_RETRIES = 2`), not a magic number. When the cap is breached, the loop emits `Step.tombstone` with `reason: "reflection_cap_breach"` and returns control to the caller. No silent passthrough.

### 5. Prompt Caching as Architectural Requirement
Not an optimization — a structural necessity. Evidence (Researcher, Round 3):
- Cache breakpoints placed at end of system prompt block (stable prefix)
- Immutable Transcript maps perfectly — growing tail accumulates cache hits automatically
- **10x input cost reduction** on cached reads ($0.30/MTok vs $3.00/MTok)
- Write premium (1.25x) breaks even after a single cache read
- A 5-agent, 3-round debate: ~$0.18 without caching → ~$0.03 with caching

### 6. Pre-Flight Token Counting
Context overflow is detected **before execution**, not after. Uses Anthropic's `/v1/messages/count_tokens` endpoint (~50-200ms latency, no inference cost). If the payload exceeds model context limits, the oldest non-system Transcript entries are truncated, preserving the cached system prefix.

### 7. All Thresholds as Named Constants
No magic numbers anywhere in the codebase. Every threshold lives in a single configuration file with a name that explains why it exists:
```typescript
// nexus-core/src/config/thresholds.ts
export const HEALTH_HEALTHY_THRESHOLD = 0.85;
export const HEALTH_DEGRADED_THRESHOLD = 0.40;
export const HEALTH_RECOVERING_THRESHOLD = 0.15;
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
export const CIRCUIT_BREAKER_RESET_MS = 60_000;
export const REFLECTION_MAX_RETRIES = 2;
```

### 8. Error Taxonomy Split: Infrastructure vs Output Quality
Two distinct categories with different recovery paths:
- **Infrastructure errors**: rate_limit, api_overloaded, api_timeout, context_overflow, server_error, auth_error, network_error (→ retry/backoff/circuit breaker)
- **Output quality errors**: empty_response, malformed_response, off_topic, too_long, too_short, refusal, no_agent_reference, repetition (→ ReflectionLoop/reprompt)

### 9. Runtime Guard: Batch API Blocked on Realtime Flows
The Batch API (50% cost discount, up to 24h processing) and Realtime streaming are **mutually exclusive by API design**. A runtime guard prevents accidental use of Batch on any flow that expects streaming results.

### 10. `--dry-run` as First-Class CLI Flag
- Exercises the full pipeline with mock responses (no API calls)
- Skips API key validation (so new devs can try without credentials)
- Validates the tombstone contract and failure paths
- Ships as part of v0.1, not a test-only feature

### 11. Supabase Deferred to v0.2
v0.1 writes transcripts and health data to local JSON files. Supabase (auth, database, realtime, storage) moves to v0.2 when we know the actual schema from production usage.

---

## Design Changes (What the Debate Changed)

| Original Design | Post-Debate Design | Why |
|---|---|---|
| Mutable shared Transcript | Immutable append-only Transcript | Eliminates silent degradation (Contrarian), makes cache work (Researcher) |
| Team class handles all protocols | Team + Graph dual layer | Team hides topology; Graph makes it explicit (Philosopher) |
| ReflectionLoop with no cap | Hard cap at 2, emits tombstone on breach | Prevents cost spirals (Pragmatist), enforces failure contract (Contrarian) |
| Supabase in v0.1 | Supabase deferred to v0.2 | YAGNI — framework concerns before product concerns (Philosopher, Pragmatist) |
| Context overflow caught post-execution | Pre-flight via token counting API | Prevents wasted retries on structurally impossible requests (Researcher) |
| Magic number thresholds | Named constants in single config | Prevents threshold drift across files (Researcher) |
| Happy-path demo | Failure-path demo | "Holy shit" = watching self-healing happen live (Business Strategist) |
| No terminal failure state | Step.tombstone mandatory on every step | "Seal the failure contract" (Philosopher, Contrarian, Pragmatist) |

---

## V0.1 Scope

### IN:
- [x] nexus-core: Agent, Team, Graph, Transcript (immutable), SelfHealingEngine
- [x] Self-healing pipeline: PRE-FLIGHT → EXECUTE → VALIDATE → [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH
- [x] Step.tombstone on every failure path
- [x] AnthropicProvider with prompt caching (cache breakpoints on system prefix)
- [x] Pre-flight token counting
- [x] Error taxonomy (infrastructure + output quality split)
- [x] CircuitBreaker, HealthTracker with named constant thresholds
- [x] ReflectionLoop (cap at 2, tombstone on breach)
- [x] OutputValidator (sync validation)
- [x] nexus-cli: `nexus run debate`, `nexus health`, `nexus init`
- [x] `--dry-run` flag (no API key required)
- [x] debate-arena demo (5 agents, multi-round, self-healing report)
- [x] Code Review Team demo (second use case proving generality)
- [x] Docs: README, QUICKSTART, ARCHITECTURE, SELF-HEALING
- [x] npm publish config for nexus-agents and nexus-cli

### DEFERRED TO V0.2:
- [ ] Supabase integration (auth, database, realtime, storage)
- [ ] Web dashboard for watching debates live
- [ ] Total-outage contract (flow-level tombstone)
- [ ] Cross-step failure inheritance model
- [ ] Cap-breach escalation policy beyond "caller decides"
- [ ] Monitoring/observability layer beyond Transcript
- [ ] OpenAI provider
- [ ] Batch API integration (for non-realtime bulk processing)

---

## Open Questions (Require Resolution During Build)

1. **Cross-step failure inheritance**: If Step A tombstones and Step B depends on A's output, what is B's obligation? Inherit failure? Tombstone independently? Graph absorbs it?
2. **Total-outage behavior**: When the entire API layer is dark, what's the contract with the caller? Is there a flow-level tombstone?
3. **Cap-breach escalation**: "Caller decides" is the current answer. What does that mean in practice for the debate-arena demo?
4. **Health threshold calibration**: 0.85/0.40/0.15 are configurable starting points. Need baseline data from real usage before tuning.

---

## Positioning

**Headline**: Nexus — Orchestrate AI Agents That Fix Themselves

**Tagline**: Resilient agent teams for production Node.js

**vs Mastra**: Mastra is about authoring agents. Nexus is about running them at scale without them dying on you.

**The "holy shit" moment**: Install Nexus, spin up two agents, deliberately break one mid-task, watch the orchestrator detect the failure, reassign the subtask, and complete the pipeline anyway — with a log line that says `[self-heal] Agent:ResearcherA timed out → redistributed to Agent:ResearcherB`.

---

## Killer Insight

> "Every constraint in the system must be an event, and every event must have a named exit."
>
> A cap is not a safety mechanism unless breaching it produces a contract. The ReflectionLoop cap is not the number 2. It is: *when the loop count reaches 2, emit Step.tombstone with reason: "reflection_cap_breach" and return control to the caller.*
>
> — Synthesized from Contrarian + Pragmatist + Philosopher

**North star**: "Seal the failure contract and this architecture deserves to ship." — The Philosopher
