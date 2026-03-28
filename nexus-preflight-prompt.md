# Nexus Preflight Check
## Run this FIRST before any other Nexus prompt

This checks that everything is armed and ready before we build.
Think of it as turning the key in the ignition before driving.

---

## What This Checks

1. **Node.js & npm** — The engine that runs our code
2. **TypeScript** — The language we write in (like choosing to build with steel instead of wood)
3. **Git** — Our save system (like autosave in a video game — we never lose work)
4. **API Key** — Our key to Claude's brain (no key = no AI)
5. **Project Structure** — Our garage is set up and organized
6. **Plugins & Tools** — All power tools are plugged in and working
7. **Design Docs** — Our blueprints exist before we start building

## How To Run

Paste this entire file into Claude Code. It will run every check and report GREEN or RED.
All greens = we're ready to build.
Any reds = we fix them before moving on.

---

## PREFLIGHT INSTRUCTIONS FOR CLAUDE

Run every check below. For each one, report:
- GREEN if it passes
- RED + what's wrong + how to fix it

### Check 1: Node.js
Run `node --version`. Need v18+.

### Check 2: npm
Run `npm --version`. Need v9+.

### Check 3: TypeScript
Run `npx tsc --version`. If not installed, install it.

### Check 4: Git
Verify `/Users/sayah/nexus` is a git repo with at least one commit.

### Check 5: API Key
Check that `ANTHROPIC_API_KEY` environment variable is set (don't print the actual key).

### Check 6: Project Structure
Verify these exist:
- `/Users/sayah/nexus/DESIGN-DECISIONS.md`
- `/Users/sayah/nexus/docs/superpowers/specs/2026-03-28-nexus-v01-design.md`

### Check 7: Superpowers Plugin
Verify superpowers skills are available (brainstorming, writing-plans, executing-plans, etc.)

### Check 8: Claude-Mem
Check if claude-mem MCP is available.

### Check 9: Parallel MCP
Check if claude-parallel MCP tool is available.

### Check 10: Existing Research
Check if `/Users/sayah/debate/RESEARCH.md` exists (our prior research).

### Check 11: Existing Code Reference
Check if `/Users/sayah/debate/src/` exists (our prototype code to reference).

---

## After All Checks Pass

Print a summary like this:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NEXUS PREFLIGHT — ALL SYSTEMS GO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Node.js ............ GREEN (v22.x)
  npm ................ GREEN (v10.x)
  TypeScript ......... GREEN (v5.x)
  Git ................ GREEN (1 commit)
  API Key ............ GREEN (set)
  Project Structure .. GREEN (2 files)
  Superpowers ........ GREEN (loaded)
  Claude-Mem ......... GREEN (loaded)
  Parallel MCP ....... GREEN (loaded)
  Research ........... GREEN (exists)
  Prototype Code ..... GREEN (exists)

  STATUS: READY TO BUILD
  NEXT STEP: Run nexus-design-debate-prompt.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If anything is RED, fix it before proceeding. Do NOT move to the next prompt with any RED checks.
