# n8n Setup Guide — Connecting Nexus to the Real World

## What n8n Does (Plain English)
n8n is the "pipes" that connect your AI agents to real systems. When a lead fills out a form → n8n catches it → sends it to your Nexus agent → agent qualifies the lead → n8n sends the response email + updates the CRM + notifies the client on Slack. All automatic. All in seconds.

## Step 1: Sign Up for n8n Cloud (5 min)
1. Go to https://n8n.io
2. Click "Get Started Free"
3. Create account with your email
4. You get a free trial — no credit card needed
5. Your n8n instance is live at: https://yourname.app.n8n.cloud

## Step 2: Your First Workflow — "Lead Response Under 60 Seconds"

### The Flow:
```
Lead submits form → n8n webhook catches it → Nexus AI qualifies →
Auto-email sent → CRM updated → Slack notification → Done in <60 seconds
```

### Build It:
1. In n8n, click "Add Workflow"
2. Add trigger: "Webhook" (this gives you a URL that catches form submissions)
3. Add node: "HTTP Request" — this calls your Nexus agent API
4. Add node: "Send Email" (Gmail or SMTP) — sends the AI response to the lead
5. Add node: "HTTP Request" — updates CRM (HubSpot, GoHighLevel, etc.)
6. Add node: "Slack" — notifies the client's team

### Connecting to Nexus:
Your Nexus agents run via the Anthropic API. The n8n HTTP Request node calls Claude with:
- The lead's information as the prompt
- Your agent's system prompt (from the lead-qualifier template)
- Returns: qualified lead score, response email, routing decision

## Step 3: Workflows Worth Building for Clients

### Real Estate ($5-10K/mo value)
- Lead response under 60 seconds (webhook → qualify → email → CRM)
- Showing booking automation (lead qualifies → check availability → book showing)
- Follow-up sequences (Day 1, 3, 7, 14 — automated drip)
- Market report generation (weekly → AI summarizes → email to leads)

### Law Firm ($5-15K/mo value)
- Client intake automation (form → document processor agent → summary → assign lawyer)
- Document review pipeline (upload → AI extracts key terms → flags risks → emails lawyer)
- Appointment booking (inquiry → qualify → book consultation → send prep docs)

### Support Teams ($3-8K/mo value)
- Ticket triage (new ticket → AI classifies → routes to right team → auto-responds)
- FAQ deflection (common question → AI answers instantly → only escalates complex ones)
- CSAT follow-up (ticket closed → wait 24h → send satisfaction survey)

## Step 4: Self-Host Later (When You Have Revenue)

Once you have 2-3 clients paying retainers:
1. Get a $6/mo DigitalOcean droplet
2. Install Docker
3. Run n8n in Docker
4. Point your domain to it (n8n.nexusagents.com)
5. Migrate workflows from cloud to self-hosted
6. Now you're running at $6/month instead of $24/month

## Dealership Vertical

The dealership vertical uses 4 interconnected n8n workflows to automate lead response, follow-up, and handoff for automotive dealerships using Activix CRM.

### Workflow 1: Instant Lead Response
**Trigger:** Activix webhook (lead.created)
**What it does:** When a new lead arrives in Activix, this workflow fires within seconds. It verifies the webhook signature (HMAC-SHA256), parses the lead data, detects the customer's language (English or French), queries the inventory for matching vehicles, generates a personalized AI response, runs a CASL compliance check, and sends the response via Twilio SMS. It also sends a secondary email, updates the Activix lead record, and notifies the assigned rep via Slack.
**n8n Workflow ID:** `vWdc92Ew7olgKFhA`

### Workflow 2: Cold Lead Warming
**Trigger:** Schedule (daily at 9 AM)
**What it does:** Every morning, this workflow queries Activix for pending/attempted leads, filters them by touch schedule (day 2, 4, 7, 14, 30, 60+), and sends the next appropriate message to each lead. It alternates between SMS and email per the cadence schedule, adapts tone by touch number (enthusiastic early, consultative mid, respectful close at touch 6), and always runs compliance checks before sending. Failed leads are skipped without blocking the batch.
**n8n Workflow ID:** `XYDPZrDBrip1GPDE`

### Workflow 3: Inbound Reply Handler
**Trigger:** Twilio webhook (incoming SMS)
**What it does:** When a customer replies to an AI message, this workflow looks up the lead in Activix, loads the full conversation transcript, classifies the customer's intent (pricing inquiry, info request, not interested, etc.), and routes accordingly. Price/financing/trade-in questions trigger a handoff to a named sales rep via Slack with full context. Simple info requests get an AI-generated contextual reply. "Not interested" replies stop the warming sequence and send an opt-out confirmation.

### Workflow 4: Activix Failover Queue
**Trigger:** Schedule (every 15 minutes)
**What it does:** If Activix is down or rate-limited, failed API calls are queued in Supabase. This workflow drains the queue by retrying pending items. It checks the circuit breaker state first — if Activix is healthy (CLOSED), it processes the queue; if unhealthy (OPEN), it skips. After 10 failed attempts, items are marked as failed and an alert is sent to Slack.

### How the Workflows Connect

```
New Lead in Activix
       |
       v
[Workflow 1: Instant Response] ---> SMS + Email sent
       |                                    |
       v                                    v
  Lead updated in Activix          Customer receives message
       |                                    |
       |                              Customer replies
       |                                    |
       v                                    v
[Workflow 2: Cold Warming]     [Workflow 3: Inbound Reply Handler]
  (if no reply, daily)              |              |             |
       |                         Handoff      AI Reply      Opt-Out
       v                            |              |             |
  Next touch sent              Slack alert    SMS sent     Sequence stops
       |                            |              |
       v                            v              v
  [Workflow 4: Failover]    Rep follows up   Transcript updated
  (retries failed Activix calls)
```

### Environment Variables (All 4 Workflows)

| Variable | Description |
|----------|-------------|
| `ACTIVIX_API_TOKEN` | Activix API bearer token |
| `ACTIVIX_WEBHOOK_SECRET` | HMAC secret for webhook verification |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio sending number (E.164) |
| `SENDGRID_API_KEY` | SendGrid API key for email |
| `FROM_EMAIL` | Dealership sending email address |
| `DEALERSHIP_NAME` | Display name for templates |
| `DEALERSHIP_PHONE` | Display phone for templates |
| `DEFAULT_REP_NAME` | Fallback rep name for messages |

### Deployment

See `docs/dealership/internal-runbook.md` for the full step-by-step deployment guide and per-dealership checklist.

---

## Pricing Your n8n Workflows
- Simple workflow (1 trigger, 3-4 steps): Include in retainer
- Complex workflow (multiple triggers, 10+ steps, integrations): $2,000-5,000 setup + retainer
- Each workflow you build is recurring revenue — they need you to maintain and optimize it
