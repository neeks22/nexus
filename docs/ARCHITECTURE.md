# Architecture

Nexus is a multi-layer system. Each layer has a single job, and they compose cleanly.

---

## Overall Architecture

```mermaid
graph TD
    CLI["nexus-cli<br/>nexus run | nexus health | nexus init"]
    Team["Team<br/>Ergonomic surface<br/>protocol: sequential | parallel | debate | parallel-then-synthesize"]
    Graph["Graph<br/>Execution topology<br/>Nodes = Agents, Edges = conditions"]
    Transcript["Transcript<br/>Append-only, immutable<br/>Shared read-only memory"]
    SHE["SelfHealingEngine<br/>Every API call goes through here"]
    CB["CircuitBreaker<br/>CLOSED → OPEN → HALF_OPEN"]
    HT["HealthTracker<br/>Rolling 20-call window<br/>Score: 0.0–1.0"]
    EC["ErrorClassifier<br/>Infrastructure | Output Quality<br/>15+ error types, 14+ strategies"]
    RL["ReflectionLoop<br/>Quality validation<br/>Cap: 2 retries, then tombstone"]
    Provider["AnthropicProvider<br/>Prompt caching · Token counting<br/>Streaming · Batch guard"]

    CLI --> Team
    Team --> Graph
    Graph --> Transcript
    Graph --> SHE
    SHE --> CB
    SHE --> HT
    SHE --> EC
    SHE --> RL
    SHE --> Provider
```

---

## The Self-Healing Pipeline

Every agent API call — every single one — passes through this pipeline. There is no way to bypass it.

```mermaid
flowchart TD
    Start([Agent.run called]) --> PF

    PF["PRE-FLIGHT<br/>Count tokens via /v1/messages/count_tokens<br/>Truncate oldest non-system entries if overflow"]
    PF --> EX

    EX["EXECUTE<br/>Call AnthropicProvider<br/>Stream response"]
    EX -->|success| VA
    EX -->|error| DI

    VA["VALIDATE<br/>OutputValidator checks:<br/>empty? too short? off-topic?<br/>malformed? refusal? repetition?"]
    VA -->|valid| UH
    VA -->|invalid| DI

    DI["DIAGNOSE<br/>ErrorClassifier.classify()<br/>Category: infrastructure | output_quality<br/>Strategy selected automatically"]
    DI --> RE

    RE{"Can recover?<br/>retries < max?<br/>circuit not OPEN?"}
    RE -->|yes| RV
    RE -->|no| TB

    RV["RECOVER<br/>Infrastructure: backoff, jitter,<br/>token reduction, truncation<br/>Output quality: reprompt, format hint,<br/>topic reminder, novelty hint"]
    RV --> RT

    RT["RETRY<br/>Re-execute with recovery applied<br/>Increment attempt counter"]
    RT --> EX

    TB["TOMBSTONE<br/>createTombstone(stepId, agentId, reason)<br/>Sealed in Transcript<br/>Pipeline continues without this agent"]
    TB --> UH

    UH["UPDATE HEALTH<br/>HealthTracker.record(success | failure)<br/>CircuitBreaker.record()<br/>Recalculate HealthScore"]
    UH --> End([Return AgentRunResult])
```

The `AgentRunResult` always comes back — whether the call succeeded, recovered, or tombstoned. The caller always gets a result. The system never hangs silently.

---

## Team + Graph Dual Layer

Nexus exposes two levels of abstraction. Most developers start with `Team`. Some graduate to `Graph`.

```mermaid
graph LR
    subgraph "Team Layer (Ergonomic)"
        TC["TeamConfig<br/>agents[], protocol, rounds"]
        TR["team.run(topic)"]
        TP["Protocol Engine<br/>sequential | parallel<br/>debate | parallel-then-synthesize"]
    end

    subgraph "Graph Layer (Topology Control)"
        GN["GraphNode<br/>id + AgentConfig"]
        GE["GraphEdge<br/>from → to<br/>condition?: GraphContext → boolean"]
        GC["GraphContext<br/>transcript, currentStepId, metadata"]
        GX["graph.execute()"]
    end

    TC --> TP
    TR --> TP
    TP --> GN
    TP --> GE
    GN --> GX
    GE --> GX
    GC --> GE
```

**Team** builds the graph for you based on the protocol. You tell it what agents you have and how they should relate. It handles the topology.

**Graph** exposes the underlying execution model directly. Every agent is a `GraphNode`. Every handoff is a `GraphEdge` with an optional condition function. When you need to route based on what a previous agent said — e.g., "only send to the critic if the researcher found conflicting evidence" — you use Graph directly.

The rule: if you can't draw the system as a static diagram before running it, the abstraction has failed you. Graph forces you to draw it.

