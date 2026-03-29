# n8n Workflow Templates & Examples Research

**Date:** 2026-03-28
**Purpose:** Scout reusable n8n workflows for automotive dealership AI automation

---

## 1. n8n + CRM Integrations

### 1a. Webflow-to-Pipedrive with Smart Phone Formatting (Template #7382)
- **URL:** https://n8n.io/workflows/7382
- **What it does:** Captures web form submissions and creates complete CRM records in Pipedrive with 4-scenario duplicate detection (existing org + existing person, existing org + new person, new org + existing person, all new). Handles international phone formatting for 20+ countries. Sends alerts via Discord and WhatsApp.
- **What we can steal:** The 4-scenario upsert logic is gold for any CRM integration. Instead of blindly creating duplicates, it checks org AND person separately. Adapt this for automotive CRM where one household might have multiple buyers.
- **Gotchas:** Pipedrive-specific node usage. Would need to swap for GoHighLevel or HubSpot HTTP calls if using a different CRM.

### 1b. Salesforce Lead Capture with AI Email & SMS (Template #6102)
- **URL:** https://n8n.io/workflows/6102
- **What it does:** n8n hosted form -> Salesforce lead creation -> OpenAI generates personalized welcome message -> routes to Twilio SMS or SMTP email based on lead preference.
- **What we can steal:** The form-to-CRM-to-AI-personalized-outreach pipeline in a single workflow. The preference-based routing (SMS vs email) is exactly what dealership leads need. Swap Salesforce for GoHighLevel.
- **Gotchas:** 15-30 min setup. Needs Salesforce, OpenAI, Twilio, and SMTP credentials.

### 1c. GoHighLevel CRM AI Assistant (Template #5131)
- **URL:** https://n8n.io/workflows/5131
- **What it does:** Conversational AI assistant (GPT-4o) connected to GoHighLevel CRM. Manage contacts, deals, tasks, appointments through natural language chat commands. Uses 14+ highLevelTool nodes covering the full CRM API surface.
- **What we can steal:** The entire GoHighLevel tool node configuration. This is the reference implementation for n8n + GHL integration. "Create a new contact for John Doe" via chat. Directly applicable to dealership ops.
- **Gotchas:** Requires GoHighLevel account + OpenAI. The template is commercial (author sells workflows).

### 1d. AI Phone Booking with GHL + VAPI.ai (Template #3759)
- **URL:** https://n8n.io/workflows/3759
- **What it does:** GHL webhook trigger -> GPT-4 lead validation -> VAPI.ai automated phone call -> post-call analysis -> conditional CRM update + confirmation emails. Handles YES/NO booking outcomes.
- **What we can steal:** The full webhook -> validate -> voice AI -> CRM update pipeline. This is almost exactly the automotive service appointment flow. Voice AI lead qualification via phone is a premium deliverable.
- **Gotchas:** Requires self-hosted n8n (community nodes). VAPI.ai costs money per call. Test extensively before production.

### 1e. Website Lead Capture + Apollo Enrichment + HubSpot (Template #4618)
- **URL:** https://n8n.io/workflows/4618
- **What it does:** Webhook captures web form -> sends thank-you email -> enriches via Apollo (job title, LinkedIn) -> creates/updates HubSpot contact -> notifies team.
- **What we can steal:** Lead enrichment step before CRM insertion. For auto dealers, enrich with vehicle history, credit pre-qual signals. The webhook -> enrich -> CRM pattern is reusable.
- **Gotchas:** Apollo API has rate limits. HubSpot free tier has contact limits.

---

## 2. n8n + Twilio SMS/Email Automation

### 2a. Solar Lead Reactivation with AI SMS Drip (Template #6213) -- TOP PICK
- **URL:** https://n8n.io/workflows/6213
- **What it does:** Multi-step SMS drip campaign: monitors Google Sheet for leads marked "Ready for Reactivation" -> sends personalized SMS via Twilio (savings + ZIP) -> waits -> follow-up SMS -> email -> final urgency SMS. Parses ALL replies with AI sentiment detection. Updates sheet with status. Sends Telegram alerts for hot leads. Optional HubSpot CRM update.
- **What we can steal:** THIS IS THE TEMPLATE. The entire reactivation drip architecture translates directly to automotive: "Hey [Name], your [Vehicle] is now worth $X in trade-in value. Interested in upgrading?" Same cadence pattern: SMS1 -> wait -> SMS2 -> email -> final SMS. The AI sentiment detection on replies is the key differentiator.
- **Gotchas:** Google Sheets as "database" doesn't scale past ~500 leads. Swap for proper DB. Twilio SMS costs ~$0.0079/segment.

