# Dealership AI Workflow — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Client vertical:** Automotive dealerships (Canadian market, Activix CRM)
**Scope:** Cold lead warming + Instant lead response via n8n + Nexus AI

---

## 1. Problem Statement

Car dealerships lose revenue because:
- **Slow response times**: Only 13% of dealers respond to web leads in under 5 minutes. 78% of consumers buy from the first responder.
- **Abandoned cold leads**: Most dealers follow up 1-2 times and stop. Research shows 5-8 touches are needed. 89% don't suggest alternative vehicles.
- **Expensive BDC teams**: Human BDC agents cost ~$5,700/month per person and only work business hours.
- **Integration chaos**: Average dealer runs 20+ overlapping systems with poor data flow between them.

## 2. Solution Overview

Two n8n workflows integrated with Activix CRM and powered by Nexus self-healing AI agents:

1. **Instant Lead Response** — Sub-60-second personalized response to every new web lead, 24/7
2. **Cold Lead Warming** — AI-driven 7-touch nurture sequence that warms cold leads and hands them to human reps when buying signals appear

### Value Proposition
- AI BDC: $300-1,500/mo vs human BDC: $5,700/mo per person
- $8-12 return per $1 spent, positive ROI in 30-90 days
- 24/7 coverage, bilingual (EN/FR), CASL compliant
- Built on Activix (840+ dealerships, 97% retention) — no CRM migration needed

## 3. Architecture

```
                         ┌──────────────────────┐
                         │     Lead Sources      │
                         │ AutoTrader, CarGurus,  │
                         │ OEM sites, Facebook,   │
                         │ Dealer website         │
                         └──────────┬─────────────┘
                                    │
                         ┌──────────▼─────────────┐
                         │     Activix CRM        │
                         │  (source of truth)      │
                         │  Webhook on new lead    │
                         └──────────┬─────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       n8n Orchestrator        │
                    │                               │
                    │  ┌─────────┐  ┌────────────┐  │
                    │  │Workflow │  │ Workflow    │  │
                    │  │1: Inst- │  │ 2: Cold    │  │
                    │  │ant Resp │  │ Lead Warm  │  │
                    │  └────┬────┘  └─────┬──────┘  │
                    │       │             │         │
                    │  ┌────▼─────────────▼──────┐  │
                    │  │   Shared Modules        │  │
                    │  │ CompliancePreFlight     │  │
                    │  │ LeadTranscript          │  │
                    │  │ InventoryService        │  │
                    │  │ MessageTemplateRepo     │  │
                    │  │ LanguageDetector        │  │
                    │  └─────────────────────────┘  │
                    └───────────────┬───────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                   │
        ┌────────▼──────┐  ┌───────▼───────┐  ┌───────▼───────┐
        │  Nexus AI     │  │   Twilio      │  │  Activix API  │
        │  Agent        │  │  SMS + Email  │  │  Lead Update  │
        │  (Claude)     │  │              │  │               │
        └───────────────┘  └──────────────┘  └───────────────┘
```

### Shared Modules

| Module | Purpose | Bypassable? |
|--------|---------|-------------|
| **CompliancePreFlight** | CASL consent check, opt-out check, frequency cap, content validation, no financial language | NO — mandatory pipeline step |
| **LeadTranscript** | Immutable append-only conversation log shared across both workflows | N/A — data layer |
| **InventoryService** | Interface for vehicle data. v1: nightly CSV cache. v2: live DMS API | N/A — data layer |
| **MessageTemplateRepository** | Templates keyed by `(template_id, locale, channel)`. Supports `en-CA` and `fr-CA` | N/A — data layer |
| **LanguageDetector** | Detects language from first inbound message. French-first for Quebec (area code/postal code) | N/A — utility |

## 4. Workflow 1: Instant Lead Response

### Trigger
Activix webhook fires on new lead creation (types: `email`, `phone`, `web_order`, `sms`)

