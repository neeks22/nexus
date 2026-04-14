# NEXUS — Master Blueprint

> **Live URL:** https://nexusagents.ca
> **GitHub:** https://github.com/neeks22/nexus
> **Generated:** 2026-04-14

---

## 1. What Nexus Is

AI agency platform at nexusagents.ca. Two products in one monorepo:

1. **nexus-core** — Self-healing multi-agent orchestration framework for TypeScript. Agents that break fix themselves.
2. **Website + CRM** — Multi-tenant dealership automation. Each tenant gets a CRM at `/tenant-name` (e.g. `/readycar`, `/readyride`). Features: lead management, auto-response (SMS + email), credit routing, financing funnel, appointment booking, deal tracking, inventory management.

**Business model:** AI agency selling automation to businesses.
- AI Audit: $5-15K
- Custom Build: $15-50K
- Managed Operations: $5-25K/month
- First vertical: subprime/used car dealerships in Ottawa

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict mode) |
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS Variables (design tokens) |
| Database | Supabase (PostgreSQL + RLS + PII encryption) |
| Hosting | Vercel (Edge Middleware, Cron Jobs) |
| AI | Anthropic Claude Opus 4.6 (extended thinking) |
| SMS | Twilio |
| Email | Gmail SMTP (nodemailer) |
| Analytics | Vercel Analytics + Speed Insights |
| Monitoring | Sentry (client + server + edge) |
| Ads | Meta Pixel + Conversions API |
| CRM Sync | Activix (primary), GHL (secondary) |
| Workflows | n8n |
| Rate Limiting | Upstash Redis (optional, in-memory fallback) |
| Notifications | Slack webhooks |
| Testing | Vitest (1,185 tests) |
| Build | tsup (packages), Next.js (website) |
| Package Manager | npm workspaces |

---

## 3. Monorepo Structure

```
nexus/
├── apps/
│   ├── website/          # Next.js 14 — main product (714 TS files)
│   ├── dashboard/        # Admin dashboard (217 TS files)
│   ├── code-review-team/ # Multi-agent code review CLI
│   ├── debate-arena/     # Multi-perspective debate CLI
│   └── roi-calculator/   # Static HTML ROI tool
│
├── packages/
│   ├── nexus-core/       # Self-healing framework (395 TS files)
│   ├── nexus-agents/     # Dealership AI agents
│   ├── nexus-activix/    # Activix CRM client
│   ├── nexus-billing/    # Cost tracking
│   ├── nexus-cli/        # CLI (nexus run, nexus health)
│   ├── nexus-compliance/ # CASL compliance
│   ├── nexus-control/    # Agent registry + toggles
│   ├── nexus-crm/        # CRM adapter layer
│   ├── nexus-dashboard/  # Analytics data provider
│   ├── nexus-i18n/       # EN/FR bilingual support
│   ├── nexus-intent/     # Intent classification + BANT
│   ├── nexus-inventory/  # Vehicle inventory service
│   ├── nexus-observability/ # Tracing + alerting
│   ├── nexus-pii/        # PII detection + redaction
│   ├── nexus-prompts/    # 3-layer prompt architecture
│   └── nexus-transcript/ # Immutable conversation log
│
├── supabase/
│   └── migrations/       # 7 migration files (001-007)
│
├── config/               # Retell voice configs, tenant configs
├── scripts/              # Build + health check scripts
├── tests/                # E2E + integration tests
├── examples/             # Example agent setups
└── docs/                 # Plans, research, PRDs
```

**Total:** ~1,060 TypeScript files across 5 apps and 16 packages.

---

## 4. Self-Healing Framework (nexus-core)

### Execution Pipeline

Every agent API call flows through:

```
PRE-FLIGHT → EXECUTE → VALIDATE → [DIAGNOSE → RECOVER → RETRY] → UPDATE HEALTH
```

### Module Map

