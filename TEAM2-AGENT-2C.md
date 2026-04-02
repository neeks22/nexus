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