### 2b. Real Estate Lead Qualification via SMS + GPT-4o (Template #6332)
- **URL:** https://n8n.io/workflows/6332
- **What it does:** Receives incoming SMS inquiries -> GPT-4o analyzes and scores lead quality -> stores in Google Sheets -> responds with relevant follow-up info via Twilio.
- **What we can steal:** The inbound SMS -> AI qualification -> response pattern. For dealerships: customer texts "interested in the 2024 Civic" -> AI qualifies budget/timeline/trade-in -> routes to right salesperson.
- **Gotchas:** Needs Twilio webhook configuration pointing at n8n instance.

### 2c. AI-Powered SMS Support System (Template #9220)
- **URL:** https://n8n.io/workflows/9220
- **What it does:** Twilio receives SMS -> GPT-4 processes inquiry -> PostgreSQL stores conversation history -> maintains context across interactions -> sends response via SMS.
- **What we can steal:** The conversation memory via PostgreSQL. Critical for multi-turn SMS conversations where a lead asks about price, then financing, then trade-in value across multiple messages. Without memory, each message is isolated.
- **Gotchas:** Requires PostgreSQL setup. Token costs accumulate with conversation history.

### 2d. Automated Lead Follow-Up Multi-Channel (Template #9738)
- **URL:** https://n8n.io/workflows/9738
- **What it does:** Follow Up Boss CRM integration -> validates phone/email -> deduplicates -> intelligent channel routing (Gmail, Twilio SMS, WhatsApp) based on lead data.
- **What we can steal:** The validation + deduplication + channel routing logic. Clean phone numbers, check for duplicates, then decide: SMS for mobile, email for corporate, WhatsApp for international.
- **Gotchas:** Follow Up Boss is real estate specific. Need to swap CRM layer.

### 2e. Twilio MCP Server for AI Agents (Template #5078)
- **URL:** https://n8n.io/workflows/5078
- **What it does:** Exposes Twilio Call + SMS as MCP tools. Any AI agent can make calls and send SMS through this MCP server.
- **What we can steal:** If we build Nexus agents that need to send SMS/make calls, this MCP pattern lets AI agents autonomously reach out. The agent decides WHEN to call/text rather than following a rigid schedule.
- **Gotchas:** MCP is still emerging. Deploy as webhook-accessible server.

---

## 3. n8n + AI Agents

### 3a. Multi-Platform AI Sales Agent with RAG (Template #4508) -- TOP PICK
- **URL:** https://n8n.io/workflows/4508
- **What it does:** 24/7 AI sales agent across WhatsApp, Instagram, Facebook, Telegram, website. Transcribes voice messages. RAG-powered knowledge base (PostgreSQL + pgvector). Modular sub-workflows: CRM Agent (Airtable) + Calendar Agent (Google Calendar). Full omni-channel lead handling.
- **What we can steal:** The modular sub-workflow architecture. Main agent orchestrates, calls CRM sub-workflow and Calendar sub-workflow as tools. This is exactly how to structure dealership AI: main conversation agent -> inventory lookup tool -> appointment booking tool -> CRM update tool.
- **Gotchas:** Complex setup (7+ credentials). Voice transcription adds latency. 4540 views = well-tested.

### 3b. AI Real Estate Agent: End-to-End Ops (Template #4368)
- **URL:** https://n8n.io/workflows/4368
- **What it does:** Three workflows: (1) Web lead qualification + scoring with AI intent/urgency classification, (2) Data research + content generation on schedule, (3) Voice call outreach with lead qualification. Uses GPT-4o Mini via Langchain.
- **What we can steal:** The AI lead scoring system: classify intent (buying, selling, inquiry) + urgency -> composite score -> route to appropriate salesperson or automation. Property database lookup maps directly to vehicle inventory lookup.
- **Gotchas:** Real estate specific prompts need rewriting for automotive. Three separate workflows to maintain.

