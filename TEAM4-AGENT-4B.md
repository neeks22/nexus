# TEAM4 Agent 4B: Integration Test Report

**Agent:** 4B - Integration Tester (READ ONLY)
**Date:** 2026-04-01
**Scope:** End-to-end trace of all live integration flows, logical correctness review

---

## 1. Funnel -> Auto-Response Flow

**Files:** `apps/website/src/app/api/funnel-lead/route.ts`, `apps/website/src/lib/auto-response.ts`, `apps/website/src/lib/security.ts`

### Data Flow

```
Form POST -> Zod validation -> handleAutoResponse(lead, tenant)
  -> normalizePhone
  -> isDuplicate (Supabase GET funnel_submissions)
  -> insertLead (Supabase POST funnel_submissions)
  -> Promise.allSettled([sendSMS, sendWelcomeEmail])
     -> sendSMS: callClaude -> sendTwilioSMS -> supaPost lead_transcripts
     -> sendWelcomeEmail: nodemailer Gmail SMTP -> supaPost lead_transcripts
  -> slackNotify summary
Also: n8n webhook POST (backup/CRM sync)
```

### Happy Path: WORKS

The flow is logically sound. Zod validates all fields. Phone is normalized to E.164. Dedup prevents double-processing. SMS and email run in parallel via `Promise.allSettled` so one failing does not kill the other. The funnel route `await`s `handleAutoResponse` before returning (comment on line 254 explains why: Vercel would kill fire-and-forget). The n8n webhook is also awaited.

### Failure Modes

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Auto-response error is swallowed** | MEDIUM | Line 256: `handleAutoResponse` failure is caught and logged but the route still returns `{ success: true }` to the client. The lead may never get SMS/email, and the client thinks everything worked. However, Slack notification fires inside the catch (line 310), so the team gets alerted. Acceptable tradeoff. |
| 2 | **n8n webhook failure is swallowed** | LOW | Line 295: n8n POST failure logged but not surfaced. Since n8n is described as "backup/CRM sync", this is intentional. |
| 3 | **Duplicate check failure defaults to NOT duplicate** | MEDIUM | `isDuplicate` returns `false` on error (line 83). This means if Supabase is down, the same lead could get processed multiple times, receiving duplicate SMS/emails. A safer default would be `true` (skip processing), but that risks losing leads entirely. Current choice prioritizes lead capture over dedup -- reasonable for a sales system. |
| 4 | **`insertLead` failure is NOT caught independently** | HIGH | If `insertLead` throws (line 290), the entire `handleAutoResponse` jumps to the outer catch (line 307). SMS and email never send. The lead is lost from Supabase AND gets no response. The Slack fatal error notification does fire, but the lead gets nothing. |
| 5 | **Empty catch block** | LOW | Line 311: `catch { /* last resort */ }` -- if the Slack notification in the fatal error handler fails, it is silently swallowed. This is acceptable as a true last-resort handler. |
| 6 | **In-memory rate limiting resets on cold start** | LOW | Acknowledged in comments. Serverless limitation. Not a real concern for this traffic level. |

### Error Handling Grade: B+

Errors are logged, Slack alerts fire for failures, `Promise.allSettled` is used correctly. The main gap is `insertLead` failure cascading and killing SMS/email.

---

## 2. SMS Reply Flow

**Files:** `apps/website/src/app/api/webhook/sms/route.ts`, `apps/website/src/app/api/webhook/sms/process/route.ts`

### Data Flow

```
Twilio POST (form-encoded) -> webhook/sms/route.ts
  -> Rate limit check
  -> Twilio signature validation (production only)
  -> Fire-and-forget internal POST to /api/webhook/sms/process
  -> Return empty TwiML immediately (200)

process/route.ts:
  -> Verify x-process-secret header
  -> Log inbound message to Supabase
  -> Intent classification (UNSUBSCRIBE / HOT / PRICING / TRADE_IN / GENERAL)
  -> If STOP: send farewell, log, return
  -> If HOT: send handoff message, mark HOT_PAUSED, update lead status, Slack alert, return
  -> Check if lead is paused (two checks: transcript status + funnel_submissions status)
  -> Load conversation history (last 10 messages)
  -> Lookup lead name from funnel_submissions
  -> Sanitize message (anti-prompt-injection)
  -> callClaude with NESB sales prompt
  -> sendTwilioSMS with AI reply
  -> Log AI reply to Supabase
  -> slackNotify
  -> Fire-and-forget: runFormExtraction (second Claude call)
     -> Extract qualification data from conversation
     -> Save form_data to Supabase
     -> If 5+ of 6 fields filled: mark as qualified, send handoff, pause AI
```

### Happy Path: WORKS

