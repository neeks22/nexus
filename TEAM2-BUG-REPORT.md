# TEAM 2 — Agent 2A: API Route Audit Report

**Scope:** Every file in `apps/website/src/app/api/` (11 route files) + supporting `lib/security.ts` and `lib/auto-response.ts`
**Date:** 2026-04-01
**Status:** READ-ONLY AUDIT — zero code changes made

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 7     |
| HIGH     | 12    |
| MEDIUM   | 10    |
| LOW      | 5     |
| **TOTAL** | **34** |

---

## CRITICAL Bugs

---

```
FILE: apps/website/src/app/api/funnel-lead/route.ts
LINE: 262-264
SEVERITY: CRITICAL
BUG: Fire-and-forget promise — handleAutoResponse runs after Response is returned. Vercel serverless kills the function once the response is sent, so SMS, email, Supabase insert, and Slack notification are all silently killed mid-execution.
EVIDENCE:
    handleAutoResponse(lead, body.tenant).catch((err) => {
      console.error('[funnel-lead] Auto-response background error:', err instanceof Error ? err.message : 'unknown');
    });
    ...
    return NextResponse.json({ success: true }, ...);
FIX: Await handleAutoResponse before returning the response. Use waitUntil() from @vercel/functions if response latency is a concern, or restructure as a queued job (e.g., Supabase Edge Function, Inngest, or QStash).
```

---

```
FILE: apps/website/src/app/api/funnel-lead/route.ts
LINE: 267-303
SEVERITY: CRITICAL
BUG: Fire-and-forget fetch to n8n webhook — same issue as above. The fetch is not awaited and the response is returned immediately. On Vercel, the n8n webhook call will be killed before completion.
EVIDENCE:
    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      ...
    }).catch((err) => {
      console.error('[funnel-lead] n8n webhook failed:', ...);
    });

    return NextResponse.json({ success: true }, ...);
FIX: Await the fetch, or use waitUntil(), or batch both into the same awaited Promise.allSettled.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/route.ts
LINE: 43-49
SEVERITY: CRITICAL
BUG: Fire-and-forget fetch to internal /api/webhook/sms/process endpoint. The SMS webhook returns TwiML immediately but the process fetch is not awaited. On Vercel, the function terminates and the internal fetch may never reach the process endpoint — customer gets no AI reply.
EVIDENCE:
    fetch(`${baseUrl}/api/webhook/sms/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-process-secret': processSecret },
      body: JSON.stringify({ fromPhone, toPhone, messageBody, delay: 0 }),
    }).catch((err) => {
      console.error('[sms-webhook] Failed to trigger process:', err);
    });

    return new NextResponse(TWIML_OK, ...);
FIX: Use waitUntil() from @vercel/functions to keep the function alive, or use a queue/background job system (QStash, Inngest). Alternatively, move the AI processing into the same function and return TwiML after completion (within Twilio's 15s timeout).
```

---

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 9
SEVERITY: CRITICAL
BUG: maxDuration = 60 is ignored on Vercel Hobby plan (hard-capped at 10s). The route includes a 3s artificial delay (line 132), multiple Supabase queries, a Claude API call (up to 15s), a Twilio SMS send, and potentially a second Claude call for form extraction. Total time easily exceeds 10s — the function times out before sending the AI reply.
EVIDENCE:
    export const maxDuration = 60;
    ...
    await new Promise(resolve => setTimeout(resolve, 3000)); // line 132
    ...
    let aiReply = await callClaude(systemPrompt, userMsg); // callClaude has 15s timeout
FIX: Remove or reduce the 3s delay. Upgrade to Vercel Pro for 60s maxDuration. Or redesign as an async job with a queue.
```

---

```
FILE: apps/website/src/app/api/auth/route.ts
LINE: 48
SEVERITY: CRITICAL
BUG: Timing-safe comparison defeated by early return. Line 48 uses `===` which short-circuits on first mismatched character, leaking password via timing side-channel. The timingSafeEqual on line 56 only runs if the `===` comparison fails (which never happens for correct passwords, and for incorrect passwords the timing leak already occurred).
EVIDENCE:
    if (password === expected) {
      const token = crypto.randomBytes(32).toString('hex');
      return NextResponse.json({ authenticated: true, token });
    }

    // Fallback: timing-safe comparison
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);
FIX: Remove the `===` comparison entirely. Use only timingSafeEqual. Pad both buffers to the same length before comparison:
    const a = Buffer.from(password.padEnd(256, '\0'));
    const b = Buffer.from(expected.padEnd(256, '\0'));
    const match = crypto.timingSafeEqual(a, b);
```

---

```
FILE: apps/website/src/lib/security.ts
LINE: 145-168
SEVERITY: CRITICAL
BUG: In-memory rate limiting is useless on Vercel serverless. Each cold start creates a fresh empty Map. The rateLimitStore, plus the duplicate rateLimitMaps in funnel-lead/route.ts (line 35) and messages/route.ts (line 35), are all ephemeral. Attackers bypass rate limiting by sending requests that hit different isolates.
EVIDENCE:
    const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
    ...
    setInterval(() => { ... }, 120000); // cleanup timer also useless in serverless
FIX: Use Vercel KV (Redis), Upstash Redis, or a Supabase-backed rate limiter. The setInterval timers should be removed as they serve no purpose in serverless.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/route.ts
LINE: 19-49
SEVERITY: CRITICAL
BUG: No Twilio MessageSid deduplication. Twilio retries webhook delivery if it doesn't get a 2xx within 15s. Since the process route may time out, Twilio will retry. Each retry creates a new /process call, a new Claude API call, and a new SMS reply. Customer gets duplicate (or triple) AI responses.
EVIDENCE:
    const formData = await request.formData();
    const fromPhone = (formData.get('From') as string) || '';
    // No MessageSid extraction or dedup check anywhere
    ...
    fetch(`${baseUrl}/api/webhook/sms/process`, { ... });
FIX: Extract MessageSid from the form data. Check it against a dedup store (Redis/Supabase) before processing. Skip if already seen.
```

---

## HIGH Bugs

---

```
FILE: apps/website/src/lib/security.ts
LINE: 56-62
SEVERITY: HIGH
BUG: supaGet silently returns empty array on ANY failure — auth error, network timeout, malformed query, missing table. Callers cannot distinguish "no data" from "total failure". The isDuplicate function in auto-response.ts (line 76-84) returns false on error, causing duplicate leads to be created and messaged.
EVIDENCE:
    export async function supaGet(path: string): Promise<unknown[]> {
      try {
        const res = await fetch(...);
        if (res.ok) return await res.json();
      } catch { /* ignore */ }
      return [];
    }
FIX: Throw on error or return a Result type { data, error }. At minimum, log the error. Callers must handle the failure case explicitly.
```

---

```
FILE: apps/website/src/lib/security.ts
LINE: 64-71
SEVERITY: HIGH
BUG: supaPost silently swallows ALL errors. If Supabase is down or the insert fails, no error is thrown or logged. Lead data, transcript entries, and status updates are silently lost.
EVIDENCE:
    export async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
      try {
        await fetch(...);
      } catch { /* ignore */ }
    }
FIX: Log errors. Return a boolean or throw. Critical inserts (lead creation, transcript logging) should not silently fail.
```

---

```
FILE: apps/website/src/lib/security.ts
LINE: 196-204
SEVERITY: HIGH
BUG: slackNotify silently swallows errors. If Slack webhook fails, the team never learns about critical events (hot lead handoffs, SMS failures, fatal errors). This is the monitoring layer — it cannot silently fail.
EVIDENCE:
    export async function slackNotify(text: string): Promise<void> {
      ...
      } catch { /* ignore */ }
    }
FIX: Log the error to console.error so it at least appears in Vercel logs.
```

---

```
FILE: apps/website/src/app/api/credit-analyze/route.ts
LINE: 62
SEVERITY: HIGH
BUG: request.json() called without try/catch. If the client sends malformed JSON, this throws an unhandled exception which is caught by the outer try/catch and returns a generic 500 error instead of a descriptive 400 error.
EVIDENCE:
    const body = await request.json();  // no try/catch
FIX: Wrap in try/catch like funnel-lead/route.ts does, returning 400 with "Invalid JSON body" message.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 81
SEVERITY: HIGH
BUG: request.json() in PATCH handler called without try/catch. Malformed JSON throws and is caught by outer catch, returning generic 500 instead of 400.
EVIDENCE:
    const body = await request.json();  // PATCH handler, line 81
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 109
SEVERITY: HIGH
BUG: request.json() in POST handler called without try/catch. Same issue as above.
EVIDENCE:
    const body = await request.json();  // POST handler, line 109
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 174
SEVERITY: HIGH
BUG: request.json() in DELETE handler called without try/catch. Same issue.
EVIDENCE:
    const body = await request.json();  // DELETE handler, line 174
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 30
SEVERITY: HIGH
BUG: request.json() called without try/catch. If Google Apps Script sends malformed data, throws unhandled exception caught by outer catch returning generic 500.
EVIDENCE:
    const body = await request.json();
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/messages/route.ts
LINE: 498
SEVERITY: HIGH
BUG: request.json() in POST handler called without try/catch. Although the outer try/catch exists, it returns 500 instead of 400 for what is fundamentally a client error.
EVIDENCE:
    const body = (await request.json()) as { to?: unknown; body?: unknown; tenant?: unknown };
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 46
SEVERITY: HIGH
BUG: request.json() called without try/catch in POST handler. Malformed request body causes 500 instead of 400.
EVIDENCE:
    const body = await request.json();
FIX: Wrap in try/catch, return 400 for invalid JSON.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 82, 141, 260, 263
SEVERITY: HIGH
BUG: Multiple empty catch blocks swallowing critical errors. Line 82: lead status update silently fails. Line 141: conversation history load silently fails (AI replies without context). Line 260: lead status update to credit_app silently fails. Line 263: JSON parse of form extraction silently fails.
EVIDENCE:
    } catch {}                    // line 82 — lead status PATCH
    } catch { /* no history */ }  // line 141 — conversation history
    } catch {}                    // line 260 — status PATCH
    } catch { /* JSON parse failed, skip */ }  // line 263
FIX: At minimum, log the error in each catch block. For the status PATCH operations, a failed update means the CRM shows stale data.
```

---

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 102
SEVERITY: HIGH
BUG: Empty catch block swallows Claude API failure. If Claude fails, aiReply is empty string, but the fallback on line 104 only checks for falsy — the error itself is never logged.
EVIDENCE:
    } catch { /* Claude failed */ }
