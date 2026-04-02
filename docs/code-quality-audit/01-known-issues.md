# Nexus Codebase — Known AI-Generated Code Issues

> Compiled from 5 parallel research agents analyzing top issues humans face with AI-generated code.
> Date: 2026-03-31

## CATEGORY 1: REFACTORING ISSUES
1. Silent behavior modification during structural changes
2. Incomplete reference propagation (dangling references after renames)
3. Broken import paths after file moves
4. Test modification instead of code fixing
5. Hallucinated API references and phantom dependencies
6. Scope creep and over-engineering during refactoring
7. Half-migrated state from interrupted multi-step refactoring

## CATEGORY 2: TYPE SAFETY ISSUES
1. Gratuitous `as any` type assertions
2. Excessive non-null assertions (`!`)
3. Over-optionality in interfaces (everything marked `?`)
4. Implicit `any` through missing type annotations
5. Unsafe error handling with untyped catch blocks
6. `@ts-ignore` and `@ts-expect-error` suppression comments
7. Incorrect type narrowing / missing runtime validation at boundaries

## CATEGORY 3: SECURITY VULNERABILITIES
1. Hardcoded secrets and credential exposure (CRITICAL)
2. SQL/PostgREST injection via string interpolation (CRITICAL)
3. Cross-site scripting via unsanitized output (CRITICAL)
4. Missing or broken authentication/authorization (HIGH)
5. SSRF and insecure URL handling (HIGH)
6. Command injection via unsanitized shell execution (CRITICAL)
7. Insecure dependencies and CORS misconfiguration (MEDIUM-HIGH)

## CATEGORY 4: DEAD CODE & HYGIENE
1. Dead/unused imports
2. Code duplication/cloning
3. Orphaned/unreferenced files
4. Unused/unnecessary dependencies
5. Dead functions and unused exports
6. Architectural mismatches and pattern violations
7. Commented-out code and excessive comments

## CATEGORY 5: ERROR HANDLING
1. Empty or log-only catch blocks (swallowed errors)
2. Missing null/undefined guards (happy path bias)
3. Unhandled promise rejections and missing `await`
4. Missing React error boundaries in Next.js
5. Overly broad exception catching (`catch (e: any)`)
6. Cascading silent failures in multi-step pipelines
7. Insecure error exposure (leaking stack traces)

---

## DETECTION PATTERNS (grep commands for Nexus codebase)

```bash
# TYPE SAFETY
grep -rn "as any" apps/website/src/ --include="*.ts" --include="*.tsx"
grep -rn "@ts-ignore\|@ts-expect-error\|@ts-nocheck" apps/website/src/
grep -rn "catch.*any\|catch.*)" apps/website/src/ --include="*.ts"

# SECURITY
grep -rn "sk-ant\|puzj\|sb_secret\|AC3a097\|9d5dc3c" apps/website/src/
grep -rn "dangerouslySetInnerHTML\|\.innerHTML" apps/website/src/
grep -rn "exec(\|execSync(" apps/website/src/
grep -rn "origin.*\*\|cors()" apps/website/src/

# ERROR HANDLING
grep -rn "catch.*{}" apps/website/src/ --include="*.ts"
grep -rn "catch.*console\.\(log\|error\)" apps/website/src/ --include="*.ts"
grep -rn "\.json().*as\s" apps/website/src/ --include="*.ts"

# DEAD CODE
grep -rn "// TODO\|// FIXME\|// HACK\|// XXX" apps/website/src/
grep -rn "// .*function\|// .*return\|// .*import" apps/website/src/
```
