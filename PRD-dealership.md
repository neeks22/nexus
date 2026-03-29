# PRD — Dealership AI Workflow (n8n + Nexus + Activix)

> Ralph execution target. Each checkbox = one iteration.
> Design spec: docs/superpowers/specs/2026-03-28-dealership-n8n-workflow-design.md
> Research: docs/research/ and docs/agency/

---

## Epic 1: Activix CRM Client Library
- [x] Create `packages/nexus-activix/` package with tsconfig, package.json
- [x] Implement `ActivixClient` class — auth (Bearer token), base URL config, rate limit handling (200/min, 2000/hr)
- [x] Implement `leads.get(id)` — GET /v2/leads/:id with include parameter support
- [x] Implement `leads.list(filters)` — GET /v2/leads with pagination (page, per_page), division/date filters
- [x] Implement `leads.search(query)` — GET /v2/leads/search with auto-pagination (max 1000)
- [x] Implement `leads.create(data)` — POST /v2/leads with required `type` field, nested advisor/emails/phones/vehicles
- [x] Implement `leads.update(id, data)` — PUT /v2/leads/:id for result, rating, advisor, appointment_date, comment
- [x] Implement webhook signature verification — HMAC-SHA256 on raw body using X-Activix-Webhook-Signature header
- [x] Add Zod schemas for all Activix lead fields (core, contact, dates, vehicles, service, nested objects)
- [x] Add retry logic with exponential backoff (1s, 2s, 4s, 8s, max 30s) and circuit breaker integration
- [x] Write unit tests for ActivixClient (mock HTTP, verify headers, pagination, error handling, webhook verification)

## Epic 2: Compliance Pre-Flight Module
- [ ] Create `packages/nexus-compliance/` package
- [ ] Implement `ConsentTracker` — tracks consent_type (express/implied), consent_date, consent_expiry, consent_source per lead
- [ ] Implement CASL expiry enforcement — implied consent = 6 months from consent_date, express = until revoked
- [ ] Implement `OptOutChecker` — checks unsubscribe_sms_date, unsubscribe_email_date, unsubscribe_all_date from Activix lead
- [ ] Implement `FrequencyCapChecker` — max touches per lead per time window (configurable, default: 7 in 30 days)
- [ ] Implement `ContentValidator` — regex + LLM check for forbidden patterns: interest rates, monthly payments, financing terms, credit scores, insurance, negotiation language
- [ ] Implement `FeatureValidator` — cross-references vehicle features in AI output against inventory record, blocks unverified claims
- [ ] Implement `CompliancePreFlight` pipeline step — orchestrates all checkers, returns pass/fail with reason, logs result
- [ ] Ensure CompliancePreFlight is non-bypassable — integrated into Nexus PRE-FLIGHT step
- [ ] Add bilingual opt-out language templates (en-CA, fr-CA) appended to every outbound message
- [ ] Write unit tests for all compliance modules (consent expiry, opt-out detection, content validation, feature verification)

## Epic 3: Inventory Service
- [ ] Create `packages/nexus-inventory/` package
- [ ] Define `InventoryService` interface — `findMatching(query)`, `getVehicle(vin)`, `listAvailable(filters)`
- [ ] Implement `CsvInventoryProvider` — reads CSV file (VIN, make, model, year, trim, color, features[], MSRP, stock_status, days_on_lot)
- [ ] Implement vehicle matching logic — match lead's vehicle interest (make/model/year) to available inventory, return top 3 matches
- [ ] Add feature extraction — parse features[] field for AI to reference specific details (panoramic roof, AWD, leather seats, etc.)
- [ ] Add "based on current listings" qualifier helper — ensures AI output includes freshness disclaimer
- [ ] Write unit tests for CsvInventoryProvider (matching, empty results, partial matches, feature extraction)

## Epic 4: Language Detection & Message Templates
- [ ] Create `packages/nexus-i18n/` package
- [ ] Implement `LanguageDetector` — detect from Activix locale field, area code (Quebec: 418, 438, 450, 514, 579, 581, 819, 873), postal code (G, H, J prefixes)
- [ ] Implement `MessageTemplateRepository` — keyed by (template_id, locale, channel), loads from file system
- [ ] Create en-CA SMS templates: instant_response, touch_2_followup, touch_3_feature, touch_4_persistence, touch_5_value, touch_6_breakup, touch_7_monthly
- [ ] Create en-CA email templates: instant_response, touch_3_feature, touch_5_value, touch_7_monthly
- [ ] Create fr-CA SMS templates: mirror of en-CA (natural Quebec French, not machine translated)
- [ ] Create fr-CA email templates: mirror of en-CA
- [ ] Create handoff templates (en-CA + fr-CA): price_inquiry, objection, test_drive, financing, general_handoff
- [ ] Create opt-out confirmation templates (en-CA + fr-CA)
- [ ] Write unit tests for LanguageDetector (area codes, postal codes, locale field, fallback to en-CA)