| Module | Purpose |
|--------|---------|
| **Agent** | Wraps Anthropic calls with full healing pipeline, tombstones on failure |
| **Team** | Orchestrates multiple agents (sequential, parallel, debate, parallel-then-synthesize) |
| **Graph** | DAG topology for complex multi-agent workflows with conditional edges |
| **Transcript** | Immutable append-only shared state across all agents |
| **CircuitBreaker** | CLOSED → OPEN (3 failures) → HALF_OPEN (60s) → test → CLOSED |
| **HealthTracker** | Weighted score: 30% success rate, 15% latency, 30% quality, 25% recovery |
| **ErrorTaxonomy** | Classifies errors as infrastructure (retry) or output quality (reprompt) |
| **RecoveryStrategies** | Backoff, reprompt, reflect, or tombstone based on error type |
| **ReflectionLoop** | Haiku-based quality assessment, capped at 2 retries |
| **OutputValidator** | Validates structure, content, length, relevance, repetition |
| **Tombstone** | Named terminal state for every failure — no silent passthrough |
| **AnthropicProvider** | Prompt caching, pre-flight token counting, error mapping |

### Health States

| State | Score | Meaning |
|-------|-------|---------|
| HEALTHY | >= 0.85 | Normal operation |
| DEGRADED | >= 0.40 | Operational but impaired |
| RECOVERING | >= 0.15 | In recovery mode |
| FAILED | < 0.15 | Non-recoverable |

### Error Taxonomy

**Infrastructure (retry with backoff):** rate_limit, api_overloaded, api_timeout, context_overflow, server_error, auth_error, network_error

**Output Quality (reprompt with hint):** empty_response, malformed_response, off_topic, too_long, too_short, refusal, no_agent_reference, repetition

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Transcript is immutable (append-only) | Eliminates silent state degradation |
| Team + Graph dual layer | Team for simple, Graph for topology control |
| Step.tombstone mandatory | Every failure gets a named terminal state |
| ReflectionLoop capped at 2 | Prevents infinite loops, emits tombstone on breach |
| Prompt caching is architectural | 10x cost savings, not optional |
| Pre-flight token counting | Prevents context overflow surprises |
| Named thresholds in config/thresholds.ts | Single source of truth for all tuning |
| Cost ceiling: $5/run | Prevents runaway retries |

---

## 5. Database Schema

### Tables (14 total)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **funnel_submissions** | Lead data from /apply funnel | tenant_id, vehicle_type, budget, employment, credit_situation, phone (encrypted), email (encrypted), status, utm_*, pre_approval_score |
| **lead_transcripts** | Append-only conversation log | tenant_id, lead_id, entry_type (message/handoff/note/status), role (ai/customer/system), content (encrypted), channel (sms/email/voice/chat/funnel/crm) |
| **consent_records** | CASL/PIPEDA compliance | tenant_id, lead_id, consent_type (express/implied), consent_date, consent_expiry, revoked_at |
| **crm_users** | CRM login accounts | email (unique), password_hash (scrypt), name, tenant_id, role (admin/manager/staff), is_active |
| **inventory** | Vehicle inventory | tenant_id, year, make, model, trim, color, price, mileage, stock_number, vin, status (available/sold/pending) |
| **appointments** | Customer bookings | tenant_id, lead_phone, appointment_type, status, scheduled_at, assigned_to, vehicle_id (FK → inventory) |
| **deals** | Sales pipeline | tenant_id, lead_phone, vehicle_id (FK → inventory), sale_price, trade_in_value, down_payment, monthly_payment, term_months, lender, status |
| **api_costs** | AI API billing | tenant_id, model, input_tokens, output_tokens, cost_usd, operation_type |
| **twilio_costs** | SMS/email/voice billing | tenant_id, channel, cost_usd, message_id |
| **failover_queue** | CRM sync retry queue | tenant_id, operation, lead_data (JSONB), attempts, status |
| **agent_toggles** | Feature flags per tenant | tenant_id, agent_id, enabled, reason, toggled_by |
| **trace_logs** | Agent execution traces | tenant_id, model, tokens, latency_ms, status, agent_type |
| **tenant_configs** | Per-tenant prompt config | tenant_id (unique), layer2_config (JSONB), layer3_config (JSONB) |

### Security

