# Architecture Health Report — Agent 1B

**Auditor:** Agent 1B (Architecture Auditor)
**Date:** 2026-04-01
**Scope:** API routes, security module, middleware, database schema, Vercel deployment model

---

## CRITICAL Issues (Will cause production bugs)

### 1. Rate Limiting Is Broken on Vercel Serverless

**Expected:** Rate limiting state persists across requests.
**Actual:** In-memory `Map` resets on every cold start. On Vercel serverless, each invocation may be a new instance — the rate limit store is empty.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/lib/security.ts` | 145-168 | `rateLimitStore` is an in-memory `Map` with a `setInterval` cleanup. Both are meaningless on serverless — the `Map` is empty on cold starts, and `setInterval` runs in a process that may be killed in seconds. |
| `apps/website/src/app/api/funnel-lead/route.ts` | 35-60 | Second independent `rateLimitMap` with its own `setInterval` — same problem, duplicated. |

**Impact:** Rate limiting provides zero protection in production. An attacker can bypass it by waiting for cold starts (which happen constantly on Hobby tier).

**Fix:** Use Vercel KV (Redis), Upstash Redis, or Supabase row-based rate limiting. Alternatively, use Vercel's built-in rate limiting via `vercel.json`.

---

### 2. Fire-and-Forget Promises Will Be Killed on Vercel Hobby (10s timeout)

**Expected:** Background work completes reliably after the response is sent.
**Actual:** Vercel terminates the function after the response is returned. Unawaited promises are killed.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/funnel-lead/route.ts` | 262-264 | `handleAutoResponse(lead, body.tenant).catch(...)` — fire-and-forget. This orchestrates Supabase insert + Claude API call + Twilio SMS + Gmail SMTP + Slack notification. On Hobby tier (10s timeout), the function terminates after returning `{ success: true }` on line 305. The entire auto-response pipeline may never execute. |
| `apps/website/src/app/api/funnel-lead/route.ts` | 267-303 | `fetch(N8N_WEBHOOK_URL, ...)` — another fire-and-forget. No `await`. |
| `apps/website/src/app/api/webhook/sms/route.ts` | 43-49 | `fetch(...process)` — fire-and-forget call to the process endpoint. This one is intentional (Twilio needs fast TwiML response), but the internal fetch may not complete before termination. |
| `apps/website/src/app/api/webhook/email/route.ts` | 71-74 | `supaPost(...)` — no `await` on line 71. Transcript log may be lost. |
| `apps/website/src/app/api/webhook/email/route.ts` | 116 | `supaPost(...)` — no `await`. AI reply transcript may be lost. |
| `apps/website/src/app/api/cron/check-email/route.ts` | 118-121 | `fetch(...)` to Supabase — fire-and-forget log. |
| `apps/website/src/app/api/cron/check-email/route.ts` | 123-126 | `fetch(SLACK_WEBHOOK, ...)` — fire-and-forget Slack notification. |

**Impact:** The primary business function (auto-responding to new leads) is unreliable. Leads submit the form, get `{ success: true }`, but never receive the SMS or email.

**Fix:** `await` the critical path (`handleAutoResponse`) before returning the response, OR use `waitUntil()` from `@vercel/functions` (available on Next.js 14+), OR move to a queue-based architecture (Vercel Cron + Supabase queue table).

---

### 3. Auth Route Has Timing-Safe Comparison Bypass

**Expected:** Password comparison is always timing-safe.
**Actual:** Line 48 does a direct `===` comparison first, which is timing-attackable. The timing-safe comparison on line 56 is only reached if the direct comparison fails — but the direct comparison already leaks timing information.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/auth/route.ts` | 48 | `if (password === expected)` — direct string comparison before the timing-safe fallback on line 56. The early return on line 49 means correct passwords return faster than incorrect ones. |

**Impact:** Timing side-channel attack against CRM passwords. Low practical risk (rate-limited to 5/min), but the code contradicts its own intent.

**Fix:** Remove the `===` comparison on line 48. Use only the timing-safe path.

---

### 4. Auth Tokens Are Stateless and Unverifiable

**Expected:** Session tokens are stored server-side or are signed JWTs that can be verified.
**Actual:** `crypto.randomBytes(32).toString('hex')` on `auth/route.ts:49` generates a random token, returns it to the client, but never stores it anywhere. No subsequent route verifies this token.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/auth/route.ts` | 49 | Token is generated but never persisted. |
| `apps/website/src/app/api/leads/route.ts` | 11-18 | `requireApiKey()` checks `NEXUS_API_KEY` or origin, NOT the auth token. |