## Epic 5: Lead Transcript (Shared State)
- [ ] Create `LeadTranscript` class extending Nexus immutable Transcript — shared across both workflows
- [ ] Add fields: lead_id, touch_number, channel (sms/email), intent_classification, compliance_check_result, handoff_event
- [ ] Implement `appendMessage(role, content, metadata)` — append-only, includes timestamp, channel, touch number
- [ ] Implement `appendHandoff(intent, confidence, rep_name)` — records handoff event with full context
- [ ] Implement `appendComplianceCheck(result, reason)` — records compliance pass/fail per message
- [ ] Implement `getSummary()` — generates human-readable conversation summary for handoff payload
- [ ] Implement persistence — store in Supabase table with lead_id index
- [ ] Write unit tests for LeadTranscript (immutability, append-only, summary generation, persistence)

## Epic 6: Intent Classification
- [ ] Create `IntentClassifier` in nexus-core or dedicated module
- [ ] Define intent enum: INFO_REQUEST, PRICE_INQUIRY, FINANCING_QUESTION, TRADE_IN_REQUEST, TEST_DRIVE_REQUEST, TIMELINE_MENTION, OBJECTION, FRUSTRATION, LEGAL_MENTION, HUMAN_REQUEST, NOT_INTERESTED
- [ ] Implement classification via Claude API call — input is latest customer message + conversation context, output is intent + confidence (0-1)
- [ ] Implement configurable handoff rules — JSON config file mapping intents to actions (handoff, continue, stop) with confidence thresholds
- [ ] Implement pre-approved objection templates — "I hear you — pricing is important. Let me connect you with [Rep] who can look at all the options including incentives."
- [ ] Write unit tests for IntentClassifier (mock API, test each intent type, confidence thresholds, edge cases)

## Epic 7: AI Agent — Instant Lead Response
- [ ] Create Nexus agent definition for instant lead response — system prompt with locale, inventory, dealership config, safety rails
- [ ] System prompt includes: customer first name, specific vehicle match, one inventory detail, soft CTA
- [ ] System prompt forbids: pricing negotiation, monthly payments, financing terms, interest rates, unverified features
- [ ] Implement personalization logic — reads lead data (name, vehicle interest, source) + inventory matches + locale
- [ ] Integrate with CompliancePreFlight — validate every outbound message before sending
- [ ] Integrate with FeatureValidator — cross-check mentioned features against inventory record
- [ ] Implement response generation with Nexus self-healing pipeline (PRE-FLIGHT → EXECUTE → VALIDATE → DIAGNOSE → RECOVER)
- [ ] Write unit tests (mock Claude API, verify personalization, compliance blocking, feature validation)

## Epic 8: AI Agent — Cold Lead Warming
- [ ] Create Nexus agent definition for cold lead warming — system prompt adapts by touch number (1-7+)
- [ ] Implement touch-aware tone: Touch 1-2 (enthusiastic), 3-5 (consultative), 6 (respectful close), 7+ (informational)
- [ ] Implement "never repeat same angle" logic — reads LeadTranscript to vary message strategy per touch
- [ ] Implement break-up message (touch 6) — "Looks like the timing might not be right — no worries, I'm here when you're ready"
- [ ] Implement monthly nurture (touch 7+) — new inventory arrivals matching lead interest, seasonal promotions
- [ ] Integrate with InventoryService — always reference specific vehicles, never generic
- [ ] Integrate with CompliancePreFlight — check consent expiry, opt-out, frequency cap before each touch
- [ ] Write unit tests (mock API, verify tone per touch, break-up message, inventory references, compliance blocking)