- **RLS:** All tables enforce `tenant_id = get_request_tenant()` via JWT claims or x-tenant-id header
- **PII Encryption:** pgcrypto (pgp_sym_encrypt) on phone, email, name, message content. Key in Supabase Vault.
- **Decryption Views:** `v_funnel_submissions`, `v_lead_transcripts` auto-decrypt on SELECT
- **Roles:** admin (full access), manager (CRUD + delete + import), staff (read/write only)

### Relationships

```
funnel_submissions.phone ──→ lead_transcripts.lead_id
funnel_submissions.phone ──→ consent_records.lead_id
funnel_submissions.phone ──→ appointments.lead_phone
funnel_submissions.phone ──→ deals.lead_phone
inventory.id ──→ appointments.vehicle_id
inventory.id ──→ deals.vehicle_id
crm_users.tenant_id ──→ All tables (auth context)
```

### Migrations

| # | What |
|---|------|
| 001 | Core 9 tables (funnel, transcripts, consent, costs, queue, toggles, traces, configs) |
| 002 | PII encryption (pgcrypto, encrypted columns, decrypt functions, views) |
| 003 | RLS policies with get_request_tenant() |
| 004 | CHECK constraint additions (new statuses, entry types) |
| 005 | RLS security hardening (removed empty-string bypass) |
| 006 | CRM users table (authentication) |
| 007 | CRM features (inventory, appointments, deals) |

---

## 6. API Routes (22 endpoints)

### Authentication

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth` | POST | Public | Login (email/password → session cookie) |
| `/api/auth` | GET | Public | Check session status |
| `/api/auth` | DELETE | Public | Logout (clear cookie) |
| `/api/auth/users` | POST | Admin | Create CRM user |
| `/api/auth/users` | GET | Admin | List all users |
| `/api/auth/users` | PATCH | Session | Change own password |

### Lead Management

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/leads` | GET | Session | List/search leads with filters |
| `/api/leads` | POST | Session | Create lead or save activity note |
| `/api/leads` | PATCH | Session | Update lead status |
| `/api/leads` | DELETE | Manager+ | Hard-delete lead + all data (PIPEDA) |
| `/api/leads/credit` | POST | Session | Update credit situation notes |

### Messaging

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/messages` | GET | Session | Fetch SMS conversations from Twilio |
| `/api/messages` | POST | Session | Send SMS or email |

### CRM Operations

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/appointments` | GET/POST/PATCH | Session | CRUD appointments + SMS reminders |
| `/api/deals` | GET/POST/PATCH | Session | CRUD deal records |
| `/api/inventory` | GET/POST/PATCH | Session | CRUD vehicle inventory |
| `/api/inventory` | DELETE | Manager+ | Delete vehicle |
| `/api/dashboard` | GET | Session | KPIs, pipeline counts, hot leads, activity |

### Public / Funnel

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/funnel-lead` | POST | Public | 9-step funnel submission → auto SMS + email + Meta CAPI |
| `/api/import-leads` | POST | Manager+ | Bulk CSV import (NDJSON streaming) |
| `/api/check-duplicates` | POST | Session | Dedup phone list before import |
| `/api/parse-pdf-contacts` | POST | Manager+ | Extract contacts from text via Claude |
| `/api/credit-analyze` | POST | Session | Credit bureau PDF/text → FICO + tier (Claude Opus) |
| `/api/health` | GET | Public | Health check |

### Webhooks

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/webhook/sms` | POST | Twilio sig | Inbound SMS → async processing |
| `/api/webhook/sms/process` | POST | Internal | AI reply generation + lead qualification |
| `/api/webhook/email` | POST | API key | Inbound email → AI reply |
| `/api/webhook/twilio-usage` | POST | Twilio | Spending alerts ($75 warn, $400 hard block) |