**Impact:** The CRM auth flow generates tokens that nothing validates. Authentication is effectively origin-based only.

**Fix:** Either store tokens in Supabase with expiry and verify on each request, or use signed JWTs (e.g., `jose` library), or use Supabase Auth.

---

## HIGH Issues (Significant risk or data integrity problems)

### 5. No Webhook Idempotency (Twilio Retries Will Cause Duplicate AI Replies)

**Expected:** Webhook endpoints handle Twilio retries idempotently using `MessageSid`.
**Actual:** No deduplication. Twilio retries on timeout (which is likely given the 3-second `setTimeout` on `process/route.ts:132` plus Claude API latency).

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/webhook/sms/route.ts` | 11-52 | No `MessageSid` extraction or dedup check. |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 13-272 | No idempotency key. If Twilio retries, the customer gets duplicate AI messages. |

**Impact:** Customers receive 2-3x duplicate SMS replies when the webhook takes longer than Twilio's retry timeout.

**Fix:** Extract `MessageSid` from form data, store in Supabase or a cache, skip processing if already seen.

---

### 6. Database Schema vs Application Mismatch (CHECK Constraints)

**Expected:** Application code writes values that match database CHECK constraints.
**Actual:** Several mismatches.

| File | Line | Schema Constraint | App Value |
|------|------|-------------------|-----------|
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 206-209 | `lead_transcripts.entry_type IN ('message', 'handoff', 'compliance_check')` | Writes `'form_data'`, `'completed_form'`, `'status'` |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 206-209 | `lead_transcripts.channel IN ('sms', 'email', 'voice', 'chat', 'funnel')` | Writes `'crm'` |
| `apps/website/src/app/api/leads/route.ts` | 9 | `funnel_submissions.status IN ('new', 'contacted', 'qualified', 'converted', 'lost')` (migration 001) | Uses `'appointment'`, `'showed'`, `'credit_app'`, `'approved'`, `'delivered'` |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 79 | Same constraint | Writes `status: 'appointment'` |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 257 | Same constraint | Writes `status: 'credit_app'` |

**Impact:** These INSERT/UPDATE operations silently fail due to CHECK constraint violations. Leads are never updated past "new" status. Form data extraction results are lost.

**Fix:** Run an ALTER TABLE migration to expand the CHECK constraints, or update the application code to match the schema. The schema in migration 001 is likely outdated — a newer migration may have already fixed this (check for ALTER statements).

---

### 7. Empty Catch Blocks Swallow Errors Silently

**Expected:** All catch blocks log errors (per CLAUDE.md global rules).
**Actual:** Numerous empty catch blocks that silently swallow failures.

| File | Line | Context |
|------|------|---------|
| `apps/website/src/lib/security.ts` | 60 | `supaGet` — Supabase read failures silently return `[]` |
| `apps/website/src/lib/security.ts` | 70 | `supaPost` — Supabase write failures silently ignored |
| `apps/website/src/lib/security.ts` | 203 | `slackNotify` — Slack failures silently ignored |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 82 | PATCH to update lead status — failure ignored |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 263 | JSON parse of extraction result — failure ignored |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 265 | Entire form extraction block — failure ignored |
| `apps/website/src/app/api/webhook/email/route.ts` | 102 | Claude API call — failure ignored |
| `apps/website/src/app/api/cron/check-email/route.ts` | 121 | Supabase log — failure ignored |
| `apps/website/src/app/api/cron/check-email/route.ts` | 126 | Slack notification — failure ignored |
| `apps/website/src/app/api/leads/route.ts` | 56, 68 | Activity fetch and lead list — swallowed |
| `apps/website/src/lib/auto-response.ts` | 311 | Last-resort Slack notify — `/* last resort */` |

**Impact:** When Supabase is down or returns errors, the system appears to work but silently drops data. No monitoring or alerting fires. Debugging production issues becomes nearly impossible.

**Fix:** Add `console.error` (minimum) or structured logging to every catch block.

---

### 8. Email Webhook Is Not Multi-Tenant

**Expected:** Email webhook supports all tenants dynamically.
**Actual:** Hardcoded to "Nicolas" / "ReadyCar" regardless of tenant.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/webhook/email/route.ts` | 84 | Unsubscribe reply hardcoded: `"Nicolas Sayah | ReadyCar"` |
| `apps/website/src/app/api/webhook/email/route.ts` | 98 | System prompt hardcoded: `"You are Nicolas, General Sales Manager at ReadyCar"` |
| `apps/website/src/app/api/webhook/email/route.ts` | 111 | From address hardcoded: `"Nicolas Sayah | ReadyCar"` |
| `apps/website/src/app/api/cron/check-email/route.ts` | 77, 86, 111 | All hardcoded to ReadyCar |
| `apps/website/src/app/api/cron/check-email/route.ts` | 120 | `tenant_id: 'readycar'` hardcoded |

