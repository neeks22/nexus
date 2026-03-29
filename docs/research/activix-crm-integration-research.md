# Activix CRM Integration Research Report

**Date:** 2026-03-28
**Researcher:** Claude (automated web + GitHub scouting)

---

## Executive Summary

Activix CRM is a Canadian automotive CRM with 75+ OEM/partner integrations, a well-documented REST API (v2), webhook support, and native Twilio integration. The open-source ecosystem around it is nearly nonexistent -- zero API wrapper libraries, zero community integrations, zero automation templates. This represents a significant opportunity: anyone building tooling around the Activix API will own that space entirely.

---

## 1. GitHub Repos Mentioning "Activix"

### 1.1 felliper/activix-crm-docs (THE KEY FIND)

- **URL:** https://github.com/felliper/activix-crm-docs
- **What:** A mirror/export of Activix CRM's external API documentation in GitBook-flavored Markdown
- **Stars:** 0
- **Last updated:** 2023-10-11
- **Contents:**
  - `api-1/authentication.md` -- OAuth 2 Bearer token auth
  - `api-1/errors.md` -- HTTP status code reference
  - `api-1/filtering.md` -- Query parameter filtering with operators (gt, gte, lt, lte) and wildcards
  - `api-1/pagination.md` -- Cursor-based pagination
  - `api-1/relations.md` -- Nested object includes
  - `api-1/resources/` -- lead.md, communication.md, email.md, phone.md, vehicle.md, search.md
  - `objects-1/` -- Full object schemas for lead, account, communication, email, events, phone, product, tasks, user, vehicle
  - `webhooks-1/` -- Webhook endpoint setup, lead webhooks, vehicle webhooks
- **Quality:** Moderate. GitBook template syntax, but all the critical info is there.
- **Reuse value:** HIGH. This is effectively the complete Activix API spec. Can be used to auto-generate TypeScript types and an API client.

### 1.2 Other "activix" repos (NOT relevant)

- `moutalao/Activix` / `moutalao/Activix2` -- C++ student server projects, unrelated
- `ShawnToubeau/ActiviX` -- Python mental health app, unrelated
- `joelzeal/activixt` -- Empty repo

**Verdict:** The felliper/activix-crm-docs repo is the only relevant find. Zero API wrappers, zero integration code, zero automation scripts exist anywhere on GitHub for Activix CRM.

---

## 2. Activix API -- Complete Technical Reference

### 2.1 Authentication

- **Method:** OAuth 2.0 Bearer token
- **Header:** `Authorization: Bearer {your_key}`
- **Key acquisition:** Must contact Activix Support (+1 866-430-6767)
- **Quirk:** Keys cannot be recovered if lost; only new keys can be generated
- **Source:** https://github.com/felliper/activix-crm-docs/blob/master/api-1/authentication.md

### 2.2 Base URL

```
https://api.crm.activix.ca/v2
```

### 2.3 Lead Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/leads` | Create a lead (required field: `type`) |
| GET | `/leads/:id` | Retrieve a single lead |
| PUT | `/leads/:id` | Update a lead |
| GET | `/leads` | List all leads (paginated, filterable) |
| GET | `/leads/search` | Full-text search (name, phone, email) |
| POST | `/screenpop` | Trigger screen pop for incoming calls |

### 2.4 Communication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/communications` | Create communication (required: lead_id, method, type) |
| PUT | `/communications/:id` | Update communication |
| POST | `/communications/:id/recording` | Upload call recording (wav/mp3, multipart/form-data) |

### 2.5 Other Resource Endpoints

- `/emails` -- Create/update email addresses on leads
- `/phones` -- Create/update phone numbers on leads
- `/vehicles` -- Create/update vehicles on leads

### 2.6 Lead Object -- Key Fields

**Core fields:** id, account_id, customer_id, source_id, first_name, last_name, type, division, status, result, rating, source, segment

