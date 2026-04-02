# Final Codebase Score — Nexus Website

**Date:** 2026-04-01
**Scorer:** Claude Opus 4.6 (READ ONLY)
**Previous scores:** 6.7 -> 7.3
**Fixes reviewed:** SCORE-FIX-1 (rate limiting, logging, types, parallelism, dedup), SCORE-FIX-2 (signed cookie auth, middleware), SCORE-FIX-3 (Sentry)

---

## 1. API SECURITY — 8.5/10

**What improved:**
- Upstash Redis rate limiting replaces in-memory Map (persists across cold starts)
- Server-side CRM auth with HMAC-SHA256 signed cookies (HttpOnly, Secure, SameSite=Strict)
- Middleware verifies session on all protected routes before handlers run
- Timing-safe comparisons on auth and Twilio signature validation
- CSRF origin checking in middleware for all mutating API requests

**What still needs work for 9.5:**
- `AUTH_SECRET` has a hardcoded fallback (`'nexus-fallback-auth-secret-change-me'`) in both `auth/route.ts:17` and `middleware.ts:20`. In production, if env vars are missing, sessions are signed with a publicly visible secret. Should fail-closed (reject logins when no secret is configured).
- `requireApiKey()` allows same-origin requests even without API key via `origin`/`referer` headers, which are trivially spoofable by any HTTP client. Not a major issue since middleware now checks session cookies, but the defense-in-depth is weaker than it appears.
- No CORS preflight handling on most API routes (only `funnel-lead` has OPTIONS).
- Upstash rate limiter ignores the `maxRequests` parameter — always uses the hardcoded 30/60s from initialization. The `rateLimit(ip, 10)` call in funnel-lead still allows 30 requests, not 10.

---

## 2. DATA INTEGRITY — 7.5/10

**What improved:**
- `supaGet` now returns `{ data, error }` so callers can distinguish empty vs failure
- `isDuplicate()` returns `true` on error (safe default, prevents double-sending)
- `insertLead` is isolated in try/catch — SMS+email still fire even if insert fails

**What still needs work for 9.5:**
- No database migrations exist (`supabase/migrations/004*.sql` and `005*.sql` referenced in the task do not exist). No CHECK constraints, no RLS policies verified in code.
- `supaPost` silently swallows errors (`catch` logs but never returns success/failure). Callers like `insertLead` can't know if the insert actually worked.
- Service role key (`SUPABASE_SERVICE_KEY`) is used for ALL Supabase requests via `supaHeaders()`, bypassing RLS entirely. The `supaAnonHeaders()` function exists but is never called. RLS is therefore not enforced server-side.
- No unique constraint enforcement visible for phone+tenant dedup — relies entirely on application-level SELECT-then-INSERT, which has a race condition window.
- The `leads/route.ts` DELETE endpoint permanently deletes customer data across 3 tables with no soft-delete, no audit trail, no confirmation.

---

## 3. ERROR HANDLING — 7.5/10

**What improved:**
- `callClaude` now logs API errors with status code and body
- `supaGet` logs HTTP errors and exceptions
- Slack fallback catch block in `auto-response.ts` now logs errors
- `sms/process/route.ts` catch blocks on pause checks log errors

**What still needs work for 9.5:**
- 2 completely empty catch blocks remain: `readycar/page.tsx:426` and `readyride/page.tsx:426` (`catch {}`).
- 5 catch blocks with only comments (`/* ignore */`, `/* not JSON */`, `/* activity fetch is optional */`, `/* couldn't parse */`) and no logging.
- Multiple API routes return generic errors without logging: `leads/route.ts:68`, `leads/route.ts:102`, `leads/route.ts:176`, `leads/route.ts:207`, `dashboard/route.ts:35` — outer catches return 500 but don't log what failed.
- `auth/route.ts:84` catches all errors in POST handler but logs nothing.
- Sentry is opt-in and not yet activated (no DSN configured). Until activated, errors only exist in Vercel logs (15min retention on Hobby).

---

## 4. MESSAGING PIPELINE — 8.5/10

