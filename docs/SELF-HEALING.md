# Self-Healing Engine — Deep Dive

This document covers the internals of Nexus's self-healing system. If you're skeptical that "self-healing" is a real thing and not a marketing word, read this first.

---

## What "self-healing" actually means

Every agent API call flows through a pipeline that:

1. Counts tokens before sending (prevents context overflow surprises)
2. Classifies every error into one of 15 named types
3. Selects a recovery strategy specific to that error type
4. Retries with the strategy applied
5. Tracks the agent's health across a rolling window
6. Emits a structured `Tombstone` when recovery is impossible

"Self-healing" means the pipeline handles failures automatically without caller intervention, and documents every failure permanently when it can't recover. It does not mean failures disappear. It means they're handled correctly and reported honestly.

---

## Error Taxonomy

Nexus classifies every error into one of two categories. The category determines the recovery path. Putting the wrong error in the wrong category wastes retries or misses the actual problem.

### Infrastructure Errors

These are API and network failures. The agent's logic is fine; the transport layer is broken. Recovery is about waiting and retrying.

| Error Type | Trigger | Default Strategy | Max Retries |
|---|---|---|---|
| `rate_limit` | HTTP 429 | `exponential_backoff_with_jitter` | 5 |
| `api_overloaded` | HTTP 529, "overloaded" | `exponential_backoff` | 3 |
| `api_timeout` | Request timeout | `retry_after_delay` | 2 |
| `context_overflow` | Token limit exceeded | `truncate_and_retry` | 1 |
| `server_error` | HTTP 5xx | `retry_with_backoff` | 3 |
| `auth_error` | HTTP 401 | `tombstone` | 0 |
| `network_error` | DNS, connection refused | `exponential_backoff_with_jitter` | 3 |

`auth_error` immediately tombstones — there is no retry that will fix a bad API key. `context_overflow` gets exactly one retry after truncation. Everything else backs off and retries.

### Output Quality Errors

These are content failures. The API returned something — it just wasn't useful. Recovery is about changing what you asked for.

| Error Type | Trigger | Default Strategy | Max Retries |
|---|---|---|---|
| `empty_response` | Content is empty or whitespace | `reprompt` | 2 |
| `malformed_response` | Can't parse expected structure | `reprompt_with_format_hint` | 2 |
| `off_topic` | Response doesn't address the topic | `reprompt_with_topic_reminder` | 2 |
| `too_long` | Response exceeds length threshold | `reprompt_with_length_hint` | 2 |
| `too_short` | Response below minimum length | `reprompt_with_length_hint` | 2 |
| `refusal` | Model declined to answer | `reprompt_with_reframe` | 2 |
| `no_agent_reference` | Debate response ignores other agents | `reprompt_with_instruction` | 2 |
| `repetition` | Content repeats a previous response | `reprompt_with_novelty_hint` | 2 |

Output quality errors go to the `ReflectionLoop`, not the infrastructure retry logic. A different model (claude-haiku) does the validation — fast and cheap.

### Why the split matters

If you treat an `off_topic` response like a `rate_limit`, you reprompt when you should back off. If you treat a `rate_limit` like an `off_topic`, you back off when you should be adjusting your prompt. Conflating the two categories wastes money and time.

The error classifier looks at HTTP status codes, error message patterns, and response content to determine which category applies. It never guesses — if it can't classify, it uses `'unknown'` with the `tombstone` strategy.

```typescript
import { classifyError } from 'nexus-core';

const classification = classifyError(error);
// {
//   type: 'rate_limit',
//   category: 'infrastructure',
//   strategy: 'exponential_backoff_with_jitter',
//   maxRetries: 5,
//   backoffBaseMs: 2000,
//   description: 'Rate limit exceeded — back off with jitter'
// }
```

---

## Circuit Breaker

The circuit breaker prevents cascading failures. When an agent starts failing repeatedly, the circuit opens and the agent is bypassed entirely until it proves it can handle a call again.

### States