**Lead types:** email, phone, walk_in, loyalty, renewal, sms, event, pre_booking

**Lead statuses:** duplicate, invalid, lost (null = active)

**Lead results:** pending, attempted, reached (null = pending)

**Divisions:** new, used, service

**Segments:** conquest, promo, notSold, service, loyalty, reminder, endWarranty, endLcap, endLnette, csi, noShow, other

**Date fields (all ISO 8601):** appointment_date, call_date, sale_date, delivery_date, delivered_date, road_test_date, be_back_date, paperwork_date, presented_date, take_over_date, csi_date, promised_date, refinanced_date, available_date

**Address fields:** address_line1, address_line2, city, province, postal_code, country (ISO 3166-2)

**Unsubscribe fields:** unsubscribe_all_date, unsubscribe_call_date, unsubscribe_email_date, unsubscribe_sms_date

**Nested objects:** account, advisor, bdc, commercial, service_advisor, service_agent, emails[], phones[], vehicles[], communications[], events[], products[], tasks[]

### 2.7 Communication Methods

- **method:** phone, email, sms
- **type:** outgoing, incoming
- **call_status:** calling, answered (and likely others)
- **call_duration:** integer (seconds)

### 2.8 Webhook System

- **Requirement:** HTTPS endpoint, JSON format
- **Authentication:** HMAC-SHA256 signature verification
  - Header: `X-Activix-Signature`
  - Verify by: HMAC(body, secure_key, SHA256) -> compare hexdigest to header
- **Events:** Lead created, Vehicle created (at minimum)
- **Expected responses:** 200 (success), 422 (unknown account), 500 (server error)
- **Source:** https://github.com/felliper/activix-crm-docs/blob/master/webhooks-1/webhooks/README.md

### 2.9 Filtering & Pagination

- Filter syntax: `?filter[field]=value` or `?filter[field][operator]=value`
- Operators: gt, gte, lt, lte
- Wildcards: `%` (recommended only at end of string for performance)
- Filterable fields on leads: name, email, phone, created, updated
- Pagination: `?page=N&per_page=N` (default 25 results)
- Response includes `links` (first, last, prev, next) and `meta` (current_page, total, etc.)

### 2.10 Error Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 400 | Bad Request (malformed syntax) |
| 401 | Unauthorized (bad API key) |
| 403 | Forbidden (key lacks permission) |
| 404 | Not Found |
| 422 | Unprocessable Entity (missing/invalid param) |
| 429 | Too Many Requests (rate limited -- use exponential backoff) |
| 5xx | Server Errors |

### 2.11 API Quirks Discovered

1. **No public rate limit numbers** -- the docs say 429 exists but do not specify requests/minute thresholds
2. **Phones and emails are append-only** on lead create/update -- you must use dedicated `/phones` and `/emails` endpoints to modify them individually
3. **Advisor assignment is by name matching** -- you pass `advisor.first_name` + `advisor.last_name` (or `email` or `id`), not just an ID
4. **Screen pop endpoint exists but is NOT YET IMPLEMENTED** in the actual CRM (documented as available but feature not built)
5. **Vehicle types:** "wanted" (what customer wants) vs "exchange" (trade-in) -- important distinction
6. **created_method is auto-set** to "api" for API-created leads and cannot be changed
7. **Webhook signature is on raw body** -- must verify before any JSON parsing/modification
8. **Recording uploads overwrite** -- only one recording per communication, re-uploading replaces it

---

## 3. Activix API Code Examples (Chilkat / example-code.com)

### 3.1 Available Languages

Code examples exist on example-code.com (via Chilkat library) for:
- **Node.js**, Java, Go, Swift, Python, PHP, C#, Android, Delphi, PowerBuilder, MFC, DataFlex

### 3.2 Available Operations

1. Search for Leads
2. Create a Lead
3. Update a Lead
4. Create a Phone
5. Update a Phone
6. Create a Communication
7. Upload a Recording

