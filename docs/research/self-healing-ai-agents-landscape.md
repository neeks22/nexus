# Self-Healing AI Agents in Production: GitHub Landscape Report

**Date:** 2026-03-28
**Scope:** 6 domains researched, 15+ repos evaluated, 20+ web sources consulted

---

## 1. AI Agent + n8n (Error Handling, Retries, Fallbacks)

### Top Repos & Resources

#### n8n-claw (freddy-schuetz/n8n-claw) -- 318 stars
- **URL:** https://github.com/freddy-schuetz/n8n-claw
- **Architecture:** Autonomous AI agent built entirely in n8n. Claude Sonnet core, PostgreSQL data layer, MCP skill system, Telegram/webhook I/O, background heartbeat scheduler (every 5 min).
- **Memory:** Multi-tier -- short-term (conversation history in Postgres), long-term (daily consolidation at 3am), vector search (OpenAI/Voyage/Ollama embeddings), project memory (persistent markdown docs).
- **Self-healing:** Background heartbeat ensures recurring tasks recover. n8n native retry on failed HTTP calls. Fallback model support in Agent nodes. However, no explicit circuit breaker or health scoring.
- **Reusable:** MCP skill abstraction pattern (decouple integrations from core agent). Background heartbeat pattern for proactive monitoring. Multi-tier memory architecture.
- **Code Quality:** Well-organized workflow modules. No visible unit tests. Setup script creates hardcoded workflows (brittle). Credentials stored in plaintext (acknowledged limitation). Suitable for small teams, not enterprise.

#### awesome-n8n-templates (enescingoz/awesome-n8n-templates) -- 20,669 stars
- **URL:** https://github.com/enescingoz/awesome-n8n-templates
- **Architecture:** 280+ curated templates across 18 categories. Includes "Qualify new leads in Google Sheets via GPT-4" and various AI agent templates.
- **Reusable:** Template library for rapid prototyping. Lead qualification template directly applicable.
- **Code Quality:** Template collection, not a framework. Quality varies per template.

#### n8n Error Handling Patterns (documented by PageLines)
- **URL:** https://www.pagelines.com/blog/n8n-error-handling-patterns
- **Patterns documented:**
  1. **Exponential Backoff** -- 1s/2s/4s/8s progression. Reduces permanent failure rate from 4.7% to 0.9%.
  2. **Dead Letter Queue** -- Routes unrecoverable errors to Airtable with alerts. Keeps main workflow running.
  3. **Circuit Breaker** -- Halts after 5 consecutive failures, 60s pause. Uses `$getWorkflowStaticData('global')` for state.
  4. **Observability** -- Slack/PagerDuty alerts with direct execution links.

#### n8n Official Production Guide
- **URL:** https://blog.n8n.io/best-practices-for-deploying-ai-agents-in-production/
- **Key patterns:** Queue mode with Redis workers for scale. Fallback models in Agent nodes. Structured output validation with auto-retry. Health checks every 5-10 min. Prometheus metrics at `/metrics`. Graceful degradation (popular items when recommendation engine down).

### Relevance to Nexus
The n8n circuit breaker pattern (5 failures / 60s cooldown) maps directly to Nexus's circuit breaker (3 failures / 60s). The exponential backoff and DLQ patterns align with Nexus's error taxonomy split between infrastructure errors (retry/backoff) and output quality errors (reprompt/reflect). The n8n ecosystem lacks health scoring and self-healing at the agent level -- exactly the gap Nexus fills.

---

## 2. Conversational AI for Sales (Multi-Turn Lead Qualification)

### Top Repo

#### SalesGPT (filip-michalsky/SalesGPT) -- 2,600 stars
- **URL:** https://github.com/filip-michalsky/SalesGPT
- **Architecture:** LangChain-based agent with explicit conversation stage management. React frontend + Python backend. LiteLLM integration supporting 50+ models. Docker deployment.
- **Conversation Stages:** Introduction -> Qualification -> Value Proposition -> Needs Analysis -> Solution Presentation -> Objection Handling -> Close -> End. The agent is "context-aware" -- it determines which stage it is in and acts accordingly.
- **Channels:** Voice, email, SMS, WhatsApp, WeChat, Weibo, Telegram.
- **Tool Integration:** Stripe (payments), Calendly (scheduling), product knowledge bases.
- **Code Quality:** 464 commits. Poetry dependency management. GitHub Actions CI. pytest unit tests. Contributing guidelines. LangSmith tracing for debugging. Last commit August 2024 -- potentially stale.
- **Reusable:**
  - Conversation stage state machine pattern (directly applicable to lead qualification flows)
  - `step()` / `human_step()` API for multi-turn management
  - Tool-calling pattern for CRM/calendar integration
  - Stage-based qualification logic

