# Best CLAUDE.md Configs & Patterns — Research Findings

Full research saved for reference. See the top 10 configurations and key patterns from:
- Official Anthropic best practices
- shanraisshan/claude-code-best-practice (2,131 stars)
- centminmod/my-claude-code-setup (memory bank architecture)
- HumanLayer minimalist approach
- 6-Level Capability Framework
- everything-claude-code hooks suite
- awesome-claude-code-toolkit (135 agents, 35 skills, 42 commands)

## Key Takeaways Applied to Nexus

1. CLAUDE.md under 200 lines — prune ruthlessly
2. Use MUST/MUST NOT for constraints
3. Path-scoped rules in .claude/rules/
4. Hooks for auto-format, pre-commit, TypeScript validation
5. Progressive disclosure — reference files, don't inline
6. Memory bank files for session state persistence
7. Convert error taxonomy to on-demand skill