```
CLOSED → normal operation, all calls pass through
OPEN   → agent bypassed, calls return tombstone immediately (no API hit)
HALF_OPEN → one test call allowed to probe recovery
```

### Transitions

```
CLOSED + 3 consecutive failures  → OPEN
OPEN   + 60 seconds elapsed      → HALF_OPEN
HALF_OPEN + success              → CLOSED
HALF_OPEN + failure              → OPEN (reset the 60s timer)
```

Both thresholds are named constants:

```typescript
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;   // consecutive failures to open
export const CIRCUIT_BREAKER_RESET_MS = 60_000;       // ms before probing recovery
```

### What "OPEN" means in practice

When the circuit is OPEN and `CircuitBreaker.canAttempt()` returns false, the `SelfHealingEngine` does not make an API call. It creates a tombstone immediately with `reason: 'circuit_breaker_open'` and returns it as the `AgentRunResult`. The team/graph sees the result and continues with the remaining agents.

This is intentional. An OPEN circuit means the agent has demonstrated it can't handle calls right now. Retrying anyway would pile failures on top of failures and burn through rate limits for a provider that's clearly struggling.

```typescript
import { CircuitBreaker } from 'nexus-core';

const cb = new CircuitBreaker();

if (!cb.canAttempt()) {
  // Circuit is OPEN — emit tombstone, skip the call
  return createTombstone(stepId, agentId, 'circuit_breaker_open', lastAttempt, retriesExhausted);
}

try {
  const result = await provider.call(request);
  cb.recordSuccess();
  return result;
} catch (err) {
  cb.recordFailure();
  // ... classify and recover
}
```

---

## Health Scoring Algorithm

Every agent has a `HealthScore` that updates after every call. The score is a weighted composite of four signals across a rolling 20-call window (`HEALTH_WINDOW_SIZE = 20`).

### Formula

```
overall = (successRate   × HEALTH_WEIGHT_SUCCESS_RATE)   // 0.30
        + (latencyScore  × HEALTH_WEIGHT_LATENCY)         // 0.15
        + (qualityScore  × HEALTH_WEIGHT_QUALITY)         // 0.30
        + (recoveryRate  × HEALTH_WEIGHT_RECOVERY)        // 0.25
```

Weights sum to 1.0. This is enforced — the constants file documents it explicitly.

### Latency scoring

Latency is bucketed, not linear. A 1900ms response and a 100ms response are both "excellent." A 20001ms response and a 50000ms response are both "poor." This prevents small jitter from tanking the score.

```
≤ 2,000ms  → 1.00  (excellent)
≤ 5,000ms  → 0.75  (good)
≤ 10,000ms → 0.50  (acceptable)
≤ 20,000ms → 0.25  (poor)
> 20,000ms → 0.00  (unacceptable)
```

### Health states

```typescript
export const HEALTH_HEALTHY_THRESHOLD   = 0.85;
export const HEALTH_DEGRADED_THRESHOLD  = 0.40;
export const HEALTH_RECOVERING_THRESHOLD = 0.15;
```

| Score | State | Meaning |
|---|---|---|
| ≥ 0.85 | `HEALTHY` | Normal — circuit CLOSED, full operation |
| ≥ 0.40 | `DEGRADED` | Elevated failures — circuit watching |
| ≥ 0.15 | `RECOVERING` | Was bad, improving — circuit probing |
| < 0.15 | `FAILED` | Circuit likely OPEN — tombstones likely |

The window rolls. An agent that tombstones 10 times but then recovers will see its score improve as old failures fall off the 20-call window. `RECOVERING` is a real state, not just a label.

---

## Recovery Strategies

When the classifier selects a strategy, the `SelfHealingEngine` applies it before retrying. Here's what each strategy actually does:

### Infrastructure strategies

**`exponential_backoff`**
Waits `backoffBaseMs × 2^attempt` before retrying. No randomness. Used when you want predictable retry timing.