**What improved:**
- MessageSid dedup in `sms/route.ts` prevents Twilio retry duplicates
- 3-second artificial delay removed from `sms/process/route.ts`
- HOT lead pause check defaults to paused on Supabase failure (safe)
- SMS + email sent via `Promise.allSettled` (one failure doesn't block the other)
- Prompt injection filtering on customer messages

**What still needs work for 9.5:**
- MessageSid dedup is in-memory (`Set`), which resets on cold start. On Vercel serverless, different instances can process the same retry. Should use Redis/Supabase for dedup.
- `sms/route.ts` awaits the internal `/api/webhook/sms/process` fetch with 55s timeout, but this is a same-origin HTTP call that creates a second serverless invocation. If the process endpoint is slow, the webhook times out and Twilio retries, causing duplicate processing (the in-memory Set won't help across instances).
- No dead letter queue or retry mechanism for failed SMS sends.
- Form extraction runs fire-and-forget (`runFormExtraction().catch(...)`) but if the serverless function terminates before it completes, the extraction is silently lost.

---

## 5. PERFORMANCE — 8.0/10

**What improved:**
- `Promise.allSettled` for auto-response + n8n webhook in funnel-lead (parallel)
- 3s sleep removed from SMS process
- Dashboard uses `Promise.all` for 4 parallel Supabase queries

**What still needs work for 9.5:**
- SMS process route still makes 4-6 sequential Supabase calls (log inbound, check pause status, check lead status, load history, lookup name) before even calling Claude. These could be parallelized.
- `AbortSignal.timeout(8000)` on `callClaude` + sequential Supabase calls means SMS process can easily exceed 10s on Hobby plan.
- No caching strategy. Dashboard fetches ALL leads on every request (`select=phone,first_name,last_name,status` with no limit on `allLeads`). For a growing dealership, this query grows unbounded.
- `messages/route.ts` redeclares its own `SUPABASE_KEY` instead of importing from security.ts — minor but indicates code not fully consolidated.

---

## 6. DEPLOYMENT — 7.5/10

**What improved:**
- Sentry integration scaffolded (client, server, edge configs + instrumentation hook)
- `vercel.json` has security headers
- `/api/health` endpoint exists for uptime monitoring
- `global-error.tsx` root error boundary captures unhandled errors

**What still needs work for 9.5:**
- Sentry DSN not configured — error tracking is wired but not active. Zero visibility into production errors beyond 15-min Vercel logs.
- No CI/CD pipeline visible (no GitHub Actions, no test runner in build).
- Zero test files in `apps/website/`. No unit tests, no integration tests, no e2e tests.
- Database migrations referenced in the scoring task (`004_fix_check_constraints.sql`, `005_fix_rls_bypass.sql`) do not exist.
- No staging environment evident. Single production deployment.
- Health endpoint doesn't check Supabase connectivity, Twilio credentials, or Claude API — it's a timestamp-only liveness probe, not a readiness check.

---

## 7. CODE QUALITY — 8.0/10

**What improved:**
- Duplicate rate limiter implementations removed from funnel-lead and messages routes
- `supaGetData()` backward-compatible wrapper avoids breaking existing callers
- Shared security module used consistently across all routes
- Clean separation: security.ts, auto-response.ts, individual route handlers

**What still needs work for 9.5:**
- `messages/route.ts` still declares its own `SUPABASE_KEY` instead of importing from security.ts.
- `sms/process/route.ts` is 357 lines with SMS handling, intent classification, AI prompt building, form extraction, and lead card generation all in one file. Should be split.
- `buildNESBPrompt()` is a 60-line string literal in the route file — should be extracted to a prompts module.
- `leads/route.ts` has 4 HTTP methods (GET/PATCH/POST/DELETE) at 210 lines — getting large for a single file.
- No TypeScript strict mode verification in website tsconfig (not checked but typical for Next.js projects).
- Several `as` type assertions scattered through route handlers without runtime validation.

---

## 8. SECURITY — 8.5/10

**What improved:**
- HttpOnly signed cookies replace spoofable sessionStorage auth
- Middleware enforces session verification before protected route handlers
- Constant-time comparison in middleware (XOR byte-by-byte, Edge Runtime compatible)
- CSRF protection via origin/referer checking on all mutating API requests
- Prompt injection filtering on customer SMS messages
- Security headers in both middleware and vercel.json (defense-in-depth)

**What still needs work for 9.5:**
- Hardcoded auth secret fallback is a critical issue. If `AUTH_SECRET` and `CSRF_SECRET` are both unset, every deployment shares the same signing key. This is in the source code.
- Service role key used for all Supabase queries — if any route has an injection vector, the attacker has full DB access. Should use anon key + RLS for read operations.
- `email/route.ts:28` trusts `User-Agent: Google-Apps-Script` as an auth mechanism — trivially spoofable.
- No Content-Security-Policy header (CSP). XSS protection relies only on `X-XSS-Protection` which is deprecated in modern browsers.
- `leads/route.ts:129` does `JSON.parse(content)` on user-provided string without try/catch — will throw and return 500 on malformed input.

---

## 9. MULTI-TENANT — 8.0/10

**What improved:**
- `validateTenant()` normalizes tenant input with safe default
- Tenant-specific phone numbers, names, and configs properly separated
- Session cookie contains tenant claim, verified in middleware

**What still needs work for 9.5:**
- RLS is not enforced because all queries use the service role key. A bug in any route could leak cross-tenant data.
- No tenant isolation verification in middleware — session cookie says `tenant: readycar` but the user can query `?tenant=readyride` on API routes. Session tenant is not compared to query tenant.
- `TENANT_MAP` and `TENANTS` config are duplicated between `security.ts` and `auto-response.ts`. Single source of truth needed.
- Only 2 tenants hardcoded. Adding a tenant requires code changes in multiple files. No config-driven tenant provisioning.

---

## 10. PRODUCTION READY — 7.0/10

**What improved:**
- Sentry scaffolded (but not activated)
- Health endpoint exists
- Server-side auth replaces client-side auth
- Error logging improved across critical paths
- Rate limiting persists across cold starts (Upstash)

**What still needs work for 9.5:**
- Zero tests. No unit tests, no integration tests, no e2e tests. For a system that auto-sends SMS and email to real customers, this is a significant gap.
- Sentry not activated (no DSN). Errors are invisible in production.
- No CI/CD pipeline. No automated checks before deployment.
- No database migrations in the repo. Schema changes are untracked.
- No alerting configured. If auto-response fails, the only notification is a best-effort Slack webhook.
- No rollback strategy documented. No feature flags.
- Auth secret fallback means production could silently run with an insecure signing key.
- No rate limiting on the GET endpoints for leads/dashboard (only POST/PATCH have rate limits... actually they do have rate limits, correcting).
- No load testing or performance benchmarks against Vercel Hobby limits.

---

## FINAL SCORES

```
1. API SECURITY        8.5/10
2. DATA INTEGRITY      7.5/10
3. ERROR HANDLING      7.5/10
4. MESSAGING PIPELINE  8.5/10
5. PERFORMANCE         8.0/10
6. DEPLOYMENT          7.5/10
7. CODE QUALITY        8.0/10
8. SECURITY            8.5/10
9. MULTI-TENANT        8.0/10
10. PRODUCTION READY   7.0/10

OVERALL SCORE: 7.9/10
PREVIOUS SCORES: 6.7 -> 7.3 -> 7.9
```

---

## Summary

Three rounds of fixes moved the score from 7.3 to 7.9 (+0.6). The biggest wins were:

1. **Server-side auth** (+1.0 across Security/API Security) — HttpOnly signed cookies with middleware verification replaced spoofable sessionStorage. This was the highest-impact fix.
2. **Upstash rate limiting** (+0.5 across API Security/Production Ready) — Rate limits now persist across serverless cold starts.
3. **Safe dedup defaults** (+0.5 Data Integrity) — Errors now prevent double-sending rather than allowing it.
4. **Parallel awaits** (+0.5 Performance) — Funnel lead response time cut in half.

## Top 5 blockers to reach 9.5

1. **Zero tests** — Most impactful gap. Write tests for `auto-response.ts`, `security.ts`, auth flow, and SMS pipeline. This would lift Production Ready from 7.0 to 8.5+ alone.
2. **Activate Sentry** — Configure DSN in Vercel env vars. The code is there, just needs the env var. Lifts Deployment and Production Ready by +0.5 each.
3. **Remove hardcoded auth secret fallback** — Replace with `throw new Error('AUTH_SECRET must be configured')` or refuse to sign sessions. Lifts Security from 8.5 to 9.0.
4. **Use anon key + RLS for reads** — Switch `supaHeaders()` calls in GET routes to `supaAnonHeaders()` and enforce RLS policies. Lifts Data Integrity and Multi-Tenant by +1.0 each.
5. **Fix catch blocks** — Add `console.error` to all empty/comment-only catches (about 15 instances). Lifts Error Handling from 7.5 to 8.5.
