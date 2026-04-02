# TEAM 1 — Agent 1A: Claude Code Pitfall Research

## Stack: Next.js 14 App Router + TypeScript + Supabase + Twilio + Claude API + Nodemailer + Vercel

### TOP 20 Most Likely Bugs (Ranked by Severity and Probability)

---

### 1. Fire-and-Forget Promises Silently Failing on Vercel (CRITICAL)

**Files:** `src/app/api/funnel-lead/route.ts:262-263`, `src/app/api/funnel-lead/route.ts:267-303`, `src/app/api/webhook/sms/route.ts:43-49`, `src/app/api/cron/check-email/route.ts:118-127`

**What happens:** The funnel-lead route calls `handleAutoResponse(lead, body.tenant).catch(...)` and the n8n webhook `fetch(...).catch(...)` as fire-and-forget, then immediately returns `{ success: true }`. On Vercel, the serverless function terminates as soon as the response is sent. Any background work still in flight (Supabase insert, SMS send, email send, Slack notify, n8n forward) is **killed mid-execution**.

**Why it's likely present:** This is the single most common Vercel serverless mistake. The SMS webhook (`route.ts:43-49`) does the same thing — fires off a fetch to `/api/webhook/sms/process` and immediately returns TwiML. On Vercel, that internal fetch may never reach the process endpoint because the invoking function has already terminated. The `handleAutoResponse` function does `Promise.allSettled([sendSMS, sendWelcomeEmail])` — both involve multiple async steps (Claude API call, Twilio API call, Supabase insert) that take 3-15 seconds. The function that spawned them is long gone.

**Impact:** Leads submit the form, get `{ success: true }`, but never receive their SMS or email. The Supabase record may or may not exist. No error is ever logged because the `.catch()` handler itself gets killed.

---

### 2. In-Memory Rate Limiting Does Not Work on Serverless (CRITICAL)

**Files:** `src/lib/security.ts:145-168`, `src/app/api/funnel-lead/route.ts:35-60`, `src/app/api/messages/route.ts:28-62`

**What happens:** Three separate `Map`-based rate limiters exist. On Vercel serverless, each function invocation may run in a different isolate. The `rateLimitStore`, `rateLimitMap`, and per-route maps are empty on every cold start. The `setInterval` cleanup timers also serve no purpose — they run in isolates that may never see a second request.

**Why it's likely present:** This is duplicated across 3 files independently, confirming it was never tested in production. An attacker can bypass rate limiting entirely by simply waiting for cold starts (which happen constantly on Hobby plan) or by sending requests fast enough that they hit different isolates.

**Impact:** Rate limiting is effectively decorative. SMS webhook, funnel submissions, auth attempts, and messages API are all unprotected against brute force or abuse. The auth endpoint (`/api/auth`) allows only 5 password attempts per minute — but only within a single warm isolate.

---

### 3. Vercel Hobby Plan 10-Second Timeout vs. SMS Process Route (CRITICAL)

**Files:** `src/app/api/webhook/sms/process/route.ts:9` (`maxDuration = 60`), `src/app/api/webhook/sms/process/route.ts:132`

**What happens:** The SMS process route sets `maxDuration = 60` and includes a `setTimeout(resolve, 3000)` delay for "human feel." But Vercel Hobby plan hard-caps at 10 seconds regardless of `maxDuration`. The route does: validate -> Supabase pause check (2 queries) -> 3s delay -> Supabase history fetch -> Supabase lead lookup -> Claude API call (up to 15s timeout) -> Twilio SMS -> Supabase log -> optional form extraction (another Claude call). This easily exceeds 10 seconds.

**Why it's likely present:** The `maxDuration = 60` export only works on Vercel Pro/Enterprise. On Hobby, it's silently ignored. The 3-second artificial delay alone consumes 30% of the budget. Add Claude API latency (2-8s typical) and Supabase queries, and this route regularly times out.

**Impact:** Customers text in, the webhook returns TwiML immediately, but the process route times out before sending the AI reply. Customer gets no response. The error may not even be logged if the timeout kills the function before the catch block runs.

---

### 4. Twilio Webhook Duplicate Message Processing (HIGH)

**Files:** `src/app/api/webhook/sms/route.ts:43-49`

**What happens:** Twilio retries webhook delivery if it doesn't get a response within 15 seconds (or gets a non-2xx). The webhook returns TwiML immediately, but if the network is slow or Vercel has a cold start, Twilio may retry. There is zero deduplication — no `MessageSid` check, no idempotency key. The fire-and-forget fetch to `/process` means the same message can be processed multiple times.

