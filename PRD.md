# Nexus PRD — Self-Healing Multi-Agent Orchestration Framework

## Epic 1: Foundation
- [x] TypeScript config (tsconfig.json, package.json workspaces)
- [x] All interfaces and types in packages/nexus-core/src/types.ts
- [x] Named constants in packages/nexus-core/src/config/thresholds.ts
- [x] Package setup for nexus-core and nexus-cli

## Epic 2: Self-Healing Engine
- [x] ErrorTaxonomy (infra + output quality split)
- [x] CircuitBreaker (CLOSED/OPEN/HALF_OPEN state machine)
- [x] HealthTracker (composite score, rolling window)
- [x] OutputValidator (sync validation checks)
- [x] RecoveryStrategies (all recovery actions)
- [x] ReflectionLoop (cap at 2, tombstone on breach)
- [x] Step.tombstone implementation
- [ ] Self-healing unit tests

## Epic 3: Provider Layer
- [x] AnthropicProvider with prompt caching
- [x] Pre-flight token counting
- [ ] Provider unit tests

## Epic 4: Transcript
- [x] Immutable append-only Transcript class
- [x] Serialization/deserialization
- [x] toMessages() for API calls
- [ ] Transcript unit tests

## Epic 5: Agent Core
- [x] Agent class with full self-healing pipeline
- [x] PRE-FLIGHT → EXECUTE → VALIDATE → DIAGNOSE → RECOVER → RETRY → UPDATE HEALTH
- [ ] Agent unit tests

## Epic 6: Team + Graph
- [x] Team class (sequential, parallel, debate, parallel-then-synthesize)
- [x] Graph class (nodes, edges, conditions)
- [x] Graceful degradation (skip failed agents)
- [ ] Team/Graph unit tests

## Epic 7: CLI
- [ ] nexus run debate "topic" command
- [ ] nexus health command
- [ ] nexus init command
- [ ] --dry-run flag (no API key required)

## Epic 8: Debate Arena Demo
- [x] 5 agent definitions (Researcher, Philosopher, Contrarian, Pragmatist, Synthesizer)
- [x] Multi-round debate protocol
- [x] Beautiful terminal output (colors, spinners)
- [x] Self-healing report at end

## Epic 9: Code Review Team Demo
- [ ] SecurityAgent, StyleAgent, LogicAgent
- [ ] Review orchestration
- [ ] Terminal output

## Epic 10: Documentation
- [ ] README.md (landing page that sells)
- [ ] QUICKSTART.md (5 min to "holy shit")
- [ ] ARCHITECTURE.md (mermaid diagrams)
- [ ] SELF-HEALING.md (deep dive)

## Epic 11: Ship It
- [ ] npm publish config
- [ ] CHANGELOG.md v0.1.0
