# Agent 5B: Final High/Medium Bug Fixer Report

**Date:** 2026-04-01
**Scope:** Fix 5 remaining high/medium bugs identified by Team 4 verification reports
**Commit:** cc3063b

---

## Fixes Applied

### FIX 1: setInterval removal in messages/route.ts
**File:** `apps/website/src/app/api/messages/route.ts:54-62`
**Bug:** CRIT-6 (partial) -- live `setInterval(() => {...}, 120_000)` for rate limit cleanup
**Fix:** Removed the setInterval block. Added comment explaining in-memory rate limiting is best-effort on serverless and cleanup happens inline via the timestamp filter in `isRateLimited()`.

### FIX 2: Fire-and-forget in email routes
**Files:**
- `apps/website/src/app/api/webhook/email/route.ts:85,130-131`
- `apps/website/src/app/api/cron/check-email/route.ts:133-141`

**Bug:** R-3, R-4 -- unawaited `supaPost()` and `slackNotify()` calls killed by Vercel before completion
**Fix:**
- webhook/email: Added `await` to all 3 calls (inbound log, AI reply log, slackNotify)
- cron/check-email: Added `await` to both fetch calls (Supabase log + Slack notify). Replaced empty `.catch(() => {})` blocks with proper error logging.
- Also fixed HIGH-12: empty catch on Claude API call in cron/check-email now logs the error.

### FIX 3: credit-analyze missing timeout
**File:** `apps/website/src/app/api/credit-analyze/route.ts:111`
**Bug:** R-2 -- Anthropic API call had no timeout, risking Vercel function timeout
**Fix:** Added `signal: AbortSignal.timeout(8000)` to match the 8s standard used in `callClaude`.

### FIX 4: Conflicting PII encryption migrations
**Files:**
- `supabase/migrations/002_pii_encryption_simple.sql` (renamed to `.DISABLED`)
- `supabase/migrations/002_pii_encryption.sql` (unchanged, canonical version)

**Bug:** CRIT-13, HIGH-18 -- `002_pii_encryption_simple.sql` had hardcoded key `'nexus-pii-key-2026'`
**Fix:** Renamed to `002_pii_encryption_simple.sql.DISABLED` so it won't be executed. Added header comment explaining the security issue and pointing to the Vault-based migration as the correct one.

### FIX 5: RLS tenant bypass
**File:** `supabase/migrations/005_fix_rls_bypass.sql` (new)
**Bug:** CRIT-10 -- All RLS policies had `OR get_request_tenant() = ''` which granted full cross-tenant access when no tenant header was set
**Fix:** Created new migration that:
1. Replaces `get_request_tenant()` function to return `NULL` instead of `''` when tenant is missing (NULL comparisons always fail in SQL, denying access by default)
2. Drops all 19 existing tenant policies across 9 tables
3. Recreates all policies using strict `tenant_id = get_request_tenant()` without the empty-string fallback

---

## Build Verification

| Check | Result |
|-------|--------|
| `npm run build` | PASS (clean build, zero errors) |

---

## Files NOT Touched (Agent 5A scope)

- `apps/website/src/app/api/webhook/sms/route.ts`
- `apps/website/src/app/api/webhook/sms/process/route.ts`
- `apps/website/src/app/api/auth/route.ts`
- `apps/website/src/lib/auto-response.ts`

---

## Summary

5 fixes applied across 4 modified files + 1 new migration + 1 renamed file. All changes address bugs flagged as CRITICAL or HIGH/MEDIUM in TEAM4-AGENT-4A.md and TEAM4-AGENT-4B.md. Build passes clean.