FIX: Log the error: catch (err) { console.error('[check-email] Claude API failed:', err); }
```

---

## MEDIUM Bugs

---

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 118-121
SEVERITY: MEDIUM
BUG: Fire-and-forget Supabase log and Slack notification. Both fetches are not awaited and use .catch(() => {}). On Vercel, these may be killed before completion, losing the transcript log and Slack alert.
EVIDENCE:
    fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, { ... }).catch(() => {});
    fetch(SLACK_WEBHOOK, { ... }).catch(() => {});
    return NextResponse.json({ sent: true, ... });
FIX: Await both fetches (use Promise.allSettled) before returning.
```

---

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 71-74
SEVERITY: MEDIUM
BUG: supaPost call for logging inbound email is fire-and-forget (supaPost itself is async but not awaited here). The function continues without confirming the log was saved.
EVIDENCE:
    supaPost('lead_transcripts', {
      tenant_id: tenant, lead_id: senderEmail, entry_type: 'message',
      role: 'customer', content: emailBody.substring(0, 500), channel: 'email',
    });
FIX: Await the supaPost call or accept that inbound emails may not be logged.
```

---

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 116-117
SEVERITY: MEDIUM
BUG: supaPost and slackNotify at the end of the email handler are fire-and-forget. The response is returned on line 119 before these complete. On Vercel, they may be killed.
EVIDENCE:
    supaPost('lead_transcripts', { ... });
    slackNotify(`EMAIL REPLY SENT\nTo: ${senderEmail}\nIntent: ${intent}\nHandoff: ${shouldHandoff}`);
    return NextResponse.json({ action: 'sent', ... });
FIX: Await both before returning.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 174
SEVERITY: MEDIUM
BUG: slackNotify is fire-and-forget (not awaited). The function returns on line 267 potentially before Slack is notified.
EVIDENCE:
    slackNotify(`SMS REPLY (${tenant.name})\nTo: ${fromPhone}\nReply: ${aiReply.substring(0, 100)}...`);
FIX: Await slackNotify before returning.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 83
SEVERITY: MEDIUM
BUG: PII logged to Slack — customer phone number and raw message body sent to Slack webhook in plain text. Multiple occurrences at lines 83, 126, 174, 244.
EVIDENCE:
    await slackNotify(`HOT LEAD HANDOFF — AI PAUSED\nPhone: ${fromPhone}\nDealer: ${tenant.name}\nMessage: ${messageBody}\n...`);
FIX: Mask phone numbers in Slack messages (e.g., +1613***1234). Do not send raw customer messages to Slack.
```

---

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 125
SEVERITY: MEDIUM
BUG: PII sent to Slack — customer email address in plain text.
EVIDENCE:
    body: JSON.stringify({ text: `EMAIL REPLY SENT\nTo: ${to}\nIntent: ${intent}\nHandoff: ${shouldHandoff}` }),
FIX: Mask email address in Slack notifications.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 117
SEVERITY: MEDIUM
BUG: JSON.parse(content) without try/catch. If content is not valid JSON, this throws and is caught by the outer catch returning a generic 500 error with no indication of what went wrong.
EVIDENCE:
    const leadData = JSON.parse(content);
FIX: Wrap in try/catch, return 400 with "Invalid lead data JSON" message.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 169-191
SEVERITY: MEDIUM
BUG: DELETE handler has no rate limiting. An authenticated attacker could mass-delete all leads in rapid succession.
EVIDENCE:
    export async function DELETE(request: NextRequest): Promise<NextResponse> {
      const authError = requireApiKey(request);
      if (authError) return authError;
      // No rateLimit() call
      try { ... }
FIX: Add rate limiting like the other handlers in this file.
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 182-186
SEVERITY: MEDIUM
BUG: DELETE endpoint deletes across three tables using Promise.all but does not check if any of the deletes failed. If one fails, partial deletion occurs (e.g., transcripts deleted but submission remains), leading to orphaned data.
EVIDENCE:
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts?...`, { method: 'DELETE', ... }),
      fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions?...`, { method: 'DELETE', ... }),
      fetch(`${SUPABASE_URL}/rest/v1/consent_records?...`, { method: 'DELETE', ... }),
    ]);
    return NextResponse.json({ success: true, ... });
FIX: Check each response for success. Use Promise.allSettled and report partial failures.
```

---

```
FILE: apps/website/src/app/api/credit-analyze/route.ts
LINE: 139
SEVERITY: MEDIUM
BUG: Empty catch block swallows JSON parse error when extracting CLIENT_JSON from Claude response.
EVIDENCE:
    try {
      clientInfo = JSON.parse(jsonMatch[1]);
    } catch { /* couldn't parse */ }
FIX: Log the parse failure so malformed Claude responses can be investigated.
```

---

## LOW Bugs

---

```
FILE: apps/website/src/app/api/credit-analyze/route.ts
LINE: 104-116
SEVERITY: LOW
BUG: No timeout on Anthropic API call. The fetch to api.anthropic.com has no AbortSignal.timeout, unlike other routes. If Claude API hangs, the Vercel function will timeout with no useful error.
EVIDENCE:
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({ ... }),
      // No signal: AbortSignal.timeout(...)
    });
FIX: Add signal: AbortSignal.timeout(15000) to match other routes.
```

---

```
FILE: apps/website/src/app/api/dashboard/route.ts
LINE: 35
SEVERITY: LOW
BUG: Catch block returns 500 with no error logging. When the dashboard fails, there is no way to diagnose why from Vercel logs.
EVIDENCE:
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
FIX: Log the error: catch (err) { console.error('[dashboard] Error:', err); return ... }
```

---

```
FILE: apps/website/src/app/api/leads/route.ts
LINE: 56
SEVERITY: LOW
BUG: Activity endpoint catch block returns 200 with empty array instead of 500, masking server errors as "no activity".
EVIDENCE:
    } catch { return NextResponse.json({ activity: [] }); }
FIX: Return 500 status code and log the error.
```

---

```
FILE: apps/website/src/app/api/webhook/sms/route.ts
LINE: 16
SEVERITY: LOW
BUG: Rate-limited requests return 200 with TwiML instead of 429. While this is intentional to prevent Twilio retries, it means rate limiting is invisible — no logging, no monitoring, no way to detect abuse.
EVIDENCE:
    if (rateLimit(ip, 60)) {
      return new NextResponse(TWIML_OK, { status: 200, ... });
    }
FIX: Add console.warn logging when rate limiting triggers so abuse attempts appear in Vercel logs.
```

---

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 23-24
SEVERITY: LOW
BUG: Origin check uses .includes() which is too permissive. A domain like "evil-nexusagents.ca" or "nexusagents.ca.attacker.com" would pass the check.
EVIDENCE:
    const isSameOrigin = origin?.includes('nexusagents.ca') || referer?.includes('nexusagents.ca');
FIX: Use URL parsing and exact hostname comparison like the requireApiKey function in security.ts does.
```

---

## Architecture-Level Concerns (Not Per-Line Bugs)

1. **Service key used everywhere** (`security.ts:33-42`): `supaHeaders()` uses `SUPABASE_SERVICE_KEY` which bypasses RLS. The `supaAnonHeaders()` function exists but is never called. All tenant isolation is application-level — one missing `tenant_id=eq.X` filter leaks cross-tenant data.

2. **Three independent in-memory rate limiters**: `security.ts:145`, `funnel-lead/route.ts:35`, `messages/route.ts:35`. All three are useless on serverless. Code is also duplicated instead of shared.

3. **No webhook idempotency**: Neither the SMS webhook nor the email webhook has any deduplication mechanism. Retries from Twilio or Google Apps Script create duplicate processing.

4. **No CORS headers on webhook endpoints**: `webhook/sms/route.ts` and `webhook/email/route.ts` do not set CORS headers. While webhooks are server-to-server and don't strictly need CORS, the email webhook accepts requests from Google Apps Script running in a browser context.

5. **auto-response.ts PII in Slack** (lines 163-164, 267, 298-303): Full customer names, phone numbers, emails, vehicle types, and credit situations are sent to Slack in plain text. Under PIPEDA, this PII in a third-party chat tool is a compliance risk.
# TEAM 2 -- Agent 2B: Database & Supabase Audit Report

## Scope
Audited all SQL migrations (001, 002, 002_simple, 003), security.ts (supaGet/supaPost/supaHeaders), auto-response.ts, leads route, SMS process route, and email cron route against 10 check categories.

---

## BUG 1: CHECK constraint on funnel_submissions.status rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 101
SEVERITY: CRITICAL
BUG: The CHECK constraint on funnel_submissions.status only allows ('new', 'contacted', 'qualified', 'converted', 'lost'). But the application writes 'appointment' (sms/process/route.ts:80), 'credit_app' (sms/process/route.ts:258), 'approved', 'delivered' (checked in sms/process/route.ts:115), and 'showed' (leads/route.ts:9 VALID_STATUSES). These PATCH operations will fail with a CHECK constraint violation at the database level.
EVIDENCE:
  SQL: CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
  App (sms/process/route.ts:80): body: JSON.stringify({ status: 'appointment' })
  App (sms/process/route.ts:258): body: JSON.stringify({ status: 'credit_app' })
  App (leads/route.ts:9): VALID_STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost']
