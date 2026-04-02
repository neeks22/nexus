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
