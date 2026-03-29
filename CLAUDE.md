# Nexus — Self-Healing Multi-Agent Orchestration Framework

## Project Overview
- **What:** TypeScript framework for building self-healing multi-agent AI systems
- **Why:** Most AI agent projects crash when something goes wrong. Nexus agents fix themselves.
- **Business:** AI agency using Nexus as internal weapon. Sell audits ($5-15K), builds ($15-50K), retainers ($5-25K/mo).

## Tech Stack
- Runtime: Node.js 22+
- Language: TypeScript (strict mode)
- Testing: Vitest
- Build: tsup
- Package manager: npm (workspaces)
- AI Provider: Anthropic SDK (@anthropic-ai/sdk)
- Logging: pino
- CLI: commander + chalk + ora
- Validation: zod
- Events: eventemitter3

## Architecture
Every agent API call flows through:
PRE-FLIGHT → EXECUTE → VALIDATE → [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH

Health States: HEALTHY (>=0.85) → DEGRADED (>=0.40) → RECOVERING (>=0.15) → FAILED (<0.15)
Circuit Breaker: CLOSED → OPEN (3 failures) → HALF_OPEN (60s) → test → CLOSED or re-OPEN

Key design decisions (from 6-agent debate):
- Transcript is IMMUTABLE (append-only) — no shared mutable state
- Team + Graph dual layer — Team for easy API, Graph for topology control
- Step.tombstone — every failure gets a mandatory named terminal state
- ReflectionLoop capped at 2 — emits tombstone on breach, no silent passthrough
- Prompt caching is architectural requirement (10x cost savings)
- Pre-flight token counting via /v1/messages/count_tokens
- All thresholds are named constants in config/thresholds.ts

## Code Style
- Prefer interfaces over types
- No `any` — use `unknown`
- All functions must have explicit return types
- Error handling: never throw unhandled. Always catch and classify.
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces, SCREAMING_SNAKE for constants
- Files: kebab-case (e.g., health-tracker.ts)
- Imports: named imports, no default exports
- Tests: colocate in __tests__/ or top-level tests/

## Key Commands
- `npm test` — run all tests
- `npm run build` — build all packages
- `npm run lint` — lint everything

## Self-Healing Error Taxonomy
Infrastructure errors (retry/backoff): rate_limit, api_overloaded, api_timeout, context_overflow, server_error, auth_error, network_error
Output quality errors (reprompt/reflect): empty_response, malformed_response, off_topic, too_long, too_short, refusal, no_agent_reference, repetition

## Workflow Rules
1. PLAN before you code. Use plan mode for anything with 3+ steps or architectural choices.
2. READ before you modify. Understand the existing code first.
3. VERIFY before you finish. Run tests, show output, prove it works.
4. If complications arise, pause and replan immediately -- do not continue on a broken path.
5. Never declare work complete without demonstrating it works.
6. Ask yourself: "Would a senior engineer approve this?" before finishing.

## Quality Standards
- Pursue elegant solutions for non-trivial changes.
- Handle bug fixes autonomously -- do not ask for detailed guidance, just fix them.
- Change only what is necessary to minimize unintended consequences.
- Compare behavior before/after when relevant.
- Keep diffs small and reviewable.

## Continuous Improvement
- After user corrections, document the learned pattern in LESSONS.md.
- Create preventive rules to avoid repeating mistakes.
- Review lessons at the start of each project.

## Non-Negotiable Rules
1. Every API call MUST go through the self-healing pipeline. No raw API calls.
2. Every error MUST be classified by the error taxonomy. No generic handling.
3. Every agent MUST have a health score. No unchecked agents.
4. The system MUST continue if individual agents fail. Graceful degradation always.
5. Tests are NOT optional. Every module gets unit tests.
6. Store major architectural decisions in memory for cross-session recall.