FIX: ALTER the CHECK constraint to include all statuses the app uses:
  CHECK (status IN ('new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'qualified', 'converted', 'lost'))
```

## BUG 2: CHECK constraint on lead_transcripts.entry_type rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 26
SEVERITY: CRITICAL
BUG: The CHECK constraint on lead_transcripts.entry_type only allows ('message', 'handoff', 'compliance_check'). But the application inserts entry_type values of 'status' (sms/process/route.ts:75), 'form_data' (sms/process/route.ts:206), 'completed_form' (sms/process/route.ts:237), and 'note' (leads/route.ts:155 via type || 'note'). All of these INSERTs will be rejected by the DB.
EVIDENCE:
  SQL: CHECK (entry_type IN ('message', 'handoff', 'compliance_check'))
  App (sms/process/route.ts:75): entry_type: 'status'
  App (sms/process/route.ts:206): entry_type: 'form_data'
  App (sms/process/route.ts:237): entry_type: 'completed_form'
  App (leads/route.ts:155): entry_type: type || 'note'
FIX: ALTER the CHECK constraint:
  CHECK (entry_type IN ('message', 'handoff', 'compliance_check', 'status', 'form_data', 'completed_form', 'note'))
```

## BUG 3: CHECK constraint on lead_transcripts.channel rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 29
SEVERITY: HIGH
BUG: The CHECK constraint on lead_transcripts.channel only allows ('sms', 'email', 'voice', 'chat', 'funnel'). But the application writes channel='crm' in multiple places (leads/route.ts:157, sms/process/route.ts:209, sms/process/route.ts:239). These INSERTs will be rejected.
EVIDENCE:
  SQL: CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel'))
  App (leads/route.ts:157): channel: 'crm'
  App (sms/process/route.ts:209): channel: 'crm'
FIX: Add 'crm' to the channel CHECK constraint:
  CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel', 'crm'))
```

## BUG 4: RLS policies allow full cross-tenant data access when x-tenant-id header is missing

```
FILE: /Users/sayah/nexus/supabase/migrations/003_rls_tenant_isolation.sql
LINE: 52-53 (and all subsequent policies)
SEVERITY: CRITICAL
BUG: Every RLS policy includes "OR get_request_tenant() = ''" which means: if NO x-tenant-id header is provided, the policy evaluates to TRUE and ALL rows are visible/writable. The get_request_tenant() function returns '' on any error or when the header is missing. This means any request without the header bypasses tenant isolation entirely.
EVIDENCE:
  SQL: USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
  get_request_tenant() returns '' when header is missing (line 38-41)
FIX: Remove the "OR get_request_tenant() = ''" fallback. If tenant_id cannot be determined, the policy should DENY access, not GRANT it. Use:
  USING (tenant_id = get_request_tenant() AND get_request_tenant() != '')
```

## BUG 5: Service role key used for ALL Supabase operations -- RLS completely bypassed

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 33-42, 56-71
SEVERITY: HIGH
BUG: supaHeaders() uses SUPABASE_SERVICE_KEY (service role) for every request. The service role key ALWAYS bypasses RLS in Supabase -- this is by design. Therefore all the RLS policies in 003_rls_tenant_isolation.sql are never enforced for any application query. supaAnonHeaders() exists (line 45-54) but is never called anywhere in the codebase. Tenant isolation depends entirely on application-level WHERE clauses being correct in every single query.
EVIDENCE:
  security.ts:11: export const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim()
  security.ts:34: apikey: SUPABASE_KEY,
  supaAnonHeaders() defined but unused
FIX: Use supaAnonHeaders() for read operations where RLS should be enforced. Reserve service role key only for admin operations that truly need to bypass RLS.
```

## BUG 6: supaGet and supaPost silently swallow all errors -- empty catch blocks

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 60-61 (supaGet), 69-70 (supaPost)
SEVERITY: HIGH
BUG: Both supaGet and supaPost have empty catch blocks with only "/* ignore */" comments. supaGet returns [] on ANY failure (network, auth, malformed query, table missing). supaPost silently drops data. Callers cannot distinguish "no results" from "total failure". This violates the project's own CLAUDE.md rule: "NEVER use empty catch blocks. ALL catch blocks MUST log errors."
EVIDENCE:
  supaGet: catch { /* ignore */ } return [];
  supaPost: catch { /* ignore */ }
FIX: Log errors in both catch blocks. supaGet should throw or return a discriminated union { data: [], error: string | null } so callers can distinguish empty results from failures. supaPost should at minimum log the error with console.error.
```

## BUG 7: isDuplicate in auto-response.ts queries encrypted phone column and will never find matches

```
FILE: /Users/sayah/nexus/apps/website/src/lib/auto-response.ts
LINE: 77-78
SEVERITY: CRITICAL
BUG: isDuplicate queries funnel_submissions with phone=eq.X, but the PII encryption trigger (002_pii_encryption.sql:156-158) NULLs out the plaintext phone column on INSERT and moves it to encrypted_phone. So the phone column is always NULL in the database, and this equality check will never match. Every submission is treated as non-duplicate, causing duplicate leads and duplicate SMS/email sends.
EVIDENCE:
  auto-response.ts:78: `funnel_submissions?tenant_id=eq.${tenantId}&phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`
  002_pii_encryption.sql:158: NEW.phone := NULL;
  The query hits the raw table, not the decrypted view v_funnel_submissions.
FIX: Query v_funnel_submissions instead of funnel_submissions for the dedup check, or query using encrypted_phone with the encrypt_pii function.
```

## BUG 8: PATCH on funnel_submissions.phone will never match rows due to encryption

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 78
SEVERITY: CRITICAL
BUG: The PATCH to update lead status filters by phone=eq.X on the raw funnel_submissions table. But the phone column is always NULL (encrypted into encrypted_phone by the trigger). This PATCH will match zero rows and silently do nothing -- the lead status is never updated.
EVIDENCE:
  sms/process/route.ts:78: `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeURIComponent(fromPhone)}&tenant_id=eq.${tenant.tenant}`
  Same issue at line 256.
  Also in leads/route.ts:90: `funnel_submissions?phone=eq.${encodeSupabaseParam(phone)}&tenant_id=eq.${tenant}`
FIX: Either query v_funnel_submissions to get the ID first then PATCH by ID, or add a hashed_phone column for lookups that persists through encryption.
```

## BUG 9: Email cron route hardcodes tenant_id='readycar' -- no multi-tenant support

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 120
SEVERITY: MEDIUM
BUG: The email cron POST handler hardcodes tenant_id: 'readycar' when logging to lead_transcripts. All email replies are attributed to readycar regardless of which tenant the email belongs to. ReadyRide email replies get logged under the wrong tenant.
EVIDENCE:
  check-email/route.ts:120: body: JSON.stringify({ tenant_id: 'readycar', lead_id: senderEmail || to, ... })
FIX: Determine tenant from the sender/recipient email domain or pass tenant as a parameter.
```

## BUG 10: Email cron route hardcodes "Nicolas" / "ReadyCar" -- breaks for ReadyRide

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 76-77, 86, 105, 111-112
SEVERITY: MEDIUM
BUG: The email cron route hardcodes dealer name "Nicolas", "ReadyCar", and phone "613-363-4494" throughout. ReadyRide emails would be sent as if from ReadyCar's GM, which is incorrect and confusing for customers.
EVIDENCE:
  Line 76: const unsubMsg = '...Nicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
  Line 86: systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar...'
  Line 112: from: '"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>'
FIX: Look up tenant config based on recipient email or pass tenant parameter, then use tenant-specific name/phone/location.
```

## BUG 11: Hardcoded encryption key in 002_pii_encryption_simple.sql

```
FILE: /Users/sayah/nexus/supabase/migrations/002_pii_encryption_simple.sql
LINE: 23
SEVERITY: CRITICAL
BUG: The "simple" PII encryption migration hardcodes the encryption key as a string literal 'nexus-pii-key-2026' directly in the function body. Anyone with read access to the migration file, the pg_proc system catalog, or a SQL dump can decrypt all PII data.
EVIDENCE:
  Line 23: RETURN encode(pgp_sym_encrypt(plaintext, 'nexus-pii-key-2026'), 'base64');
  Line 31: RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), 'nexus-pii-key-2026');
FIX: Use the Vault-based approach from 002_pii_encryption.sql instead. If both migrations have been applied, the simple version's functions may have overwritten the secure versions.
```

## BUG 12: Two conflicting PII encryption migrations -- function overwrite risk

```
FILE: /Users/sayah/nexus/supabase/migrations/002_pii_encryption.sql and 002_pii_encryption_simple.sql
LINE: N/A (file-level)
SEVERITY: HIGH
BUG: Both migrations define encrypt_pii() and decrypt_pii() with CREATE OR REPLACE, but with different signatures (one takes 2 args, one takes 1 arg). If both are applied, the second one overwrites the first. The "simple" version has a hardcoded key; the "proper" version uses Vault. Depending on execution order, you may end up with the insecure version. Additionally, the views in 002_pii_encryption.sql call decrypt_pii(col, get_pii_key()) with 2 args, but if the simple version's 1-arg decrypt_pii() was applied last, these view calls will fail with a signature mismatch.
EVIDENCE:
  002_pii_encryption.sql:42: CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, key TEXT)
  002_pii_encryption_simple.sql:19: CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
FIX: Remove one migration. Keep only the Vault-based version. Ensure function signatures are consistent.
```

## BUG 13: Missing indexes on columns used in WHERE clauses

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: N/A
SEVERITY: MEDIUM
BUG: Several query patterns in application code filter on columns that have no indexes:
  1. funnel_submissions.phone -- used in PATCH WHERE clauses and dedup checks, no index exists
  2. lead_transcripts.entry_type -- used in WHERE entry_type=eq.status (sms/process/route.ts:96), no index
  3. lead_transcripts.channel -- used in WHERE channel=eq.sms and channel=eq.crm (leads/route.ts:36), no index
  4. funnel_submissions.email -- used in search ilike queries, no index
EVIDENCE:
  Existing indexes: idx_transcript_tenant_lead (tenant_id, lead_id), idx_funnel_tenant (tenant_id)
  Missing: phone, entry_type, channel columns have no indexes
FIX: Add indexes:
  CREATE INDEX idx_funnel_phone ON funnel_submissions(tenant_id, phone);
  CREATE INDEX idx_transcript_entry_type ON lead_transcripts(entry_type);
  CREATE INDEX idx_transcript_channel ON lead_transcripts(channel);
```

## BUG 14: Empty catch blocks in SMS process route swallow critical failures

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 82, 141, 260, 263, 265
SEVERITY: HIGH
BUG: Multiple empty catch blocks swallow errors silently:
  - Line 82: empty catch on status PATCH -- lead status never updated, no one knows
  - Line 141: empty catch on conversation history fetch -- AI replies without context
  - Line 260: empty catch on credit_app status PATCH -- qualified lead not marked
  - Line 263: empty catch on JSON parse of extraction -- form data lost
  - Line 265: empty catch on entire extraction block -- qualification pipeline silently dead
EVIDENCE:
  Line 82: } catch {}
  Line 260: } catch {}
  Line 263: } catch { /* JSON parse failed, skip */ }
FIX: Add console.error logging to every catch block. For critical operations (status updates), add Slack notifications on failure.
```

## BUG 15: supaGet does not pass tenant_id header -- no defense-in-depth

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 58
SEVERITY: MEDIUM
BUG: supaGet() calls supaHeaders() without passing a tenant parameter. This means the x-tenant-id header is never set on any supaGet request. Even if RLS policies were enforced (they aren't due to service key usage), the tenant header would be missing, causing get_request_tenant() to return '' and the OR fallback to grant access to all rows.
EVIDENCE:
  security.ts:58: const res = await fetch(..., { headers: supaHeaders(), ... });
  supaGet callers like isDuplicate (auto-response.ts:77) don't pass tenant through supaGet.
FIX: Modify supaGet to accept and pass a tenant parameter:
  export async function supaGet(path: string, tenant?: string): Promise<unknown[]>
  Then pass tenant in supaHeaders(tenant).
```

## BUG 16: supaPost does not pass tenant_id header

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 66-67
SEVERITY: MEDIUM
BUG: Same issue as supaGet -- supaPost calls supaHeaders() without a tenant parameter. The x-tenant-id header is never set on POST requests through this helper.
EVIDENCE:
  security.ts:67: method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
FIX: Add tenant parameter to supaPost and pass it through to supaHeaders.
```

## BUG 17: encodeSupabaseParam preserves literal '+' which breaks PostgREST filter syntax

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 188-191
SEVERITY: MEDIUM
BUG: encodeSupabaseParam intentionally un-encodes %2B back to '+'. But in PostgREST URL query strings, an unencoded '+' is interpreted as a space character (URL encoding standard). So a phone number like +16135551234 becomes " 16135551234" (with leading space) in the PostgREST filter, which will never match any row.
EVIDENCE:
  security.ts:189: .replace(/%2B/g, '+')
  Used in leads/route.ts:33: encodeSupabaseParam(phone) for lead_transcripts queries
  Used in leads/route.ts:90: encodeSupabaseParam(phone) for funnel_submissions PATCH
FIX: Keep '+' encoded as %2B in URL query parameters. The phone number in the database already has a literal '+', so PostgREST needs the encoded form to match correctly. Remove the .replace(/%2B/g, '+') line.
```

## BUG 18: Leads route activity query uses channel=eq.crm but 'crm' fails CHECK constraint

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/leads/route.ts
LINE: 36-37
SEVERITY: HIGH
BUG: The activity endpoint queries lead_transcripts with channel=eq.crm, but 'crm' is not in the CHECK constraint for channel. This means no rows with channel='crm' can exist in the database (INSERTs would be rejected), so this query will always return empty results. This is a downstream effect of BUG 3.
EVIDENCE:
  leads/route.ts:36: `lead_transcripts?...&channel=eq.crm&...`
  001_nexus_tables.sql:29: CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel'))
FIX: Add 'crm' to the channel CHECK constraint (same fix as BUG 3).
```

## BUG 19: Email cron fires-and-forgets Supabase log and Slack notify without await

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 118-126
SEVERITY: MEDIUM
BUG: The Supabase lead_transcripts insert and Slack webhook are called without await -- just .catch(() => {}). On Vercel serverless, these fire-and-forget fetches will be killed when the function returns the response on line 128. The email reply transcript may never be logged.
EVIDENCE:
  Line 118: fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {...}).catch(() => {});
  Line 123: fetch(SLACK_WEBHOOK, {...}).catch(() => {});
  Line 128: return NextResponse.json({ sent: true, ... });
FIX: Await both fetch calls before returning the response, or use waitUntil() if available on the platform.
```

## BUG 20: Leads DELETE endpoint has no rate limiting

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/leads/route.ts
LINE: 169-192
SEVERITY: MEDIUM
BUG: The DELETE endpoint (which deletes all customer data across 3 tables) has no rate limiting, unlike GET/PATCH/POST which all check rateLimit(). An attacker with a valid API key or same-origin access could mass-delete customer data.
EVIDENCE:
  GET (line 17): if (rateLimit(ip, 60))
  PATCH (line 78): if (rateLimit(ip, 30))
  POST (line 106): if (rateLimit(ip, 20))
  DELETE (line 169): no rate limit check
FIX: Add rate limiting to the DELETE handler, e.g., rateLimit(ip, 5) for a stricter limit.
```

---

## SUMMARY

| Severity | Count | Bug IDs |
|----------|-------|---------|
| CRITICAL | 6     | 1, 2, 4, 7, 8, 11 |
| HIGH     | 6     | 3, 5, 6, 12, 14, 18 |
| MEDIUM   | 8     | 9, 10, 13, 15, 16, 17, 19, 20 |

### Top 3 Showstoppers (fix immediately):
1. **BUG 1 + 2 + 3**: CHECK constraints reject values the app writes -- funnel_submissions.status, lead_transcripts.entry_type, and lead_transcripts.channel. This means status updates, CRM notes, form extraction, and activity logging ALL silently fail at the database level. Combined with empty catch blocks (BUG 6, 14), nobody knows.
2. **BUG 7 + 8**: PII encryption NULLs out the phone column, but queries filter on the plaintext phone column. Dedup never works (duplicate leads created), status PATCHes never match (leads stuck in 'new' forever).
3. **BUG 4**: RLS policies have an OR fallback that grants access to ALL rows when the tenant header is missing. Combined with BUG 5 (service key bypasses RLS entirely), there is zero tenant isolation at the database level.
# TEAM 2 -- Agent 2C: SMS/Email/AI Agent Audit Report

**Scope:** Twilio SMS pipeline, email pipeline, Claude API calls, auto-response system, security utilities.

**Files audited:**
- `apps/website/src/app/api/webhook/sms/route.ts`
- `apps/website/src/app/api/webhook/sms/process/route.ts`
- `apps/website/src/app/api/webhook/email/route.ts`
- `apps/website/src/app/api/cron/check-email/route.ts`
- `apps/website/src/app/api/messages/route.ts`
- `apps/website/src/lib/auto-response.ts`
- `apps/website/src/lib/security.ts`

---

## FINDINGS

---

### BUG 1: Fire-and-Forget Fetch in SMS Webhook Killed by Vercel

```
FILE: apps/website/src/app/api/webhook/sms/route.ts
LINE: 43-49
SEVERITY: CRITICAL
BUG: The inbound SMS webhook fires off a fetch() to /api/webhook/sms/process and immediately returns TwiML. On Vercel serverless, the function terminates as soon as the response is sent. The background fetch is killed mid-flight. The customer texts in, Twilio gets a 200, but the AI processing never completes.
EVIDENCE:
  fetch(`${baseUrl}/api/webhook/sms/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-process-secret': processSecret },
    body: JSON.stringify({ fromPhone, toPhone, messageBody, delay: 0 }),
  }).catch((err) => {
    console.error('[sms-webhook] Failed to trigger process:', err);
  });

  return new NextResponse(TWIML_OK, { ...});
