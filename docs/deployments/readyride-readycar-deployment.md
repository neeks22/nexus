# ReadyRide.ca & ReadyCar.ca -- Deployment Checklist

**Client:** ReadyRide / ReadyCar (subprime auto dealerships)
**Location:** Gloucester/Ottawa, Ontario
**CRM:** Activix
**Timezone:** America/Toronto (Eastern)
**Target Start:** Week of deployment kickoff
**Vertical:** Subprime auto financing (575-699 credit scores, bankruptcy, consumer proposal, newcomers, no credit)

---

## IMPORTANT: Subprime-Specific Notes

### Meta Special Ad Category Restrictions
- All Meta campaigns for credit/lending MUST be set to **Special Ad Category: Credit** (or Housing/Employment if applicable)
- Special Ad Category removes: age targeting, zip code targeting (only 15-mile radius minimum), gender targeting, detailed targeting exclusions, Lookalike Audiences (replaced by Special Ad Audiences)
- This means: NO targeting by credit score, income, financial status, or zip-code-level exclusions
- Workaround: Use "Your Job Is Your Credit" and lifestyle-based messaging that self-selects the audience without platform-level targeting restrictions
- All ad copy must comply with the Canadian Code of Advertising Standards and CASL

### Subprime Messaging Guidelines
- Never use the word "subprime" in any customer-facing copy or ad creative
- Approved language: "all credit welcome," "credit challenges," "second chance financing," "your job is your credit," "everyone deserves a fresh start"
- Empathy-first framing: acknowledge the pain, offer hope, show social proof
- Always include: "No impact on your credit score" (soft pull), "No obligation," "OMVIC Registered"
- Key emotional triggers: hope/fresh start, speed/urgency, safety/trust, empowerment (credit rebuilding)
- Target personas: post-bankruptcy (discharged or active consumer proposal), newcomers to Canada, thin file / no credit history, employed but bruised credit (late payments, collections)

### "Your Job Is Your Credit" Campaign Angle
- Primary hook for paid ads -- self-selects subprime audience without triggering Special Ad Category issues around income/credit targeting
- Messaging: "Employed? You qualify. Period." / "Making $2K/month? You're approved." / "Your paycheck is your credit score."
- This bypasses ReadyRide's gap: they require $2K/month income but exclude ODSP/CPP/gig -- if ReadyCar accepts wider income types, lean into that differentiation

---

## Pre-Deployment: Account & Access Confirmation

Before starting any technical work, confirm:

- [ ] Client contracts signed for both ReadyRide.ca and ReadyCar.ca
- [ ] Confirm: Are ReadyRide and ReadyCar on the SAME Activix account (multi-rooftop) or SEPARATE accounts?
- [ ] Confirm: Same ownership group or separate entities? (affects billing, shared assets, cross-promotion rules)
- [ ] Confirm dealership details for each:
  - Legal business name
  - Physical address
  - Phone number
  - Business hours (ReadyRide known: Mon-Fri 10am-6pm, Sat 10am-4pm, Sun Closed)
  - Staff list with names, roles, emails, cell numbers
  - Escalation contacts (who gets called when AI hands off a hot lead)
- [ ] Confirm: Does ReadyCar.ca have a live website? What is the tech stack?
- [ ] Confirm: Does ReadyCar have an existing Meta Pixel? Google Ads? GTM?
- [ ] ReadyRide Meta Pixel ID confirmed: 3946664872263007
- [ ] ReadyRide GTM status: placeholder (GTM-XXXXXXX) -- needs real container

---

## Phase 1: AI Lead Handling (Week 1)

### 1.1 Activix CRM Configuration

