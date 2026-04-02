# PROJECT MEMORY
> Last updated: 2026-04-01 17:00 PDT
> Updated by: Claude (context recovery session)

## PROJECT IDENTITY
- **Name**: Nexus
- **One-line description**: Self-healing multi-agent AI framework powering an agency that sells dealership lead gen automation
- **Tech stack**: TypeScript (strict), Next.js 13+, React, Node.js 22+, Supabase (PostgreSQL + RLS), Twilio (SMS), Gmail SMTP (email), Anthropic Claude API, n8n Cloud (workflow automation), Vercel (hosting), Vitest (testing), Zod (validation), Pino (logging)
- **Current phase**: Building — framework complete, dealership vertical 90% code-complete, first client onboarding in progress

## MASTER BLUEPRINT

Nexus is two things:

1. **Framework** (`packages/nexus-core`): Open-source TypeScript library for self-healing multi-agent orchestration. Every API call goes through PRE-FLIGHT -> EXECUTE -> VALIDATE -> DIAGNOSE -> RECOVER -> RETRY -> UPDATE HEALTH. Immutable transcript, circuit breakers, tombstones.

2. **Agency** (`apps/website` + `packages/*` + `workflows/`): AI agency selling automation to businesses. First vertical = subprime/used car dealerships in Ottawa/Ontario. The dealership product captures leads from Meta/Google ads, responds in <60 seconds via AI, warms cold leads on a 7-touch cadence, classifies inbound replies by intent, hands off hot leads to sales reps, and tracks everything in a CRM inbox.

### System Architecture

```
[Meta/Google Ads] -> [Landing Page Funnel] -> [Supabase DB]
                                                    |
                                               [n8n Workflows]
                                                    |
                            +-------+-------+-------+-------+
                            |       |       |       |       |
                     [Instant   [Cold    [Reply   [CAPI   [Failover
                      Response]  Warming] Handler] Track]  Queue]
                            |       |       |
                     [Nexus AI Agents: instant-response, cold-warming]
                            |       |       |
                     [Compliance PreFlight: CASL, content, features]
                            |       |       |
                     [Twilio SMS] [Gmail Email] [Slack Alerts]
                            |
                     [CRM Inbox] <- [Password-gated admin panel]
```

### Directory Structure

```
nexus/
  apps/
    website/           # Next.js app: landing pages, funnel, API routes, CRM inbox (12,214 lines)
    dashboard/         # Separate Next.js dashboard app (legacy, being replaced by website CRM)
    debate-arena/      # Demo: 5-agent debate with self-healing
    code-review-team/  # Demo: 3+1 agent code review
    roi-calculator/    # Client ROI calculator
  packages/
    nexus-core/        # Framework: Agent, Team, Graph, Transcript, SelfHealingEngine
    nexus-agents/      # Dealership agents: instant-response, cold-warming, funnel, ad-copy, service-bdc, voice-receptionist
    nexus-activix/     # Activix CRM client library (REST API wrapper)
    nexus-billing/     # Cost tracking per tenant (API + Twilio costs)
    nexus-cli/         # CLI: nexus run, nexus health, nexus init
    nexus-compliance/  # CASL compliance: consent, opt-out, frequency cap, content/feature validation
    nexus-control/     # Agent registry and presets
    nexus-crm/         # CRM factory (Activix/GHL abstraction)
    nexus-dashboard/   # Dashboard data provider
    nexus-i18n/        # Language detection (en-CA/fr-CA) + message templates
    nexus-intent/      # Intent classification, BANT scoring, handoff rules, objection templates
    nexus-inventory/   # Vehicle inventory: CSV provider, matching, feature extraction
    nexus-observability/ # Tracing, alerting, health dashboard
    nexus-pii/         # PII redaction for logs
    nexus-prompts/     # 3-layer prompt assembly (git + DB tenant + DB client config)
    nexus-transcript/  # LeadTranscript: append-only conversation history per lead
  workflows/           # n8n workflow JSON files (7 workflows)
  supabase/            # SQL migrations (9 tables + RLS + triggers)
  config/              # Tenant configs (readycar, readyride), GTM templates, Retell voice configs, agent presets
  docs/                # 60 files: agency sales materials, research, campaigns, security, architecture
  tests/               # Unit + E2E tests (11,872 lines)
  scripts/             # Outreach campaign scripts, Ralph automation
  .claude/             # 32 agents, 6 commands, 5 rules
```