### 3.3 Node.js Create Lead Example (Key Pattern)

```
Endpoint: POST https://crm.activix.ca/api/v2/leads
  (Note: example-code.com uses crm.activix.ca, official docs use api.crm.activix.ca -- verify which is current)

Headers:
  Authorization: Bearer {ACCESS_TOKEN}
  Accept: application/json
  Content-Type: application/json

Body:
{
  "account_id": "MY_ACCOUNT_ID",
  "first_name": "John",
  "last_name": "Doe",
  "type": "email",
  "advisor": { "first_name": "John", "last_name": "Doe" },
  "emails": [{ "address": "hello@example.com", "type": "home" }],
  "phones": [{ "number": "+15144321214", "extension": 12345, "type": "home" }],
  "vehicles": [{ "make": "Aston Martin", "model": "DB11", "year": 2018, "type": "wanted" }]
}
```

**Sources:**
- https://www.example-code.com/nodejs/activix.asp
- https://www.example-code.com/nodejs/activix_lead_create.asp
- https://www.example-code.com/golang/activix_lead_update.asp

---

## 4. Activix + Automation Tools

### 4.1 LeadsBridge Integration

- **URL:** https://leadsbridge.com/integrations/activix-crm/
- **What:** Third-party iPaaS that connects Activix CRM to Facebook Lead Ads, Google Ads, and webhook sources
- **Pattern:** Field mapping UI for syncing leads between platforms
- **Limitation:** Paid middleware, not self-hosted

### 4.2 Native Integrations (from activix.ca/en/integrations)

Activix lists 75+ built-in integrations including:
- **Communication:** Twilio, RingCentral, Podium, Cielocom, Talksoon
- **Phone systems:** BCom, RingCentral, SBK Telecom, Twilio
- **DMS:** CDK Global, PBS, Serti, Tekion
- **OEMs:** BMW Canada, Ford Direct, GM Canada, Honda Canada, Nissan Canada, Stellantis Digital
- **Desking:** Autovance, DealerVu, Deskit, EasyDeal, Merlin
- **Trade-in:** Canadian Black Book, vAuto, Quick Trade

### 4.3 Zapier / Make / n8n

- **No native Zapier app** for Activix CRM found
- **No native Make (Integromat) module** found
- **No n8n community node** found
- **Opportunity:** Build a custom n8n node or use HTTP Request nodes with the REST API

**Source:** https://www.activix.ca/en/integrations

### 4.4 Activix's Own Open Source

- **activix/nylas-php** on Packagist -- a fork of the Nylas PHP SDK adapted for internal Activix use (email integration)
- **Source:** https://packagist.org/packages/activix/nylas-php
- Not an API client for Activix CRM itself, but shows they use Laravel/PHP internally

---

## 5. Dealership Automation / BDC Open Source Projects

### 5.1 MatiasCarabella/dealership-ai-chat (BEST OPEN SOURCE FIND)

- **URL:** https://github.com/MatiasCarabella/dealership-ai-chat
- **Stars:** 4 | **License:** MIT | **Lang:** Python
- **Last updated:** 2026-03-09
- **What:** AI-powered chatbot for car dealerships using FastAPI + PostgreSQL + Groq (Llama)
- **Stack:** Python 3.13, FastAPI, PostgreSQL 17, Docker, Groq AI
- **Features:**
  - Vehicle inventory CRUD API
  - AI chat endpoint (`POST /api/chat`) that queries inventory and responds naturally
  - Docker Compose deployment
  - Postman collection included
- **Code quality:** Clean, well-structured, minimal but functional
- **Reuse patterns:**
  - Chat endpoint design (message in, AI response out)
  - Inventory-aware prompting (feeds DB results into LLM context)
  - Docker-first deployment pattern
- **What it lacks:** No CRM integration, no lead capture, no SMS/email, no follow-up automation

