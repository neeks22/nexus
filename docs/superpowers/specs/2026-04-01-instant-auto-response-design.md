# Instant Auto-Response on Funnel Submission

> Spec date: 2026-04-01
> Status: Approved

## Problem

When a lead submits the 7-step funnel at `/apply/dealerships`, the data is saved to Supabase and forwarded to an n8n webhook — but no immediate SMS or email is sent. The lead hears nothing. The outreach that happened on Apr 1 was a manual script run. Every minute of silence after submission kills conversion.

## Solution

Add inline auto-response directly in the `/api/funnel-lead` route. When a lead submits, they get a personalized SMS + welcome email within seconds. No n8n dependency for the instant response.

## Architecture

### Modified file

`apps/website/src/app/api/funnel-lead/route.ts`

### New file

`apps/website/src/lib/auto-response.ts` — extracted module for the auto-response logic (keeps the route file focused on validation + routing).

### Flow

```
User submits funnel form
  1. Zod validates input
  2. Save to Supabase funnel_submissions (with dedup check)
  3. Return { success: true } to user immediately
  4. After response (fire-and-forget via waitUntil or background promise):
     a. Forward to n8n webhook (existing, unchanged)
     b. Generate personalized SMS via callClaude() with NESB prompt
     c. Send SMS via sendTwilioSMS()
     d. Send welcome email via nodemailer (Gmail SMTP)
     e. Log both messages to lead_transcripts (touch_number: 1)
     f. Slack notification with lead summary
```

### Deduplication

Before inserting into `funnel_submissions`, query by phone + tenant_id. If the lead already exists:
- Do NOT insert a duplicate row
- Do NOT send another SMS/email
- Still return success to the user (don't leak info about existing records)
- Log a "duplicate submission" event

### SMS Content

AI-generated via `callClaude()` using a shortened version of the NESB system prompt from `sms/process/route.ts`. The user message includes:
- Lead's first name
- Vehicle type they selected
- Their credit situation
- Instruction: "This is the FIRST contact. Introduce yourself as [GM], GM at [DealerName]. 2-3 sentences. End with a question about what they're looking for."

Fallback if Claude fails: static template — "Hey [firstName], it's [GM] from [DealerName]. Got your application — let's get you on the road. What kind of vehicle would make the biggest difference for you right now?"

### Email Content

HTML email via nodemailer (Gmail SMTP), matching the existing email agent pattern. Content:
- Subject: "[FirstName], your application has been received"
- Body: confirmation that application is being reviewed, soft CTA to reply, ReadyCar branding, CASL unsubscribe footer
- From: nicolas@readycar.ca (ReadyCar) or moe@readyride.ca (ReadyRide) based on tenant

### Tenant Routing

The funnel form currently does not pass a tenant field. Two options:
1. Add a hidden `tenant` field to the form based on the URL path or a query param
2. Default to `readycar` (current only active tenant)

Decision: Default to `readycar` for now. Add tenant routing later when ReadyRide funnel goes live. The `TENANT_MAP` in security.ts already has both tenants mapped by phone number — we'll use the tenant's outbound phone as the SMS `from` number.

### Supabase Insert

Insert into `funnel_submissions` with these fields (matching existing schema):
```
tenant_id, vehicle_type, budget_range, employment, credit_situation,
has_trade_in, first_name, last_name, phone, email, casl_consent,
utm_source, utm_medium, utm_campaign, status ('new'), created_at
```

### Lead Transcript Logging

Two entries in `lead_transcripts` for the initial touch:
1. SMS message: `{ tenant_id, lead_id: phone, entry_type: 'message', role: 'ai', content: smsText, channel: 'sms', touch_number: 1 }`
2. Email message: `{ tenant_id, lead_id: phone, entry_type: 'message', role: 'ai', content: emailSubject, channel: 'email', touch_number: 1 }`

### Error Handling

- Claude API failure: use static fallback SMS template
- Twilio failure: log error, send Slack alert, do not retry (lead is saved, can be contacted manually)
- Gmail failure: log error, send Slack alert, SMS still goes out
- Supabase failure: log error, still attempt SMS/email (lead data is in n8n webhook as backup)
- n8n failure: already handled (logs warning, does not block response)
- All errors logged with `console.error('[auto-response]', ...)` prefix

### CASL Compliance

- Only send if `caslConsent === true` (already enforced by Zod schema — field is `z.literal(true)`)
- SMS includes implied opt-out: "Reply STOP to unsubscribe"
- Email includes CASL footer with unsubscribe instruction and physical address

### Security

- No PII in logs (existing pattern)
- Phone numbers normalized before Twilio send
- Email addresses lowercased and trimmed (already done by Zod)
- Prompt injection protection on lead data passed to Claude (sanitize name/vehicle fields)

## Dependencies

All exist — no new packages:
- `callClaude` from `lib/security.ts`
- `sendTwilioSMS` from `lib/security.ts`
- `supaPost`, `supaGet` from `lib/security.ts`
- `slackNotify` from `lib/security.ts`
- `nodemailer` (already in package.json)
- `TENANT_MAP` from `lib/security.ts`

## Testing

- Manual: submit the funnel, verify SMS arrives within 30 seconds, verify email arrives, verify Supabase entry, verify Slack notification
- Dedup: submit same phone twice, verify only one SMS/email sent
- Failure: test with invalid Twilio creds, verify graceful fallback

## What This Does NOT Include

- No cold lead warming automation (separate feature)
- No changes to the funnel UI
- No n8n workflow changes
- No new packages or abstractions
- No ReadyRide tenant support (just readycar for now)