**Why it's likely present:** The code doesn't store or check `MessageSid` from the Twilio payload. Each retry triggers a new `/process` call, which triggers a new Claude API call, which sends another SMS reply. The customer receives 2-3 identical (or slightly different, since Claude is non-deterministic) responses.

**Impact:** Customer gets duplicate AI replies, looks unprofessional. Double Supabase inserts create corrupted conversation history. Double Claude API calls waste money.

---

### 5. Supabase Service Key Used for All Operations — RLS Bypassed (HIGH)

**Files:** `src/lib/security.ts:33-42`, `src/lib/security.ts:56-71`

**What happens:** `supaHeaders()` uses `SUPABASE_SERVICE_KEY` (the service role key that bypasses RLS). Every Supabase read and write in the entire application goes through this key. The `supaAnonHeaders()` function exists but is never called anywhere in the codebase.

**Why it's likely present:** The `x-tenant-id` header is passed for "defense in depth" but Supabase REST API doesn't natively use custom headers for RLS — you'd need a custom function or policy that reads from `current_setting('request.headers')`. Without that, the tenant isolation is entirely application-level. A bug in any query (missing `tenant_id=eq.X` filter) exposes all tenants' data to each other.

**Impact:** If any API route forgets the tenant filter (or a search query is malformed), cross-tenant data leakage occurs. ReadyCar can see ReadyRide's leads and vice versa. This is a compliance issue under PIPEDA.

---

### 6. Supabase Queries Silently Return Empty Arrays on Failure (HIGH)

**Files:** `src/lib/security.ts:56-62`

**What happens:** The `supaGet` function catches all errors and returns `[]`. This means: auth failure returns `[]`, network timeout returns `[]`, malformed query returns `[]`, table doesn't exist returns `[]`. The caller has no way to distinguish "no results" from "total failure."

**Why it's likely present:** Every consumer of `supaGet` treats `[]` as "no data." The pause check in the SMS process route (`route.ts:94-106`) actually handles this correctly by defaulting to paused on error. But the dedup check in `auto-response.ts:76-85` returns `false` on error — meaning if Supabase is down, every submission is treated as new, and duplicate leads get created and messaged.

**Impact:** Intermittent Supabase issues cause silent data loss, duplicate processing, and incorrect business logic. No monitoring catches this because no errors are thrown.

---

### 7. Auth Route Timing-Safe Comparison is Defeated by Early Return (HIGH)

**Files:** `src/app/api/auth/route.ts:48-56`

**What happens:** Line 48 does `if (password === expected)` — a direct string comparison that returns immediately on match. This is NOT timing-safe. The timing-safe comparison on lines 54-56 only runs if the direct comparison fails (which it never does for correct passwords). The `===` operator short-circuits on first mismatched character, leaking password length and character information via timing side-channel.

**Why it's likely present:** The code was written with awareness of timing attacks (the `timingSafeEqual` call exists) but the early `===` comparison negates it entirely. This is a common pattern where developers add security measures incorrectly.