The 3s sleep removal is clean -- it was just a `delay` parameter that is now passed as `0` and there is no actual `sleep()` call anywhere. The form extraction was moved to fire-and-forget (line 178) which is correct -- it runs after the primary SMS response is already sent.

### Failure Modes

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Fire-and-forget in webhook/sms/route.ts** | HIGH | Line 43: The internal `fetch` to `/api/webhook/sms/process` is NOT awaited. On Vercel, this means the webhook handler returns immediately (empty TwiML), but the background fetch may be killed by the runtime before the process route completes. **This is the #1 risk in the entire system.** The comment says the 3s sleep was removed to save Vercel budget, but the fire-and-forget pattern itself means Vercel may kill the connection before the process route finishes its work (Claude call + Twilio send + Supabase writes). |
| 2 | **PROCESS_SECRET empty string comparison** | MEDIUM | Line 15 in process/route.ts: `PROCESS_SECRET` defaults to `''`. If the env var is not set, the secret header check on line 16 compares `''` to `''`, which passes. Any request with no `x-process-secret` header would return `null` from `request.headers.get()`, which would fail the `!==` check. So this is actually safe -- `null !== ''` is true, so unauthorized requests are rejected. BUT: if the env var IS set to empty string explicitly, then the check is bypassed. Minor concern. |
| 3 | **runFormExtraction JSON.parse without try/catch** | HIGH | Line 221: `JSON.parse(extractResult)` will throw if Claude returns malformed JSON. The outer `.catch()` on line 178 catches it, but the error message logged is generic. More importantly, this crash kills the form extraction silently -- no Slack alert, no retry. |
| 4 | **Paused check defaults to paused on error** | GOOD | Lines 103, 119: If Supabase is down, the system defaults to NOT replying. This is the safe choice -- better to miss a reply than spam a hot lead the human is handling. |
| 5 | **Empty catch blocks in history/name lookup** | LOW | Lines 140, 149: `catch { /* no history */ }` and `catch { /* no lead */ }`. These are acceptable -- missing history or name just means the AI has less context, not a failure. |
| 6 | **Double Supabase query for HOT_PAUSED on every message** | LOW | Every inbound SMS triggers two Supabase queries (transcript status + funnel_submissions status) before the AI reply. This adds latency but is necessary for correctness. |
| 7 | **Empty catch on PATCH in HOT handoff** | MEDIUM | Line 82: `catch {}` after updating lead status to 'appointment'. If this fails, the lead stays in old status but the AI is still paused. CRM shows stale status. Violates the "never use empty catch blocks" rule. |
| 8 | **Tenant fallback** | LOW | Line 35: `TENANT_MAP[toPhone] || TENANT_MAP['+13433125045']` -- if a new Twilio number is added without updating TENANT_MAP, all messages default to ReadyCar. Could cause cross-tenant message routing. |

### Error Handling Grade: B-

The paused-check safety defaults are excellent. The fire-and-forget pattern on the main webhook is the biggest risk. The JSON.parse without try/catch and empty catch blocks are code quality issues.

---

## 3. Email Flow

**Files:** `apps/website/src/app/api/webhook/email/route.ts`, `apps/website/src/app/api/cron/check-email/route.ts`

### Data Flow

```
webhook/email/route.ts:
  External POST (from Google Apps Script or CRM) -> Auth check -> Parse email
  -> Skip internal/automated/non-reply/non-vehicle emails
  -> Log inbound to Supabase
  -> If unsubscribe: send farewell, return
  -> Classify intent
  -> callClaude for AI reply
  -> Send via Gmail SMTP (nodemailer)
  -> Log AI reply to Supabase
  -> slackNotify

cron/check-email/route.ts:
  GET: Returns setup instructions (no actual polling)
  POST: Receives email data -> classify -> callClaude -> send via Gmail SMTP -> log
```

### Happy Path: WORKS (with caveats)

The tenant-awareness changes work correctly. Both routes accept a `tenant` parameter, default to 'readycar', and use the correct tenant config for reply signatures. The cron route's GET endpoint is basically a no-op that returns instructions -- the actual work is done by the webhook or the POST endpoint.