---

## Transcript Data Flow

The Transcript is the shared memory between agents. It is append-only. No entry is ever modified or deleted after writing.

```mermaid
sequenceDiagram
    participant A1 as Agent: Researcher
    participant T as Transcript
    participant A2 as Agent: Critic
    participant A3 as Agent: Synthesizer

    A1->>T: append(entry: round=1, content="...")
    Note over T: Entry sealed. ID + timestamp assigned.

    T-->>A2: read full transcript (immutable snapshot)
    A2->>T: append(entry: round=1, content="...")
    Note over T: Entry sealed.

    T-->>A1: read full transcript
    A1->>T: append(entry: round=2, content="...")
    Note over T: Entry sealed.

    T-->>A2: read full transcript
    A2->>T: append(entry: round=2, content="...")
    Note over T: Entry sealed.

    T-->>A3: read full transcript (all 4 entries)
    A3->>T: append(entry: round=3, content="synthesis...")
    Note over T: Entry sealed.

    T-->>Caller: transcript[] — complete, immutable record
```

This design has three consequences that matter:

1. **No silent degradation.** An agent can't overwrite a previous response to hide a failure. The tombstone always shows up in the transcript.

2. **Prompt caching works perfectly.** The system prompt is a stable prefix. The transcript is a growing tail. Anthropic's cache breakpoint sits at the end of the system prompt, and every new round gets more cache hits for free.

3. **Debugging is reading a receipt.** The full transcript is a complete, ordered log of everything that happened. You don't need to reconstruct state.

---

## Circuit Breaker State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED

    CLOSED --> OPEN : 3 consecutive failures\n(CIRCUIT_BREAKER_FAILURE_THRESHOLD)
    OPEN --> HALF_OPEN : 60 seconds elapsed\n(CIRCUIT_BREAKER_RESET_MS)
    HALF_OPEN --> CLOSED : test call succeeds
    HALF_OPEN --> OPEN : test call fails

    CLOSED : CLOSED\nAll calls pass through\nFailures counted
    OPEN : OPEN\nAll calls rejected immediately\nNo API calls made\nTombstone emitted
    HALF_OPEN : HALF_OPEN\nOne test call allowed\nResult determines next state
```

When the circuit is OPEN, the agent is bypassed entirely — no API call is made. The `SelfHealingEngine` emits a tombstone with `reason: 'circuit_breaker_open'` and the pipeline continues with the remaining agents.

---

## Health Score Composition

Health is not a single metric. It's a weighted composite of four signals, each measuring a different failure mode.

```
overall = (successRate × 0.30)
        + (latencyScore × 0.15)
        + (qualityScore × 0.30)
        + (recoveryRate × 0.25)
```

| Signal | Weight | What it measures |
|---|---|---|
| `successRate` | 30% | Fraction of calls that succeeded without error |
| `latencyScore` | 15% | How fast responses come back (scored against breakpoints) |
| `qualityScore` | 30% | Output validation pass rate (empty, malformed, off-topic) |
| `recoveryRate` | 25% | When failures happen, how often the agent recovers |

Health states and their thresholds (all named constants in `config/thresholds.ts`):

| State | Threshold | Meaning |
|---|---|---|
| `HEALTHY` | ≥ 0.85 | Normal operation |
| `DEGRADED` | ≥ 0.40 | Elevated failures, circuit breaker watching |
| `RECOVERING` | ≥ 0.15 | Agent has been restored, rebuilding score |
| `FAILED` | < 0.15 | Circuit breaker likely OPEN, tombstones likely present |

All of these are configurable. The values in `thresholds.ts` are calibrated starting points, not magic numbers. Change one constant, it changes everywhere.

---

## Package Structure

```
nexus/
├── packages/
│   ├── nexus-core/          # Framework — Agent, Team, Graph, SelfHealingEngine
│   │   └── src/
│   │       ├── agent/       # Agent class
│   │       ├── team/        # Team class + protocol runners
│   │       ├── graph/       # Graph class + execution engine
│   │       ├── transcript/  # Transcript (append-only)
│   │       ├── healing/     # CircuitBreaker, HealthTracker, ErrorClassifier,
│   │       │                #   ReflectionLoop, OutputValidator, RecoveryStrategies
│   │       ├── provider/    # AnthropicProvider (caching, token counting)
│   │       ├── config/      # thresholds.ts — all named constants
│   │       └── types.ts     # All interfaces, exported
│   └── nexus-agents/        # Pre-built agent personas
├── apps/
│   └── nexus-cli/           # CLI: nexus run | nexus health | nexus init
├── examples/
│   ├── debate-arena/        # 5-agent debate demo
│   └── code-review-team/    # Code review pipeline demo
└── tests/                   # Integration tests
```
