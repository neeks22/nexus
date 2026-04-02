# Score Fix 1 - Production Hardening

**Date:** 2026-04-01
**Agent:** Senior Engineer (Score Push 7.3 -> 9.5)

---

## Fixes Applied

### FIX 1: callClaude error logging (security.ts)
- Added `console.error` for non-ok API responses with status code and body
- Added error logging in catch block (was empty, returned '' silently)
- **Impact:** Compromised/revoked Anthropic API keys now produce log entries

### FIX 2: supaGet return type + backward-compatible wrapper (security.ts)
- Changed `supaGet` to return `{ data: unknown[]; error: boolean }` so callers can distinguish "no data" from "Supabase down"
- Added `supaGetData()` backward-compatible wrapper that returns just the array
- Updated `auto-response.ts` to destructure `{ data, error }` from supaGet
- Updated `sms/process/route.ts` to use `supaGetData()` (5 call sites)
- **Impact:** Data integrity -- callers can now react to Supabase outages

### FIX 3: Dedup safe default (auto-response.ts)
- Changed `isDuplicate()` to return `true` on error (was `false`)
- On supaGet error, treats as duplicate to prevent double-sending SMS/email
- Also fixed empty catch on Slack fallback notification (line 316)
- **Impact:** Prevents double-sending on Supabase failures

### FIX 4: Parallel awaits in funnel-lead (funnel-lead/route.ts)
- Replaced sequential `await handleAutoResponse` + `await fetch(n8n)` with `Promise.allSettled([])`
- Cuts worst-case latency from ~20s to ~10s
- **Impact:** Funnel lead submissions now fit within Vercel Hobby 10s limit

### FIX 5: Upstash Redis rate limiting (security.ts + all routes)
- Installed `@upstash/ratelimit` and `@upstash/redis`
- Replaced in-memory `rateLimit()` with Upstash Redis sliding window (30 req/60s)
- Kept in-memory Map as fallback when Upstash env vars aren't configured
- Made `rateLimit()` async, updated ALL callers across the codebase (9 files)
- Removed duplicate rate limiter implementations from `funnel-lead/route.ts` and `messages/route.ts` -- now use shared implementation
- **Impact:** Rate limiting persists across cold starts on Vercel serverless

### Bonus: Code dedup
- Removed 2 duplicate rate limiter implementations (funnel-lead, messages) -- consolidated to shared `rateLimit()` from security.ts
- **Impact:** Code quality -- single rate limiting implementation across all routes

---

## Verification

- `npx tsc --noEmit` -- clean, no errors
- `npm run build` -- passes, all routes compile

## Files Modified

- `apps/website/src/lib/security.ts` -- supaGet return type, supaGetData wrapper, callClaude logging, Upstash rate limiting
- `apps/website/src/lib/auto-response.ts` -- supaGet destructuring, safe dedup default, Slack catch logging
- `apps/website/src/app/api/funnel-lead/route.ts` -- Promise.allSettled, shared rate limiter
- `apps/website/src/app/api/messages/route.ts` -- shared rate limiter
- `apps/website/src/app/api/webhook/sms/process/route.ts` -- supaGetData, async rateLimit
- `apps/website/src/app/api/webhook/sms/route.ts` -- async rateLimit
- `apps/website/src/app/api/webhook/email/route.ts` -- async rateLimit
- `apps/website/src/app/api/auth/route.ts` -- async rateLimit
- `apps/website/src/app/api/leads/route.ts` -- async rateLimit
- `apps/website/src/app/api/credit-analyze/route.ts` -- async rateLimit
- `apps/website/src/app/api/dashboard/route.ts` -- async rateLimit

## Estimated Score Impact

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| API Security | 7.5 | 8.5 | +1.0 |
| Data Integrity | 6.5 | 7.5 | +1.0 |
| Error Handling | 7.5 | 8.5 | +1.0 |
| Performance | 6.5 | 7.5 | +1.0 |
| Code Quality | 7.0 | 8.0 | +1.0 |
| Production Ready | 6.0 | 7.0 | +1.0 |