### What's Missing from SalesGPT
No self-healing when API calls fail. No health monitoring. No bilingual support. No CASL/TCPA compliance layer. No human handoff mechanism. These are all gaps Nexus agents could fill.

---

## 3. AI Handoff Patterns (AI -> Human Transfer)

### Key Implementations

#### OpenAI Agents SDK Handoffs
- **URL:** https://openai.github.io/openai-agents-python/handoffs/
- **Pattern:** Handoffs appear as tools to the LLM (e.g., `transfer_to_refund_agent`). Receiving agent sees entire conversation history by default. `input_filter` can modify what the next agent receives. `on_handoff` callback fires on transfer. `is_enabled` allows runtime enable/disable.
- **Limitation:** Agent-to-agent only. No built-in AI-to-human escalation path.

#### AutoGen Handoffs
- **URL:** https://microsoft.github.io/autogen/stable//user-guide/core-user-guide/design-patterns/handoffs.html
- **Pattern:** Three message types: UserLogin, UserTask (contains chat history), AgentResponse. HumanAgent type subscribes to task messages and prompts for human input. Full conversation context transferred on delegation.
- **Reusable:** The HumanAgent pattern is directly applicable to sales escalation. Supports Slack/Teams integration for real-world handoff.

#### Dialogflow Agent-Human Handoff (dialogflow/agent-human-handoff-nodejs) -- 211 stars
- **URL:** https://github.com/dialogflow/agent-human-handoff-nodejs
- **Architecture:** Dialogflow NLU + Node.js/Express + Socket.IO. Dual web interfaces (customer + operator).
- **Handoff Triggers:**
  1. Explicit: Customer says "let me talk to a person" -> `operator_request` context
  2. Automatic: 2 consecutive unmatched inputs -> fallback chain forces handoff
- **Context Transfer:** Server monitors Dialogflow response objects for escalation context. Stops routing to AI, starts routing to human operator.
- **Code Quality:** Learning tool / experiment, not production-ready. No auth, in-memory storage, no persistence.
- **Reusable:** Context-based routing pattern. Dual-trigger escalation (explicit request + failure detection). Multi-conversation management.

### Production Escalation Triggers (from industry research)
- **Sentiment:** Negative sentiment detection, frustration, confusion
- **Loops:** AI repeatedly fails to interpret intent (2+ consecutive failures)
- **Value:** High-value purchase decisions above dollar thresholds
- **Complexity:** Custom solution requirements, contract terms, negotiation
- **Explicit:** Customer directly asks for a human
- **Source:** https://www.replicant.com/blog/when-to-hand-off-to-a-human-how-to-set-effective-ai-escalation-rules

### Relevance to Nexus
Nexus's health state model (HEALTHY -> DEGRADED -> RECOVERING -> FAILED) can serve as a handoff trigger. When an agent enters DEGRADED or FAILED state during a sales conversation, it should automatically hand off to a human with full transcript context. The OpenAI SDK's `on_handoff` callback pattern maps cleanly to Nexus's event system (eventemitter3).

---

## 4. Lead Scoring with AI

### Top Repos

#### lead-qualifier-ai (josepino/lead-qualifier-ai)
- **URL:** https://github.com/josepino/lead-qualifier-ai
- **Architecture:** n8n workflow with 7 stages: Webhook trigger (Tally) -> Data normalization -> AI scoring via Gemini (0-100) -> Composite scoring engine -> Classification (Cold/Warm/Hot) -> Research enrichment via Perplexity -> Multi-platform storage (Google Sheets, Notion, Telegram).
- **Scoring Method:** Gemini evaluates expressed needs. Composite engine combines AI score, company size, contact validity. Only Warm/Hot leads trigger Telegram notifications.
- **Code Quality:** 5 files total. Workflow JSON + README. Early stage, no tests, not production-tested.
- **Reusable:** Multi-stage qualification pipeline template. AI scoring prompt structure. Composite scoring pattern (AI + rules).

#### ai-lead-generator (brightdata/ai-lead-generator) -- 38 stars
- **URL:** https://github.com/brightdata/ai-lead-generator
- **Architecture:** Three-stage pipeline: NLP filter extraction (OpenAI) -> Web scraping (Bright Data) -> AI enrichment and ranking (OpenAI). Streamlit UI. Python 3.9+.
- **Reusable:** OpenAI prompt pattern for filter extraction. Lead enrichment workflow.

#### LeadQualifier (xeneta/LeadQualifier)
- **URL:** https://github.com/xeneta/LeadQualifier
- **Architecture:** Traditional ML approach (not LLM-based). Useful as baseline comparison.