### Flow
```
Activix Webhook (new lead)
    │
    ▼
Parse lead data (name, vehicle interest, source, locale, phones[], emails[])
    │
    ▼
LanguageDetector → set locale (fr-CA if Quebec area code/postal, else en-CA)
    │
    ▼
InventoryService.findMatching(vehicle interest) → matching vehicles on lot
    │
    ▼
Nexus AI Agent: generate personalized response
  - System prompt includes: locale, inventory matches, dealership name, rep name
  - MUST include: customer first name, specific vehicle, one concrete detail from inventory, soft CTA
  - MUST NOT include: pricing negotiation, monthly payments, financing terms, interest rates
    │
    ▼
CompliancePreFlight
  - Consent valid? (implied from form submission, 6-month window)
  - Opt-out not set? (check unsubscribe_sms_date, unsubscribe_email_date)
  - Content passes validation? (no financial language, no unverified features)
  - Feature claims match inventory record?
    │
    ▼
[PASS] → Send via Twilio (SMS primary, email secondary)
[FAIL] → Log tombstone event, alert dealership, do NOT send
    │
    ▼
Update Activix lead:
  - result: "attempted"
  - Set advisor (named rep assignment)
  - Append to communications[]
    │
    ▼
Notify assigned advisor via Slack with lead summary
    │
    ▼
Enter 7-touch sequence (managed by Workflow 2's scheduler)
```

### Target Performance
- **Response time:** < 60 seconds from webhook to customer receiving message
- **Personalization:** Customer name + specific vehicle + inventory detail + CTA

### Example AI Output (English)
> "Hi Sarah! Thanks for your interest in the 2024 CR-V EX-L. We've got one in Platinum White with the panoramic roof — it's been really popular. Would you like to schedule a test drive this week? I can set something up with Alex on our sales team."

### Example AI Output (French)
> "Bonjour Sarah! Merci pour votre interet pour le CR-V EX-L 2024. Nous en avons un en Blanc Platine avec le toit panoramique — c'est un modele tres populaire. Aimeriez-vous planifier un essai routier cette semaine? Je peux organiser un rendez-vous avec Alex de notre equipe des ventes."

## 5. Workflow 2: Cold Lead Warming

### Trigger
n8n cron schedule (daily, 9 AM local time)

### Lead Selection
Query Activix API: `GET /v2/leads` with filters:
- `result` = `pending` OR `attempted`
- `updated_at` older than configured interval for current touch
- `division` = `new` OR `used`
- Exclude: `status` = `invalid` OR `duplicate` OR `lost`
- Exclude: any `unsubscribe_*_date` set

### 7-Touch Cadence

| Touch | Day | Channel | Message Strategy | Goal |
|-------|-----|---------|-----------------|------|
| 1 | 0 | SMS + Email | Instant response with vehicle match (Workflow 1) | First contact, qualify |
| 2 | 2 | SMS | "Just following up — did you get a chance to look at [vehicle]?" | Re-engage |
| 3 | 4 | Email | Different angle: specific feature highlight, current promotion, or seasonal hook | Add value |
| 4 | 7 | SMS | "Just wanted to make sure you saw my note about the [vehicle]" | Persistence |
| 5 | 14 | Email | Value-add: new arrivals that match interest, market update | Demonstrate expertise |
| 6 | 30 | SMS | **Break-up message**: "Looks like the timing might not be right — no worries, I'm here when you're ready" | Trigger loss aversion (15-20% reply rate) |
| 7 | 60+ | Email | Monthly nurture: new inventory, seasonal promotions | Stay top of mind |

### AI Agent Behavior Per Touch
- Reads full `LeadTranscript` for context
- Knows which touch number this is
- Adapts tone: Touch 1-2 (enthusiastic), Touch 3-5 (helpful/consultative), Touch 6 (respectful close), Touch 7+ (informational)
- Always references specific vehicles from `InventoryService`
- Never repeats the same message angle