### Failure Modes

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Supabase logging is fire-and-forget in webhook/email** | MEDIUM | Lines 85, 130: `supaPost` and the final log are called without `await`. If the function exits before these complete, the transcript is lost. The webhook route does await the Claude call and Gmail send, but not the Supabase logs. |
| 2 | **Gmail SMTP failure silently skips email** | MEDIUM | Line 121 in webhook/email: if `GMAIL_PASS` is falsy, the AI reply is generated but never sent. No error logged, no Slack alert. The response still says `action: 'sent'`. |
| 3 | **Duplicate Claude API call logic** | LOW | cron/check-email/route.ts (line 107) calls the Anthropic API directly instead of using the shared `callClaude` helper. This means the cron route has its own error handling (empty catch on line 117) that differs from the shared helper. |
| 4 | **"Not a reply" filter is too aggressive** | MEDIUM | Line 71 in webhook/email: `if (!emailSubject.toLowerCase().includes('re:'))` skips any email that is not a reply. If a lead sends a new email (not replying to a campaign), it gets silently dropped. Same in cron route line 79. |
| 5 | **Unsubscribe sends without logging** | LOW | Line 91-101 in webhook/email: The unsubscribe confirmation email is sent but not logged to Supabase transcripts. The lead's opt-out is not recorded anywhere persistent. |
| 6 | **Fire-and-forget Supabase/Slack in cron route** | MEDIUM | Lines 133-141 in cron/check-email: Both `fetch` calls to Supabase and Slack have `.catch(() => {})` -- empty catch blocks that swallow errors silently. |
| 7 | **Auth model difference** | LOW | webhook/email uses Google Apps Script user-agent detection OR same-origin OR API key. cron/check-email uses a `secret` query parameter. Inconsistent but each is appropriate for its use case. |

### Error Handling Grade: C+

The email flow has the most silent failure modes. Gmail credential absence is not reported. Supabase logs are fire-and-forget. Unsubscribe opt-outs are not persisted. Empty catch blocks in the cron route.

---

## 4. CRM Inbox

**Files:** `apps/website/src/app/inbox/dealerships/page.tsx`, `apps/website/src/app/api/messages/route.ts`, `apps/website/src/app/api/leads/route.ts`

### Data Flow

```
Inbox page loads -> PasswordGate (client-side auth)
  -> If authenticated (sessionStorage token):
     -> GET /api/messages?tenant=readycar (fetches ALL Twilio messages + Supabase leads)
     -> Groups messages into conversations by phone number
     -> Displays conversation list with lead metadata
     -> 30s polling interval for updates
     -> Compose bar: POST /api/messages (sends SMS via Twilio)
     -> Transfer: POST /api/messages (sends conversation summary to rep's phone)
```

### Happy Path: WORKS

The inbox fetches all Twilio messages via the Twilio API (paginated), cross-references with Supabase leads for metadata (name, status, vehicle interest), and groups them into conversations. The 30s polling keeps it reasonably up-to-date.

### Failure Modes

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Fetches ALL Twilio messages every 30 seconds** | HIGH | `fetchAllMessages()` on line 213 of messages/route.ts paginates through ALL messages in the Twilio account. For a new account this is fine, but as message volume grows, this becomes an O(n) API call on every page load and every 30s poll. Twilio rate limits will eventually throttle this. |
| 2 | **No server-side auth on messages API** | HIGH | The `GET /api/messages` route uses `requireApiKey` which allows same-origin requests without any token. The auth token from `/api/auth` is stored in `sessionStorage` but NEVER sent to the messages API. The password gate is purely client-side UI. Anyone who knows the URL can fetch all conversations by calling `/api/messages?tenant=readycar` from the same origin (or with the API key). |
| 3 | **Hardcoded tenant** | LOW | Line 10 in page.tsx: `const TENANT = 'readycar'`. The inbox only shows ReadyCar conversations. ReadyRide has no inbox access unless this is changed. |
| 4 | **Archive is client-side only** | LOW | `archivedPhones` is stored in React state. Refreshing the page restores all archived conversations. Not persisted. |
| 5 | **setInterval in serverless context** | LOW | Line 54 in messages/route.ts: `setInterval` for rate limit cleanup runs on module load. On Vercel serverless, this is essentially a no-op since the function instance dies between invocations. It does no harm but wastes a few cycles on cold start. |
| 6 | **sessionStorage auth check is token presence only** | MEDIUM | Line 227 in page.tsx: `sessionStorage.getItem('inbox_auth') === 'true'`. But on line 25, the token is stored as `data.token || 'true'`. If the server returns a real token, the check on line 227 fails because the value is not the string `'true'`. However, looking more carefully: on success the server returns `{ authenticated: true, token: "hex..." }`. The client stores `data.token` which is a hex string, not `'true'`. So the check `=== 'true'` would fail on page reload. **This means auth does not persist across page reloads** -- users must re-enter the password every time they reload. This is a UX bug but arguably a security feature. |

### Error Handling Grade: B-

The inbox works functionally but has scalability and auth weaknesses. The ALL-messages fetch is the biggest operational risk.

---

## 5. Auth Model

**File:** `apps/website/src/app/api/auth/route.ts`

### Current Model

```
Client: POST /api/auth { password, tenant }
Server: Compare against CRM_PASSWORD_READYCAR / CRM_PASSWORD_READYRIDE env vars
  -> If match: return { authenticated: true, token: random_hex_32 }
  -> If no match: return { authenticated: false } (401)
```

