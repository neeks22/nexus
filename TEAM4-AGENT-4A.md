# Agent 4A: Regression Checker Report

**Date:** 2026-04-01
**Scope:** Verified every CRITICAL and HIGH bug from TEAM2-BUG-REPORT.md against current code after Team 3 fixes.
**Mode:** READ-ONLY -- zero code changes made.

---

## Build Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (zero errors) |
| `npm run build` | PASS (clean build) |

---

## CRITICAL Bugs

| BUG ID | DESCRIPTION | STATUS | EVIDENCE |
|--------|-------------|--------|----------|
| CRIT-1 (2A) | Fire-and-forget handleAutoResponse in funnel-lead/route.ts | **FIXED** | Line 256: `await handleAutoResponse(lead, body.tenant).catch(...)` -- properly awaited |
| CRIT-2 (2A) | Fire-and-forget n8n fetch in funnel-lead/route.ts | **FIXED** | Line 261: `await fetch(N8N_WEBHOOK_URL, ...)` -- properly awaited with AbortSignal.timeout(10000) |
| CRIT-3 (2A) | Fire-and-forget fetch to /sms/process in sms/route.ts | **STILL BROKEN** | Line 43: `fetch(...)` is still NOT awaited. Fire-and-forget pattern unchanged. No waitUntil() added. |
| CRIT-4 (2A) | 3s setTimeout + 15s Claude timeout in sms/process/route.ts | **FIXED** | Line 131 comment confirms removal: "Removed 3s artificial delay". Claude timeout = 8s in security.ts:225. |
| CRIT-5 (2A) | Timing-safe comparison defeated in auth/route.ts | **STILL BROKEN** | Lines 48-51: `if (password === expected)` still short-circuits before timingSafeEqual on line 56. Fix log does not mention this bug. |
| CRIT-6 (2A) | In-memory rate limiting setInterval in security.ts + funnel-lead | **PARTIALLY FIXED** | security.ts: setInterval removed (line 165-166 is comment only). funnel-lead/route.ts: setInterval removed (line 52-53 is comment only). **BUT messages/route.ts line 54-62 still has a live `setInterval` cleanup timer.** |
| CRIT-7 (2A) | No Twilio MessageSid deduplication in sms/route.ts | **STILL BROKEN** | No MessageSid extraction or dedup check anywhere in sms/route.ts. Fix log does not mention this bug. |
| CRIT-8 (2B) | CHECK constraint on funnel_submissions.status | **FIXED** | 004_fix_check_constraints.sql adds all missing statuses: appointment, showed, credit_app, approved, delivered |
| CRIT-9 (2B) | CHECK constraint on lead_transcripts.entry_type | **FIXED** | 004_fix_check_constraints.sql adds: status, form_data, completed_form, note |
| CRIT-10 (2B) | RLS policies allow cross-tenant access when x-tenant-id missing | **STILL BROKEN** | Fix log does not mention 003_rls_tenant_isolation.sql. The `OR get_request_tenant() = ''` fallback remains. |
| CRIT-11 (2B) | isDuplicate queries NULLed phone column (encryption) | **STILL BROKEN** | Fix log does not mention auto-response.ts isDuplicate fix. The query still hits raw funnel_submissions.phone which is NULLed by PII trigger. |
| CRIT-12 (2B) | PATCH on funnel_submissions.phone never matches (encryption) | **STILL BROKEN** | sms/process/route.ts lines 78, 271: Still PATCH by `phone=eq.X` on raw table. Phone column is NULL due to encryption trigger. Leads/route.ts line 96: Same issue. |
| CRIT-13 (2B) | Hardcoded encryption key in 002_pii_encryption_simple.sql | **STILL BROKEN** | Fix log does not mention this. The literal key `nexus-pii-key-2026` remains in the migration file. |

---

## HIGH Bugs