**ReadyRide:**
- [ ] Obtain Activix API token from ReadyRide (Settings > API > Generate Token)
- [ ] Test API token: `GET https://api.activix.ca/v2/leads?per_page=1` with Bearer token
- [ ] Generate webhook secret (32+ characters) for ReadyRide
- [ ] Set Activix webhook URL: `https://nexusagents.app.n8n.cloud/webhook/activix-lead-webhook`
- [ ] Configure webhook events: `lead.created`
- [ ] Test webhook fires and n8n receives the payload
- [ ] Store as env vars: `READYRIDE_ACTIVIX_API_TOKEN`, `READYRIDE_ACTIVIX_WEBHOOK_SECRET`

**ReadyCar:**
- [ ] Obtain Activix API token from ReadyCar (or same account -- confirm multi-rooftop setup)
- [ ] Test API token: `GET https://api.activix.ca/v2/leads?per_page=1` with Bearer token
- [ ] Generate webhook secret (32+ characters) for ReadyCar
- [ ] Set Activix webhook URL: `https://nexusagents.app.n8n.cloud/webhook/activix-lead-webhook`
- [ ] Configure webhook events: `lead.created`
- [ ] Test webhook fires and n8n receives the payload
- [ ] Store as env vars: `READYCAR_ACTIVIX_API_TOKEN`, `READYCAR_ACTIVIX_WEBHOOK_SECRET`

### 1.2 Twilio Phone Numbers

- [ ] Purchase Canadian phone number for ReadyRide -- Ottawa area code **613** preferred
  - Number: `+1613XXXXXXX` -- record here: _______________
  - Enable SMS capability
  - Set inbound webhook: `https://nexusagents.app.n8n.cloud/webhook/twilio-inbound-sms`
  - Method: POST
- [ ] Purchase Canadian phone number for ReadyCar -- Ottawa area code **613** preferred
  - Number: `+1613XXXXXXX` -- record here: _______________
  - Enable SMS capability
  - Set inbound webhook: `https://nexusagents.app.n8n.cloud/webhook/twilio-inbound-sms`
  - Method: POST
- [ ] Store env vars: `READYRIDE_TWILIO_FROM_NUMBER`, `READYCAR_TWILIO_FROM_NUMBER`
- [ ] Confirm shared Twilio account SID and auth token are in n8n: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`

### 1.3 SendGrid Email Configuration

**ReadyRide:**
- [ ] Configure sender domain authentication for readyride.ca (DNS records: CNAME for em.readyride.ca)
- [ ] Verify sender domain in SendGrid
- [ ] Set FROM address: `financing@readyride.ca` or `info@readyride.ca` (confirm with client)
- [ ] Store env var: `READYRIDE_FROM_EMAIL`

**ReadyCar:**
- [ ] Configure sender domain authentication for readycar.ca (DNS records: CNAME for em.readycar.ca)
- [ ] Verify sender domain in SendGrid
- [ ] Set FROM address: `financing@readycar.ca` or `info@readycar.ca` (confirm with client)
- [ ] Store env var: `READYCAR_FROM_EMAIL`

### 1.4 Slack Channels

- [ ] Create `#readyride-leads` channel -- all new lead notifications
- [ ] Create `#readycar-leads` channel -- all new lead notifications
- [ ] Create `#readyride-compliance` channel -- CASL compliance alerts, opt-out events
- [ ] Create `#readycar-compliance` channel -- CASL compliance alerts, opt-out events
- [ ] Create `#readyride-handoffs` channel -- hot lead handoffs to human sales staff
- [ ] Create `#readycar-handoffs` channel -- hot lead handoffs to human sales staff
- [ ] Invite relevant team members to all channels
- [ ] Test Slack webhook integration from n8n

### 1.5 Tenant Configuration (Layer 2 -- Dealership Identity)