**Impact:** ReadyRide emails get sent as ReadyCar. Tenant isolation is broken for the email channel.

---

## MEDIUM Issues (Best practice violations)

### 9. Environment Variables Not Validated at Startup

**Expected:** Missing env vars cause a clear startup failure.
**Actual:** Env vars default to empty strings and fail silently at runtime.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/lib/security.ts` | 10-20 | All env vars default to `''` via `?? ''`. `validateRequiredEnv()` exists (line 268) but is never called at module load or in any route. |
| `apps/website/src/app/api/funnel-lead/route.ts` | 21 | `N8N_WEBHOOK_URL` has a hardcoded fallback URL — if the env var is missing, it silently sends to the default. |
| `apps/website/src/app/api/webhook/sms/route.ts` | 41 | `process.env.PROCESS_SECRET || ''` — empty secret means the process endpoint accepts any request with an empty `x-process-secret` header. |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 10 | Same: `PROCESS_SECRET` defaults to `''`. |

**Impact:** If `PROCESS_SECRET` is not set, any request with header `x-process-secret: ""` passes auth. If Twilio credentials are missing, SMS silently fails.

**Fix:** Call `validateRequiredEnv()` at the top of each route, or validate at module load in `security.ts` and throw.

---

### 10. RLS Policies Allow Empty Tenant (Full Table Access)

**Expected:** RLS policies enforce strict tenant isolation.
**Actual:** Every policy has `OR get_request_tenant() = ''` — if no `x-tenant-id` header is sent, the query returns ALL tenants' data.

| File | Line | Problem |
|------|------|---------|
| `supabase/migrations/003_rls_tenant_isolation.sql` | 53 | `USING (tenant_id = get_request_tenant() OR get_request_tenant() = '')` — empty tenant = full access. |
| `apps/website/src/lib/security.ts` | 33-42 | `supaHeaders()` uses the service role key, which bypasses RLS entirely. The `x-tenant-id` header is only sent as "defense in depth" but the service key makes it irrelevant. |
| `apps/website/src/lib/security.ts` | 44-54 | `supaAnonHeaders()` would respect RLS, but is never used in any API route. |

**Impact:** RLS provides no actual tenant isolation because (a) the service key bypasses it, and (b) even with the anon key, missing headers grant full access. Defense-in-depth is theater here.

**Fix:** (1) Use the anon key for read operations. (2) Remove the `OR get_request_tenant() = ''` fallback — require the header. (3) For the service key path, enforce `tenant_id` filtering in application code (which is mostly done already via query params).

---

### 11. SMS Process Route Intentional Delay Risks Vercel Timeout

**Expected:** Responses complete within Vercel's timeout.
**Actual:** 3-second `setTimeout` + Claude API call (up to 15s) + multiple Supabase calls + potential form extraction (another Claude call).

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 9 | `maxDuration = 60` — only works on Vercel Pro. Hobby tier is 10s hard limit. |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 132 | `setTimeout(resolve, 3000)` — burns 3 of 10 available seconds. |

**Impact:** On Vercel Hobby, most SMS replies will timeout. The `maxDuration = 60` export has no effect without a Pro plan.

---

### 12. CORS Not Configured for Webhook Endpoints

**Expected:** Webhook endpoints have CORS disabled (they don't need browser access).
**Actual:** No explicit CORS headers on webhook routes. The middleware doesn't add `Access-Control-Allow-Origin` for webhooks, which is correct — but the email webhook (`/api/webhook/email`) is also called from the CRM (browser), and has no CORS handling.

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/webhook/email/route.ts` | 1-124 | No `OPTIONS` handler for CORS preflight. If the CRM frontend calls this cross-origin, it will fail. |
| `apps/website/src/app/api/funnel-lead/route.ts` | 178-184 | Has proper CORS handling (good). |

