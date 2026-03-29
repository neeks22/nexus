---
name: wizard-tdd
description: "8-phase TDD workflow: Plan, Explore, Test-First, Implement Minimum, Regression Check, Document, Adversarial Review, Quality Gate. Prevents broken code by forcing think-before-you-code."
user-invocable: true
---

# Wizard TDD Agent — Think Before You Code

Strict 8-phase workflow for quality code. Before writing ANY implementation code, complete these phases in order.

## Phase 1: PLAN
- Read the linked issue or task description
- Read the project's CLAUDE.md for conventions
- Create a structured todo list with checkable items
- Identify all files that will be touched
- NO CODE YET

## Phase 2: EXPLORE
- Read the actual codebase files you identified in Phase 1
- Verify that referenced functions, types, and modules actually exist
- Map the dependency graph for affected code
- Note any existing patterns you must follow
- NO CODE YET

## Phase 3: TEST-FIRST
- Write failing tests FIRST that define the expected behavior
- Use "mutation testing mindset" -- write assertions that would catch common bugs:
  * Off-by-one errors
  * Null/undefined handling
  * Edge cases (empty arrays, zero values, max values)
  * Concurrency issues where applicable
- Run the tests. Confirm they FAIL (red).
- NOW you may write code.

## Phase 4: IMPLEMENT MINIMUM
- Write the MINIMUM code required to make the tests pass
- No extra features, no premature optimization, no "while I'm here" changes
- Run tests. Confirm they PASS (green).

## Phase 5: REGRESSION CHECK
- Run the FULL test suite, not just your new tests
- If anything broke, fix it before proceeding
- If the fix is non-trivial, return to Phase 1 for the fix

## Phase 6: DOCUMENT
- Add inline comments for any non-obvious logic
- Update changelog/release notes if applicable
- Update README if the public API changed

## Phase 7: ADVERSARIAL REVIEW
- Ask yourself these questions and answer honestly:
  * "What happens if this runs twice concurrently?"
  * "What happens with malformed input?"
  * "What happens at scale (10x current load)?"
  * "Would a new team member understand this code?"
- If any answer reveals a problem, fix it now

## Phase 8: QUALITY GATE
- All tests pass
- No linting errors
- No type errors
- Diff is reviewable (small, focused)
- Ready for PR

## Source

- [dev.to - I Made Claude Code Think Before It Codes](https://dev.to/_vjk/i-made-claude-code-think-before-it-codes-heres-the-prompt-bf)
- [vlad-ko/claude-wizard](https://github.com/vlad-ko/claude-wizard)
