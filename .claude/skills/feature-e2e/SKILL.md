---
name: feature-e2e
description: "End-to-end feature implementation: requirements, data model, API, UI, tests, and docs. Forces the complete lifecycle in small, reviewable diffs."
user-invocable: true
---

# Feature Implementation End-to-End

The single best pattern for shipping a complete feature. Forces the complete lifecycle.

## Process

Implement: [feature].

Start by clarifying requirements (ask questions if needed), then design:

1. **Data model**: tables/collections, keys, constraints, and migrations
2. **API routes**: endpoints, request/response shapes, auth, and errors
3. **User interface**: screens, states, validation, and empty/loading behaviors

Then:

4. Propose a plan and get confirmation
5. Make changes incrementally
6. Add tests for every new behavior
7. Update docs if the public API changed
8. Keep diffs small and reviewable

## Constraints

- Never skip tests
- Never make changes outside the scope of the feature
- Always clarify ambiguous requirements before implementing
- Prefer small, focused commits over large monolithic changes

## Source

[QuantumByte - Claude Code Prompts: Best Templates](https://quantumbyte.ai/articles/claude-code-prompts)
