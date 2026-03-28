# Changelog

## v0.1.0 (2026-03-28)

### Initial Release

**Core Framework (nexus-agents)**
- Agent class with full self-healing pipeline (PRE-FLIGHT → EXECUTE → VALIDATE → DIAGNOSE → RECOVER → RETRY → UPDATE HEALTH)
- Team class with 4 orchestration protocols: sequential, parallel, debate, parallel-then-synthesize
- Graph class for topology-based execution with conditional edges
- Immutable append-only Transcript
- AnthropicProvider with prompt caching (10x cost reduction)
- Pre-flight token counting via /v1/messages/count_tokens

**Self-Healing Engine**
- Error taxonomy: 7 infrastructure + 8 output quality error types
- CircuitBreaker: CLOSED → OPEN → HALF_OPEN state machine
- HealthTracker: composite scoring with rolling window
- OutputValidator: sync response validation
- RecoveryStrategies: exponential backoff, reprompting, tombstoning
- ReflectionLoop: quality check with cap at 2 (tombstone on breach)
- Step.tombstone: mandatory terminal failure state on every step

**CLI (nexus-cli)**
- `nexus run debate <topic>` — run multi-agent debates
- `nexus health` — agent health dashboard
- `nexus init <name>` — scaffold new projects
- `--dry-run` flag — test without API key

**Demo Apps**
- Debate Arena: 5 specialized agents (Researcher, Philosopher, Contrarian, Pragmatist, Synthesizer)
- Code Review Team: 3 reviewers + orchestrator (Security, Style, Logic)

**Documentation**
- README with quickstart and architecture overview
- QUICKSTART.md, ARCHITECTURE.md, SELF-HEALING.md deep dives

**Testing**
- 159 unit tests across 6 test suites, all passing
