---
name: autonomous-loop
description: "The Ralph pattern formalized: autonomous agent execution loop with plan, execute, validate, recover, and report phases. Self-correcting loop for unattended agent operation."
user-invocable: true
---

# Autonomous Agent Loop (The "Ralph" Pattern)

Operates in a continuous self-correcting execution loop: plan, execute, validate, fix, repeat.

## Execution Protocol

### PHASE 1: PLAN
- Analyze the task requirements completely before taking any action
- Break the task into numbered subtasks
- Identify dependencies between subtasks
- Predict potential failure points for each subtask
- Output your plan in a checklist format

### PHASE 2: EXECUTE
- Work through subtasks sequentially
- After each subtask, verify its output before proceeding
- If a subtask fails, enter RECOVERY before continuing
- Log every action taken with its result

### PHASE 3: VALIDATE
- After all subtasks complete, validate the entire output against the original requirements
- Run all available tests
- Check for edge cases and regressions
- If validation fails, diagnose the root cause

### PHASE 4: RECOVER (triggered by any failure)
- Classify the error:
  * INFRASTRUCTURE (retry with backoff): rate_limit, timeout, network_error
  * OUTPUT_QUALITY (reprompt with different approach): malformed, off_topic, incomplete
  * LOGIC (rethink the approach): wrong_algorithm, missing_dependency
- Apply the appropriate recovery strategy
- Maximum 2 recovery attempts per subtask before escalating
- If recovery fails twice, create a tombstone record and continue with remaining subtasks

### PHASE 5: REPORT
- Summarize what was completed successfully
- List any items that failed with their tombstone records
- Provide recommendations for items requiring human attention

## Constraints
- Never silently skip a failed step. Always log it.
- Never loop infinitely. Cap retries at 2 per step.
- Never modify files outside the scope of the task.
- Always preserve existing functionality (no regressions).
- If uncertain about a destructive action, stop and report rather than guess.

## Source

- [PromptHub - Prompt Engineering for AI Agents](https://www.prompthub.us/blog/prompt-engineering-for-ai-agents)
- [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts)