### Cron Jobs

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/follow-up` | Daily 2PM UTC | Multi-touch SMS sequences (Touch 2-5) |
| `/api/cron/check-email` | TBD | Email inbox polling |
| `/api/cron/data-retention` | Weekly | PIPEDA purge (credit >90d, orphans >6mo) |

### Middleware

Edge Runtime middleware on every request:
- Session verification (HMAC-SHA256 signed cookies, 24h expiry, sliding renewal)
- CSRF protection (Origin header validation, exempts webhooks/cron)
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Tenant scoping (staff/manager restricted to own tenant)

---

## 7. Frontend Architecture

### Page Routes (16)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Marketing | Homepage — hero, logo slider, CTA |
| `/services` | Marketing | Service tiers (audit, build, managed ops) |
| `/pricing` | Marketing | Pricing cards + FAQ |
| `/case-studies` | Marketing | Client success stories |
| `/contact` | Marketing | Free 30-min call booking form |
| `/about` | Marketing | Company info |
| `/privacy` | Legal | Privacy policy |
| `/apply` | Funnel | Application start |
| `/apply/dealerships` | Funnel | 9-step financing funnel (vehicle → credit → contact) |
| `/login` | Auth | CRM login (email + password) |
| `/dashboard` | CRM | Main dashboard (redirects to tenant) |
| `/readycar` | CRM | ReadyCar tenant CRM |
| `/readyride` | CRM | ReadyRide tenant CRM |
| `/inbox` | CRM | SMS/email inbox |
| `/inbox/dealerships` | CRM | Dealership-specific inbox |
| `/dealerships` | CRM | Dealership management |

### CRM Component Tree

```
CRMLayout (369 lines — main container, tab state, mobile nav)
├── DashboardTab (128 lines) — KPIs, today's schedule, hot leads, pipeline funnel
├── PipelineTab (33 lines) → KanbanBoard (150 lines) — drag-drop Kanban by status
├── LeadsTab (306 lines) — searchable lead list, new lead modal
├── LeadDetailPanel (455 lines) — slide-out panel: timeline, SMS, email, status
├── AppointmentsTab (228 lines) — today/upcoming/all views, create/remind
├── DealsTab (215 lines) — deal list with pipeline value, status filters
├── InventoryTab (191 lines) — vehicle list with search/filter, add/edit/delete
├── ReportsTab (290 lines) — Recharts analytics (funnel, conversion, UTM, deals)
├── SettingsTab (141 lines) — profile, password change
├── ImportSpreadsheetModal (412 lines) — CSV/Excel drag-drop bulk import
└── CreditRouter (347 lines)
    ├── CreditForm — FICO, income, vehicle data, file upload, AI analysis
    ├── CreditResults — 8 scored lenders in tier cards
    ├── LenderCard — individual lender approval details
    ├── ScoreCircle — circular FICO display with grade badge
    └── scoring-engine.ts — 8 Canadian subprime lenders database