### Data Flow

1. **Lead capture**: User fills 7-step funnel at /apply/dealerships -> POST /api/funnel-lead -> Zod validation + rate limiting + injection blocking -> Supabase `funnel_submissions` -> Forward to n8n webhook
2. **Instant response**: n8n receives lead -> Nexus AI agent generates personalized SMS/email -> CompliancePreFlight validates -> Twilio sends SMS, Gmail sends email -> Log to `lead_transcripts`
3. **Cold warming**: n8n daily cron at 9 AM -> Query leads due for next touch -> AI generates touch-appropriate message -> Send + log
4. **Inbound reply**: Customer replies via SMS -> Twilio webhook -> /api/webhook/sms -> Intent classification -> Route to AI response, rep handoff, or opt-out stop
5. **CRM inbox**: Admin logs in at /inbox/dealerships -> Views conversations, lead profiles, pipeline stages -> Updates status, adds notes
6. **Ad tracking**: Meta CAPI events fired server-side for conversion optimization

## WHAT HAS BEEN BUILT (COMPLETED)

### Framework (nexus-core)
1. Agent, Team, Graph, Transcript (immutable, append-only)
2. Full self-healing pipeline: CircuitBreaker, HealthTracker, ErrorTaxonomy (15+ types), RecoveryStrategies, ReflectionLoop (cap 2), OutputValidator
3. AnthropicProvider with prompt caching + pre-flight token counting
4. Cost ceiling ($5/run)
5. 159 unit tests passing
6. CLI: `nexus run debate`, `nexus health`, `nexus init`, `--dry-run`

### Dealership Packages (16 packages, 22,504 lines)
7. nexus-activix: Full Activix CRM client (CRUD, search, webhook verification, retry + circuit breaker)
8. nexus-compliance: ConsentTracker, OptOutChecker, FrequencyCapChecker, ContentValidator, FeatureValidator, CompliancePreFlight
9. nexus-inventory: CsvInventoryProvider, vehicle matching, feature extraction
10. nexus-i18n: LanguageDetector (area code, postal, locale), MessageTemplateRepository, en-CA + fr-CA templates
11. nexus-transcript: LeadTranscript (immutable, append-only, Supabase persistence)
12. nexus-intent: IntentClassifier (11 intents), BANT scorer, handoff rules, objection templates
13. nexus-agents: 6 agent definitions (instant-response, cold-warming, funnel, ad-copy, service-bdc, voice-receptionist)
14. nexus-prompts: 3-layer PromptAssembler (git + tenant DB + client DB), injection protection
15. nexus-billing: Cost logger, reporter, store (per-tenant API + Twilio costs)
16. nexus-observability: Trace logger, alert engine, health dashboard
17. nexus-pii: PII redactor for pino logs
18. nexus-crm: CRM factory (Activix/GHL abstraction)
19. nexus-control: Agent registry, presets

### Website (apps/website, 12,214 lines, deployed to Vercel)
20. Landing page (nexusagents.ca) with agency pitch
21. 7-step dealership application funnel (/apply/dealerships) — vehicle type, employment, income, credit, trade-in, contact, CASL consent
22. Real car images on step 1, real lender logos (CIBC, TD, iA Financial)
23. Secured API routes: /api/funnel-lead (rate limited, Zod validated, injection blocked), /api/leads (CRUD), /api/webhook/sms (Twilio inbound), /api/auth (password gate)
24. CRM inbox (/inbox/dealerships) with conversation viewer, lead profiles, pipeline stages, activity timeline
25. AI SMS agent: responds to leads via Claude API + Twilio, promotes delivery model, handoff detection
26. AI Email agent: replies via Gmail SMTP directly (no n8n dependency)
27. ReadyCar branded landing page (/readycar)
28. ReadyRide branded landing page (/readyride)
29. About, Services, Pricing, Case Studies, Contact, Privacy pages