### Lead Reply Handling
When a lead replies at any point:
1. AI classifies intent against: `INFO_REQUEST`, `PRICE_INQUIRY`, `FINANCING_QUESTION`, `TRADE_IN_REQUEST`, `TEST_DRIVE_REQUEST`, `TIMELINE_MENTION`, `OBJECTION`, `FRUSTRATION`, `LEGAL_MENTION`, `HUMAN_REQUEST`, `NOT_INTERESTED`
2. Handoff intents (confidence > 0.8) route to human rep immediately
3. Non-handoff intents: AI continues conversation, appends to `LeadTranscript`
4. Reply resets the cadence timer (don't send touch 3 the day after they replied to touch 2)

## 6. AI-to-Human Handoff

### Handoff Triggers (configurable rules on intent labels)

| Intent | Action |
|--------|--------|
| `PRICE_INQUIRY` | Handoff — AI acknowledges, connects to named rep |
| `FINANCING_QUESTION` | Handoff — regulated territory, immediate transfer |
| `TRADE_IN_REQUEST` | Handoff — requires human appraisal |
| `TEST_DRIVE_REQUEST` | Handoff — book via Activix `appointment_date`, notify rep |
| `TIMELINE_MENTION` | Handoff — buying signal ("this month", "this weekend") |
| `OBJECTION` | Handoff — AI uses pre-approved template: "I hear you — pricing is important. Let me connect you with [Rep] who can look at all the options including incentives." |
| `FRUSTRATION` | Handoff — immediate escalation to manager |
| `LEGAL_MENTION` | Handoff — warranty, lemon law, accident history |
| `HUMAN_REQUEST` | Handoff — customer explicitly asks |
| `NOT_INTERESTED` | Respect it — mark lead, stop sequence |
| `INFO_REQUEST` | AI handles — hours, directions, trim info, features |

### Handoff Payload to Rep (via Slack + Activix)
- Customer name and contact info
- Vehicle(s) of interest
- Full conversation transcript summary
- AI-classified intent and confidence
- Lead score and engagement history
- Recommended next action

## 7. Activix CRM Integration

### API Details
- **Base URL:** `https://api.crm.activix.ca/v2`
- **Auth:** Bearer token
- **Rate limit:** 200 req/min, 2,000/hr
- **Format:** JSON, ISO 8601 timestamps, TLS 1.2

### Endpoints Used

| Operation | Method | Endpoint | Purpose |
|-----------|--------|----------|---------|
| Get lead | GET | `/v2/leads/:id` | Fetch lead details on webhook |
| List leads | GET | `/v2/leads?filter[...]` | Cold lead warming batch query |
| Search leads | GET | `/v2/leads/search?query=` | Dedup check |
| Update lead | PUT | `/v2/leads/:id` | Update result, advisor, dates |
| Create lead | POST | `/v2/leads` | Fallback if webhook misses |

### Key Fields We Read
- `first_name`, `last_name`, `locale`, `type`, `source`
- `phones[]`, `emails[]`, `vehicles[]` (make, model, year, type)
- `result`, `status`, `division`, `segment`, `rating`
- `unsubscribe_sms_date`, `unsubscribe_email_date`, `unsubscribe_all_date`
- `appointment_date`, `advisor`, `communications[]`

### Key Fields We Write
- `result` → update to `"attempted"` or `"reached"`
- `rating` → set 1-5 based on AI engagement scoring
- `appointment_date` → when test drive booked
- `advisor` → assign named rep on handoff
- `phones[]`, `emails[]` → append-only if new contact info discovered
- `comment` → AI conversation summary

### Webhook Configuration
- Activix fires webhook on lead creation/update
- **Verification:** HMAC-SHA256 signature in `X-Activix-Webhook-Signature` header
- **Our endpoint:** n8n webhook URL (HTTPS required)

## 8. Self-Healing & Resilience

### Nexus Pipeline (every AI call)
```
PRE-FLIGHT → EXECUTE → VALIDATE → [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH
```

### Activix API Failure Handling
- **Error classification:** `api_timeout`, `server_error`, `rate_limit`, `auth_error`
- **Strategy:** Exponential backoff (1s, 2s, 4s, 8s, max 30s)
- **Circuit breaker:** CLOSED → OPEN (3 failures) → HALF_OPEN (60s test) → CLOSED or re-OPEN
- **Fallback queue:** Supabase table with RLS and encryption-at-rest
- **Reconciliation:** Separate n8n workflow runs every 15 min, drains queue when Activix recovers
- **Critical rule:** Customer ALWAYS gets instant response regardless of CRM status. CRM sync is async.

### Health Monitoring
- Activix integration agent has its own health score
- Dashboard shows: lead volume, response time, handoff rate, API health, consent compliance rate
- Alert to dealership manager after 3 consecutive API failures

## 9. CASL Compliance

### Consent Tracking
Every lead record includes:
- `consent_type`: `express` or `implied`
- `consent_date`: ISO timestamp
- `consent_expiry`: 6 months from `consent_date` for implied consent
- `consent_source`: form URL, phone call ID, or manual entry

### Rules (enforced by CompliancePreFlight)
1. **Implied consent** from form submission = 6-month window. After 6 months with no engagement, STOP.
2. **Express consent** = valid until revoked
3. Every message includes: sender identity (dealership name), contact info, functional unsubscribe
4. SMS: Twilio handles STOP keyword automatically
5. Email: unsubscribe link honored immediately
6. Opt-out processed instantly (CASL requires within 10 business days — we do it in seconds)
7. Quebec (Bill 96): French-first for all initial outreach. Customer can opt for English.

### Content Validation
- No interest rates, monthly payments, financing terms, credit scores, insurance
- No vehicle features not explicitly in inventory data
- No availability guarantees ("based on current listings" qualifier)
- MSRP only with "plus applicable taxes, fees, and charges" disclaimer
- Objection acknowledgments use pre-approved templates only

### Audit Trail
- Full conversation transcripts retained 2 years
- Compliance check results logged per message
- Consent records retained 3 years after last communication
- PII redacted from all application logs (pino PII redaction)

## 10. Bilingual Support

### Language Detection
1. Check Activix `locale` field
2. If not set: check area code / postal code against Quebec/NB list
3. If Quebec/NB: French-first
4. If customer replies in other language: switch immediately
5. Store detected language in Activix lead record

### Template Structure
```
MessageTemplateRepository
├── en-CA/
│   ├── instant_response.sms
│   ├── instant_response.email
│   ├── touch_2_followup.sms
│   ├── touch_3_feature_highlight.email
│   ├── touch_4_persistence.sms
│   ├── touch_5_value_add.email
│   ├── touch_6_breakup.sms
│   ├── touch_7_monthly.email
│   ├── handoff_price.sms
│   ├── handoff_objection.sms
│   └── opt_out_confirmation.sms
└── fr-CA/
    └── (mirror of en-CA, native-reviewed)
```

### Requirements
- All templates reviewed by native French speaker before launch
- Legal disclosures in both languages
- AI system prompt includes language directive when generating non-template messages
- No machine-translated French — must be natural Quebec French

## 11. Inventory Integration

### v1: Nightly CSV Cache
- Dealership exports inventory nightly (or DMS provides automated export)
- CSV ingested into Supabase table or n8n static data
- Fields: VIN, make, model, year, trim, color, features[], MSRP, stock status, days on lot
- Refreshed daily at midnight

### v2: Live DMS API (future)
- `InventoryService` interface allows swapping `CsvInventoryProvider` → `DmsApiInventoryProvider`
- Agent code unchanged — only the data source changes

### AI Usage
- AI matches lead's vehicle interest to inventory
- References specific vehicles: "We have a 2024 Civic Sport in Rallye Red"
- Mentions 1-2 features from the record
- VALIDATE step cross-checks: any feature mentioned must exist in the inventory record
- Always qualifies: "based on our current listings"

## 12. Technology Stack

| Component | Technology |
|-----------|-----------|
| Workflow orchestration | n8n (cloud or self-hosted) |
| AI agent | Nexus framework → Claude API |
| CRM | Activix CRM API v2 |
| SMS/Email | Twilio (SMS) + SendGrid or Twilio (email) |
| Notifications | Slack API |
| Fallback queue | Supabase (with RLS) |
| Inventory cache | Supabase table |
| Language detection | Claude (lightweight call) or heuristic |
| Monitoring | n8n execution logs + custom health dashboard |

## 13. Implementation Timeline

### Week 1: Instant Lead Response
- [ ] Activix webhook → n8n endpoint setup
- [ ] Webhook signature verification (HMAC-SHA256)
- [ ] Lead data parsing and language detection
- [ ] InventoryService with CSV provider
- [ ] Nexus AI agent: instant response generation
- [ ] CompliancePreFlight module
- [ ] Twilio SMS + email sending
- [ ] Activix lead update (result, advisor)
- [ ] Slack notification to assigned rep
- [ ] Error handling and circuit breaker for Activix API

### Week 2: Cold Lead Warming + Handoff
- [ ] Daily cron trigger with Activix lead filtering
- [ ] 7-touch cadence logic with touch tracking
- [ ] AI agent: context-aware message generation per touch
- [ ] Intent classification on lead replies
- [ ] Handoff routing with configurable rules
- [ ] Handoff payload assembly (transcript, score, recommendation)
- [ ] Break-up message (touch 6) implementation
- [ ] Monthly nurture (touch 7+) implementation
- [ ] Supabase fallback queue + reconciliation workflow
- [ ] LeadTranscript shared state across workflows

### Week 3: Polish, Compliance, Launch
- [ ] Native French template review and corrections
- [ ] CASL consent tracking with expiry enforcement
- [ ] PII redaction in all logs
- [ ] Load testing Activix API integration + failover
- [ ] End-to-end testing: full lead lifecycle
- [ ] Health monitoring dashboard
- [ ] Dealership staff training documentation
- [ ] Go-live with single dealership pilot

## 14. Success Metrics

| Metric | Target | Industry Avg |
|--------|--------|-------------|
| Response time (new leads) | < 60 seconds | 15-47 minutes |
| Lead reply rate | > 25% | 10-15% |
| Cold lead re-engagement rate | > 15% | 3-5% |
| Handoff-to-appointment rate | > 40% | 20-25% |
| CASL compliance | 100% | Variable |
| System uptime | 99.5% | N/A |
| Cost per lead handled | < $2 | $15-25 (human BDC) |

## 15. Pricing Model

- **Build fee:** $15,000-35,000 (setup, customization, integration, training)
- **Monthly retainer:** $2,000-5,000 (monitoring, optimization, AI costs, support)
- **ROI pitch:** Replaces 1-2 BDC reps ($5,700/mo each), 24/7 coverage, bilingual, CASL compliant
- **Break-even:** Month 1-2 for the dealership

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AI hallucination (wrong vehicle features) | Legal liability | VALIDATE step cross-checks against inventory record |
| CASL violation | $10M fine | CompliancePreFlight is mandatory, non-bypassable |
| Activix API downtime | Lost leads | Circuit breaker + Supabase queue + async CRM sync |
| AI quotes unauthorized price | Margin erosion, legal | Content validation blocks financial language |
| Stale inventory data | Customer frustration | "Based on current listings" qualifier, nightly refresh |
| French translation quality | Brand damage | Native speaker review, no machine translation |
| Lead in both workflows | Duplicate messages | LeadTranscript tracks state, dedup logic in both workflows |
| Twilio delivery failure | Missed touchpoint | Retry logic, fallback to email if SMS fails |

---

**Next step:** Write PRD with discrete checkable items → Run Ralph for autonomous execution.