### Analysis

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | **Token is generated but never verified** | CRITICAL | The server generates a random 32-byte hex token on line 49 and returns it. The client stores it in `sessionStorage`. But NO subsequent API call ever checks this token. The token is purely decorative. The actual API routes (`/api/messages`, `/api/leads`) use `requireApiKey` which checks for the `NEXUS_API_KEY` or same-origin -- never the session token. |
| 2 | **Timing-safe comparison is applied incorrectly** | MEDIUM | Line 48: `if (password === expected)` is done first (NOT timing-safe). The timing-safe comparison on lines 54-56 is a fallback that only runs if the direct comparison fails. This means the timing-safe path is never reached on correct passwords and provides no protection against timing attacks on incorrect passwords (the attacker sees the same timing whether the first char or last char differs). |
| 3 | **Rate limiting: 5 attempts/min/IP** | GOOD | Reasonable brute-force protection. |
| 4 | **cleanEnv strips trailing \\n** | GOOD | Handles the Vercel CLI env var issue correctly. |
| 5 | **No session expiry** | LOW | The token never expires. Since it is only in `sessionStorage` (not `localStorage`), it dies when the tab closes. But within a session, there is no TTL. |
| 6 | **Password comparison for mismatched lengths** | LOW | `timingSafeEqual` throws if buffer lengths differ. The code checks `a.length === b.length` first, which leaks password length via timing. However, this is the fallback path that in practice is unreachable (the `===` on line 48 already returned). |
| 7 | **No CSRF protection on auth endpoint** | LOW | The auth endpoint accepts POST from anywhere. Combined with the fact the token is never verified, this is academic. |

### Auth Model Summary

The auth is a **client-side password gate only**. It prevents casual access to the inbox UI but provides zero server-side security. All API routes are protected by same-origin checks or the `NEXUS_API_KEY`, not by the auth token. This means:

- The inbox password stops someone from seeing the UI
- The API data is protected by origin checks (same-origin from nexusagents.ca)
- Anyone who can make requests appearing to come from nexusagents.ca can access all data
- The token generated by `/api/auth` serves no purpose

### Error Handling Grade: C

Functional but the token is security theater.

---

## 6. Health Endpoint

**File:** `apps/website/src/app/api/health/route.ts`

### Analysis

```typescript
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
  });
}
```

### Verdict: WORKS but SHALLOW

The endpoint returns a 200 with a JSON body. It does NOT check:
- Supabase connectivity
- Twilio credentials validity
- Claude API key validity
- Gmail credentials
- Slack webhook

This is a "is the server up" check, not a "are integrations healthy" check. For an uptime monitor (e.g., UptimeRobot), this is sufficient. For operational monitoring, it misses dependency health.

### Error Handling Grade: N/A (no error paths possible)

---

## Summary of Critical Findings

### Severity: CRITICAL

1. **Auth token is never verified server-side** (auth/route.ts) -- the generated token is decorative. All API security relies on same-origin checks only.

### Severity: HIGH

2. **Fire-and-forget webhook/sms/route.ts -> process/route.ts** -- the internal fetch is not awaited. On Vercel, the SMS processing may be killed before completion.
3. **insertLead failure kills SMS+email** (auto-response.ts:290) -- if Supabase insert fails, the lead gets no auto-response.
4. **ALL Twilio messages fetched on every inbox load** (messages/route.ts:213) -- O(n) API calls that will hit Twilio rate limits as volume grows.
5. **JSON.parse without try/catch in form extraction** (process/route.ts:221) -- malformed Claude output crashes the extraction silently.

### Severity: MEDIUM

6. **Duplicate check defaults to "not duplicate" on error** -- could cause duplicate SMS/emails if Supabase is down.
7. **Gmail SMTP absence silently skips email but returns "sent"** -- email webhook says it sent when it did not.
8. **"Not a reply" filter drops new lead emails** -- only `Re:` subjects are processed.
9. **Supabase logging is fire-and-forget in email routes** -- transcript entries may be lost.
10. **Empty catch blocks** in process/route.ts:82, check-email/route.ts:117, check-email/route.ts:133-141.
11. **sessionStorage auth check mismatch** -- token stored as hex but checked as `'true'`, causing re-auth on every page reload.

### What Works Well

- Zod validation on funnel input is thorough with injection detection
- `Promise.allSettled` for parallel SMS+email prevents cascading failures
- HOT lead paused-check defaults to safe (no-reply) on error
- Twilio signature validation in production
- Tenant-aware routing throughout
- Slack alerting on most failure paths
- Rate limiting on all endpoints
- Input sanitization and anti-prompt-injection in SMS processing
- Security headers on responses

---

*Agent 4B: Integration Test complete. Zero code changes made.*