FIX: Use waitUntil() from next/server (Next.js 14+) to keep the function alive until the fetch completes. Alternatively, use Vercel's edge runtime with waitUntil, or await the fetch before returning TwiML (Twilio allows up to 15s before retry). Or use a queue (Vercel KV, Upstash QStash) to decouple ingestion from processing.
```

---

### BUG 2: 3-Second setTimeout Consumes 30% of Vercel Hobby 10s Budget

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 132
SEVERITY: CRITICAL
BUG: A 3-second artificial delay ("human feel") runs before any AI processing begins. On Vercel Hobby plan (10s hard timeout), this leaves only 7 seconds for: 2 Supabase pause checks + history fetch + lead lookup + Claude API call (2-8s) + Twilio SMS send + Supabase log + optional form extraction (second Claude call). This routinely exceeds 10s total.
EVIDENCE:
  await new Promise(resolve => setTimeout(resolve, 3000));
FIX: Remove the delay entirely. If "human feel" is required, implement it client-side or use a queue-based system where the delay happens outside the serverless function's execution window. The maxDuration = 60 on line 9 is silently ignored on Vercel Hobby.
```

---

### BUG 3: Double Claude API Call Per Message Guarantees Timeout

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 164 + 197
SEVERITY: CRITICAL
BUG: Every inbound SMS triggers TWO Claude API calls sequentially: (1) AI response generation at line 164, (2) form data extraction at line 197. Each callClaude has a 15s AbortSignal timeout. Combined with the 3s delay (Bug 2), Supabase queries, and Twilio sends, worst-case execution is 3s + 15s + 15s + network = 33s+. Even best case is 3s + 3s + 2s + network = ~10s, right at the Hobby limit.
EVIDENCE:
  let aiReply = await callClaude(systemPrompt, userMsg);       // line 164, up to 15s
  ...
  const extractResult = await callClaude('You extract...', extractPrompt, 300);  // line 197, up to 15s
FIX: Either (a) skip form extraction when close to timeout by checking elapsed time, (b) make form extraction async via a separate endpoint/queue, or (c) combine both tasks into a single Claude call with structured output.
```

---

### BUG 4: No Twilio Message Deduplication -- Race Condition on Duplicate Webhooks

```
FILE: apps/website/src/app/api/webhook/sms/route.ts
LINE: 43-49
SEVERITY: HIGH
BUG: Twilio retries webhook delivery if it doesn't receive a timely response. The webhook has no deduplication -- MessageSid from the Twilio payload is never checked or stored. If Vercel has a cold start or the fire-and-forget fetch (Bug 1) fails, Twilio retries and the same message is processed multiple times. Two simultaneous retries can both pass the pause check and both generate AI responses, sending duplicate replies to the customer.
EVIDENCE:
  // No MessageSid extraction or dedup check anywhere in the webhook
  const fromPhone = (formData.get('From') as string) || '';
  const toPhone = (formData.get('To') as string) || '';
  const messageBody = (formData.get('Body') as string) || '';
FIX: Extract MessageSid from formData, check if it exists in Supabase (or a Redis/KV set) before processing. Return early if already seen. Pass MessageSid to the process endpoint for idempotency.
```

---

### BUG 5: Empty Catch Block Swallows Lead Status PATCH Failure

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 82
SEVERITY: HIGH
BUG: When a HOT lead triggers handoff, the lead status PATCH to funnel_submissions is wrapped in a completely empty catch block. If the PATCH fails (network error, Supabase down, wrong tenant filter), the lead is never marked as "appointment" in the CRM. The AI is paused via transcript status but the CRM shows stale status. Rep may not prioritize the lead.
EVIDENCE:
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeURIComponent(fromPhone)}&tenant_id=eq.${tenant.tenant}`, {
      method: 'PATCH', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'appointment' }), signal: AbortSignal.timeout(5000),
    });
  } catch {}
FIX: Log the error and notify Slack. Same pattern exists at line 255-260 for the credit_app status update.
```

---

### BUG 6: Empty Catch Block Swallows Form Extraction JSON Parse Failure

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 263
SEVERITY: MEDIUM
BUG: If Claude returns malformed JSON for form extraction, the JSON.parse fails silently. No log, no alert. The qualification data is lost.
EVIDENCE:
  } catch { /* JSON parse failed, skip */ }
FIX: Log the parse error and the raw extractResult string so it can be debugged. Bad Claude outputs should be tracked.
```

---

### BUG 7: Empty Catch Block Swallows Entire Form Extraction Pipeline

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 265
SEVERITY: MEDIUM
BUG: The outer try/catch around the entire form extraction block (lines 177-265) swallows ALL errors silently. If the second Claude call throws, if supaPost fails, if slackNotify throws -- all invisible.
EVIDENCE:
  } catch { /* extraction failed, continue */ }
FIX: At minimum log the error. This block contains a second Claude API call, multiple Supabase writes, a Slack notification, and an SMS send -- any of which can fail.
```

---

### BUG 8: Empty Catch Block on Conversation History Fetch

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 141
SEVERITY: MEDIUM
BUG: If conversation history fetch fails, the AI responds without any context. The customer has been in a 10-message conversation and the AI suddenly acts like it's the first message. No error is logged.
EVIDENCE:
  } catch { /* no history */ }
FIX: Log the error. Consider whether a contextless AI reply is better or worse than no reply at all (it can contradict previous messages, confuse the customer).
```

---