### 3c. BANT Lead Qualification with AI (Template #8773)
- **URL:** https://n8n.io/workflows/8773
- **What it does:** Form captures lead data -> Google Gemini AI scores on BANT framework (Budget, Authority, Need, Timing) -> routes hot/mid/cold: Hot -> calendar booking, Mid -> WhatsApp engagement, Cold -> nurturing email.
- **What we can steal:** The BANT scoring framework adapted for automotive: Budget (financing pre-approval range), Authority (primary buyer vs researcher), Need (new vs used, trade-in), Timing (buying this week vs 6 months). The 3-tier routing is clean.
- **Gotchas:** Form-based only. Would need webhook trigger for CRM-originated leads.

### 3d. GoHighLevel SMS AI Agent with Knowledge Base (Template #4223)
- **URL:** https://n8n.io/workflows/4223
- **What it does:** Scrapes company website on schedule -> builds vector knowledge base -> receives GoHighLevel SMS -> AI answers from knowledge base -> responds via SMS. Uses Bright Data for scraping, OpenAI for embeddings + chat, Redis for memory.
- **What we can steal:** The auto-updating knowledge base from website scraping. Dealership inventory pages change daily. Scrape inventory nightly, rebuild vector store, AI agent always has current pricing/availability. This is the "always up-to-date" pattern.
- **Gotchas:** Bright Data is paid. Requires self-hosted n8n for community nodes. Vector store in memory (not persistent across restarts without external DB).

### 3e. B2B Lead Gen + AI Email Campaigns (Template #8269)
- **URL:** https://n8n.io/workflows/8269
- **What it does:** 6-workflow system: lead scraping (Google Maps via Apify) -> email extraction -> SendGrid campaigns with tracking IDs -> webhook event processing (opens, clicks, bounces) -> Gmail reply detection + AI classification (Interested/Not Interested/Misc) -> automated follow-ups at day 5 and day 10.
- **What we can steal:** The complete outbound pipeline architecture. Especially: embedded tracking IDs for attribution, AI reply classification, and the priority logic for status updates (delivered < opened < clicked < replied). The follow-up timing (5 day, 10 day) is configurable.
- **Gotchas:** Massive workflow (130+ nodes across 6 sub-workflows). Google Maps scraping for dealership leads is ethically gray. Better to use this architecture with opt-in lead lists.

---

## 4. n8n Dealership/Automotive Specific

### 4a. Otto: AI Automotive Call Center
- **URL:** https://github.com/theblockchainbaby/Otto
- **What it does:** Voice + workflow automation platform for dealerships, repair shops, service centers. Handles inbound/outbound calls, appointment scheduling, CRM integration, lead follow-up. Uses ElevenLabs for voice AI + n8n for orchestration.
- **What we can steal:** The concept validation that n8n + voice AI for dealerships is a real product. Their architecture (ElevenLabs + n8n + custom AI) is similar to what we'd build. Study their call flow design.
- **Gotchas:** Small repo (0 stars), likely early stage or internal. May not have public workflow files. ElevenLabs voice costs can be high at volume.

### 4b. Used Car AI Agent with Airtop (Template #3483)
- **URL:** https://n8n.io/workflows/3483
- **What it does:** AI agent that opens automated browser sessions to fill out car details on resale marketplaces and captures vehicle offer valuations. Automated vehicle valuation across multiple platforms.
- **What we can steal:** Automated vehicle valuation is a huge dealership use case. "Your [Year] [Make] [Model] is worth $X based on current market data." Feed this into SMS nurturing: "Hey [Name], we just checked - your 2020 Accord could get you $22,500 in trade-in value this month."
- **Gotchas:** Airtop is a browser automation tool (paid). Marketplace scraping may violate ToS.

---

## 5. n8n Lead Warming/Nurturing Patterns

