# n8n Workflow Registry — Nexus Dealership AI

**Instance:** nexusagents.app.n8n.cloud
**Total workflows:** 7
**Status:** All inactive (pending credential configuration)

---

## Lead Handling Workflows

### 1. Instant Lead Response
- **ID:** `vWdc92Ew7olgKFhA`
- **Trigger:** Webhook POST `/webhook/activix-lead-webhook`
- **Nodes:** 13
- **What it does:** New lead comes in → verify webhook signature → parse lead data → detect language → match inventory → generate AI response (BDC Sales Agent prompt) → compliance check → send SMS + email → update CRM → notify rep via Slack
- **Env vars:** CRM_PROVIDER, MESSAGING_PROVIDER, ACTIVIX_API_TOKEN, TWILIO_*, SLACK_WEBHOOK_URL

### 2. Cold Lead Warming
- **ID:** `XYDPZrDBrip1GPDE`
- **Trigger:** Schedule (daily 9:00 AM ET)
- **Nodes:** 14
- **What it does:** Fetches all pending/attempted leads from CRM → filters eligible (not unsubscribed, due for next touch) → determines touch number → generates touch-appropriate message with BANT scoring → compliance check → sends SMS or email → updates CRM
- **Cadence:** Day 2 (SMS), Day 4 (email), Day 7 (SMS), Day 14 (email), Day 30 (SMS break-up), Day 60+ (monthly email)

### 3. Inbound Reply Handler
- **ID:** `Iu3zbs4uAJbfKUHz`
- **Trigger:** Webhook POST `/webhook/inbound-sms` (Twilio)
- **Nodes:** 20
- **What it does:** Receives SMS reply → validates Twilio signature → looks up lead in CRM → loads conversation history → classifies intent + BANT score → routes: handoff (HOT) / AI reply (INFO) / opt-out (STOP) → sends response → updates transcript → resets cadence timer

### 4. CRM Failover Queue
- **ID:** `xoQDRxTkLpDge7q7`
- **Trigger:** Schedule (every 15 minutes)
- **Nodes:** 15
- **What it does:** Checks queue for failed CRM operations → tests CRM health → if healthy: execute queued ops → if unhealthy: increment retry counter → after 10 failures: Slack alert

### 5. Service Department Handler
- **ID:** `pcfbM9Ns0hVIzpgh`
- **Trigger:** Webhook POST `/webhook/service-inquiry`
- **Nodes:** 8
- **What it does:** Receives service inquiry → classifies type (booking/status/recall/FAQ) → generates response using Service BDC prompt → compliance check → sends SMS → updates CRM

---

## Marketing Workflows

### 6. Meta CAPI Tracking
- **ID:** `YWMy7GvBignFzbuj`
- **Trigger:** Webhook POST `/webhook/meta-capi`
- **Nodes:** 7
- **What it does:** Receives conversion events from dealer websites → hashes PII (SHA256) → builds CAPI payload → sends to Meta Graph API → logs result. Dead letter queue for failures.
- **Env vars:** META_PIXEL_ID, META_ACCESS_TOKEN

### 7. Ad Lead Capture
- **ID:** `JCmUCJVgfyj059VM`
- **Trigger:** Webhook POST `/webhook/ad-lead`
- **Nodes:** 13
- **What it does:** Receives leads from Meta/Google lead forms (via LeadsBridge or direct webhook) → detects source → normalizes lead data → deduplicates against CRM → creates new lead or updates existing → triggers instant response → Slack notification

---

## Webhook Endpoints Summary

| Endpoint | Workflow | Purpose |
|----------|----------|---------|
| `/webhook/activix-lead-webhook` | Instant Response | New CRM leads |
| `/webhook/inbound-sms` | Reply Handler | Incoming SMS |
| `/webhook/service-inquiry` | Service Dept | Service requests |
| `/webhook/meta-capi` | CAPI Tracking | Conversion events |
| `/webhook/ad-lead` | Ad Lead Capture | Meta/Google form leads |

---

## Environment Variables Required

### Platform (set once, same for all dealers)
```
TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=(your token)
TWILIO_FROM_NUMBER=+13433125045
SLACK_WEBHOOK_URL=(your webhook)
SUPABASE_URL=https://arnczuspgedxsxiyueup.supabase.co
SUPABASE_SECRET_KEY=(your key)
ANTHROPIC_API_KEY=(your key)
N8N_WEBHOOK_BASE_URL=https://nexusagents.app.n8n.cloud
```

### Per-Dealer (read from Supabase tenant_configs at runtime)
- CRM provider + API keys
- Dealer name, hours, staff
- Promotions, FAQ, blacklisted topics
- Language preference