**ReadyRide tenant config:**
```typescript
{
  tenantId: "readyride-ottawa",
  dealershipName: "Ready Ride",
  hours: "Mon-Fri 10AM-6PM, Sat 10AM-4PM, Sun Closed",
  staff: [
    // Confirmed from reviews: Moe, Hussein, Eddy, Samah, Adam
    { name: "Moe", role: "Sales", email: "moe@readyride.ca" },
    { name: "Hussein", role: "Sales", email: "hussein@readyride.ca" },
    { name: "Eddy", role: "Sales", email: "eddy@readyride.ca" },
    { name: "Samah", role: "Sales", email: "samah@readyride.ca" },
    { name: "Adam", role: "Sales", email: "adam@readyride.ca" },
    // GET FULL STAFF LIST FROM CLIENT
  ],
  address: "1740 Queensdale Avenue, Gloucester, Ontario K1T 1J6",
  phone: "(613) 983-9834",
  timezone: "America/Toronto",
  tone: "friendly", // empathetic but confident -- matches their brand
  escalationNumbers: ["(613) 983-9834"], // confirm direct lines
}
```
- [ ] Confirm all staff names, emails, and roles with client
- [ ] Store ReadyRide tenant config in Supabase

**ReadyCar tenant config:**
```typescript
{
  tenantId: "readycar-ottawa",
  dealershipName: "Ready Car",
  hours: "TBD -- GET FROM CLIENT",
  staff: [
    // GET FROM CLIENT
  ],
  address: "TBD -- GET FROM CLIENT",
  phone: "TBD -- GET FROM CLIENT",
  timezone: "America/Toronto",
  tone: "friendly",
  escalationNumbers: [],
}
```
- [ ] Get all ReadyCar details from client
- [ ] Store ReadyCar tenant config in Supabase

### 1.6 Tenant Configuration (Layer 3 -- Client-Editable Defaults)

**ReadyRide:**
- [ ] Set initial promotions (get current offers from client):
  - e.g., "98% Approval Rate," "Rates Starting at 0%," "3-Minute Application"
  - Any seasonal/event promotions running
- [ ] Set inventory highlights (top 5-10 vehicles to push)
- [ ] Set blacklisted topics: `["competitor pricing", "specific interest rates beyond 'starting at 0%'"]`
- [ ] Set custom FAQ from their website content (approval process, income requirements, credit rebuilding)
- [ ] Store Layer 3 config in Supabase

**ReadyCar:**
- [ ] Set initial promotions (get from client)
- [ ] Set inventory highlights (get from client)
- [ ] Set blacklisted topics
- [ ] Set custom FAQ
- [ ] Store Layer 3 config in Supabase

### 1.7 Inventory Load

**ReadyRide:**
- [ ] Request inventory CSV or feed URL from client
- [ ] Verify CSV format: `VIN,make,model,year,trim,color,features,MSRP,stock_status,days_on_lot`
- [ ] Note: ReadyRide uses "Call for Price" -- confirm if MSRP data is available internally
- [ ] Upload inventory to configured source (S3/local/API)
- [ ] Test inventory matching: query for a known vehicle, confirm results
- [ ] Set up inventory refresh schedule (daily or real-time feed)

**ReadyCar:**
- [ ] Request inventory CSV or feed URL from client
- [ ] Verify CSV format matches expected schema
- [ ] Upload inventory to configured source
- [ ] Test inventory matching
- [ ] Set up inventory refresh schedule

### 1.8 n8n Workflow Configuration

All 4 workflows are shared (tenant-aware routing). Configure per-tenant environment variables:

- [ ] Set all ReadyRide env vars in n8n:
  - `READYRIDE_ACTIVIX_API_TOKEN`
  - `READYRIDE_ACTIVIX_WEBHOOK_SECRET`
  - `READYRIDE_TWILIO_FROM_NUMBER`
  - `READYRIDE_FROM_EMAIL`
  - `READYRIDE_DEALERSHIP_NAME` = "Ready Ride"
  - `READYRIDE_DEALERSHIP_PHONE` = "(613) 983-9834"
  - `READYRIDE_DEFAULT_REP_NAME` (confirm with client)