## Epic 9: n8n Workflow 1 — Instant Lead Response
- [ ] Create n8n workflow via MCP: Webhook trigger node (receives Activix webhook, POST)
- [ ] Add webhook signature verification node (HMAC-SHA256, X-Activix-Webhook-Signature)
- [ ] Add lead data parsing node — extract name, vehicles[], phones[], emails[], locale, source, type, advisor
- [ ] Add LanguageDetector node — determine en-CA or fr-CA
- [ ] Add InventoryService query node — find matching vehicles on lot
- [ ] Add Nexus AI Agent node (HTTP Request to Nexus API or inline code) — generate personalized response
- [ ] Add CompliancePreFlight node — validate before sending
- [ ] Add conditional: if compliance PASS → send, if FAIL → log and alert
- [ ] Add Twilio SMS send node — primary channel
- [ ] Add email send node (SendGrid/Twilio) — secondary channel
- [ ] Add Activix lead update node — PUT /v2/leads/:id with result="attempted", advisor assignment
- [ ] Add Slack notification node — alert assigned rep with lead summary
- [ ] Add error handling: dead letter queue (Supabase) for failed sends, retry logic, circuit breaker
- [ ] Validate workflow with n8n_validate_workflow before activation
- [ ] Test workflow end-to-end with n8n_test_workflow

## Epic 10: n8n Workflow 2 — Cold Lead Warming
- [ ] Create n8n workflow via MCP: Schedule trigger (daily, 9 AM)
- [ ] Add Activix lead query node — GET /v2/leads with filters: result=pending|attempted, division=new|used, exclude lost/invalid/duplicate, exclude unsubscribed
- [ ] Add touch tracking logic — determine which touch number each lead is on (store in Supabase or Activix comment)
- [ ] Add cadence filter — only process leads due for next touch (Day 2, 4, 7, 14, 30, 60+)
- [ ] Add loop node — iterate through qualifying leads
- [ ] Add LanguageDetector per lead
- [ ] Add InventoryService query per lead — fresh vehicle matches
- [ ] Add Nexus AI Agent node — generate touch-appropriate message with LeadTranscript context
- [ ] Add CompliancePreFlight per message
- [ ] Add Twilio SMS / email send (channel alternates per touch schedule)
- [ ] Add Activix lead update — update rating, comment with conversation summary
- [ ] Add LeadTranscript append — log outbound message with touch number
- [ ] Add error handling: skip failed leads (continue loop), log errors, circuit breaker for Activix
- [ ] Validate and test workflow