**Impact:** An attacker with network access can determine the CRM password character-by-character via timing analysis. Combined with the broken rate limiting (#2), this is exploitable.

---

### 8. Empty Catch Blocks Swallowing Critical Errors (HIGH)

**Files:** `src/app/api/webhook/sms/process/route.ts:82`, `src/app/api/webhook/sms/process/route.ts:141`, `src/app/api/webhook/sms/process/route.ts:258-263`, `src/lib/security.ts:60`, `src/lib/security.ts:69`, `src/lib/security.ts:102`, `src/lib/security.ts:203`

**What happens:** At least 12 empty `catch {}` blocks across the codebase. Key failures that are silently swallowed:
- `supaPost` failures (line 69 of security.ts) — lead data never saved, no one knows
- Twilio signature validation errors (line 102) — returns `false` but no log
- Slack notification failures (line 203) — team never learns about issues
- Lead status PATCH at process/route.ts:82 — hot lead never updated
- Conversation history fetch (line 141) — AI replies without context

**Why it's likely present:** The pattern `catch { /* ignore */ }` appears repeatedly. These were likely written during rapid development with the intent to add logging later. They violate the project's own CLAUDE.md rule: "NEVER use empty catch blocks."

**Impact:** Production failures are invisible. When something breaks, there are no logs, no alerts, and no way to diagnose the issue retroactively.

---

### 9. Claude API Call Has No Retry Logic (MEDIUM-HIGH)

**Files:** `src/lib/security.ts:208-234`

**What happens:** The `callClaude` function makes a single attempt with a 15-second timeout. On failure (429 rate limit, 500 server error, 529 overloaded), it returns an empty string. The callers treat empty string as "use fallback message." There is no exponential backoff, no retry on transient errors.

**Why it's likely present:** Claude API returns 429 (rate limit) and 529 (overloaded) regularly during peak hours. These are transient errors that resolve in 1-5 seconds. A single retry with 2-second backoff would catch 90%+ of these. Instead, every transient failure results in a generic fallback message being sent to the customer.

**Impact:** During peak hours, a significant percentage of customer interactions receive the generic fallback message instead of a personalized AI response. The dealership's "AI agent" looks like a bot sending canned responses.

---

### 10. Nodemailer Dynamic Import in Serverless Edge Runtime (MEDIUM-HIGH)

**Files:** `src/app/api/webhook/email/route.ts:79`, `src/app/api/webhook/email/route.ts:108`, `src/app/api/cron/check-email/route.ts:74`, `src/lib/auto-response.ts:243`

**What happens:** Nodemailer is imported dynamically via `await import('nodemailer')` in 4 places. Nodemailer uses Node.js `net`, `tls`, and `dns` modules. If any of these routes are deployed to Vercel Edge Runtime (either explicitly or via middleware forcing edge), nodemailer will fail with "Module not found" errors because Edge Runtime doesn't support Node.js built-in modules.

**Why it's likely present:** The middleware runs on Edge Runtime by default (no explicit `export const runtime = 'nodejs'`). While the API routes themselves default to Node.js runtime in Next.js 14, any future `export const runtime = 'edge'` or Vercel config change will break email silently. The dynamic import also adds cold-start latency on every invocation.

**Impact:** Currently works in Node.js runtime but is fragile. Any configuration drift toward Edge breaks all email functionality with no fallback.

---

### 11. Env Var Trailing Newline Handling is Inconsistent (MEDIUM)

**Files:** `src/lib/security.ts:10-12`, `src/app/api/auth/route.ts:10-12`, `src/middleware.ts:12`, `src/app/api/messages/route.ts:8-22`

**What happens:** Some env vars are cleaned with `.trim().replace(/\\n$/, '')` (the literal string `\n`, not an actual newline). Others use `.trim()` only. The `ANTHROPIC_KEY` at line 13 only does `.trim()`. The auth route has its own `cleanEnv` function that handles both `\\n` and `\n`. This inconsistency means some env vars will have trailing characters stripped and others won't.

**Why it's likely present:** Vercel CLI and dashboard historically had issues where copying env vars included trailing newlines or the literal characters `\n`. Different developers fixed this at different times with different approaches, creating 3 distinct cleaning patterns across the codebase.

**Impact:** An env var with a trailing newline will work in some routes and fail in others. The Supabase URL with a trailing newline causes all API calls to go to `https://xxx.supabase.co\n/rest/v1/...` which fails silently (caught by empty catch blocks — see #8).

---

### 12. Twilio Signature Validation Uses `request.url` Which Differs from Twilio's URL (MEDIUM)

**Files:** `src/lib/security.ts:75-105`

**What happens:** The validation function uses `request.url` to build the HMAC. On Vercel, `request.url` contains the internal Vercel URL (e.g., `https://nexus-xxx.vercel.app/api/webhook/sms`), not the public URL Twilio used to make the request (`https://nexusagents.ca/api/webhook/sms`). Twilio signs using the URL configured in the Twilio dashboard. If these don't match, every signature validation fails.

**Why it's likely present:** The code skips validation in development (`process.env.NODE_ENV !== 'development'`), so this was never tested locally. In production, if the Vercel deployment URL differs from the Twilio-configured URL (which it does behind custom domains or when preview deployments receive webhooks), validation silently fails and the webhook returns TwiML with no processing.

**Impact:** Either all Twilio webhooks are rejected (if URLs mismatch) or validation is effectively bypassed (if the workaround was to set NODE_ENV=development, which isn't the case here). This needs the `X-Forwarded-Host` header or explicit URL override.

---

### 13. Gmail App Password Expiry / Revocation (MEDIUM)

**Files:** `src/lib/security.ts:17` (`GMAIL_PASS`), all nodemailer usages

**What happens:** Gmail app passwords can be revoked if Google detects suspicious activity, if 2FA is reconfigured, or if the account is flagged for exceeding sending limits (500/day for consumer Gmail, 2000/day for Workspace). When `GMAIL_PASS` becomes invalid, nodemailer throws an auth error. The email webhook catches this and returns a 500, but the auto-response path (`auto-response.ts:265-268`) only logs the error — the lead still shows as processed.

**Why it's likely present:** Gmail app passwords have no expiry notification. Google can silently revoke them. The system has no health check for SMTP connectivity. The first indication of failure would be leads reporting they never received a confirmation email — which they're unlikely to do.

**Impact:** All email functionality silently stops working. Welcome emails, AI reply emails, and unsubscribe confirmations all fail. Since errors are caught and swallowed in some paths, the Slack notification may or may not fire depending on which code path hit the error.

---

### 14. `setInterval` Timers in Serverless Functions (MEDIUM)

**Files:** `src/lib/security.ts:162-168`, `src/app/api/funnel-lead/route.ts:52-60`, `src/app/api/messages/route.ts:54-62`

**What happens:** Three `setInterval` calls run every 120 seconds to clean up rate limit maps. In serverless, these timers keep the function warm artificially (preventing garbage collection) but never execute predictably. On Vercel, functions are frozen between invocations — the timer doesn't tick. When the function thaws for the next request, the timer may fire immediately or not at all. Worse, if the module is re-imported in a new isolate, a new timer is created with an empty map, making the cleanup useless.

**Why it's likely present:** This is standard server-side code that assumes a long-running process. It works in `next dev` but not in production serverless.

**Impact:** Minor memory leak risk (rate limit maps grow but never clean up within an isolate's lifetime). The timers themselves are harmless but indicate a misunderstanding of the execution model that propagates to more serious issues (#2).

---

### 15. Credit Bureau PDF Data Sent to Claude API Without Size Limits (MEDIUM)

**Files:** `src/app/api/credit-analyze/route.ts:62-67`

**What happens:** The credit-analyze route accepts `pdfBase64` from the request body with no size validation. A large PDF (e.g., 50MB base64-encoded) will: (a) consume the entire Vercel request body budget, (b) be sent to Claude API which has its own limits, (c) potentially cause the function to OOM. There's no `AbortSignal.timeout` on the Claude API call in this route (unlike `callClaude` in security.ts which has a 15s timeout).

**Why it's likely present:** The route was built for a specific use case (credit bureau PDFs, typically 1-5 pages) but has no guardrails against abuse or large files.

**Impact:** A single large request can crash the function or exhaust Vercel's bandwidth. The missing timeout means the function can hang for the full Vercel timeout waiting for Claude to process a huge document.

---

### 16. Search Parameter SQL Injection via Supabase REST (MEDIUM)

**Files:** `src/app/api/leads/route.ts:62`

**What happens:** The search parameter is injected into the Supabase PostgREST query string: `&or=(first_name.ilike.*${encodeSupabaseParam(search)}*,...)`. While `encodeSupabaseParam` handles some special characters, PostgREST has its own query language that can be exploited. Characters like `)`, `(`, `,` in the search term can break out of the `or(...)` filter and inject additional PostgREST operators.

**Why it's likely present:** The `encodeSupabaseParam` function encodes `(),.` but only after `encodeURIComponent` — the order matters and edge cases exist. PostgREST operators like `.not.`, `.is.`, `.in.` embedded in search terms could alter query semantics.

**Impact:** Potential data exfiltration or query manipulation. An attacker could craft a search term that returns all records across tenants or bypasses the tenant filter.

---

### 17. No CSRF Token — Origin-Only CSRF Protection is Insufficient (MEDIUM)

**Files:** `src/middleware.ts:25-60`

**What happens:** CSRF protection relies entirely on `Origin` and `Referer` headers. These can be omitted by certain request types (e.g., form submissions from same-origin pages where the browser doesn't send Origin). The middleware allows requests with NO origin AND NO referer in some code paths. Flash-based attacks (legacy) and DNS rebinding attacks can forge these headers.

**Why it's likely present:** True CSRF tokens require session state, which adds complexity. The Origin check is a reasonable first layer but not sufficient for a production CRM handling PII and financial data.

**Impact:** A malicious website could potentially trigger state-changing API calls (lead deletion, status updates, SMS sends) if a CRM user visits it while authenticated.

---

### 18. Conversation History Loaded Without Pagination Limit (MEDIUM-LOW)

**Files:** `src/app/api/messages/route.ts:213-239` (`fetchAllMessages`)

**What happens:** `fetchAllMessages` follows Twilio pagination with `while (url)` until there are no more pages. For an account with thousands of messages, this fetches every single message, consuming memory and Vercel execution time. Each page fetch has a 15s timeout, but there's no overall timeout or message count limit.

**Why it's likely present:** Works fine with a small message count but degrades as the business grows. After a few months of active SMS campaigns across two tenants, the message count could be in the thousands.

**Impact:** The messages API endpoint becomes progressively slower and eventually times out on Vercel. The CRM inbox page fails to load.

---

### 19. `JSON.parse(content)` on User-Controlled Input Without Validation (LOW-MEDIUM)

**Files:** `src/app/api/leads/route.ts:117`

**What happens:** When `type === 'create_lead'`, the code does `JSON.parse(content)` where `content` is a user-supplied string from the request body. While the overall request is JSON-parsed by `request.json()`, the `content` field is parsed again as nested JSON. A malformed `content` string will throw, caught by the outer try/catch, returning a generic 500 error with no specific feedback.

**Why it's likely present:** This is a common pattern when passing structured data inside a string field. The lack of Zod validation (unlike the funnel-lead route which validates thoroughly) means any shape of JSON is accepted and used directly in the Supabase insert.

**Impact:** Arbitrary JSON fields can be written to the `funnel_submissions` table. If Supabase columns don't match, the insert silently fails (returning a non-ok response that triggers a generic 500).

---

### 20. `AbortSignal.timeout` Stacking Creates Resource Exhaustion (LOW-MEDIUM)

**Files:** Throughout the codebase — `AbortSignal.timeout(8000)`, `AbortSignal.timeout(10000)`, `AbortSignal.timeout(15000)` on multiple concurrent fetches

**What happens:** The SMS process route makes 6-10 sequential and parallel fetch calls, each with its own `AbortSignal.timeout`. These timeouts are independent — they don't account for cumulative time spent. A route with 5 sequential calls, each timing out at 8 seconds, has a worst-case execution time of 40 seconds. On Vercel Hobby (10s limit), the function is killed long before all timeouts resolve, potentially leaving Supabase in an inconsistent state (e.g., inbound message logged but AI reply never sent).

**Why it's likely present:** Individual timeouts were added defensively but total execution time was never budgeted. The 3-second artificial delay in the process route makes this worse.

**Impact:** Under degraded network conditions, the function reliably times out mid-execution, creating partial state (message logged as received but never replied to).

---

## Summary Priority Matrix

| Priority | Bug # | Issue | Fix Effort |
|----------|-------|-------|------------|
| P0 | 1 | Fire-and-forget promises killed on Vercel | Medium — use `waitUntil()` or move to queue |
| P0 | 2 | In-memory rate limiting useless on serverless | Medium — use Upstash Redis or Supabase |
| P0 | 3 | 10s Hobby timeout vs 60s route needs | Low — remove delay, optimize calls, or upgrade plan |
| P1 | 4 | Twilio duplicate message processing | Low — add MessageSid dedup check |
| P1 | 5 | Service key bypasses RLS everywhere | High — implement proper RLS + anon key |
| P1 | 6 | supaGet swallows all errors as empty array | Low — add error discrimination |
| P1 | 7 | Auth timing-safe comparison defeated | Low — remove the `===` early return |
| P1 | 8 | Empty catch blocks everywhere | Medium — add logging to all catch blocks |
| P2 | 9 | No Claude API retry logic | Low — add 1 retry with 2s backoff |
| P2 | 10 | Nodemailer fragile in serverless | Low — add `runtime = 'nodejs'` exports |
| P2 | 11 | Env var cleaning inconsistency | Low — centralize env cleaning |
| P2 | 12 | Twilio signature URL mismatch | Low — use configured base URL |
| P2 | 13 | Gmail app password silent expiry | Low — add health check endpoint |
| P2 | 14 | setInterval in serverless | Low — remove timers |
| P3 | 15 | No PDF size limit on credit analyze | Low — add body size check |
| P3 | 16 | Search param PostgREST injection | Medium — use parameterized queries |
| P3 | 17 | No CSRF tokens | Medium — add token-based CSRF |
| P3 | 18 | Unbounded Twilio message pagination | Low — add limit parameter |
| P3 | 19 | Unvalidated JSON.parse on user input | Low — add Zod schema |
| P3 | 20 | Cumulative timeout exceeds function budget | Medium — implement timeout budget |

---

*Generated by Agent 1A — Research Only. No files were modified.*