- [ ] Set all ReadyCar env vars in n8n:
  - `READYCAR_ACTIVIX_API_TOKEN`
  - `READYCAR_ACTIVIX_WEBHOOK_SECRET`
  - `READYCAR_TWILIO_FROM_NUMBER`
  - `READYCAR_FROM_EMAIL`
  - `READYCAR_DEALERSHIP_NAME` = "Ready Car"
  - `READYCAR_DEALERSHIP_PHONE` = TBD
  - `READYCAR_DEFAULT_REP_NAME` (confirm with client)

- [ ] Verify tenant routing logic in all 4 workflows handles both tenant IDs
- [ ] Verify Supabase `activix_queue` table exists for both tenants

### 1.9 Activate Workflows

- [ ] Activate Workflow 1: Instant Lead Response (`vWdc92Ew7olgKFhA`)
- [ ] Activate Workflow 2: Cold Lead Warming (`XYDPZrDBrip1GPDE`) -- verify schedule trigger: 9 AM ET
- [ ] Activate Workflow 3: Inbound Reply Handler -- verify handoff threshold: 0.8
- [ ] Activate Workflow 4: Activix Failover Queue -- verify schedule: every 15 minutes

### 1.10 End-to-End Testing

**ReadyRide E2E:**
- [ ] Create test lead in Activix with test phone number (tag as test)
- [ ] Verify n8n receives webhook within 5 seconds
- [ ] Verify SMS arrives on test phone within 60 seconds
- [ ] Verify SMS mentions customer name and vehicle interest
- [ ] Verify email arrives (if email provided on lead)
- [ ] Verify Slack notification appears in `#readyride-leads`
- [ ] Verify Activix lead is updated with AI response notes
- [ ] Verify compliance pre-flight passed (check logs)
- [ ] Test inbound reply: reply to SMS with "how much is the Civic?"
  - [ ] Verify intent classified as PRICE_INQUIRY
  - [ ] Verify handoff notification in `#readyride-handoffs`
  - [ ] Verify Activix lead updated with handoff
- [ ] Test cold warming: create lead with `created_at` 3 days ago, trigger manually
  - [ ] Verify touch 2 SMS sent
  - [ ] Verify message differs from instant response
- [ ] Test compliance block: set `unsubscribe_sms_date` on test lead, trigger touch
  - [ ] Verify message is BLOCKED
  - [ ] Verify alert in `#readyride-compliance`
- [ ] Delete/archive all test leads after verification

**ReadyCar E2E:**
- [ ] Repeat all above tests for ReadyCar tenant
- [ ] Create test lead in Activix for ReadyCar
- [ ] Verify n8n routes to ReadyCar config (correct dealership name, phone, Twilio number)
- [ ] Verify Slack notifications go to `#readycar-leads`
- [ ] Verify SMS comes from ReadyCar Twilio number (not ReadyRide)
- [ ] Full inbound reply + handoff test
- [ ] Full cold warming test
- [ ] Full compliance block test
- [ ] Delete/archive all test leads after verification

### 1.11 Go Live

- [ ] Confirm all 4 workflows are active and healthy (no errors in n8n execution log)
- [ ] Confirm Activix failover queue is empty
- [ ] Send "We're Live" confirmation to ReadyRide point of contact
  - Include: Twilio number in use, Slack channels to monitor, support contact, escalation process
- [ ] Send "We're Live" confirmation to ReadyCar point of contact
  - Include: same details as above
- [ ] Schedule Week 1 daily monitoring: check n8n executions, Slack alerts, response times

---

## Phase 2: Ad Campaigns (Week 2)

### 2.1 Meta Business Manager Setup

**ReadyRide:**
- [ ] Get admin access to ReadyRide's Meta Business Manager (or create one)
- [ ] Verify Meta Pixel 3946664872263007 is firing correctly on readyride.ca
- [ ] Confirm pixel events: PageView, InitiateCheckout, Lead, CompleteRegistration
- [ ] Set up Meta CAPI (Conversions API) via n8n for server-side tracking
  - This beats ad blockers and improves ad optimization
- [ ] Create Custom Audiences:
  - Website visitors (7-day, 30-day, 90-day)
  - Lead form submitters
  - Application starters (InitiateCheckout) who did NOT complete (CompleteRegistration)
  - Video viewers (25%, 50%, 75%, 95%)