### BUG 9: Claude API Has Zero Retry Logic on Transient Errors (429/529)

```
FILE: apps/website/src/lib/security.ts
LINE: 208-234
SEVERITY: HIGH
BUG: callClaude makes a single attempt. On 429 (rate limit) or 529 (overloaded) -- both transient errors that resolve in 1-5 seconds -- it returns empty string immediately. The caller falls back to a generic canned message. During peak hours, a significant percentage of customers get the canned response instead of a personalized AI reply.
EVIDENCE:
  if (!res.ok) return '';
  ...
  } catch {
    return '';
  }
FIX: Add retry with exponential backoff for 429/529/500 status codes. One retry with 2s delay would catch 90%+ of transient failures and still fit within the timeout budget (if Bug 2's 3s delay is removed).
```

---

### BUG 10: Claude API Empty Response -- No Error Logging

```
FILE: apps/website/src/lib/security.ts
LINE: 228-231
SEVERITY: MEDIUM
BUG: When Claude returns a non-OK response, the function returns empty string with no logging. The caller has no idea if it was a 429 (retry would work), 400 (bad request, prompt issue), or 500 (Claude outage). You cannot diagnose AI failures in production.
EVIDENCE:
  if (!res.ok) return '';
FIX: Log the status code, response body (truncated), and the system prompt name/context. This is the single most important diagnostic for understanding why customers get canned responses.
```

---

### BUG 11: supaPost Silently Swallows All Errors

```
FILE: apps/website/src/lib/security.ts
LINE: 64-71
SEVERITY: HIGH
BUG: supaPost catches all errors and ignores them. Every lead transcript entry, every status update, every form data save goes through this function. If Supabase is down or the table schema changes, every write fails silently. Conversation history is lost, lead data is lost, and nobody knows.
EVIDENCE:
  export async function supaPost(table: string, data: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify(data), signal: AbortSignal.timeout(8000),
      });
    } catch { /* ignore */ }
  }
FIX: Log errors with the table name, a summary of the data (not PII), and the error. Return a boolean so callers can react to failures. At minimum, failed transcript inserts should trigger a Slack alert.
```

---

### BUG 12: supaGet Silently Returns Empty Array on All Failures

```
FILE: apps/website/src/lib/security.ts
LINE: 56-62
SEVERITY: HIGH
BUG: supaGet catches all errors and returns []. Callers cannot distinguish "no results" from "Supabase is down." The isDuplicate check in auto-response.ts:75-85 returns false on error, meaning if Supabase is down, every submission is treated as new and duplicate leads are created and messaged.
EVIDENCE:
  export async function supaGet(path: string): Promise<unknown[]> {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders(), signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return [];
  }
FIX: Log errors with the query path (sanitized). Consider throwing on error so callers can handle failure explicitly, or return a discriminated union { data: T[], error?: string }.
```

---

### BUG 13: slackNotify Silently Swallows Errors

```
FILE: apps/website/src/lib/security.ts
LINE: 196-204
SEVERITY: MEDIUM
BUG: Slack notifications fail silently. When Slack is your primary alerting channel and the alert itself fails, you have zero observability. If the Slack webhook URL expires or the channel is archived, all alerts stop and nobody knows.
EVIDENCE:
  } catch { /* ignore */ }
FIX: Log errors to console.error at minimum. Slack failures should trigger a secondary alert (e.g., Sentry, or at least a console.error that Vercel's logs capture).
```

---

### BUG 14: Prompt Injection Sanitization is Regex-Based and Bypassable

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 153-157
SEVERITY: HIGH
BUG: The prompt injection filter uses regex patterns that are trivially bypassable. Unicode homoglyphs, zero-width characters, typos, alternate languages, or even simple word reordering bypass it. Example: "1gnore previous instruct1ons" or "previous instructions ignore" or using Cyrillic characters. The filter also strips JSON-like content ({...}) which could interfere with legitimate messages containing curly braces.
EVIDENCE:
  const safeMessage = messageBody
    .replace(/ignore.*(?:previous|above|all).*(?:instructions?|prompts?|rules?)/gi, '[message filtered]')
    .replace(/you are now|act as|pretend to be|system prompt|reveal.*prompt/gi, '[message filtered]')
    .replace(/\{[^}]*\}/g, '') // strip JSON-like injections
    .substring(0, 500);
FIX: Regex-based sanitization is fundamentally insufficient against prompt injection. Better approaches: (1) Use Claude's system prompt to explicitly instruct it to ignore customer instructions (already partially done in NESB prompt SECURITY section), (2) Use a separate classifier call to detect injection attempts, (3) Accept that some injection risk exists and focus on limiting what the AI can do (no tool use, constrained output). The regex gives false confidence.
```

---

### BUG 15: Email Webhook and Cron Hardcoded to ReadyCar -- ReadyRide Broken

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 84, 98, 111
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 76-77, 86, 110-112
SEVERITY: HIGH
BUG: Email from name is hardcoded to "Nicolas Sayah | ReadyCar" and email signature says "Nicolas, General Sales Manager, ReadyCar | 613-363-4494". When tenant is "readyride", the AI still replies as Nicolas from ReadyCar. The system prompt in the email webhook (line 98) is entirely ReadyCar-specific. The cron route is even worse -- no tenant parameter at all, everything is ReadyCar.
EVIDENCE:
  // email/route.ts line 84:
  from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`, to: senderEmail,
  // email/route.ts line 98:
  const systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar in Ottawa...';
  // email/route.ts line 111:
  from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`, to: senderEmail,
  // cron/check-email/route.ts line 76:
  from: `"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>`,
  // cron/check-email/route.ts line 86:
  const systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar in Ottawa (6231 Hazeldean Rd, Stittsville)...';
FIX: Use the tenant config from TENANT_MAP or auto-response.ts TENANTS to dynamically set the from name, system prompt persona, and signature. ReadyRide emails should come from "Moe | ReadyRide" with ReadyRide's phone number.
```

---

### BUG 16: Email Webhook supaPost is Fire-and-Forget (No Await)

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 71-74, 116
SEVERITY: MEDIUM
BUG: Two supaPost calls in the email webhook are not awaited. The inbound email log (line 71) and the AI reply log (line 116) are fire-and-forget. On Vercel, the function may terminate before these complete, losing conversation history.
EVIDENCE:
  // Line 71 -- no await:
  supaPost('lead_transcripts', {
    tenant_id: tenant, lead_id: senderEmail, entry_type: 'message',
    role: 'customer', content: emailBody.substring(0, 500), channel: 'email',
  });
  // Line 116 -- no await:
  supaPost('lead_transcripts', { tenant_id: tenant, lead_id: senderEmail, ... });
FIX: Add await to both supaPost calls.
```

---

### BUG 17: Cron Route Fire-and-Forget Supabase + Slack Calls

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 118-127
SEVERITY: MEDIUM
BUG: The Supabase log and Slack notification at the end of the cron POST handler are fire-and-forget with .catch(() => {}). After the email is sent, the function returns before these complete. Empty catch blocks on both.
EVIDENCE:
  fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {
    method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ ... }),
  }).catch(() => {});

  fetch(SLACK_WEBHOOK, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  }).catch(() => {});

  return NextResponse.json({ sent: true, ... });
FIX: Await both calls before returning, or use waitUntil().
```

---

### BUG 18: Cron Route Claude API Call Has Empty Catch Block

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 102
SEVERITY: MEDIUM
BUG: The Claude API call in the cron route uses a raw fetch (not callClaude helper) with an empty catch block. If Claude fails, no error is logged. The 8-second timeout is tighter than the 15-second timeout in callClaude, increasing failure rate.
EVIDENCE:
  } catch { /* Claude failed */ }
FIX: Log the error. Use the shared callClaude helper instead of duplicating the raw API call.
```

---

### BUG 19: Cron Route Duplicates Claude API Logic Instead of Using Shared Helper

```
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 91-102
SEVERITY: LOW
BUG: The cron route makes a raw fetch to the Claude API instead of using the shared callClaude function from security.ts. This means it doesn't benefit from any future improvements to callClaude (retry logic, better error handling, model changes). The model is hardcoded to claude-sonnet-4-20250514 -- if the model changes in security.ts, the cron route still uses the old one.
EVIDENCE:
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: userMsg }] }),
    signal: AbortSignal.timeout(8000),
  });
FIX: Replace with callClaude(systemPrompt, userMsg, 500).
```

---

### BUG 20: Twilio Signature Validation Uses request.url Which Mismatches on Vercel

```
FILE: apps/website/src/lib/security.ts
LINE: 82
SEVERITY: HIGH
BUG: validateTwilioSignature uses request.url for HMAC computation. On Vercel behind a custom domain, request.url may contain the internal Vercel URL (e.g., nexus-xxx.vercel.app) rather than the public URL (nexusagents.ca) that Twilio used when signing the request. If these differ, every signature validation fails, and all inbound SMS webhooks are silently rejected (the code returns TwiML with no processing).
EVIDENCE:
  const url = request.url;
  // ... HMAC computed using this URL
FIX: Use the X-Forwarded-Host header or an explicit environment variable (e.g., TWILIO_WEBHOOK_URL) to construct the canonical URL that matches what Twilio signed against.
```

---

### BUG 21: No Opt-Out Check in Manual Message Send Path

```
FILE: apps/website/src/app/api/messages/route.ts
LINE: 469-576
SEVERITY: HIGH
BUG: The POST endpoint for manual SMS sending has no opt-out check. A CRM user can send an SMS to a phone number that previously sent "STOP". This violates TCPA/CASL regulations. The opt-out status (if tracked at all) is only checked in the AI auto-reply path.
EVIDENCE:
  // No check for opt-out/unsubscribe status before sending
  const params = new URLSearchParams({
    To: toPhone,
    From: sendFromNumber,
    Body: messageBody,
  });
  const res = await fetch(`${TWILIO_BASE_URL}/Messages.json`, { ... });
FIX: Before sending, check lead_transcripts for a status entry of "UNSUBSCRIBE" or check funnel_submissions for an opt-out flag. Block the send and return an error if the recipient has opted out.
```

---

### BUG 22: No Opt-Out Persistence in SMS Process Route

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 62-67
SEVERITY: HIGH
BUG: When a customer sends "STOP", the system sends a goodbye message but does NOT persist the opt-out status anywhere. There is no Supabase write to mark the lead as unsubscribed. Future auto-response triggers (from funnel resubmission, email campaigns, etc.) will still send SMS to this number.
EVIDENCE:
  if (shouldStop) {
    const msg = 'No problem at all. Wishing you all the best.';
    await sendTwilioSMS(fromPhone, toPhone, msg);
    await supaPost('lead_transcripts', { ... intent });
    return NextResponse.json({ sent: true, immediate: true });
    // No status entry like HOT_PAUSED, no funnel_submissions update
  }