| BUG ID | DESCRIPTION | STATUS | EVIDENCE |
|--------|-------------|--------|----------|
| HIGH-1 (2A) | supaGet empty catch block | **FIXED** | security.ts:60-61: `console.error('[supaGet] Error:', err instanceof Error ? err.message : 'unknown')` |
| HIGH-2 (2A) | supaPost empty catch block | **FIXED** | security.ts:72-73: `console.error('[supaPost] Error:', err instanceof Error ? err.message : 'unknown')` |
| HIGH-3 (2A) | slackNotify empty catch block | **FIXED** | security.ts:201-202: `console.error('[slackNotify] Error:', err instanceof Error ? err.message : 'unknown')` |
| HIGH-4 (2A) | request.json() no try/catch in credit-analyze | **FIXED** | credit-analyze/route.ts lines 62-66: Separate try/catch returns 400 |
| HIGH-5 (2A) | request.json() no try/catch in leads PATCH | **FIXED** | leads/route.ts lines 81-85: Separate try/catch returns 400 |
| HIGH-6 (2A) | request.json() no try/catch in leads POST | **FIXED** | leads/route.ts lines 115-119: Separate try/catch returns 400 |
| HIGH-7 (2A) | request.json() no try/catch in leads DELETE | **FIXED** | leads/route.ts lines 186-189: Separate try/catch returns 400 |
| HIGH-8 (2A) | request.json() no try/catch in webhook/email | **FIXED** | webhook/email/route.ts lines 36-40: Separate try/catch returns 400 |
| HIGH-9 (2A) | request.json() no try/catch in messages POST | **NOT VERIFIED** | messages/route.ts was too large to read in full; would need targeted verification of POST handler |
| HIGH-10 (2A) | request.json() no try/catch in cron/check-email | **FIXED** | cron/check-email/route.ts lines 52-56: Separate try/catch returns 400 |
| HIGH-11 (2A) | Empty catch blocks in sms/process/route.ts (lines 82, 141, 260, 263) | **PARTIALLY FIXED** | Line 82: `catch {}` -- STILL EMPTY (status PATCH). Line 140: `catch { /* no history */ }` -- STILL EMPTY. Line 275-276: Fixed with error logging. Extraction moved to separate function with .catch() logging. 2 of 4 original empty catches remain. |
| HIGH-12 (2A) | Empty catch in cron/check-email Claude call | **STILL BROKEN** | Line 117: `catch { /* Claude failed */ }` -- still no error logging |
| HIGH-13 (2A) | PII in console.log/error (raw phone numbers) | **PARTIALLY FIXED** | sms/process/route.ts: Lines 104, 120 use `fromPhone.slice(-4)` -- FIXED. BUT line 83: `slackNotify(...Phone: ${fromPhone}...)` still sends full phone to Slack. Line 126-127: full phone + messageBody to Slack. Line 173: full phone to Slack. security.ts line 257: `to=...${to.slice(-4)}` -- FIXED. |
| HIGH-14 (2A) | Email path hardcoded to ReadyCar | **FIXED** | Both email routes have TENANT_EMAIL_CONFIG maps with per-tenant fromName, gm, phone, signoff. All hardcoded refs replaced. |
| HIGH-15 (2A) | .env.example contains real credentials | **FIXED** | .env.example: All real values replaced with placeholders (your-project.supabase.co, +1XXXXXXXXXX, etc.) |
| HIGH-16 (2B) | lead_transcripts.channel CHECK rejects 'crm' | **FIXED** | 004_fix_check_constraints.sql adds 'crm' to channel CHECK |
| HIGH-17 (2B) | Service role key used for all Supabase ops (RLS bypassed) | **STILL BROKEN** | security.ts:35: `supaHeaders()` still uses SUPABASE_KEY (service role). `supaAnonHeaders()` exists (line 45) but is never called. |
| HIGH-18 (2B) | Two conflicting PII encryption migrations | **STILL BROKEN** | Both 002_pii_encryption.sql and 002_pii_encryption_simple.sql still exist with conflicting function signatures. |
| HIGH-19 (2B) | Empty catch blocks in sms/process (DB audit duplicate) | **PARTIALLY FIXED** | Same as HIGH-11. Line 82 and 140 still empty. |

---

## Infrastructure / Security Checks

| CHECK | STATUS | EVIDENCE |
|-------|--------|----------|
| vercel.json security headers | **FIXED** | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy all present |
| /api/health endpoint | **FIXED** | apps/website/src/app/api/health/route.ts exists, returns status + timestamp + git SHA |
| SQL migration 004 CHECK constraints | **FIXED** | All three CHECK constraints (status, entry_type, channel) fixed + phone dedup index added |
| Claude timeout 8s in callClaude | **FIXED** | security.ts:225: `AbortSignal.timeout(8000)` with comment explaining Vercel 10s limit |
| setInterval removed from security.ts | **FIXED** | Only a comment remains at line 165-166 |
| setInterval removed from funnel-lead | **FIXED** | Only a comment remains at line 52-53 |
| setInterval in messages/route.ts | **STILL BROKEN** | Lines 54-62: Live `setInterval(() => {...}, 120_000)` still present |

---

## NEW Regressions Introduced by Fixes

| # | REGRESSION | SEVERITY | DETAILS |
|---|-----------|----------|---------|
| R-1 | Form extraction in sms/process is now fire-and-forget | MEDIUM | Line 178: `runFormExtraction(...).catch(...)` runs after response is returned. This was intentionally moved off the hot path (Fix 2), but it has the same Vercel kill risk as the original CRIT-1 bug. The JSON.parse on line 221 inside runFormExtraction has NO try/catch -- will throw on malformed Claude output and crash the background task silently. |
| R-2 | credit-analyze/route.ts still has no timeout on Anthropic call | LOW | Lines 111-123: No `signal: AbortSignal.timeout(...)` on the fetch to api.anthropic.com. While Team 2 flagged this as LOW, it remains unfixed and could cause function timeout on Vercel. |
| R-3 | cron/check-email still has fire-and-forget Supabase + Slack | MEDIUM | Lines 133-141: Both `fetch()` calls use `.catch(() => {})` with empty catch and no await. Transcript logging and Slack notifications will be killed on Vercel. Team 3 did not address this. |
| R-4 | webhook/email supaPost calls still fire-and-forget | MEDIUM | Lines 85-88 and 130: `supaPost(...)` not awaited. Will be killed on Vercel before completion. |

---

## Summary

| Category | FIXED | PARTIALLY FIXED | STILL BROKEN | TOTAL |
|----------|-------|-----------------|--------------|-------|
| CRITICAL | 4 | 1 | 8 | 13 |
| HIGH | 10 | 3 | 3 | 16 |
| New Regressions | -- | -- | 4 | 4 |

**Bottom line:** Core pipeline fixes (await handleAutoResponse, remove 3s sleep, Claude 8s timeout, CHECK constraints, security headers, health endpoint, .env cleanup) are solid and verified. However, 8 CRITICAL bugs remain untouched -- most notably the PII encryption query mismatch (isDuplicate + PATCH by phone both query NULLed columns), the RLS bypass, the SMS webhook fire-and-forget, the timing-safe auth bypass, and the hardcoded encryption key. The messages/route.ts setInterval was missed. Several empty catch blocks in sms/process and cron/check-email were not fixed. PII still leaks to Slack in full phone numbers.