- [ ] Create Special Ad Audiences (replaces Lookalikes under Credit category):
  - Based on website visitors
  - Based on lead form submitters
- [ ] Set up offline event tracking (if Activix can export sale data for ROAS measurement)

**ReadyCar:**
- [ ] Get admin access to ReadyCar's Meta Business Manager (or create one)
- [ ] Install Meta Pixel on readycar.ca
- [ ] Configure pixel events: PageView, InitiateCheckout, Lead, CompleteRegistration
- [ ] Set up Meta CAPI via n8n
- [ ] Create same Custom Audiences as ReadyRide
- [ ] Create Special Ad Audiences
- [ ] Set up offline event tracking

### 2.2 Google Ads & Tracking Setup

**ReadyRide:**
- [ ] Get Google Ads account access (or create one)
- [ ] Install Google Tag Manager on readyride.ca (replace placeholder GTM-XXXXXXX with real container)
- [ ] Configure GTM conversion events:
  - VDP View (Vehicle Detail Page)
  - Lead Form Submit
  - Phone Call Click
  - Application Start
  - Application Complete
- [ ] Set up Google Merchant Center account
- [ ] Connect inventory feed to Google Merchant Center (VIN, make, model, year, price, image, URL)
  - Note: ReadyRide uses "Call for Price" -- need internal pricing for Merchant Center feed
- [ ] Link Google Ads to Merchant Center for Vehicle Listing Ads
- [ ] Set up Google Ads conversion tracking (import from GTM)

**ReadyCar:**
- [ ] Get Google Ads account access (or create one)
- [ ] Install Google Tag Manager on readycar.ca
- [ ] Configure same GTM conversion events
- [ ] Set up Google Merchant Center account
- [ ] Connect inventory feed
- [ ] Link Google Ads to Merchant Center
- [ ] Set up Google Ads conversion tracking

### 2.3 LeadsBridge Integration

- [ ] Set up LeadsBridge account (or use existing)
- [ ] ReadyRide: Connect Meta Lead Forms --> Activix CRM (real-time sync)
- [ ] ReadyRide: Connect Google Lead Forms --> Activix CRM (real-time sync)
- [ ] ReadyCar: Connect Meta Lead Forms --> Activix CRM
- [ ] ReadyCar: Connect Google Lead Forms --> Activix CRM
- [ ] Test: submit lead via Meta Lead Form --> verify appears in Activix within 10 seconds --> verify n8n picks it up --> verify AI response fires
- [ ] Test: same flow for Google Lead Forms

### 2.4 Creative Production

**ReadyRide (20 creatives minimum):**
- [ ] AdStellar/Zeely: Generate 10 static ad creatives from top 10 vehicles on readyride.ca
- [ ] Create 5 carousel ads (best inventory groupings: SUVs, sedans, trucks, under-$300/mo, newest arrivals)
- [ ] Create 3 video ads:
  - "Your Job Is Your Credit" (30s, empathy-first, show diverse families getting keys)
  - "New Arrivals This Week" (30s, inventory spotlight)
  - "Real Customer Story" (30s, testimonial -- use review content from Karri, Kristen, etc.)
- [ ] Create 2 retargeting ads:
  - Dynamic: show exact vehicle the person viewed
  - Static: "Still thinking about it? Your approval is waiting."
- [ ] All creatives must comply with Meta Special Ad Category: Credit
  - No income references in targeting (ok in ad copy)
  - No credit score numbers in ad copy (use "all credit welcome" instead)
  - Include OMVIC registration reference
- [ ] Ensure all ad copy uses empathetic tone matching ReadyRide brand (no ALL CAPS, no exclamation marks, no "BAD CREDIT???" screaming)