## Epic 11: n8n Workflow 3 — Inbound Reply Handler
- [ ] Create n8n workflow via MCP: Twilio webhook trigger (incoming SMS)
- [ ] Add lead lookup — match phone number to Activix lead via leads.search()
- [ ] Add LeadTranscript load — get full conversation history
- [ ] Add IntentClassifier node — classify reply intent + confidence
- [ ] Add conditional routing: handoff intents (>0.8 confidence) → handoff branch, info requests → AI response branch, NOT_INTERESTED → stop branch
- [ ] Handoff branch: generate handoff payload (transcript summary, intent, score, recommendation), send Slack alert to named rep, update Activix (rating=4-5, advisor assignment)
- [ ] AI response branch: generate contextual reply via Nexus agent, CompliancePreFlight, send via Twilio, update LeadTranscript
- [ ] Stop branch: respect NOT_INTERESTED, mark lead, stop warming sequence, send opt-out confirmation
- [ ] Add cadence reset — reply resets touch timer (don't send next touch immediately after a reply)
- [ ] Validate and test workflow

## Epic 12: n8n Workflow 4 — Activix Failover Queue
- [ ] Create n8n workflow via MCP: Schedule trigger (every 15 minutes)
- [ ] Create Supabase table: `activix_queue` (id, lead_data, operation, created_at, attempts, last_error, status)
- [ ] Add queue drain logic — fetch pending items, attempt Activix API call, mark success or increment attempts
- [ ] Add max retry logic — after 10 attempts, mark as failed, alert via Slack
- [ ] Add health check — if Activix is healthy (circuit breaker CLOSED), process queue; if OPEN, skip
- [ ] Validate and test workflow

## Epic 13: Three-Layer Prompt Architecture
- [ ] Create `packages/nexus-prompts/` package
- [ ] Layer 1 (git): base system prompts for instant response agent and cold warming agent — safety rails, conversation logic, compliance rules
- [ ] Layer 2 (database): per-tenant config schema — dealership_name, hours, staff[], address, phone, timezone, tone (professional/friendly/casual), escalation_numbers
- [ ] Layer 3 (database): client-editable config schema — active_promotions[], inventory_highlights[], blacklisted_topics[], custom_faq[], greeting_override
- [ ] Implement `PromptAssembler` — merges Layer 1 + Layer 2 + Layer 3 into final system prompt at runtime
- [ ] Implement input sanitization on Layer 3 — character limits, disallowed patterns, prompt injection protection
- [ ] Implement instruction hierarchy in Layer 1 — base prompt explicitly prioritizes Layer 1 rules over Layer 3 content
- [ ] Write unit tests (prompt assembly, sanitization, injection protection, layer override behavior)

## Epic 14: Cost Tracking
- [ ] Create Supabase table: `api_costs` (id, tenant_id, timestamp, model, input_tokens, output_tokens, cost_usd, operation_type)
- [ ] Implement cost logging middleware — wraps every Anthropic API call, logs tokens + cost with tenant_id
- [ ] Implement Twilio cost logging — log per-SMS and per-email cost with tenant_id
- [ ] Implement `getCostReport(tenantId, dateRange)` — returns total cost, cost per lead, cost per conversation, cost per appointment
- [ ] Write unit tests for cost tracking (logging accuracy, report generation)

## Epic 15: Client Dashboard (Retool/ToolJet)
- [ ] Set up ToolJet (self-hosted) or Retool instance
- [ ] View 1: Daily Summary — leads handled today, appointments booked, escalations, response time avg
- [ ] View 2: Conversation Browser — searchable list of all AI conversations, with AI responses highlighted, full transcript view
- [ ] View 3: Performance Trends — week-over-week charts: lead volume, reply rate, handoff rate, appointment rate
- [ ] View 4: Settings — client-editable Layer 3 config: promotions, inventory highlights, blacklisted topics, FAQ, hours
- [ ] Connect dashboard to Supabase (LeadTranscript, api_costs, activix_queue tables)
- [ ] Add auth — dealership staff login (one account per dealership)

## Epic 16: Observability & Alerting
- [ ] Set up LangFuse (self-hosted Docker) — trace every LLM call with tenant_id tag
- [ ] Integrate Nexus → LangFuse — pipe all agent executions (input, output, latency, tokens, errors) as traces
- [ ] Set up alerting: circuit breaker OPEN → Slack alert to ops channel
- [ ] Set up alerting: compliance check FAIL → Slack alert with message details
- [ ] Set up alerting: response time > 60 seconds → Slack alert
- [ ] Set up alerting: Activix API error rate > 10% → PagerDuty/Slack
- [ ] Create health dashboard — Activix API health, Twilio delivery rate, AI error rate, queue depth

## Epic 17: PII Protection
- [ ] Implement PII redaction in pino logger — redact phone numbers, emails, names from all application logs
- [ ] Ensure LeadTranscript stores PII only in encrypted Supabase columns (RLS enabled)
- [ ] Ensure error messages and stack traces never contain customer PII
- [ ] Add PII scan to CI — fail build if PII patterns found in log statements

## Epic 18: End-to-End Testing
- [ ] Test: new lead webhook → AI response sent in < 60 seconds
- [ ] Test: cold lead query → correct touch selected → message sent → LeadTranscript updated
- [ ] Test: inbound reply with PRICE_INQUIRY → handoff to rep with full payload
- [ ] Test: inbound reply with INFO_REQUEST → AI responds contextually
- [ ] Test: lead with unsubscribe_sms_date set → message blocked by CompliancePreFlight
- [ ] Test: expired implied consent (>6 months) → message blocked
- [ ] Test: AI mentions vehicle feature not in inventory → blocked by FeatureValidator
- [ ] Test: AI output contains "monthly payment" → blocked by ContentValidator
- [ ] Test: Activix API down → lead queued in Supabase → reconciled when API recovers
- [ ] Test: Quebec lead (514 area code) → French response generated
- [ ] Test: break-up message at touch 6 → correct template, correct tone
- [ ] Test: lead replies after touch 4 → cadence timer resets, no immediate next touch
- [ ] Test: full lifecycle — new lead → 7 touches → reply → handoff → appointment booked

## Epic 19: Documentation & Training
- [ ] Write dealership onboarding guide — how to set up their account, configure promotions, manage the dashboard
- [ ] Write internal runbook — how to deploy for a new dealership, configure Activix webhook, set up Twilio number
- [ ] Write troubleshooting guide — common issues (webhook not firing, SMS not delivering, AI response slow)
- [ ] Update docs/agency/n8n-setup-guide.md with dealership vertical section