### LLM-Based Lead Scoring Patterns (from Refuel.ai research)
- **URL:** https://www.refuel.ai/blog-posts/how-to-score-and-qualify-leads-with-llms
- LLMs analyze unstructured data from emails, chat conversations, and social media
- NLP interprets language, tone, and context to detect lead intent and sentiment
- AI lead scoring ranks prospects by probability of engagement using intent signals

### Relevance to Nexus
The composite scoring pattern (AI score + rules engine) is the right approach for Nexus clients. The AI provides nuanced signal detection from conversation text, while deterministic rules handle budget thresholds, company size, and compliance flags. Nexus's self-healing pipeline ensures scoring API calls recover from failures rather than dropping leads silently.

---

## 5. CASL/TCPA Compliance in Code

### Finding: No Dedicated Open-Source Repos Exist

Despite extensive searching, there are no meaningful open-source repositories specifically implementing CASL or TCPA compliance automation. This is a significant market gap.

### What Exists

#### Consent Management Platforms (GDPR-focused)
- **ConsentStack/cmp** -- https://github.com/ConsentStack/cmp -- Open source, developer-focused consent management
- **osano/cookieconsent** -- https://github.com/osano/cookieconsent -- Cookie consent for EU/CCPA/GDPR
- **OpencontentCoop/consent-manager** -- https://github.com/OpencontentCoop/consent-manager -- GDPR consent tracking
- All are web cookie/GDPR focused. None handle CASL's express/implied consent distinction or TCPA SMS opt-in tracking.

#### Commercial Solutions
- **Twilio Compliance Toolkit** -- AI-powered detection of regulatory missteps. Consent Management API for SMS. Not open source.
  - Source: https://www.twilio.com/en-us/blog/products/launches/introducing-compliance-toolkit

### CASL Requirements That Need Code
1. **Express vs. Implied Consent Tracking** -- Implied consent expires (6 months for inquiry, 2 years for business relationship). Must track expiry dates.
2. **Unsubscribe Processing** -- Must process within 10 business days. Must be functional and visible.
3. **Sender Identification** -- Every CEM must include company name, mailing address, contact details.
4. **Consent Records** -- Immutable, encrypted logs of every opt-in/opt-out. Must document date, time, method.
5. **Penalties** -- Up to $1M individual / $10M corporate per infraction.
   - Source: https://crtc.gc.ca/eng/com500/faq500.htm

### TCPA Requirements for SMS
1. **Express Written Consent** -- Required before promotional/automated messages.
2. **Consent Records** -- Retain for 4+ years. Log date, time, method, exact opt-in language.
3. **Opt-Out Compliance** -- Must honor STOP/UNSUBSCRIBE immediately.
4. **Penalties** -- $500-$1,500 per message violation.
   - Source: https://activeprospect.com/blog/tcpa-text-messages/

### Relevance to Nexus
This is a **differentiation opportunity**. No one has built an open-source CASL/TCPA compliance layer for AI agent outreach. A Nexus compliance module that tracks consent state, enforces expiry rules, and logs immutably would be a selling point for Canadian agency clients. The self-healing pipeline can enforce compliance checks as a pre-flight step before any outbound message.

---

## 6. Bilingual AI Agents (English/French)

### Top Repo

#### Parlant (emcie-co/parlant) -- 17,900 stars
- **URL:** https://github.com/emcie-co/parlant
- **Architecture:** Context-engineering framework for customer-facing AI agents. Condition-action guideline system. Canned responses for strict mode. Journey-based multi-turn SOPs. Per-turn context matching (not massive system prompts).
- **Bilingual Support:** Glossary feature maps domain-specific vocabulary with synonyms across languages. Observations trigger language-specific guidelines. Community translations in 7+ languages including French.
- **Tech Stack:** Python 3.10+. LLM-agnostic (OpenAI, Anthropic, LiteLLM). OpenTelemetry tracing. Apache 2.0 license.
- **Code Quality:** 5,398 commits. pytest + mypy + GitHub Actions CI. 17.9K stars indicates strong adoption.
- **Reusable:**
  - Guideline condition-action system (when user speaks French, activate French guidelines)
  - Glossary for bilingual term mapping
  - Journey system for multi-turn bilingual SOPs
  - Per-turn context narrowing (reduces token cost significantly)

#### rasa_multi_bot (souvikg10/rasa_multi_bot)
- **URL:** https://github.com/souvikg10/rasa_multi_bot
- **Architecture:** Rasa-based multi-lingual bot with Facebook/Chatfuel integration. Separate TensorFlow embedding models for French and English.
- **Reusable:** Dual-model architecture pattern. Language-specific NLU pipelines.

### Bilingual Best Practices (from industry research)
- **URL:** https://www.useinvent.com/blog/how-to-build-effective-multilingual-ai-agents-2025-best-practices-guide
- Include localization instructions in system prompt for every part of the flow
- Auto-detect language and respond in same language
- Allow user to reset to preferred language at any time
- Handle code-switching (mixing English/French in same message) gracefully