### n8n Workflows (7 workflow JSON files)
30. instant-lead-response.json — Webhook -> AI response -> SMS/email -> CRM update
31. cold-lead-warming.json — Daily cron -> query leads -> AI message -> send
32. inbound-reply-handler.json — Twilio webhook -> intent classify -> route
33. ad-lead-capture.json — Meta/Google lead form webhook -> normalize -> dedup -> CRM create -> instant response trigger
34. meta-capi-tracking.json — Server-side conversion events to Meta
35. activix-failover-queue.json — 15-min retry queue for failed CRM calls
36. service-department-handler.json — Service appointment workflow

### Database (Supabase)
37. 9 tables: consent_records, lead_transcripts, api_costs, twilio_costs, failover_queue, funnel_submissions, agent_toggles, trace_logs, tenant_configs
38. RLS enabled on all tables
39. Additional migrations: PII encryption, tenant isolation

### Documentation (60 files, 22,297 lines)
40. Full architecture docs (ARCHITECTURE.md, SELF-HEALING.md, QUICKSTART.md)
41. Agency sales materials: proposal template, SOW, outreach emails (CASL compliant), pricing guide, case study template, welcome email, expansion playbook
42. Research: Activix CRM, dealership AI landscape, Canadian auto Facebook ads, Twilio alternatives, Retell AI voice, self-healing agents
43. Campaign docs: ReadyRide/ReadyCar Meta + Google campaigns, week 1 social calendar
44. Security: PII encryption guide, security hardening checklist
45. 90-day content system with 38 copy-paste templates (1,704 lines)
46. Lead gen playbook with $5K/month budget split (511 lines)
47. API blueprint for Meta Marketing API + Google Ads API (500+ lines)

### Operational
48. 32 Claude agents for various tasks (research, sales, compliance, testing, etc.)
49. 6 slash commands (/audit, /prospect, /propose, /deploy, /report, /healthcheck)
50. Outreach campaign script (scripts/outreach-campaign-apr1.js) — 33 leads imported + contacted
51. Gmail Apps Script for email webhook forwarding (docs/gmail-apps-script.js)

## WHAT IS IN PROGRESS (CURRENT SPRINT)

1. **First client lead gen launch** — Getting real leads flowing for first dealership client
2. **Uncommitted changes**: middleware.ts, leads API route, SMS webhook processing, LeadDetailPanel, gmail apps script, .gitignore updates
3. **Untracked files**: vercel.json, outreach campaign script, API blueprint doc, code quality audit, content system doc, lead gen playbook

## WHAT HASN'T BEEN BUILT YET (BACKLOG)

1. **n8n workflow E2E testing** — All 7 workflows created but not tested end-to-end with real data (PRD Epic 9-12, 20-21 have unchecked test items)
2. **Meta/Google ad campaign creation** — API blueprint exists but no code to programmatically create campaigns, sync inventory feeds, or pull performance reports
3. **LeadsBridge / direct webhook configuration** — Ad platforms not yet pointed at /webhook/ad-lead
4. **PII encryption in Supabase** — Migration written but not verified (PRD Epic 17: encrypted columns, error message PII scan)
5. **Activix API failover E2E test** — PRD Epic 18: test that leads queue when Activix is down
6. **Public case studies / social proof** — No real client results to publish yet
7. **Dashboard auth hardening** — Currently password-gated, needs proper auth before showing to clients
8. **Inventory CSV upload handler** — CsvInventoryProvider exists but no endpoint to upload/refresh inventory
9. **Meta CAPI production testing** — Requires META_PIXEL_ID and META_ACCESS_TOKEN configured
10. **Voice receptionist** — Agent definition exists (nexus-agents/voice-receptionist-agent.ts) but Retell AI integration not wired

## KEY DECISIONS ALREADY MADE