```

### React Query Hooks (7 files, ~30 hooks)

| Hook | Queries | Mutations |
|------|---------|-----------|
| **use-dashboard** | Dashboard KPIs (30s refetch) | — |
| **use-leads** | Leads list (search/status filter) | Create, update status, delete |
| **use-lead-detail** | Lead data + conversation + activity (combined) | Send SMS, send email, update status, post note, delete |
| **use-appointments** | Appointments (view filter) | Create, update, send reminder |
| **use-deals** | Deals (status filter) | Create, update |
| **use-inventory** | Vehicles (search/status filter) | Create, update, delete |
| **use-conversations** | All conversations (15s refetch) | Send message |

### Design System

**23 CSS variables** for CRM theming:
- Backgrounds: `--crm-bg`, `--crm-bg-panel`, `--crm-bg-card`, `--crm-bg-input`, `--crm-bg-modal`
- Text: `--crm-text`, `--crm-text-secondary`, `--crm-text-muted`
- Brand: `--crm-brand` (#DC2626 red), gradient
- Status: `--crm-green`, `--crm-amber`, `--crm-cyan`, `--crm-purple`, `--crm-red`
- Borders: `--crm-border`, `--crm-border-strong`
- Radius: `--crm-radius`, `--crm-radius-lg`, `--crm-radius-xl`

**Status color maps** for leads, deals, appointments, inventory, and credit grades (A+ through F).

**Shared styles** (`styles.ts`): 15 reusable CSSProperties objects — inputs, cards, modals, badges, tables, buttons, page containers.

---

## 8. Integrations Map

| Service | Status | Purpose | Key Files |
|---------|--------|---------|-----------|
| **Twilio** | Active | SMS send/receive, webhook validation, spending controls | security.ts, webhook/sms/*, messages/route.ts |
| **Anthropic Claude** | Active | Credit analysis (Opus + thinking), auto-response, follow-up SMS | security.ts, credit-analyze/route.ts, auto-response.ts |
| **Supabase** | Active | Multi-tenant DB, RLS, PII encryption, auth | security.ts, migrations/001-007 |
| **Vercel** | Active | Hosting, cron jobs, edge middleware, analytics | vercel.json, middleware.ts |
| **Sentry** | Active | Error tracking (client + server + edge) | sentry.*.config.ts |
| **Meta/Facebook** | Active | Pixel tracking + CAPI conversion events | meta-pixel.ts, meta-conversions.ts, MetaPixel.tsx |
| **Gmail SMTP** | Active | Transactional email (auto-response, follow-up) | auto-response.ts |
| **Slack** | Active | Alerts (spending, follow-up results, errors) | security.ts (slackNotify) |
| **Activix** | Active | Dealership CRM sync (leads, notes, comms) | nexus-activix, nexus-crm adapters |
| **n8n** | Active | Workflow automation (5 workflows) | funnel-lead/route.ts |
| **Upstash Redis** | Optional | Distributed rate limiting | security.ts |
| **GHL** | Code exists | Alternative CRM (switchable via env) | nexus-crm/ghl-adapter.ts |
| **Retell AI** | Research only | Voice receptionist (not deployed) | config/retell/ |
| **Stripe** | Not implemented | — | — |

### Tenant-Specific Config

| Tenant | Twilio Number | Email Sender | Twilio From |
|--------|--------------|--------------|-------------|
| ReadyCar | +13433125045 | nicolas@readycar.ca | +13433125045 |
| ReadyRide | +13433412797 | moe@readyride.ca | +13433412797 |

---

## 9. Environment Variables (31 total)

### Required

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase admin key (server-only) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `GMAIL_USER` | Gmail address for auto-response |
| `GMAIL_PASS` | Gmail app password |
| `AUTH_SECRET` | Session HMAC key (32+ bytes) |
| `CRON_SECRET` | Cron endpoint authorization |

### Recommended

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side error tracking |
| `SENTRY_DSN` | Server-side error tracking |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `META_PIXEL_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | Facebook Pixel |
| `META_CONVERSIONS_API_TOKEN` | Meta CAPI (server-side) |
| `PROCESS_SECRET` | Internal SMS processing auth |
| `NEXUS_API_KEY` | API authentication |
| `ALLOWED_ORIGIN` | CSRF origin (default: nexusagents.ca) |

### Optional

| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Distributed rate limiting |
| `ACTIVIX_API_URL` / `TOKEN` / `WEBHOOK_SECRET` | Activix CRM sync |
| `GHL_API_KEY` / `LOCATION_ID` | GHL CRM (if switching) |
| `CRM_PROVIDER` | `activix` or `ghl` |
| `N8N_FUNNEL_WEBHOOK_URL` | n8n workflow trigger |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-side Supabase |

---

## 10. Security Architecture

### Authentication Flow

```
Login POST /api/auth → verify scrypt hash → sign session cookie (HMAC-SHA256, 24h)
  → every request: middleware verifies cookie → extracts tenant_id, role
  → API routes: requireSession() enforces auth, requireRole() enforces RBAC
  → sliding renewal: re-issues cookie when <12h remaining
```

### Rate Limiting

| Route | Limit |
|-------|-------|
| Login | 10/min |
| Funnel submit | 10/min |
| Credit analyze | 10/min |
| SMS webhook | 60/min |
| General API | 30/min |
| Bulk import | 2/min |

### Security Headers (all routes)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Compliance

- CASL consent tracking (express/implied with expiry)
- PIPEDA data retention cron (credit >90d, orphans >6mo)
- PII encrypted at rest (pgcrypto in Supabase)
- Hard-delete endpoint for right-to-be-forgotten

---

## 11. Auto-Response Flow