### 5.2 1rishu0/LeadAutomationSystem

- **URL:** https://github.com/1rishu0/LeadAutomationSystem
- **Stars:** 0 | **Lang:** Python
- **Last updated:** 2025-12-11
- **What:** Automated car dealership lead management with AI intent scoring
- **Stack:** Python, Flask, Groq (Llama 3.3), Google Sheets, Google Calendar, Discord, Gmail
- **Features:**
  - Webhook endpoint for lead intake (`POST /webhook/lead`)
  - AI-powered intent scoring (0-1 scale)
  - Google Sheets as lead database
  - Google Calendar for appointment booking (with Meet links)
  - Discord + email notifications
  - Live demo deployed on Render.com
- **Code quality:** Prototype-grade, functional but not production-ready
- **Reuse patterns:**
  - Intent scoring prompt design
  - Webhook-based lead intake pattern
  - Multi-channel notification (Discord, email)
  - Calendar integration for appointment booking
- **What it lacks:** No real CRM, no SMS, uses Google Sheets instead of proper DB

### 5.3 Dariel305/AutoNationLexBot

- **URL:** https://github.com/Dariel305/AutoNationLexBot
- **Stars:** 0 | **Lang:** Not specified
- **What:** AutoNation chatbot using AWS Lex + Twilio SMS
- **Features:** Appointment checking, repair order status, vehicle tracking, SMS via Twilio
- **Reuse patterns:** Twilio SMS integration with automotive chatbot, repair order lookups

### 5.4 JUKKarol/GarageCRM

