# Dealership Vertical — Internal Deployment Runbook

This runbook covers deploying the dealership AI workflow for a new client. Follow every step. Do not skip the checklist at the end.

---

## Prerequisites

Before starting deployment, confirm:

- [ ] Client contract signed (audit or build engagement)
- [ ] Activix CRM access granted (API token + webhook permissions)
- [ ] Twilio account provisioned (dedicated number for this dealership)
- [ ] Supabase project set up (or existing multi-tenant instance)
- [ ] n8n instance running (https://nexusagents.app.n8n.cloud or self-hosted)
- [ ] Client provided: dealership name, address, phone, hours, timezone, staff list with emails, escalation numbers
- [ ] Client provided: inventory CSV or inventory feed URL
- [ ] Slack workspace access (for handoff notifications)

---

## Step 1: Create Tenant Configuration

### 1.1 Layer 2 — Tenant Config

Create the tenant config in Supabase or via the PromptAssembler API:

```typescript
const tenantConfig = {
  dealershipName: "Client Dealership Name",
  hours: "Mon-Fri 9AM-8PM, Sat 9AM-5PM, Sun Closed",
  staff: [
    { name: "Rep Name", role: "Sales Manager", email: "rep@dealer.ca" },
    // Add all sales staff
  ],
  address: "123 Street, City, Province Postal",
  phone: "(XXX) XXX-XXXX",
  timezone: "America/Toronto", // or America/Montreal, America/Vancouver, etc.
  tone: "friendly", // professional | friendly | casual
  escalationNumbers: ["(XXX) XXX-XXXX"],
};
```

### 1.2 Layer 3 — Client-Editable Config

Set initial values (client can edit later via dashboard):

```typescript
const clientConfig = {
  activePromotions: [],       // Client fills in via dashboard
  inventoryHighlights: [],    // Client fills in via dashboard
  blacklistedTopics: [],      // e.g., ["competitor pricing"]
  customFaq: [],              // Client fills in via dashboard
  greetingOverride: null,     // Optional custom greeting
};
```

### 1.3 Store Configs

Save both configs to the tenant config store with the tenant ID (use dealership slug, e.g., `maple-motors-ottawa`).

---

## Step 2: Configure Activix Webhook

### 2.1 Get the Webhook URL

The webhook URL is:
```
https://nexusagents.app.n8n.cloud/webhook/activix-lead-webhook
```

### 2.2 Set Up in Activix

1. Log in to Activix CRM as admin
2. Go to Settings > Integrations > Webhooks
3. Add a new webhook:
   - **URL**: the webhook URL above
   - **Events**: `lead.created` (for instant response)
   - **Method**: POST
   - **Secret**: Generate a strong secret (32+ chars), save it as `ACTIVIX_WEBHOOK_SECRET`
4. Test the webhook from Activix — confirm n8n receives the payload

### 2.3 Store the API Token

1. In Activix, go to Settings > API > Generate Token
2. Save the token as `ACTIVIX_API_TOKEN` in the n8n environment
3. Test with a GET request to `https://api.activix.ca/v2/leads?per_page=1`

---

## Step 3: Configure Twilio

### 3.1 Provision a Phone Number

1. In Twilio Console, buy a local Canadian number matching the dealership's area code
2. Enable SMS capability
3. Note the number in E.164 format: `+1XXXXXXXXXX`

### 3.2 Set Up Inbound Webhook

1. In Twilio Console > Phone Numbers > your number > Messaging
2. Set "When a message comes in" to the inbound reply handler webhook:
   ```
   https://nexusagents.app.n8n.cloud/webhook/twilio-inbound-sms
   ```
3. Method: POST

### 3.3 Store Credentials

Set in n8n environment variables:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (the E.164 number)

---

## Step 4: Configure n8n Workflows

### 4.1 Workflow 1 — Instant Lead Response

Workflow ID: `vWdc92Ew7olgKFhA`

1. Open the workflow in n8n
2. Set environment variables:
   - `ACTIVIX_WEBHOOK_SECRET` — the secret from Step 2
   - `TWILIO_FROM_NUMBER` — from Step 3
   - `FROM_EMAIL` — dealership's sending email
3. Configure Twilio credentials node
4. Configure SendGrid/email credentials node
5. Configure Slack notification channel (create `#leads-{dealership}` channel)
6. Update inventory query node with dealership's inventory source
7. Activate the workflow

### 4.2 Workflow 2 — Cold Lead Warming

Workflow ID: `XYDPZrDBrip1GPDE`

1. Open the workflow in n8n
2. Set environment variables:
   - `ACTIVIX_API_TOKEN`
   - `DEALERSHIP_NAME`, `DEALERSHIP_PHONE`, `DEFAULT_REP_NAME`
   - Twilio and SendGrid credentials (same as Workflow 1)
3. Verify the schedule trigger is set to 9 AM in the dealership's timezone
4. Activate the workflow

### 4.3 Workflow 3 — Inbound Reply Handler

1. Open the workflow in n8n
2. Verify Twilio inbound webhook URL matches Step 3.2
3. Configure intent classification thresholds (default: 0.8 for handoff)
4. Configure handoff Slack channel
5. Activate the workflow

### 4.4 Workflow 4 — Activix Failover Queue

1. Open the workflow in n8n
2. Verify Supabase `activix_queue` table exists for this tenant
3. Set the schedule to every 15 minutes
4. Activate the workflow

---

## Step 5: Load Inventory

### 5.1 CSV Format

The inventory CSV must have these columns:
```
VIN,make,model,year,trim,color,features,MSRP,stock_status,days_on_lot
```

- `features` is a pipe-separated list: `Apple CarPlay|Honda Sensing|heated seats`
- `stock_status` must be one of: `available`, `sold`, `pending`, `in_transit`

### 5.2 Upload

Upload the CSV to the configured inventory source (local file path, S3 bucket, or API endpoint depending on setup).

### 5.3 Verify

Run a test query to confirm inventory matching works:
```typescript
const provider = new CsvInventoryProvider(csvPath);
const matches = await provider.findMatching({ make: "Honda", model: "Civic" });
console.log(matches); // Should return matching vehicles
```

---

## Step 6: Verify End-to-End

### 6.1 Test Instant Response

1. Create a test lead in Activix with a test phone number
2. Verify n8n receives the webhook within 5 seconds
3. Verify SMS arrives on the test phone within 60 seconds
4. Verify the message mentions the customer name and vehicle
5. Verify compliance check passed in logs

### 6.2 Test Cold Warming

1. Create a test lead with `created_at` set to 3 days ago
2. Trigger the cold warming workflow manually
3. Verify the lead receives a touch 2 SMS
4. Verify the message varies from the instant response

### 6.3 Test Inbound Reply

1. Reply to the AI's SMS from the test phone: "how much is the Civic?"
2. Verify the intent is classified as PRICE_INQUIRY
3. Verify a handoff notification appears in Slack
4. Verify the Activix lead is updated with the handoff

### 6.4 Test Compliance

1. Set `unsubscribe_sms_date` on a test lead in Activix
2. Trigger a touch — verify the message is blocked
3. Check compliance failure logs

---

## Per-Dealership Checklist

Copy this checklist for each new dealership deployment:

```
## [Dealership Name] — Deployment Checklist

### Configuration
- [ ] Tenant ID created: _______________
- [ ] Layer 2 config stored (name, hours, staff, address, phone, timezone, tone)
- [ ] Layer 3 config initialized (empty promotions, FAQ, highlights)
- [ ] Inventory CSV uploaded and verified

### Activix
- [ ] API token generated and stored
- [ ] Webhook configured with correct URL
- [ ] Webhook secret generated and stored
- [ ] Test webhook received by n8n

### Twilio
- [ ] Phone number provisioned: _______________
- [ ] Inbound webhook configured
- [ ] Test SMS sent and received

### n8n Workflows
- [ ] Workflow 1 (Instant Response) activated
- [ ] Workflow 2 (Cold Warming) activated
- [ ] Workflow 3 (Inbound Reply) activated
- [ ] Workflow 4 (Failover Queue) activated

### Slack
- [ ] #leads-{dealership} channel created
- [ ] #compliance-{dealership} channel created
- [ ] Handoff notifications tested

### End-to-End Verification
- [ ] Instant response test passed (< 60 seconds)
- [ ] Cold warming test passed (correct touch + channel)
- [ ] Inbound reply handoff test passed
- [ ] Compliance block test passed
- [ ] French language test passed (if Quebec dealership)

### Handoff to Client
- [ ] Client onboarding call completed
- [ ] Dashboard access provided
- [ ] Onboarding guide sent
- [ ] Support contacts shared
```

---

## Monitoring

### Daily Checks

- Review the n8n execution log for failed workflows
- Check Slack for any compliance failure alerts
- Verify the Activix failover queue is empty (no stuck items)

### Weekly Checks

- Review cost report per tenant (target: < $0.15 per lead)
- Check response time trends (target: < 60 seconds for instant response)
- Review handoff rate (target: 15-25% of engaged leads)
- Review opt-out rate (alert if > 5%)

### Alerts

The system sends automatic alerts for:
- Circuit breaker OPEN on Activix API
- Compliance check failures
- Response time exceeding 60 seconds
- Activix API error rate above 10%

---

## Scaling to New Dealerships

### Multi-Tenant Architecture

Each dealership is a separate tenant with:
- Unique tenant ID
- Separate Layer 2 and Layer 3 configs
- Dedicated Twilio phone number
- Shared n8n workflows (tenant-aware routing)
- Shared Supabase tables (filtered by tenant_id)

### Adding a New Dealership

1. Follow Steps 1-6 above for the new dealership
2. The n8n workflows are shared — they route based on webhook source and tenant config
3. Add the new tenant's credentials to the n8n environment
4. No code changes required for standard deployments

### Capacity Planning

- Each n8n workflow handles up to ~500 leads per day per dealership
- Activix API rate limit: 200 requests/minute, 2000/hour (shared across all tenants)
- Twilio: 1 message/second per number (provision additional numbers for high-volume dealers)
- Claude API: monitor token usage; switch to Haiku for cost-sensitive operations