```
Customer submits /apply/dealerships form
  ↓
POST /api/funnel-lead (Zod validation, rate limit, dedup check)
  ↓
Insert to funnel_submissions (PII auto-encrypted via trigger)
  ↓
handleAutoResponse() runs in parallel:
  ├── Claude generates personalized SMS → Twilio sends
  ├── Claude generates personalized email → Gmail SMTP sends
  ├── Both logged to lead_transcripts
  └── Meta CAPI event (Lead conversion)
  ↓
n8n webhook POST (fire-and-forget)
  ↓
Return {success: true} to browser

Follow-up sequence (cron, daily 9 AM ET):
  Touch 2: 4 hours after submission
  Touch 3: 24 hours
  Touch 4: 72 hours
  Touch 5: 7 days
  Each touch: Claude-generated contextual SMS via Twilio
```

### Inbound SMS Flow

```
Customer replies to SMS
  ↓
Twilio POST → /api/webhook/sms (signature validation, dedup)
  ↓
Async POST → /api/webhook/sms/process
  ↓
Intent detection:
  ├── STOP/UNSUBSCRIBE → immediate opt-out response, no auto-reply
  ├── HOT intent (ready to buy, test drive) → handoff + pause auto-reply
  └── Normal → Claude generates reply + form extraction
  ↓
Form extraction (5/7 fields complete → qualified lead card → Slack → handoff)
```

---

## 12. Credit Scoring Engine

8 Canadian subprime lenders scored against applicant profile:

| Lender | FICO Range | Specialty |
|--------|-----------|-----------|
| Northlake Financial | 550-900 | Full spectrum, low payments |
| TD Auto Finance | 650-900 | Prime/near-prime |
| iA Financial Group | 600-900 | Insurance-backed |
| EdenPark | 0-649 | Deep subprime, no-hit |
| AutoCapital Canada | 400-700 | Subprime rebuild |
| Rifco National | 450-650 | Drive Plan for deep sub |
| Iceberg Finance | 500-700 | Northern Ontario specialty |
| Santander Consumer | 550-750 | Volume bonuses |

**Scoring:** Each lender's tiers compared against applicant FICO, income, vehicle age/km/price, down payment, desired payment. Returns approval likelihood, rate, LTV, restrictions.

**Credit grades:** A+ (800+) through F (<400) with color-coded display.

---

## 13. Lighthouse Scores (Production)

| Metric | Score |
|--------|-------|
| Performance | 98 |
| Accessibility | 89 |
| Best Practices | 96 |
| SEO | 100 |
| FCP | 0.9s |
| LCP | 2.4s |
| TBT | 0ms |
| CLS | 0 |

---

## 14. Test Coverage

- **29 test files**, **1,185 tests**, all passing
- Unit tests: healing pipeline (circuit breaker, health tracker, error taxonomy, recovery, validator, transcript)
- Unit tests: all domain packages (agents, compliance, CRM, intent, inventory, PII, i18n, prompts, billing)
- Integration tests: API routes (security, auth, rate limiting)
- E2E tests: dealership workflow (lead → response → storage)

---

## 15. Outstanding Items (Priority Order)

### Blockers
1. DB migration: 3 ALTER TABLEs in Supabase (HOT leads, status tracking, agent pause/resume)
2. Set `SLACK_WEBHOOK_URL` in Vercel
3. Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel

### This Week
4. Contact form: replace localStorage fallback with real endpoint
5. Search debounce on LeadsTab + InventoryTab
6. Kanban drag-drop optimistic update (snap-back bug)
7. Enable Vercel Analytics dashboard

### Before Scaling
8. SMS delivery retest end-to-end
9. Session invalidation for deactivated users
10. Timing-safe API key comparison
11. Inbox: migrate to React Query + split component (700 lines, 17 state vars)
12. Meta Business Manager setup + first ad campaigns
13. Delete deal functionality (missing entirely)
14. Appointment timezone handling

### Accessibility
15. Fix color contrast ratios
16. Fix heading order (skipped levels)
17. Remove prohibited ARIA attributes

### Bigger Initiatives
18. Lead gen engine (8-day build, CRM now unblocked)
19. Server-side email from CRM inbox
20. Real-time updates (WebSocket vs polling)
21. n8n workflow activation + testing
22. LeadDetailPanel split (455 lines)