1. **Transcript is immutable (append-only)** — No shared mutable state between agents. Non-negotiable.
2. **Team + Graph dual layer** — Team for ergonomic API, Graph for topology control
3. **Step.tombstone mandatory** — Every permanent failure emits a structured Tombstone
4. **ReflectionLoop cap = 2** — Emits tombstone on breach, no silent passthrough
5. **Prompt caching is architectural** — Not optional optimization. 10x cost savings.
6. **All thresholds are named constants** — Single config file, no magic numbers
7. **Error taxonomy split** — Infrastructure (retry/backoff) vs Output quality (reprompt/reflect)
8. **CompliancePreFlight is non-bypassable** — Integrated into Nexus PRE-FLIGHT step
9. **CASL compliance required** — All outbound messages include unsubscribe, implied consent = 6 months
10. **Delivery model, not dealership visits** — AI agents promote bringing the car to the customer
11. **Multi-tenant by tenant_id** — All tables scoped by tenant_id, RLS enforced
12. **n8n replaced for SMS/email** — Email agent runs directly in Next.js (no n8n for core messaging). n8n used for workflow orchestration, CAPI, failover.
13. **ReadyCar brand** — First client brand. Password: stored in env var, not hardcoded.
14. **Supabase for persistence** — All lead data, transcripts, costs, configs in Supabase
15. **Vercel for hosting** — Website deployed at nexusagents.ca via Vercel

## KNOWN ISSUES & BUGS

1. **Contact form saves to localStorage** — TODO comment in ContactForm.tsx: needs real endpoint (agency leads, not dealership)
2. **Proposal template has blank dollar amounts** — Must fill before sending to prospects
3. **Welcome email has 3 placeholder links** — Dead links on client onboarding
4. **Retainer price mismatch** — Inconsistency between pricing guide and expansion playbook
5. **Uncommitted changes** — Several modified files not yet committed (middleware, leads API, SMS webhook, LeadDetailPanel)

## EXTERNAL DEPENDENCIES & INTEGRATIONS

1. **Anthropic Claude API** — AI agent responses (claude-sonnet model)
2. **Supabase** — Database (PostgreSQL), RLS, storage
3. **Twilio** — Inbound/outbound SMS
4. **Gmail SMTP** — Outbound email (app password auth)
5. **Vercel** — Website hosting (nexusagents.ca)
6. **n8n Cloud** — Workflow automation (nexusagents.app.n8n.cloud)
7. **Meta Marketing API** — Ad campaigns, CAPI tracking (planned)
8. **Google Ads API** — Search + PMax campaigns (planned)
9. **Activix CRM** — Dealership CRM integration (client library built, not yet connected to real instance)
10. **GoHighLevel (GHL)** — Alternative CRM option (factory pattern supports both)
11. **GoDaddy** — Domain registration (nexusagents.ca)
12. **GitHub** — Source code (github.com/neeks22/nexus, 114 commits)

## ENVIRONMENT & CONFIG

- **Dev**: `cd apps/website && npm run dev` (localhost:3000)
- **Build**: `cd apps/website && npm run build`
- **Deploy**: `cd apps/website && vercel --yes --prod`
- **Tests**: `npx vitest run` (from root)
- **Debate demo**: `npx tsx apps/debate-arena/src/index.ts "topic" --dry-run`
- **Env vars needed**: See .env.example (Anthropic API key, Supabase URL/key, Twilio SID/token/phone, Gmail SMTP creds, n8n webhook URLs, admin password)
- **Website**: nexusagents.ca (Vercel) — GoDaddy DNS: A record -> 76.76.21.21, CNAME www -> cname.vercel-dns.com

## PROJECT STATS

| Metric | Count |
|--------|-------|
| Total files | 662 |
| Git commits | 114 |
| Website source | 12,214 lines |
| Package source | 22,504 lines |
| Test source | 11,872 lines |
| Documentation | 22,297 lines (60 files) |
| Workflow specs | 4,212 lines (8 files) |
| n8n workflows | 7 JSON files |
| Supabase tables | 9 |
| Claude agents | 32 |
| Slash commands | 6 |

## CONVERSATION CONTINUITY RULES

When I start a new conversation about this project, ALWAYS:
1. Read this PROJECT_MEMORY.md file FIRST before doing anything
2. Never ask "what would you like to work on" -- check the IN PROGRESS section and pick up where we left off
3. Never re-suggest architecture that's already been decided (see KEY DECISIONS)
4. If I reference something from a previous conversation, check this file before saying you don't have context
5. After completing any task, UPDATE this file with what changed