FIX: Add a supaPost for a status entry (e.g., 'UNSUBSCRIBED') and PATCH funnel_submissions to set a status or flag. Check this flag in all SMS-sending paths.
```

---

### BUG 23: Email Webhook Unsubscribe Not Persisted Either

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 77-88
SEVERITY: MEDIUM
BUG: When a customer replies "unsubscribe" to an email, a goodbye email is sent but the opt-out is not persisted to Supabase. Future email campaigns or auto-responses will still email this person.
EVIDENCE:
  if (/\b(unsubscribe|stop|remove me|not interested)\b/i.test(lower)) {
    // ... sends unsubscribe confirmation email
    return NextResponse.json({ action: 'sent', intent: 'UNSUBSCRIBE' });
    // No Supabase write to record the unsubscribe
  }
FIX: Write an unsubscribe status to lead_transcripts and/or update funnel_submissions with an opt-out flag.
```

---

### BUG 24: Gmail SMTP Transport Created on Every Request -- No Connection Pooling

```
FILE: apps/website/src/app/api/webhook/email/route.ts
LINE: 79-80, 108-109
FILE: apps/website/src/app/api/cron/check-email/route.ts
LINE: 74-75, 109-110
FILE: apps/website/src/lib/auto-response.ts
LINE: 242-244
SEVERITY: LOW
BUG: A new nodemailer transport is created on every single email send. Each creation establishes a new SMTP connection to Gmail, does TLS handshake, and authenticates. This adds 1-3 seconds of latency per email. On serverless this is unavoidable (no persistent connections), but within a single request that sends multiple emails, the transport should be reused.
EVIDENCE:
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.default.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
FIX: Within a single request, create the transport once and reuse it. For serverless, this is mostly cosmetic, but the cron route could benefit if it processes multiple emails.
```

---

### BUG 25: Conversation History Has No Token Limit -- Token Explosion Risk

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 136-140, 161-162
SEVERITY: MEDIUM
BUG: Conversation history is loaded (up to 10 messages) and concatenated into the Claude prompt. With 10 messages averaging 100 chars each, this is manageable (~1000 chars). But the history is combined with the full NESB system prompt (~2000 chars) and user message. The form extraction prompt (line 178-195) concatenates the FULL conversation again. No token counting is done. If messages are long (customer sends paragraphs), the prompt could exceed Claude's context or generate unexpectedly high costs.
EVIDENCE:
  const history = await supaGet(
    `lead_transcripts?...&limit=10`
  ) as { role: string; content: string }[];
  if (history.length > 0) conversationHistory = history.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
  // ... later:
  const fullConvo = conversationHistory + '\ncustomer: ' + messageBody + '\nai: ' + aiReply;
FIX: The limit=10 is reasonable, but individual message content should be truncated (e.g., 200 chars per message). Also add a total character cap on conversationHistory (e.g., 2000 chars).
```

---

### BUG 26: slackNotify on Line 174 is Fire-and-Forget (No Await)

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 174
SEVERITY: LOW
BUG: The Slack notification after sending the AI SMS reply is not awaited. Minor -- the function continues and returns before confirming Slack delivery. If this is the last operation, Vercel may kill it.
EVIDENCE:
  slackNotify(`SMS REPLY (${tenant.name})\nTo: ${fromPhone}\nReply: ${aiReply.substring(0, 100)}...`);
FIX: Add await.
```

---

### BUG 27: Twilio SMS Error Response Not Checked in sendTwilioSMS (Verified Fixed)

```
FILE: apps/website/src/lib/security.ts
LINE: 238-264
SEVERITY: N/A (VERIFIED FIXED)
BUG: Previously reported as not checking Twilio response. VERIFIED: The current code correctly checks res.ok, logs error body on failure, and returns a boolean. The auto-response.ts caller (line 160-166) correctly checks the return value and alerts Slack on failure.
EVIDENCE:
  if (!res.ok) {
    const errBody = await res.text().catch(() => 'no body');
    console.error(`[twilio] SMS failed ${res.status}: to=${to} from=${from} error=${errBody}`);
  }
  return res.ok;
FIX: None needed -- this is correctly implemented.
```

---

### BUG 28: NESB System Prompt in SMS Process Route Already Has ReadyRide Support (Verified)

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 274-338
SEVERITY: N/A (SMS path is fine)
BUG: The SMS process route correctly uses tenant config from TENANT_MAP to dynamically set the GM name, dealership name, location, and phone in the NESB prompt. ReadyRide SMS replies correctly come from "Moe" at "ReadyRide". However, the EMAIL path (Bug 15) is still hardcoded to ReadyCar.
EVIDENCE:
  function buildNESBPrompt(tenant: { name: string; location: string; phone: string; gm: string }): string {
    return `You are ${tenant.gm}, General Sales Manager at ${tenant.name}...`;
  }
FIX: None needed for SMS. Email path needs the same treatment (see Bug 15).
```

---

## SUMMARY BY SEVERITY

| Severity | Count | Bug Numbers |
|----------|-------|-------------|
| CRITICAL | 3 | 1, 2, 3 |
| HIGH | 8 | 4, 5, 9, 11, 12, 14, 15, 20, 21, 22 |
| MEDIUM | 8 | 6, 7, 8, 10, 13, 16, 17, 23, 25 |
| LOW | 2 | 19, 24, 26 |
| VERIFIED FIXED | 2 | 27, 28 |

## TOP 3 PRIORITIES

1. **Bug 1 + Bug 2 + Bug 3 (CRITICAL):** The SMS pipeline is fundamentally broken on Vercel Hobby. The fire-and-forget fetch, 3-second delay, and double Claude call combine to make reliable AI SMS replies impossible. Fix: Remove the delay, use waitUntil() or await the process fetch, and combine or defer the form extraction call.

2. **Bug 15 (HIGH):** ReadyRide email replies go out as "Nicolas from ReadyCar." This is a live tenant-facing bug that makes the business look broken. Fix: Dynamic tenant config for email path.

3. **Bug 21 + Bug 22 + Bug 23 (HIGH):** Opt-out is not persisted anywhere. Sending SMS/email to people who said "STOP" is a TCPA/CASL violation with potential fines. Fix: Persist opt-out status, check it in all send paths.
# TEAM 2 -- Agent 2D: Frontend & CRM Inbox Audit Report

**Scope:** All frontend pages (inbox, CRM, funnel, landing), CRM components, auth route
**Date:** 2026-04-01
**Status:** READ-ONLY audit -- zero code changes made

---

## CRITICAL FINDINGS

---

```
FILE: apps/website/src/app/api/auth/route.ts
LINE: 48
SEVERITY: CRITICAL
BUG: Timing-safe comparison defeated by early `===` return
EVIDENCE: if (password === expected) { const token = crypto.randomBytes(32).toString('hex'); return NextResponse.json({ authenticated: true, token }); }
FIX: Remove the line 48 `===` check entirely. Only use the timingSafeEqual path (lines 54-56). The `===` operator short-circuits on first mismatched byte, leaking password content via timing side-channel. The "fallback" timingSafeEqual on line 56 never executes for correct passwords, and only runs for wrong passwords -- which is backwards.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 26-27
SEVERITY: CRITICAL
BUG: Client-side-only auth gate using sessionStorage -- trivially spoofable
EVIDENCE: sessionStorage.setItem('inbox_auth', data.token || 'true'); ... if (sessionStorage.getItem('inbox_auth') === 'true') { setAuthed(true); }
FIX: The auth token from the server is stored but NEVER validated on subsequent loads. Line 227 checks for the literal string 'true', meaning even if a real token is returned, the fallback `|| 'true'` means any user can open DevTools, run `sessionStorage.setItem('inbox_auth', 'true')`, and access the full CRM inbox with all customer PII (names, phones, credit situations, message history). The token should be sent as an HTTP-only cookie or validated server-side on every API call.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 232-233
SEVERITY: CRITICAL
BUG: Client-side auth gate -- slightly better but still spoofable
EVIDENCE: const token = sessionStorage.getItem('readycar_auth'); if (token && token.length > 10) setAuthed(true);
FIX: Checking `token.length > 10` is marginally better than checking `=== 'true'` but still trivially bypassed -- anyone can set sessionStorage to any string > 10 chars. No server-side token validation occurs. Same fix: HTTP-only cookies or server-side session validation.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 232-233
SEVERITY: CRITICAL
BUG: Identical client-side auth spoofing vulnerability as readycar
EVIDENCE: const token = sessionStorage.getItem('readyride_auth'); if (token && token.length > 10) setAuthed(true);
FIX: Same as above. All three CRM entry points have no server-side session validation.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 674
SEVERITY: CRITICAL
BUG: XSS vulnerability -- raw SMS message body rendered without sanitization
EVIDENCE: <div className={`${styles.messageBubble} ...`}>{msg.body}</div>
FIX: SMS messages from customers are rendered directly into the DOM via React's JSX interpolation. While React escapes HTML by default (preventing basic XSS via innerHTML), the msg.body content is user-controlled SMS text that could contain malicious URLs, phishing links, or social engineering content displayed verbatim to CRM operators. However, since React's {} does auto-escape, this is NOT a traditional XSS. Downgrading sub-finding: the real risk is that message content is never sanitized for malicious links or content that could trick CRM users. Consider link detection and sandboxing.
```

**Revised severity for XSS: MEDIUM (React auto-escapes, but no link sanitization)**

---

## HIGH FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 271
SEVERITY: HIGH
BUG: Hardcoded personal phone number for lead transfer
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6133634494');
FIX: This is a real personal phone number hardcoded as the default transfer target. Should be loaded from tenant configuration or environment variable. Also exposed in client-side bundle.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 287
SEVERITY: HIGH
BUG: Different hardcoded personal phone number for ReadyRide transfer
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6139839834');
FIX: Same issue -- hardcoded PII. Should come from tenant config, not client-side code.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 287
SEVERITY: HIGH
BUG: Hardcoded phone number for ReadyCar transfer (same as inbox/dealerships)
EVIDENCE: const [transferPhone, setTransferPhone] = useState('6133634494');
FIX: Extract to tenant configuration.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 295
SEVERITY: HIGH
BUG: No error state shown to user when conversation fetch fails
EVIDENCE: catch (err) { console.error('Failed to load conversations:', err); } finally { setLoading(false); }
FIX: When fetch fails, loading is set to false but there is no error state variable. The UI silently shows "No conversations yet" -- indistinguishable from a network failure. Add an `error` state and display a retry prompt.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 103
SEVERITY: HIGH
BUG: Empty catch block swallowing CRM activity fetch errors
EVIDENCE: } catch { /* activity fetch is optional */ }
FIX: At minimum log the error. Silent failures make debugging impossible when activity data stops loading.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 138
SEVERITY: HIGH
BUG: Empty catch block on SMS send failure
EVIDENCE: } catch { alert('Failed to send SMS'); }
FIX: The catch block shows an alert but does not log the error. The actual error (network failure, auth failure, rate limit) is lost. Should log err to console.error at minimum.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 153
SEVERITY: HIGH
BUG: Empty catch block on email send
EVIDENCE: } catch { alert('Failed to open email'); }
FIX: Same pattern -- error is caught but not logged.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 168
SEVERITY: HIGH
BUG: Status update error swallowed
EVIDENCE: } catch { console.error('Failed to update status'); }
FIX: The actual error object is not passed to console.error. Should be `catch (err) { console.error('Failed to update status:', err); }` so the root cause is visible.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 202-204
SEVERITY: HIGH
BUG: Resume AI error swallowed with empty catch
EVIDENCE: } catch { console.error('Failed to resume AI'); }
FIX: Same pattern -- no error object logged.
```

