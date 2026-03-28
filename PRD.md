# Nexus PRD — Self-Healing Multi-Agent Orchestration Framework

## Epic 1: Foundation
- [ ] TypeScript config (tsconfig.json, package.json workspaces)
- [ ] All interfaces and types in packages/nexus-core/src/types.ts
- [ ] Named constants in packages/nexus-core/src/config/thresholds.ts
- [ ] Package setup for nexus-core and nexus-cli

## Epic 2: Self-Healing Engine
- [ ] ErrorTaxonomy (infra + output quality split)
- [ ] CircuitBreaker (CLOSED/OPEN/HALF_OPEN state machine)
- [ ] HealthTracker (composite score, rolling window)
- [ ] OutputValidator (sync validation checks)
- [ ] RecoveryStrategies (all recovery actions)
- [ ] ReflectionLoop (cap at 2, tombstone on breach)
- [ ] Step.tombstone implementation
- [ ] Self-healing unit tests

## Epic 3: Provider Layer
- [ ] AnthropicProvider with prompt caching
- [ ] Pre-flight token counting
- [ ] Provider unit tests

## Epic 4: Transcript
- [ ] Immutable append-only Transcript class
- [ ] Serialization/deserialization
- [ ] toMessages() for API calls
- [ ] Transcript unit tests

## Epic 5: Agent Core
- [ ] Agent class with full self-healing pipeline
- [ ] PRE-FLIGHT → EXECUTE → VALIDATE → DIAGNOSE → RECOVER → RETRY → UPDATE HEALTH
- [ ] Agent unit tests

## Epic 6: Team + Graph
- [ ] Team class (sequential, parallel, debate, parallel-then-synthesize)
- [ ] Graph class (nodes, edges, conditions)
- [ ] Graceful degradation (skip failed agents)
- [ ] Team/Graph unit tests

## Epic 7: CLI
- [ ] nexus run debate "topic" command
- [ ] nexus health command
- [ ] nexus init command
- [ ] --dry-run flag (no API key required)

## Epic 8: Debate Arena Demo
- [ ] 5 agent definitions (Researcher, Philosopher, Contrarian, Pragmatist, Synthesizer)
- [ ] Multi-round debate protocol
- [ ] Beautiful terminal output (colors, spinners)
- [ ] Self-healing report at end

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