**ReadyCar (20 creatives minimum):**
- [ ] Repeat same creative production process for ReadyCar inventory and branding
- [ ] Ensure ReadyCar creatives are visually distinct from ReadyRide (different brand colors/logo)
- [ ] If cross-promotion is desired, create "sister dealership" referral creatives

### 2.5 Meta Campaign Build (Per Dealer)

All campaigns MUST be set to **Special Ad Category: Credit**.

**Campaign 1: Automotive Inventory Ads (AIA) -- 40% of budget**
- [ ] ReadyRide: Create AIA campaign targeting Ottawa + 50km radius (Special Ad Category minimum radius)
- [ ] ReadyCar: Create AIA campaign targeting Ottawa + 50km radius
- [ ] Connect inventory catalog to each campaign
- [ ] Set optimization: Conversions (Lead event)
- [ ] Budget: 40% of total Meta spend per dealer

**Campaign 2: Lead Gen (Facebook Lead Forms) -- 30% of budget**
- [ ] ReadyRide: Create Lead Gen campaign with instant form
  - Form fields: Name, Phone, Email, "What vehicle type are you looking for?"
  - Context card: "98% Approval Rate. 3-Minute Application. Your Job Is Your Credit."
  - Thank you screen: "A financing specialist will call you within 1 hour!"
- [ ] ReadyCar: Create Lead Gen campaign with instant form (same structure, different branding)
- [ ] Verify LeadsBridge is syncing form submissions to Activix in real-time
- [ ] Budget: 30% of total Meta spend per dealer

**Campaign 3: Retargeting -- 20% of budget**
- [ ] ReadyRide: Create retargeting campaign
  - Audience: Website visitors (7-day) who did NOT submit application
  - Audience: Application starters who did NOT complete
  - Creative: "Your approval is waiting" + dynamic inventory
- [ ] ReadyCar: Create retargeting campaign (same structure)
- [ ] Budget: 20% of total Meta spend per dealer

**Campaign 4: Video Views --> Retarget -- 10% of budget**
- [ ] ReadyRide: Create Video Views campaign with "Your Job Is Your Credit" and testimonial videos
- [ ] ReadyCar: Create Video Views campaign
- [ ] Create retargeting audience: people who watched 50%+ of video
- [ ] Retarget video viewers with Lead Gen or AIA campaigns
- [ ] Budget: 10% of total Meta spend per dealer

### 2.6 Google Campaign Build (Per Dealer)

**Campaign 1: Vehicle Listing Ads (VLAs)**
- [ ] ReadyRide: Create VLA campaign from Merchant Center feed
- [ ] ReadyCar: Create VLA campaign from Merchant Center feed
- [ ] Target: Ottawa + 100km radius
- [ ] These are highest-intent leads -- people actively searching for specific vehicles

**Campaign 2: Search Ads**
- [ ] ReadyRide: Create Search campaign
  - Ad groups: bad credit car loans ottawa, car financing ottawa, buy here pay here ottawa, second chance auto financing, no credit car dealership ottawa, used cars gloucester ontario
  - Subprime-specific keywords: "your job is your credit ottawa," "car loan after bankruptcy ottawa," "consumer proposal car loan ontario," "newcomer car loan ottawa," "no credit check car dealership ottawa"
  - Negative keywords: "new car," "luxury," "Tesla," "BMW" (filter out prime buyers who waste spend)
- [ ] ReadyCar: Create Search campaign (same keyword strategy, different ad copy with ReadyCar branding)
- [ ] Set bid strategy: Maximize Conversions (target CPA $25-50)

**Campaign 3: Performance Max (PMax)**
- [ ] ReadyRide: Create PMax campaign
  - Asset groups: inventory images, video ads, headlines, descriptions
  - Audience signals: in-market for vehicles, custom intent (subprime search terms)
  - Note: PMax auto-optimizes across Search, Display, YouTube, Gmail, Maps, Discover
- [ ] ReadyCar: Create PMax campaign (same structure)

### 2.7 Automation & Rules