**`exponential_backoff_with_jitter`**
Waits `backoffBaseMs × 2^attempt × random(0.5, 1.5)`. Prevents thundering herd — multiple agents hitting the same rate-limited endpoint all at the same time.

**`retry_with_reduced_tokens`**
Reduces `maxTokens` by 30% before retrying. Used when the provider signals the request is too heavy.

**`truncate_and_retry`**
For `context_overflow`: removes the oldest non-system `TranscriptEntry` entries until the token count fits, then retries. The system prompt prefix is always preserved (it's the cache anchor).

**`retry_after_delay`**
Flat delay before retry. Used for timeouts where backoff isn't needed.

**`retry_with_backoff`**
Simple backoff without jitter. For server errors where thundering herd isn't a concern.

**`tombstone`**
No retry. Used for `auth_error` — nothing will fix this without human intervention.

### Output quality strategies

All reprompt strategies inject additional instruction into the next call's user message. They don't change the agent's system prompt — that stays stable for caching.

**`reprompt`** — plain retry with the same input (for transient empty responses)

**`reprompt_with_format_hint`** — appends "Please respond in the expected format: [schema]"

**`reprompt_with_topic_reminder`** — appends "Please focus your response on: [topic]"

**`reprompt_with_length_hint`** — appends specific length guidance (too long: shorten; too short: expand)

**`reprompt_with_reframe`** — for refusals: reframes the request to address the model's concern

**`reprompt_with_instruction`** — for `no_agent_reference` in debates: explicitly instructs the agent to reference prior responses

**`reprompt_with_novelty_hint`** — for `repetition`: instructs the agent to introduce a new angle not yet covered in the transcript

---

## ReflectionLoop and the Cap

The `ReflectionLoop` is the output quality validator. When an agent returns a response, the loop runs a cheap validation call (using `claude-haiku-4-5-20251001`) to check whether the output actually meets quality criteria. If it doesn't, the loop reprompts and retries.

The loop has a hard cap: **2 retries maximum** (`REFLECTION_MAX_RETRIES = 2`).

### Why the cap exists

Without a cap, a quality loop can spiral. An agent keeps producing subtly wrong output, the validator keeps rejecting it, and you burn through tokens and time indefinitely. The cap turns the loop into a bounded contract.

### What happens at cap breach

When the loop hits 2 retries without a passing response, it does not silently pass the bad output through. It does not throw an exception. It emits a `Tombstone` with `reason: 'reflection_cap_breach'` and returns control to the caller.

```typescript
// This is the contract:
const result = await reflectionLoop.run(agent, request, transcript);

if (isReflectionCapBreach(result)) {
  // result.tombstone is set
  // result.content may be the last attempt or empty
  // the caller (Team/Graph) continues without this agent
}
```

The `isReflectionCapBreach` guard is a typed discriminator. You don't have to check `tombstone !== undefined` — the type narrows for you.

### Validation logic

The `OutputValidator` runs synchronously. It checks:

1. Is the content non-empty and non-whitespace? (`empty_response`)
2. Is the content above the minimum length threshold? (`too_short`)
3. Is the content below the maximum length threshold? (`too_long`)
4. Does the content reference the debate topic? (`off_topic`) — keyword overlap check
5. Is the content identical or near-identical to a recent transcript entry? (`repetition`) — hash comparison
6. In debate mode: does the content reference other agents? (`no_agent_reference`)
7. Does the content signal a refusal? (`refusal`) — pattern match on "I cannot", "I'm not able to", etc.

These are all configurable. The validator uses the same `OutputErrorType` taxonomy as the classifier, so a validation failure feeds directly into the error classification pipeline.

---

## Step.tombstone — The Failure Contract

A `Tombstone` is the terminal failure state for an agent step. It is not an exception. It is a sealed, structured record of what failed, why, and when.

```typescript
interface Tombstone {
  stepId: string;           // which step in the execution graph
  agentId: string;          // which agent
  reason: TombstoneReason;  // named reason — see below
  timestamp: number;        // Unix ms
  lastAttempt: unknown;     // the last response/error before giving up
  retriesExhausted: number; // how many retries were attempted
}

type TombstoneReason =
  | 'reflection_cap_breach'  // quality loop hit REFLECTION_MAX_RETRIES
  | 'circuit_breaker_open'   // circuit was OPEN, call bypassed
  | 'total_timeout'          // wall-clock timeout for the entire step
  | 'auth_failure'           // bad credentials, no retry possible
  | 'unrecoverable_error';   // classifier returned tombstone strategy
```

### The contract

Every step in the execution graph has exactly two valid terminal states:

1. **Resolution** — the step produced a usable `AgentRunResult` with content
2. **Tombstone** — the step permanently failed and sealed a `Tombstone`

A step that ends without one of these two states is an architectural violation. The framework enforces this — `SelfHealingEngine` always produces one or the other.

This contract means the caller — `Team`, `Graph`, your application code — never has to handle partial states. You either get content or you get a sealed failure record. There is no "maybe it worked" ambiguity.

### Tombstones in the transcript

When a step tombstones, the `TranscriptEntry` for that agent includes the tombstone inline:

```typescript
{
  id: 'entry-007',
  agentId: 'critic',
  agentName: 'Critic',
  round: 2,
  content: '',             // empty — no usable output
  timestamp: 1711584000000,
  tombstone: {
    stepId: 'step-critic-r2',
    agentId: 'critic',
    reason: 'reflection_cap_breach',
    timestamp: 1711584000000,
    lastAttempt: 'The previous analysis was correct...',  // last attempt before giving up
    retriesExhausted: 2,
  }
}
```

The tombstone is permanent in the transcript. It can't be removed or modified. Any downstream agent reading the transcript can see that this agent failed and why.

### Pipeline behavior after tombstone

When a step tombstones, the `Team`/`Graph` continues without it. In a debate, the other agents still complete their rounds. In a parallel run, the surviving results are collected. The `HealingSummary` at the end of the run includes all tombstones, so the caller has full visibility.

The team does not abort. This is the core of the self-healing contract: **individual agent failures do not kill the pipeline**.

---

## Prompt Caching

Prompt caching is not a feature you turn on. It's an architectural requirement baked into how Nexus constructs API requests.

### How it works

Anthropic's prompt caching writes a snapshot of a request prefix to a short-term cache (~5 minutes). Subsequent requests with the same prefix pay $0.30/MTok for cache reads instead of $3.00/MTok for normal input — a 10x cost reduction. There's a 1.25x write premium on the first call, which breaks even after a single cache read.

Nexus places cache breakpoints at the end of the system prompt block. This is the stable anchor: the system prompt doesn't change between rounds, so it always hits the cache.

```
Request structure:
┌─────────────────────────────────────────┐
│  System Prompt (stable)                 │ ← cache breakpoint here
│  "You are a rigorous researcher..."     │
├─────────────────────────────────────────┤ ← cache hit on every request
│  Transcript round 1 (appended)          │
│  Transcript round 2 (appended)          │
│  Transcript round 3 (appended)          │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Why the immutable transcript makes caching work

Because the transcript is append-only, every previous round's content is unchanged from the cache's perspective. In a 3-round debate with 5 agents:

- Round 1: system prompt misses (first call), writes to cache
- Round 2: system prompt hits, transcript round 1 hits
- Round 3: system prompt hits, transcript rounds 1–2 hit
- By round 3, most of the input tokens are served from cache

If the transcript were mutable — if agents could edit previous entries — the cache prefix would change and every call would be a miss.

### Cost example (from real measurements)

A 5-agent, 3-round debate with `claude-sonnet-4-20250514`:

```
Without caching: ~$0.18
With caching:    ~$0.03
Reduction:       ~83%
```

The savings scale with transcript length. Longer debates save proportionally more.

### TokenUsage in every result

Every `AgentRunResult` and `TeamRunResult` includes a `TokenUsage` breakdown:

```typescript
interface TokenUsage {
  inputTokens: number;       // tokens billed at full price
  outputTokens: number;      // generated tokens
  cacheReadTokens: number;   // tokens served from cache (cheap)
  cacheWriteTokens: number;  // tokens written to cache (1.25x premium)
}
```

You can see exactly how much caching is saving you on every run.

---

## Pre-Flight Token Counting

Context overflow is detected before execution, not after. Nexus calls Anthropic's `/v1/messages/count_tokens` endpoint (~50–200ms, no inference cost) to verify the payload fits before sending it.

If the payload exceeds the model's context limit, Nexus truncates the oldest non-system `TranscriptEntry` entries until it fits — preserving the system prompt prefix (the cache anchor) and the most recent context. Then it proceeds.

This prevents a class of wasted retries: constructing a payload that's structurally impossible to execute, sending it, getting an error, and retrying with the same payload. Pre-flight catches it before the first attempt.

The truncation is logged so you can see when it happens:

```
[pre-flight] Agent:Researcher — context overflow detected (142,840 tokens > 128,000 limit)
[pre-flight] Truncating 3 oldest transcript entries → 119,204 tokens
[execute]    Agent:Researcher — proceeding
```

---

## All Thresholds Are Named Constants

Every number in the self-healing system has a name. There are no magic numbers.

```typescript
// packages/nexus-core/src/config/thresholds.ts

// Health
export const HEALTH_HEALTHY_THRESHOLD    = 0.85;
export const HEALTH_DEGRADED_THRESHOLD   = 0.40;
export const HEALTH_RECOVERING_THRESHOLD = 0.15;
export const HEALTH_WEIGHT_SUCCESS_RATE  = 0.30;
export const HEALTH_WEIGHT_LATENCY       = 0.15;
export const HEALTH_WEIGHT_QUALITY       = 0.30;
export const HEALTH_WEIGHT_RECOVERY      = 0.25;
export const HEALTH_WINDOW_SIZE          = 20;

// Circuit Breaker
export const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
export const CIRCUIT_BREAKER_RESET_MS          = 60_000;

// Reflection
export const REFLECTION_MAX_RETRIES = 2;
export const REFLECTION_MODEL       = 'claude-haiku-4-5-20251001';

// Retry limits per error type
export const RETRY_RATE_LIMIT_MAX       = 5;
export const RETRY_OVERLOADED_MAX       = 3;
export const RETRY_TIMEOUT_MAX          = 2;
export const RETRY_CONTEXT_OVERFLOW_MAX = 1;
export const RETRY_SERVER_ERROR_MAX     = 3;
export const RETRY_NETWORK_MAX          = 3;
export const RETRY_OUTPUT_QUALITY_MAX   = 2;

// Latency breakpoints
export const LATENCY_EXCELLENT_MS   = 2_000;
export const LATENCY_GOOD_MS        = 5_000;
export const LATENCY_ACCEPTABLE_MS  = 10_000;
export const LATENCY_POOR_MS        = 20_000;
```

Change a constant here, it changes everywhere. There's no threshold drift — no situation where "retry max" is 3 in one file and 5 in another because someone hardcoded it.

These are calibrated starting points based on real usage patterns. They're not sacred. When you have production data, adjust them.

---

## The Killer Insight

> Every constraint in the system must be an event, and every event must have a named exit.
>
> A cap is not a safety mechanism unless breaching it produces a contract. The `ReflectionLoop` cap is not the number 2. It is: when the loop count reaches 2, emit `Step.tombstone` with `reason: "reflection_cap_breach"` and return control to the caller.

This principle applies to every constraint in the system:

- Circuit breaker hits threshold → named event (`circuit_breaker_open`) with named exit (OPEN state, tombstone emitted)
- Pre-flight overflow detected → named event (token count) with named exit (truncation applied, proceed)
- Auth error encountered → named event (`auth_error`) with named exit (tombstone, no retry)
- Health score drops below threshold → named event (state transition) with named exit (degraded behavior, circuit watching)

No constraint is silent. No failure is ambiguous. The system always knows what happened and why.