### 5a. n8n AI Appointment Manager (GitHub)
- **URL:** https://github.com/justhassann/n8n-ai-appointment-manager
- **JSON file:** `handling appointments and lead followup.json` (ready to import)
- **What it does:** Cal.com webhook -> personalized SMS via Twilio -> AI analyzes replies (confirmation/questions/no response) -> routes to confirm, escalate to human, or schedule reminder.
- **What we can steal:** The reply classification pattern: "confirmed" / "has questions" / "no response" and the corresponding routing. For dealerships: appointment set -> SMS reminder -> customer replies "running late" -> AI understands and adjusts.
- **Gotchas:** Cal.com specific trigger. Swap for any calendar webhook.

### 5b. WhatsApp Lead Re-engagement Drip (GitHub)
- **URL:** https://github.com/janmaaarc/n8n-lead-reengagement-workflow
- **JSON file:** `workflow.json` (ready to import)
- **What it does:** Identifies 90+ day inactive leads -> 5-day WhatsApp drip campaign -> AI (Google Gemini) categorizes response engagement levels -> Slack daily summaries -> Google Sheets tracking.
- **What we can steal:** The 90-day re-engagement trigger is perfect for service departments: "Your [Vehicle] is due for its 30K mile service. Book online or reply to schedule." The 5-day cadence prevents spam while maintaining presence.
- **Gotchas:** WhatsApp Business API is more complex than Twilio SMS. WhatsApp template messages need pre-approval.

### 5c. YouTube-to-WhatsApp Sales Nurturing (Template #3808)
- **URL:** https://n8n.io/workflows/3808
- **What it does:** Lead source (YouTube/Instagram CTA) -> landing page form -> webhook to n8n -> Google Sheets backup -> FluentCRM tagging ("New Lead") -> email warmup sequence (5 emails) -> WhatsApp outreach 1hr after form fill -> manual sales follow-up -> CRM tag updates (New Lead -> Engaged -> Customer).
- **What we can steal:** The tag-based lifecycle tracking: New Lead -> Engaged -> Customer. The 1-hour delay before WhatsApp is smart (not too eager, not too late). The 5-email warmup sequence template structure.
- **Gotchas:** FluentCRM is WordPress-specific. Adapt tag system to any CRM.

### 5d. Automated Outreach with AI + Gmail (Template #5479)
- **URL:** https://n8n.io/workflows/5479
- **What it does:** Schedule trigger (every 60 min) -> fetch leads from Google Sheet -> validate emails -> scrape lead websites for context -> Google Gemini generates personalized cold outreach -> send via Gmail -> update status to "Contacted".
- **What we can steal:** The website scraping for personalization context. For automotive: scrape customer's social media or past purchase data to personalize: "Since you drive a [Current Vehicle], you might love the new [Model] with [Feature they'd care about]."
- **Gotchas:** Gmail sending limits (~500/day for personal, ~2000/day for Workspace). Need rate limiting.

---

## 6. n8n Webhook Patterns & Best Practices

### 6a. Event-Driven Architecture Patterns (Medium Article)
- **URL:** https://medium.com/@Nexumo_/8-event-driven-architectures-with-webhooks-queues-and-n8n-34f08e3a8a43
- **Key patterns for our use:**
  1. **Webhook Fan-Out:** One event triggers parallel branches (notify Slack + enrich CRM + write to DB). Use for: lead comes in -> simultaneously update CRM, send SMS, notify salesperson, log to analytics.
  2. **Debounce/Deduplicate:** Redis cache prevents processing duplicate webhook events. Use for: CRM webhooks that fire multiple times for same update.
  3. **Outbox Pattern:** Transactional integrity -- prevents "lead saved to DB but webhook failed" scenarios.
  4. **Dead-Letter Queue:** Failed CRM updates get queued and replayed. Critical for production reliability.
- **Gotchas:** Adds complexity. Start simple (linear webhook -> process -> CRM), add patterns as scale demands.

### 6b. n8n Webhook Node Best Practices
- **URL:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **URL:** https://till-freitag.com/en/blog/n8n-best-practices-guide-en
- **Key practices:**
  - Always validate input fields with IF node before main logic
  - Set Response Mode explicitly (Immediately vs When Last Node Finishes)
  - Use trigger condition filtering to reduce unnecessary executions
  - Test with edge cases: missing fields, duplicate events, rapid-fire submissions
  - For CRM updates: enrich/transform data BEFORE insertion (not after)