- [ ] Set up Revealbot automation rules for both dealers:
  - Rule 1: PAUSE any ad set with CPA > $40 after $100 spend
  - Rule 2: INCREASE budget 20% on any ad set with CPA < $20 and 3+ conversions
  - Rule 3: ALERT if any campaign spends 50% of daily budget before noon with 0 conversions
  - Rule 4: PAUSE any ad creative with CTR < 0.5% after 1,000 impressions
- [ ] Set up automated daily spend alerts (email) for both dealers

### 2.8 Launch & Verify

- [ ] Launch all Meta campaigns for ReadyRide
- [ ] Launch all Meta campaigns for ReadyCar
- [ ] Launch all Google campaigns for ReadyRide
- [ ] Launch all Google campaigns for ReadyCar
- [ ] Verify end-to-end lead flow for EACH campaign type:
  - Meta AIA click --> readyride.ca --> application --> Activix --> n8n --> AI SMS/email --> Slack
  - Meta Lead Form submit --> LeadsBridge --> Activix --> n8n --> AI SMS/email --> Slack
  - Google VLA click --> readyride.ca --> application --> Activix --> n8n --> AI SMS/email --> Slack
  - Google Search click --> readyride.ca --> application --> Activix --> n8n --> AI SMS/email --> Slack
  - Repeat all flows for ReadyCar
- [ ] Confirm conversion tracking is firing for all events in both Meta and Google
- [ ] Send "Campaigns Live" report to both dealers with:
  - Campaign names and budgets
  - Dashboard access links
  - Expected timeline for first results (24-72 hours for initial data)
  - CPL targets: $15-25 Meta, $25-50 Google

---

## Phase 3: Optimization (Weeks 3-4 and Ongoing)

### 3.1 Daily Tasks (15 min per dealer)

- [ ] Check ad performance in Meta Ads Manager and Google Ads
- [ ] Verify Revealbot automations are running (winners scaling, losers pausing)
- [ ] Check n8n execution log for any failed workflows
- [ ] Check Slack channels for compliance alerts or stuck handoffs
- [ ] Verify Activix failover queue is empty
- [ ] Monitor response times (target: < 60 seconds for instant response)
- [ ] Review any new lead quality flags (off-topic, spam, duplicate)

### 3.2 Weekly Tasks (1 hour per dealer)

- [ ] Create 5 new ad creatives per dealer (prevent ad fatigue)
  - Rotate: new inventory arrivals, fresh testimonials, seasonal offers, "Your Job Is Your Credit" variations
- [ ] Review lead quality with dealer contact:
  - How many leads turned into appointments?
  - How many appointments showed?
  - Any lead quality issues? (wrong area, unqualified, spam)
  - Which vehicles are moving? Which are sitting?
- [ ] Update inventory feed (remove sold, add new arrivals)
- [ ] Review and adjust keyword bids on Google Search campaigns
- [ ] Post 3-5 organic social posts per dealer (use Predis.ai / Buffer)
- [ ] Check opt-out rate (alert if > 5% of leads opting out of SMS)
- [ ] Check handoff rate (target: 15-25% of engaged leads)
- [ ] Check cost per lead (target: < $0.15 per AI-handled lead for the Nexus system cost)

### 3.3 Monthly Tasks (2 hours per dealer)

- [ ] Generate full performance report for each dealer:
  - Total leads generated (by source: Meta, Google, Organic, Direct)
  - Cost per lead by campaign
  - Lead-to-appointment conversion rate
  - Appointment-to-sale conversion rate (need dealer data)
  - Total ad spend vs. gross profit (ROI calculation)
  - AI response metrics: avg response time, handoff rate, compliance rate
  - Top performing creatives and ad sets
  - Recommendations for next month
- [ ] Present report to dealer (call or in-person)
- [ ] Plan next month's campaigns and creative direction
- [ ] Request Google reviews from recent buyers (reputation management)
- [ ] Update Layer 3 config: current promotions, inventory highlights, seasonal messaging
- [ ] Review and adjust Revealbot rules based on accumulated data
- [ ] Audit CASL compliance: review all active sequences, opt-out handling, consent records