---

## MEDIUM FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 1-737
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (737 lines) -- monolithic component
EVIDENCE: 737 lines containing PasswordGate, InboxContent, helpers, SVG icons all in one file
FIX: Split into: PasswordGate component, InboxContent component, helper utilities, SVG icon components. Per project rules, files exceeding 500 lines should be split before adding more code.
```

```
FILE: apps/website/src/app/readycar/page.tsx
LINE: 1-922
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (922 lines) -- massive monolithic component
EVIDENCE: 922 lines -- nearly identical to readyride/page.tsx
FIX: Extract shared inbox logic into a reusable component. ReadyCar and ReadyRide pages are 95%+ identical code with only TENANT and transferPhone differing.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 1-921
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (921 lines) -- near-duplicate of readycar/page.tsx
EVIDENCE: 921 lines, nearly identical to readycar/page.tsx
FIX: Same as above. These two files should be ONE component parameterized by tenant.
```

```
FILE: apps/website/src/app/apply/dealerships/page.tsx
LINE: 1-1084
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (1084 lines) -- largest file in the frontend
EVIDENCE: 1084 lines containing all 7 funnel steps, animations, validation, styles
FIX: Extract each step into its own component. Extract shared styles into a styles module. Extract helpers into a utils file.
```

```
FILE: apps/website/src/app/dealerships/page.tsx
LINE: 1-770
SEVERITY: MEDIUM
BUG: File exceeds 500 lines (770 lines)
EVIDENCE: 770-line landing page with all sections inline
FIX: Extract sections (Hero, Products, HowItWorks, Pricing, etc.) into separate components.
```

```
FILE: apps/website/src/app/dealerships/page.tsx
LINE: 22
SEVERITY: MEDIUM
BUG: Hardcoded phone number that may be fake/placeholder
EVIDENCE: <a href="tel:+16139001234" className={styles.navPhone}> ... (613) 900-1234
FIX: Verify this is a real business number. If placeholder, it should come from config. Currently hardcoded in two places (desktop and mobile).
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 210-433
SEVERITY: MEDIUM
BUG: Entire component rendered with inline styles -- hundreds of hardcoded color values
EVIDENCE: background: '#12121f', color: '#f0f0f5', color: '#8888a0', background: '#10b981', color: '#ef4444', background: 'rgba(239,68,68,0.12)', color: '#666', etc.
FIX: Replace all inline styles with CSS module classes or Tailwind classes using CSS variables/design tokens. There are 50+ hardcoded hex colors in this single file.
```

```
FILE: apps/website/src/components/crm/CRMLayout.tsx
LINE: 68-165
SEVERITY: MEDIUM
BUG: Entire layout built with inline styles and hardcoded colors
EVIDENCE: background: '#0a0a0f', background: '#0d0d14', color: '#f0f0f5', color: '#8888a0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', etc.
FIX: Extract to CSS module with design tokens. At least 20 hardcoded hex colors.
```

```
FILE: apps/website/src/components/crm/KanbanBoard.tsx
LINE: 65-136
SEVERITY: MEDIUM
BUG: Entire Kanban board uses inline styles with hardcoded colors
EVIDENCE: background: 'rgba(255,255,255,0.02)', color: '#f0f0f5', color: '#8888a0', etc.
FIX: Same -- extract to CSS module.
```

```
FILE: apps/website/src/components/crm/LeadsTab.tsx
LINE: 279-283
SEVERITY: MEDIUM
BUG: Shared inputStyle object with hardcoded colors
EVIDENCE: const inputStyle: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#f0f0f5', ... };
FIX: Should use CSS variables from a design system.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 48-50
SEVERITY: MEDIUM
BUG: useEffect missing dependency -- will not refetch when tenant/phone changes
EVIDENCE: useEffect(() => { fetchData(); }, [tenant, phone]);
FIX: The `fetchData` function is not in the dependency array, and `tenant`/`phone` are listed but ESLint may not catch that `fetchData` closes over them. This works but is fragile. Better to include `fetchData` as dependency or use inline async.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 648-650
SEVERITY: MEDIUM
BUG: Client-side "hot lead" detection using regex against message body -- fragile and duplicated
EVIDENCE: const hotKeywords = /\b(yes|yeah|interested|ready|come in|test drive|appointment|schedule|book|buy|approved|check|let.s do it|sign me up|i.m in|deal|trade.?in|license|permis|drivers? licen[cs]e)\b/i; const isHot = conv.messages.some((m: Message) => m.direction === 'inbound' && hotKeywords.test(m.body));
FIX: This duplicates server-side hot lead detection logic. It is also duplicated between the conversation list (line 648) and the compose area (line 855). Should be a shared utility function, ideally driven by server-side status rather than client-side regex.
```

```
FILE: apps/website/src/app/readyride/page.tsx
LINE: 418
SEVERITY: MEDIUM
BUG: Empty catch block when saving archived phones to sessionStorage
EVIDENCE: try { sessionStorage.setItem('archived_readyride', JSON.stringify(Array.from(next))); } catch {}
FIX: Should at minimum log the error. SessionStorage can fail in private browsing or when quota is exceeded.
```

---

## LOW FINDINGS

---

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 10
SEVERITY: LOW
BUG: TENANT hardcoded to 'readycar' -- this is the OLD inbox page, likely dead code
EVIDENCE: const TENANT = 'readycar';
FIX: This file at /inbox/dealerships/ appears to be the original inbox before the CRM was built. The readycar CRM now lives at /readycar/page.tsx. Verify if this page is still linked anywhere or if it can be removed.
```

```
FILE: apps/website/src/app/inbox/page.tsx
LINE: 4
SEVERITY: LOW
BUG: Redirects to /inbox/dealerships which may be a dead/legacy page
EVIDENCE: redirect('/inbox/dealerships');
FIX: Verify this redirect target is still the intended destination. The main CRM pages are now at /readycar and /readyride.
```

```
FILE: apps/website/src/app/apply/dealerships/layout.tsx
LINE: 5
SEVERITY: LOW
BUG: Metadata title says "Nexus Auto" -- should be the dealership brand name
EVIDENCE: title: 'Get Pre-Qualified | Nexus Auto',
FIX: Should dynamically show the tenant's brand (ReadyCar, ReadyRide) rather than "Nexus Auto" which is the agency name, not the customer-facing brand.
```

```
FILE: apps/website/src/components/crm/LeadDetailPanel.tsx
LINE: 54
SEVERITY: LOW
BUG: Dead variable -- SUPABASE_URL assigned but never used
EVIDENCE: const SUPABASE_URL = '/api/dashboard'; // reuse to get supabase URL indirectly
FIX: Remove the unused variable.
```

```
FILE: apps/website/src/app/inbox/dealerships/page.tsx
LINE: 489-495
SEVERITY: LOW
BUG: Search input missing ARIA label
EVIDENCE: <input type="text" className={styles.searchInput} placeholder="Search by name or phone..." ... />
FIX: Add aria-label="Search conversations" for screen reader accessibility.
```

```
FILE: apps/website/src/components/crm/CRMLayout.tsx
LINE: 106-126
SEVERITY: LOW
BUG: Tab buttons missing ARIA attributes
EVIDENCE: <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={...}> {tab.label} </button>
FIX: Add role="tab", aria-selected={activeTab === tab.id}, and wrap in a role="tablist" container. The tab panel should have role="tabpanel".
```

```
FILE: apps/website/src/components/crm/KanbanBoard.tsx
LINE: 116-130
SEVERITY: LOW
BUG: Drag-and-drop cards have no keyboard accessibility
EVIDENCE: SortableContext with LeadCard components -- no keyboard instructions or ARIA live regions
FIX: Add aria-label to draggable cards, announce drag operations via aria-live region.
```

```
FILE: apps/website/src/components/crm/LeadsTab.tsx
LINE: 248-249
SEVERITY: LOW
BUG: Mouse hover effect using direct style manipulation instead of CSS
EVIDENCE: onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
FIX: Use CSS :hover pseudo-class instead of JavaScript event handlers for hover effects.
```

```
FILE: apps/website/src/app/readycar/page.tsx + readyride/page.tsx
LINE: Multiple
SEVERITY: LOW
BUG: Massive code duplication -- readycar and readyride pages are 95%+ identical
EVIDENCE: Both files are ~920 lines with identical PasswordGate, types, helpers, InboxContent, SVG icons. Only differences: TENANT constant, transferPhone default, sessionStorage key, and ReadyRide has a "New Message" button + hot lead regex highlighting.
FIX: Create a shared TenantInbox component that accepts tenant config as props. Current duplication means any bug fix must be applied in 3 places (inbox/dealerships, readycar, readyride).
```

---

## SUMMARY TABLE

| Severity | Count | Key Issues |
|----------|-------|-----------|
| CRITICAL | 4 | Auth bypass via sessionStorage spoofing (3 pages), timing-safe comparison defeated |
| HIGH | 8 | Hardcoded phone numbers, empty catch blocks, no error states on fetches |
| MEDIUM | 13 | Files over 500 lines (5 files), hundreds of inline hardcoded colors, code duplication |
| LOW | 9 | Dead code, missing ARIA labels, dead links, placeholder values |

## TOP 3 PRIORITIES

1. **Auth is theater.** All three CRM pages can be accessed by setting a sessionStorage key. There is zero server-side session validation. Any person who opens DevTools can access all customer PII, SMS history, credit situations, and can send SMS messages to any phone number on behalf of the dealership. This is the single most important fix.

2. **Code duplication is a maintenance bomb.** readycar/page.tsx, readyride/page.tsx, and inbox/dealerships/page.tsx are 95%+ identical (~2,580 lines of near-duplicate code). Any fix must be applied in 3 places. Extract a shared TenantInbox component.

3. **Inline styles with hardcoded colors everywhere.** The CRM components have 100+ hardcoded hex colors across LeadDetailPanel, CRMLayout, KanbanBoard, LeadsTab. A design token system or CSS variables would make theming and maintenance possible.
# TEAM 2 -- Agent 2E: DevOps & Deployment Audit