### 6c. Webhook -> CRM Update Pattern (Composite)
Based on research, the canonical pattern is:
```
Webhook Trigger
  -> Validate (IF node: required fields exist?)
    -> YES: Deduplicate (check Redis/DB for recent identical event)
      -> NEW: Transform (Set node: map fields to CRM schema)
        -> Fan-out parallel:
          Branch 1: CRM Create/Update
          Branch 2: Send notification (Slack/email)
          Branch 3: Log to analytics sheet
      -> DUPLICATE: Discard or merge
    -> NO: Error handler (log bad data, alert admin)
```

---

## GitHub Repos with Actual JSON Workflow Files

| Repo | Stars | JSON Available | Best For |
|------|-------|---------------|----------|
| [felipfr/awesome-n8n-workflows](https://github.com/felipfr/awesome-n8n-workflows) | 386 | Yes - 90+ CRM workflows, Twilio workflows in `/crm`, `/communication`, `/marketing` dirs | Reference library of production patterns |
| [ritik-prog/n8n-automation-templates-5000](https://github.com/ritik-prog/n8n-automation-templates-5000) | 334 | Yes - 5000+ workflows organized by platform | Bulk template mining |
| [enescingoz/awesome-n8n-templates](https://github.com/enescingoz/awesome-n8n-templates) | 20,669 | Yes - 280+ templates | Most popular collection |
| [lucaswalter/n8n-ai-automations](https://github.com/lucaswalter/n8n-ai-automations) | 1,412 | Yes - AI-focused workflows | AI agent patterns |
| [justhassann/n8n-ai-appointment-manager](https://github.com/justhassann/n8n-ai-appointment-manager) | 2 | Yes - `handling appointments and lead followup.json` | SMS appointment follow-up |
| [janmaaarc/n8n-lead-reengagement-workflow](https://github.com/janmaaarc/n8n-lead-reengagement-workflow) | 0 | Yes - `workflow.json` | WhatsApp drip re-engagement |
| [abhiram0709/Cold-Mail-Automation-Using-N8N](https://github.com/abhiram0709/Cold-Mail-Automation-Using-N8N-With-Brevo-CRM) | 7 | Yes - Cold email workflow | Outbound email patterns |
| [theblockchainbaby/Otto](https://github.com/theblockchainbaby/Otto) | 0 | Check repo | Automotive AI call center |

---

## Priority Recommendations for Automotive Agency

### Immediate Builds (Week 1-2)
1. **Lead Intake Webhook** -- Adapt Template #6102 (Salesforce Lead Capture). Swap Salesforce for GoHighLevel. Webhook -> validate -> AI personalize -> CRM + SMS/email.
2. **SMS Drip Nurturing** -- Fork Template #6213 (Solar Lead Reactivation). Change copy from solar to automotive. Keep the AI sentiment detection on replies.
3. **Appointment Follow-Up** -- Import `handling appointments and lead followup.json` from justhassann repo. Adapt for dealership service appointments.

### Phase 2 (Week 3-4)
4. **AI Lead Qualifier** -- Build from Template #8773 (BANT). Customize scoring for automotive: Budget -> financing tier, Need -> vehicle type, Timing -> purchase window.
5. **Conversational AI via SMS** -- Combine Template #9220 (GPT-4 SMS) with Template #4223 (GHL Knowledge Base). AI answers inventory questions via SMS with conversation memory.

### Phase 3 (Month 2)
6. **Multi-Channel Sales Agent** -- Adapt Template #4508 (Multi-Platform AI Sales Agent). Add vehicle inventory RAG, appointment booking sub-workflow, trade-in valuation tool.
7. **Voice AI Integration** -- Study Otto repo architecture. Build n8n + ElevenLabs/VAPI.ai for inbound call handling.

### Key Technical Decisions
- **CRM:** GoHighLevel (native n8n node, automotive industry adoption, built-in SMS)
- **SMS:** Twilio (most template support, MCP server available, reliable)
- **AI:** OpenAI GPT-4o for qualification, Claude for complex reasoning, Gemini for cost-sensitive batch ops
- **Database:** PostgreSQL with pgvector (conversation memory + RAG knowledge base)
- **Lead Tracking:** Google Sheets for MVP, migrate to Airtable or Supabase at scale