### 3.4 Subprime-Specific Optimization

- [ ] Track which credit situations convert best (bankruptcy vs. no credit vs. newcomer) -- adjust ad spend allocation
- [ ] A/B test "Your Job Is Your Credit" vs. "Everyone Gets Approved" vs. "Fresh Start Financing" messaging
- [ ] Test different application friction levels: Facebook Lead Form (low friction, lower quality) vs. website application (higher friction, higher quality)
- [ ] Monitor and compare ReadyRide vs. ReadyCar performance -- share winning strategies between dealers
- [ ] Track "Call for Price" vs. showing payment estimates in ads -- if ReadyCar is willing to show payments, compare lead quality
- [ ] Monitor seasonal subprime trends: tax refund season (Feb-Apr) is peak, increase budgets; summer is slower for credit-challenged buyers

---

## Key Contacts & Credentials Reference

| Item | ReadyRide | ReadyCar |
|---|---|---|
| Tenant ID | `readyride-ottawa` | `readycar-ottawa` |
| Activix API Token | _stored in n8n_ | _stored in n8n_ |
| Activix Webhook Secret | _stored in n8n_ | _stored in n8n_ |
| Twilio Number | +1613_________ | +1613_________ |
| SendGrid From Email | ___@readyride.ca | ___@readycar.ca |
| Meta Pixel ID | 3946664872263007 | TBD |
| GTM Container ID | TBD (replace placeholder) | TBD |
| Slack: Leads | #readyride-leads | #readycar-leads |
| Slack: Compliance | #readyride-compliance | #readycar-compliance |
| Slack: Handoffs | #readyride-handoffs | #readycar-handoffs |
| Meta Business Manager | TBD | TBD |
| Google Ads Account | TBD | TBD |
| Google Merchant Center | TBD | TBD |
| LeadsBridge | TBD | TBD |
| Revealbot | TBD | TBD |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Meta rejects ads under Special Ad Category: Credit | Pre-review all copy against Meta's credit advertising policies. No income/credit targeting. Use "all credit welcome" language. |
| ReadyRide's existing Pixel has stale data from old campaigns | Create new ad account if pixel data is polluted; or reset learning phase with new campaign structure. |
| Activix API rate limits (200/min, 2000/hr) shared across both dealers | Failover queue (Workflow 4) handles bursts. Monitor queue depth. |
| "Call for Price" kills Google VLA performance | Push client to provide pricing for Merchant Center feed even if hidden on website. VLAs require price. |
| CASL compliance gap if consent not properly tracked | Pre-flight check on every SMS/email. Audit consent records monthly. Block any lead without explicit opt-in. |
| Client expects instant ROI from subprime audience | Set expectations: subprime leads have longer sales cycles (7-14 days avg). Week 1 is data collection. Real optimization starts Week 3. |
| Cross-contamination between ReadyRide and ReadyCar leads | Strict tenant ID routing in all workflows. Dedicated Twilio numbers. Separate Slack channels. Test routing on every deployment. |

---

## Success Metrics (30/60/90 Day Targets)

| Metric | 30 Days | 60 Days | 90 Days |
|---|---|---|---|
| Leads per dealer per month | 75-100 | 150-200 | 200-300 |
| Cost per lead (Meta) | $20-30 | $15-25 | $12-20 |
| Cost per lead (Google) | $35-50 | $25-40 | $20-35 |
| AI response time (instant) | < 60s | < 45s | < 30s |
| Lead-to-appointment rate | 15-20% | 20-30% | 25-35% |
| Appointments per dealer/month | 12-20 | 30-60 | 50-100 |
| Cars sold per dealer/month | 5-8 | 10-20 | 15-25 |
| Dealer ROI | Breakeven | 200-300% | 350-500% |

Note: Subprime conversion rates are lower than prime but gross profit per unit is higher ($3-5K avg). The math works at scale.
