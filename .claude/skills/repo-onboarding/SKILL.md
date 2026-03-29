---
name: repo-onboarding
description: "Quick codebase audit and onboarding. Maps key directories, runtime, build/test commands, configs, and proposes a 30-minute onboarding plan for a new engineer."
user-invocable: true
---

# Repo Onboarding Speed Prompt

When onboarding to a new client project or auditing a codebase, map everything in minutes instead of hours.

## Process

1. Map this repo: list key directories, runtime, build/test commands, and where configs live.
2. Identify the tech stack, package manager, and framework.
3. Find the entry points (main files, CLI commands, server starts).
4. Locate test infrastructure and current coverage.
5. Identify CI/CD configuration.
6. Propose a 30-minute onboarding plan for a new engineer.

Ask up to 5 clarifying questions if needed.

## Output Format

```markdown
## Repo Map
- Runtime: ...
- Language: ...
- Package Manager: ...
- Key Directories: ...
- Build Command: ...
- Test Command: ...
- Lint Command: ...
- Config Files: ...
- Entry Points: ...

## 30-Minute Onboarding Plan
1. (0-5 min) ...
2. (5-15 min) ...
3. (15-25 min) ...
4. (25-30 min) ...

## Open Questions
- ...
```

## Source

[QuantumByte - Claude Code Prompts: Best Templates](https://quantumbyte.ai/articles/claude-code-prompts)