**Scope:** Deployment config, infrastructure security, CI/CD readiness, dependency health
**Project:** /Users/sayah/nexus (Next.js 14 on Vercel)
**Date:** 2026-04-01
**Mode:** READ ONLY -- zero code changes made

---

## Summary

The deployment configuration is **partially complete**. Security headers in `next.config.js` are well-done (CSP, HSTS, X-Frame-Options all present). However, `vercel.json` is barebones with no security headers, no function config, and no redirects. There are 2 npm vulnerabilities (1 high in `next`, 1 moderate in `@anthropic-ai/sdk`), real credentials leaked in `.env.example`, no health check endpoint, no error monitoring (Sentry), a hardcoded webhook URL, a `maxDuration` export that does nothing on Hobby plan, and a missing env var in `.env.example` that the code depends on.

**Total issues found: 12**
- CRITICAL: 3
- HIGH: 4
- MEDIUM: 4
- LOW: 1

---

## Issues

---

### Issue 1: Real Credentials Committed in .env.example

```
FILE: .env.example
LINE: 2-3, 9
SEVERITY: CRITICAL
BUG: .env.example contains real Supabase URL, a real publishable key, and a real Twilio phone number instead of placeholders.
EVIDENCE: Line 2: SUPABASE_URL=https://arnczuspgedxsxiyueup.supabase.co (real project URL). Line 3: SUPABASE_PUBLISHABLE_KEY=sb_publishable_IYFH4dxMdVpHESvrq4DRmA_ym2I7yDM (real key). Line 9: TWILIO_FROM_NUMBER=+13433125045 (real number).
FIX: Replace all real values with descriptive placeholders (e.g., SUPABASE_URL=https://your-project.supabase.co). Rotate the exposed publishable key. Since this is in git history, the key must be considered compromised even after replacement.
```

---

### Issue 2: maxDuration=60 Export Silently Ignored on Vercel Hobby Plan

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 9
SEVERITY: CRITICAL
BUG: export const maxDuration = 60 only works on Vercel Pro/Enterprise. On Hobby plan, the hard cap is 10 seconds. This route includes a 3-second artificial delay, Claude API calls (2-8s), and multiple Supabase queries -- easily exceeding 10s.
EVIDENCE: `export const maxDuration = 60;` -- Vercel Hobby ignores this and enforces 10s max.
FIX: Either upgrade to Vercel Pro plan, or eliminate the 3s artificial delay and optimize the route to complete within 10s. Consider moving heavy processing to a queue (Vercel Cron, Inngest, or external worker).
```

---

### Issue 3: npm Vulnerability -- Next.js (HIGH Severity)

```
FILE: apps/website/package.json
LINE: 17
SEVERITY: CRITICAL
BUG: next@^14.0.0 has 4 known vulnerabilities (1 high): DoS via Image Optimizer, HTTP request deserialization DoS, HTTP request smuggling in rewrites, unbounded disk cache growth.
EVIDENCE: npm audit output: "next 9.5.0 - 15.5.13 Severity: high" with 4 advisories (GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8).
FIX: Upgrade to next@15.5.14+ or latest stable. Test thoroughly after upgrade as this is a major version bump.
```

---

### Issue 4: No Health Check Endpoint

```
FILE: INFRA
LINE: N/A
SEVERITY: HIGH
BUG: No /api/health endpoint exists. This means no uptime monitoring, no Vercel/external health checks, and no way to verify the deployment is functional after a release.
EVIDENCE: Glob for apps/website/src/app/api/health/** returned no files.
FIX: Create /api/health/route.ts that returns 200 with a JSON body including version, timestamp, and connectivity checks (Supabase ping). Wire up external monitoring (UptimeRobot, Better Uptime, etc.).
```

---

### Issue 5: No Error Monitoring (Sentry or Equivalent)

```
FILE: INFRA
LINE: N/A
SEVERITY: HIGH
BUG: No error monitoring service is integrated. No Sentry, no LogRocket, no Datadog. Combined with the empty catch blocks identified by Team 1, errors in production are completely invisible.
EVIDENCE: Grep for "sentry" or "@sentry" across apps/website returned no matches. No Sentry DSN in .env.example. No error reporting package in package.json.
FIX: Install @sentry/nextjs, configure with DSN, wrap API routes. This is essential for a production application handling real customer data and payments.
```

---

### Issue 6: Hardcoded n8n Webhook URL with Inadequate Fallback

```
FILE: apps/website/src/app/api/funnel-lead/route.ts
LINE: 21
SEVERITY: HIGH
BUG: The n8n webhook URL is hardcoded as a fallback: process.env.N8N_FUNNEL_WEBHOOK_URL ?? 'https://nexusagents.app.n8n.cloud/webhook/ad-lead'. The env var N8N_FUNNEL_WEBHOOK_URL is not documented in .env.example, so it will always use the hardcoded fallback.
EVIDENCE: grep confirms the hardcoded URL. grep for N8N_FUNNEL_WEBHOOK_URL in .env.example returned no matches. Only N8N_BASE_URL is documented.
FIX: Add N8N_FUNNEL_WEBHOOK_URL to .env.example. Remove the hardcoded fallback URL -- fail explicitly if the env var is missing rather than silently using a potentially wrong URL.
```

---

### Issue 7: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.example

```
FILE: .env.example
LINE: N/A (missing)
SEVERITY: HIGH
BUG: The code at security.ts:12 reads process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, but this variable is not listed in .env.example. Developers setting up the project will not know to configure it.
EVIDENCE: security.ts:12 exports SUPABASE_ANON_KEY from NEXT_PUBLIC_SUPABASE_ANON_KEY. The .env.example only has SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY -- neither matches NEXT_PUBLIC_SUPABASE_ANON_KEY.
FIX: Add NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here to .env.example. Verify that SUPABASE_PUBLISHABLE_KEY is not an unused duplicate.
```

---

### Issue 8: vercel.json is Barebones -- No Function Config, No Redirects

```
FILE: vercel.json
LINE: 1-5
SEVERITY: MEDIUM
BUG: vercel.json only specifies buildCommand, outputDirectory, and installCommand. Missing: function memory/timeout config, redirects (www -> apex or vice versa), rewrites, region selection. Security headers are in next.config.js (good) but Vercel-level headers can provide defense-in-depth.
EVIDENCE: Full vercel.json content is 5 lines with only build configuration.
FIX: Add function configuration (memory limits), region selection (closest to target users), and www/non-www redirect. Consider adding Vercel-level security headers as a secondary layer.
```

---

### Issue 9: npm Vulnerability -- @anthropic-ai/sdk (MODERATE)

```
FILE: package.json (root)
LINE: N/A
SEVERITY: MEDIUM
BUG: @anthropic-ai/sdk has a moderate vulnerability -- Memory Tool Path Validation allows sandbox escape to sibling directories (GHSA-5474-4w2j-mq4c).
EVIDENCE: npm audit output: "Severity: moderate, fix available via npm audit fix --force, Will install @anthropic-ai/sdk@0.82.0 (breaking change)"
FIX: Upgrade @anthropic-ai/sdk to 0.82.0+. Review changelog for breaking changes before upgrading.
```

---

### Issue 10: CSP Allows unsafe-inline and unsafe-eval

```
FILE: apps/website/next.config.js
LINE: 25
SEVERITY: MEDIUM
BUG: The Content-Security-Policy script-src includes 'unsafe-inline' and 'unsafe-eval', which significantly weakens XSS protection. While Next.js may need unsafe-inline for its runtime, unsafe-eval should not be required in production.
EVIDENCE: script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ...
FIX: Remove 'unsafe-eval' and test. If Next.js requires it in dev only, use an environment-conditional config. For production, use nonce-based CSP instead of unsafe-inline where possible.
```

---

### Issue 11: No lint Script in Website package.json

```
FILE: apps/website/package.json
LINE: 6-9
SEVERITY: MEDIUM
BUG: The scripts section only has dev, build, and start. No lint, no test, no type-check script. This means CI/CD cannot run automated quality checks on the website specifically.
EVIDENCE: scripts: { "dev": "next dev --port 3000", "build": "next build", "start": "next start" } -- no lint or test scripts.
FIX: Add "lint": "next lint", "typecheck": "tsc --noEmit", and "test": "vitest" scripts. Wire these into a CI pipeline (Vercel build step or GitHub Actions).
```

---

### Issue 12: TypeScript Compiles Clean (Positive Finding)

```
FILE: apps/website/tsconfig.json
LINE: N/A
SEVERITY: LOW
BUG: Not a bug -- positive finding. TypeScript strict mode is enabled and tsc --noEmit passes with zero errors. The tsconfig uses bundler module resolution (correct for Next.js 14) and has path aliases configured.
EVIDENCE: npx tsc --noEmit completed with no output (zero errors).
FIX: No action needed. Maintain this standard.
```

---

## Deployment Readiness Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Security headers (CSP, HSTS, X-Frame) | PASS | Well configured in next.config.js |
| .env.local in .gitignore | PASS | Both root and website .gitignore exclude .env.* |
| Secrets in git history | PASS | No .env files ever committed |
| Secrets in .env.example | FAIL | Real Supabase URL, key, and phone number |
| TypeScript strict + clean build | PASS | Zero type errors |
| npm audit clean | FAIL | 2 vulnerabilities (1 high, 1 moderate) |
| Health check endpoint | FAIL | None exists |
| Error monitoring | FAIL | No Sentry or equivalent |
| Env vars documented | FAIL | NEXT_PUBLIC_SUPABASE_ANON_KEY and N8N_FUNNEL_WEBHOOK_URL missing |
| maxDuration compatible with plan | FAIL | 60s export on Hobby plan (10s cap) |
| Hardcoded URLs | FAIL | n8n webhook hardcoded as fallback |
| CI/CD quality gates | FAIL | No lint or test scripts in website package.json |

---

## Priority Actions (Ordered)

1. **IMMEDIATE:** Rotate the Supabase publishable key exposed in .env.example. Replace all real values with placeholders.
2. **IMMEDIATE:** Upgrade Next.js to patch the 4 security vulnerabilities.
3. **BEFORE LAUNCH:** Add Sentry or equivalent error monitoring.
4. **BEFORE LAUNCH:** Create /api/health endpoint.
5. **BEFORE LAUNCH:** Resolve the maxDuration/Hobby plan conflict (upgrade plan or optimize route).
6. **SHORT-TERM:** Add missing env vars to .env.example, remove hardcoded webhook URL.
7. **SHORT-TERM:** Add lint and typecheck scripts, set up CI quality gates.
8. **SHORT-TERM:** Upgrade @anthropic-ai/sdk to fix moderate vulnerability.
9. **MEDIUM-TERM:** Tighten CSP by removing unsafe-eval.