- **URL:** https://github.com/JUKKarol/GarageCRM
- **Stars:** 0 | **Lang:** C#
- **What:** Automotive workshop CRM with API integration
- **Reuse value:** Low (C#, workshop-focused not sales-focused)

---

## 6. Commercial AI BDC Solutions (Competitive Landscape)

These are the paid competitors -- understanding their features tells us what to build:

| Product | Key Feature | Price Range |
|---------|-------------|-------------|
| **DriveCentric** | AI virtual BDC agent, 24/7 lead engagement | Enterprise |
| **Podium** | AI lead gen, multi-channel (chat/SMS/email) | $300-1000+/mo |
| **Conversica** | AI email/SMS assistant, persistent follow-up | Enterprise |
| **Impel AI** | Full lifecycle management, smart follow-up | Enterprise |
| **DealerAI** | Chat + email + SMS automation, cold lead re-engagement | Not disclosed |
| **Matador AI** | Conversational AI specifically for automotive | Not disclosed |
| **Numa** | AI phone answering + lead routing | Not disclosed |
| **Spyne** | AI chatbot + visual AI for inventory photos | Not disclosed |

**Source:** https://www.numa.com/blog/top-7-ai-bdc-solutions-dealerships

---

## 7. Twilio + Dealership SMS Patterns

### 7.1 Twilio Native Integration with Activix

Activix CRM lists Twilio as a native integration partner for both Communications and Phone Systems. This means Activix already handles Twilio call routing and potentially SMS relay internally.

**Source:** https://www.activix.ca/en/integrations

### 7.2 Driva Case Study (Twilio + Auto Financing)

- **URL:** https://customers.twilio.com/en-us/driva
- **What:** Online auto finance broker using Twilio Voice + SMS + AI chatbot
- **Result:** 5% conversion uplift at major friction points
- **Pattern:** AI chatbot handles initial customer queries, escalates to human for financing

### 7.3 DealerAI

- **URL:** https://dealerai.com/
- **What:** AI for car dealerships -- chat, email, SMS automation
- **Pattern:** Captures inquiries 24/7, automates follow-ups, re-ignites cold leads

---

## 8. Recommendations for Nexus Integration

### 8.1 Build an Activix API Client (TypeScript)

No one has built this. The market is wide open. Using the docs from felliper/activix-crm-docs, build:

```typescript
// Suggested interface
interface ActivixClient {
  leads: {
    create(data: CreateLeadInput): Promise<Lead>;
    get(id: number): Promise<Lead>;
    update(id: number, data: UpdateLeadInput): Promise<Lead>;
    list(filters?: LeadFilters, pagination?: PaginationParams): Promise<PaginatedResponse<Lead>>;
    search(query: string): Promise<PaginatedResponse<Lead>>;
  };
  communications: {
    create(data: CreateCommunicationInput): Promise<Communication>;
    update(id: number, data: UpdateCommunicationInput): Promise<Communication>;
    uploadRecording(id: number, file: Buffer, type: 'wav' | 'mp3'): Promise<void>;
  };
  phones: { create(...): ...; update(...): ...; };
  emails: { create(...): ...; update(...): ...; };
  vehicles: { create(...): ...; update(...): ...; };
  webhooks: {
    verifySignature(body: string, signature: string, secretKey: string): boolean;
  };
}
```

### 8.2 Build Webhook Handler with HMAC Verification

```typescript
// Pattern from Activix docs
import { createHmac } from 'crypto';

function verifyActivixWebhook(rawBody: string, signature: string, secretKey: string): boolean {
  const computed = createHmac('sha256', secretKey).update(rawBody).digest('hex');
  return computed === signature;
}
```

### 8.3 Build n8n Custom Node

No Activix node exists for n8n. Build one covering:
- Lead CRUD operations
- Communication logging
- Webhook trigger node (with HMAC verification)
- Search functionality

### 8.4 AI Lead Scoring + Auto-Response Agent

Combine patterns from:
- LeadAutomationSystem (intent scoring via LLM)
- dealership-ai-chat (inventory-aware AI responses)
- Activix Communication API (log all interactions back to CRM)

### 8.5 Key Technical Decisions

1. **Rate limiting:** Activix does not publish rate limits. Implement conservative exponential backoff starting at 1 req/sec, with circuit breaker pattern.
2. **Phone/email append-only:** When syncing contacts, always check existing before creating to avoid duplicates.
3. **Advisor matching:** The API matches advisors by name, not ID. Store advisor name mappings to avoid mismatches.
4. **Base URL discrepancy:** Verify whether `crm.activix.ca` or `api.crm.activix.ca` is the current production URL (docs use the latter).
5. **Webhook raw body:** Must capture raw request body before any JSON parsing for HMAC verification.

---

## 9. Source Index

| # | Source | What |
|---|--------|------|
| 1 | https://github.com/felliper/activix-crm-docs | Complete API docs mirror |
| 2 | https://docs.crm.activix.ca/ | Official API documentation portal |
| 3 | https://www.activix.ca/en/integrations | 75+ integration partners list |
| 4 | https://www.example-code.com/nodejs/activix.asp | Node.js code examples (Chilkat) |
| 5 | https://www.example-code.com/swift/activix_lead_create.asp | Lead creation example |
| 6 | https://www.example-code.com/golang/activix_lead_update.asp | Lead update example |
| 7 | https://leadsbridge.com/integrations/activix-crm/ | LeadsBridge integration |
| 8 | https://github.com/MatiasCarabella/dealership-ai-chat | AI dealership chatbot (MIT) |
| 9 | https://github.com/1rishu0/LeadAutomationSystem | Lead automation with AI scoring |
| 10 | https://github.com/Dariel305/AutoNationLexBot | Twilio + AWS Lex dealership bot |
| 11 | https://packagist.org/packages/activix/nylas-php | Activix's own Nylas PHP fork |
| 12 | https://dealerai.com/ | Commercial AI for dealerships |
| 13 | https://customers.twilio.com/en-us/driva | Twilio auto finance case study |
| 14 | https://www.numa.com/blog/top-7-ai-bdc-solutions-dealerships | AI BDC market overview |
| 15 | https://www.activix.ca/en/contact-us | API key requests |