### Relevance to Nexus
For Canadian clients, Parlant's guideline system is the most architecturally sound approach. Rather than a single massive bilingual system prompt, conditions detect language and activate the appropriate guideline set. This maps to Nexus's pre-flight step: detect language before execution, load appropriate prompt variant, validate response language in post-flight.

---

## 7. Bonus: Production Self-Healing Frameworks

### mission-control (builderz-labs/mission-control) -- 3,500 stars
- **URL:** https://github.com/builderz-labs/mission-control
- **Architecture:** Next.js 16 + TypeScript 5.7 + SQLite. 101 REST API endpoints. Multi-gateway supporting OpenClaw, CrewAI, LangGraph, AutoGen, Claude SDK.
- **Self-Healing:** Webhook delivery with exponential backoff + circuit breaker. Background task scheduler for reconciliation. Drift detection (10% threshold vs 4-week baseline). Trust posture scoring (0-100).
- **Code Quality:** 577 tests (282 Vitest unit + 295 Playwright E2E). TypeScript strict mode. 39 DB migrations. RBAC. Docker hardened variant. MIT license. Alpha software.
- **Reusable:** Framework adapter pattern. Four-layer eval framework. Trust scoring. Drift detection. The most architecturally aligned repo to Nexus's goals.

### cascadeflow (lemony-ai/cascadeflow) -- 305 stars
- **URL:** https://github.com/lemony-ai/cascadeflow
- **Architecture:** Cascading runtime -- tries cheap models first, validates quality, escalates only when needed. Python + TypeScript. n8n integration available.
- **Self-Healing:** Automatic retry + fallback. Quality validation (length, confidence, format, semantic alignment). Per-tool budget gating.
- **Cost Savings:** 60-93% cost reduction across benchmarks while retaining 96% quality.
- **Reusable:** Speculative execution pattern. Quality validation framework. Multi-model cost optimization. Direct n8n plugin.

### Self-Healing Lessons from 70+ Production Bugs
- **URL:** https://dev.to/_d7eb1c1703182e3ce1782/how-to-build-a-self-healing-ai-agent-system-lessons-from-70-production-bugs-2nep
- **Error Taxonomy (7 categories):** Encoding crashes, sync loops, validation gaps, resource exhaustion, pipeline deadlock, port conflicts, code injection.
- **Health Monitoring:** 13-check patrol loop every 10 seconds. 50+ restarts = escalate. Pipeline stall detection (tasks in "doing" > 30 min). Disk space alerts.
- **Three-Tier Escalation:** Auto-heal -> Alert (Discord/Telegram) -> Escalation task (diagnostic file for human).
- **Results:** Crash detection from hours to 10 seconds. 5+ days uninterrupted operation.

---

## Summary: What's Reusable for Nexus

| Pattern | Source | Nexus Integration Point |
|---------|--------|------------------------|
| Circuit breaker (5 failures / 60s) | n8n patterns | Already in Nexus (3 failures / 60s) |
| Exponential backoff with jitter | n8n, cascadeflow | Infrastructure error retry strategy |
| Dead letter queue | n8n patterns | Tombstone + error logging |
| Conversation stage machine | SalesGPT | Lead qualification agent template |
| Handoff as tool call | OpenAI SDK, AutoGen | Agent-to-human escalation |
| Dual-trigger escalation | Dialogflow handoff | Explicit request + failure detection |
| Composite lead scoring | lead-qualifier-ai | AI score + rules engine |
| CASL consent state tracking | (gap -- build this) | Pre-flight compliance check |
| Guideline condition-action | Parlant | Bilingual prompt management |
| Speculative execution | cascadeflow | Cost optimization layer |
| Trust posture scoring | mission-control | Agent health scoring extension |
| 13-check patrol loop | Production bugs article | Health monitoring daemon |
| Three-tier escalation | Production bugs article | Auto-heal -> alert -> human task |

## Top Recommendations

1. **Build a CASL/TCPA compliance module** -- No open-source solution exists. First-mover advantage for Canadian market.
2. **Adopt Parlant's guideline pattern** for bilingual agents -- condition-action pairs beat monolithic bilingual prompts.
3. **Integrate cascadeflow** for cost optimization -- 60-93% savings with minimal quality loss. Has n8n plugin.
4. **Use SalesGPT's stage machine** as template for lead qualification agents -- proven pattern, 2.6K stars.
5. **Implement OpenAI SDK handoff pattern** with Nexus health state as trigger -- DEGRADED/FAILED state triggers `transfer_to_human`.
6. **Study mission-control's eval framework** -- four-layer evaluation (output, trace, component, drift) is production-grade.