---

### 13. Supabase Client Is Not a True Singleton

**Expected:** Supabase client is created once and reused.
**Actual:** No Supabase JS client is used at all — raw `fetch()` calls to the REST API everywhere. This works but:

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/lib/security.ts` | 56-71 | `supaGet`/`supaPost` create a new `fetch` per call. No connection pooling, no retry logic, no request dedup. |
| `apps/website/src/app/api/webhook/sms/process/route.ts` | 78, 256 | Inline `fetch()` to Supabase REST API, bypassing the helpers entirely. |
| `apps/website/src/app/api/leads/route.ts` | 34-65 | More inline `fetch()` calls with duplicated header construction. |

**Impact:** No connection reuse across requests. Each Supabase operation creates a new TCP connection. On high traffic this adds latency. The inline fetches also bypass the `supaHeaders(tenant)` tenant header, weakening defense-in-depth.

**Fix:** Either use `@supabase/supabase-js` (singleton per request via `createClient`), or at minimum route all calls through the existing `supaGet`/`supaPost` helpers and add tenant support to them.

---

## LOW Issues (Code quality / maintainability)

### 14. Duplicate Code Across Routes

- `getClientIp()` is defined in both `security.ts:170` and `funnel-lead/route.ts:151`
- Rate limiting is implemented twice: `security.ts:145-168` and `funnel-lead/route.ts:35-60`
- Email intent classification is duplicated between `webhook/email/route.ts:93-95` and `cron/check-email/route.ts:81-83`
- Nodemailer transport is created fresh in every function call (6+ times across files)

### 15. SQL Injection Risk in Supabase REST Queries

| File | Line | Problem |
|------|------|---------|
| `apps/website/src/app/api/leads/route.ts` | 62 | `search` param is passed through `encodeSupabaseParam()` but interpolated directly into the query string for `.ilike.` filter. If `encodeSupabaseParam` has gaps, this could allow PostgREST injection. |

**Impact:** Low — PostgREST handles parameterization internally, and `encodeSupabaseParam` does basic encoding. But the pattern is fragile.

---

## Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Rate Limiting | BROKEN | In-memory maps on serverless = no protection |
| Fire-and-Forget Safety | BROKEN | Critical business logic (SMS, email) may never execute |
| Webhook Idempotency | MISSING | Twilio retries will cause duplicate messages |
| Auth Token Verification | MISSING | Tokens generated but never verified |
| Env Var Validation | WEAK | Defaults to empty strings, never validated at startup |
| Multi-Tenant Isolation (DB) | ADEQUATE | RLS exists but service key bypasses it; app-level filtering is present |
| Multi-Tenant Isolation (App) | PARTIAL | Email channel is hardcoded to one tenant |
| Schema Consistency | BROKEN | CHECK constraints don't match app values |
| Error Observability | POOR | 11+ empty catch blocks |
| CORS Configuration | ADEQUATE | Correct for most routes, missing on email webhook |
| Concurrent Request Handling | OK | Next.js App Router handles concurrency natively; no shared mutable state issues beyond rate limiting |

---

## Priority Fix Order

1. **[CRITICAL]** Make `handleAutoResponse` awaited or use `waitUntil()` -- leads are being lost
2. **[CRITICAL]** Replace in-memory rate limiting with Redis/KV or Vercel WAF rules
3. **[CRITICAL]** Fix schema CHECK constraint mismatches (status values, entry_type, channel)
4. **[HIGH]** Add Twilio `MessageSid` idempotency to SMS webhook
5. **[HIGH]** Remove direct `===` password comparison in auth route
6. **[HIGH]** Add logging to all empty catch blocks
7. **[HIGH]** Make email webhook multi-tenant
8. **[MEDIUM]** Validate env vars at startup (especially `PROCESS_SECRET`)
9. **[MEDIUM]** Remove `OR get_request_tenant() = ''` from RLS policies
10. **[MEDIUM]** Remove 3s delay or move to Pro plan for `maxDuration`
11. **[LOW]** Deduplicate shared code (rate limiting, getClientIp, nodemailer transport)
12. **[LOW]** Route all Supabase calls through shared helpers with tenant headers
