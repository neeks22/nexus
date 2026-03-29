# Retell AI Deep Research Brief
**Date:** 2026-03-28
**Purpose:** Evaluate Retell AI for dealership AI automation project integration

---

## 1. What is Retell AI

Retell AI is a **conversational voice AI platform** for building, testing, deploying, and monitoring production-ready AI phone agents. It is a Y Combinator W24 company (YC W24) that has grown to a 4.8/5 rating across 929+ reviews on G2, winning the 2026 G2 Best Agentic AI Software Products award.

**Core product:** A platform that replaces traditional IVR systems with natural-sounding AI voice agents that can handle both inbound and outbound phone calls autonomously.

**How it works architecturally:**
1. **Build** -- Create voice agents using no-code Conversation Flow builder, Single Prompt, or Multi-Prompt configurations. You can also bring your own Custom LLM via webhook.
2. **Test** -- Interactive testing and validation in the dashboard before deployment.
3. **Deploy** -- Connect to telephony (Retell-provided numbers, Twilio SIP trunk, or custom telephony via SIP).
4. **Monitor** -- Real-time dashboards with metrics: call completion status, task completion, user sentiment, average end-to-end latency, network latency.

**Agent types:**
- **Conversation Flow** -- Visual state machine where you break a call into multiple states, each with shorter prompts and fewer tool choices (reduces hallucination).
- **Single Prompt** -- One system prompt governs the entire conversation.
- **Multi Prompt** -- Multiple prompt stages within one agent.

**Source:** [Retell AI Homepage](https://www.retellai.com), [Retell AI Docs](https://docs.retellai.com/general/introduction)

---

## 2. API and Integration Capabilities

### REST API
- Full REST API at `api.retellai.com`
- Key endpoint: `POST /v2/create-phone-call` -- programmatically trigger outbound calls
- Request authentication via `Authorization: Bearer <api_key>` header
- Request verification via `X-Retell-Signature` header for incoming webhooks

### SDKs
- **Python SDK:** `retell-python-sdk` ([GitHub](https://github.com/RetellAI/retell-python-sdk))
- **TypeScript SDK:** `retell-typescript-sdk` ([GitHub](https://github.com/RetellAI/retell-typescript-sdk))
- Both support async operations, typed request/response objects, and error handling

### Twilio Integration (Confirmed)
- Native integration via **Elastic SIP Trunking**
- Whitelist Retell SIP SBC CIDR block: `18.98.16.120/30`
- Origination SIP URI: `sip:sip.retellai.com`
- Import existing Twilio phone numbers in E.164 format
- Supports both inbound and outbound calls through your existing Twilio numbers
- **This means you can keep your existing Twilio numbers and route them through Retell**

### CRM Integration
- Real-time customer profile access during calls via custom functions
- Automated call detail logging into CRM systems post-call
- Conversation context syncing for agent handoffs
- No native Activix CRM connector, but achievable via webhooks + n8n

### Webhook Events
Retell sends **three webhook events per call:**
1. `call_started` -- when the call begins
2. `call_ended` -- when the call terminates
3. `call_analyzed` -- post-call analysis with transcript, sentiment, and metadata

### Custom Functions (Mid-Call API Calls)
- Define functions in the Retell dashboard with names, descriptions, and endpoint URLs
- Retell sends POST requests to your endpoints during the call
- Configure parameters using JSON schema
- Control whether the agent speaks during or after function execution
- Use cases: CRM lookup, appointment booking, inventory check

**Sources:** [Retell API Docs](https://docs.retellai.com/general/introduction), [Twilio Integration Docs](https://docs.retellai.com/deploy/twilio), [Voice API Integration Blog](https://www.retellai.com/blog/how-to-integrate-phone-ai-agents-with-your-existing-api-systems)

---

## 3. Pricing

### Pay-As-You-Go (No Platform Fee)
| Component | Cost |
|-----------|------|
| Retell Voice Infrastructure | $0.055/min |
| TTS (Retell/OpenAI/Cartesia/Minimax/Fish) | $0.015/min |
| TTS (ElevenLabs) | $0.040/min |
| LLM -- GPT-4.1 (Recommended) | $0.045/min |
| LLM -- Claude 4.5 Sonnet | $0.080/min |
| LLM -- GPT-5 mini | $0.012/min |
| LLM -- GPT-5 nano | $0.003/min |
| LLM -- Gemini 3.0 Flash | $0.027/min |
| Telephony (US via Twilio/Telnyx) | $0.015/min |

**Realistic total cost per minute (production):**
- Budget config (GPT-5 nano + Retell TTS): ~$0.088/min
- Mid-tier (GPT-4.1 + Retell TTS): ~$0.130/min
- Premium (Claude 4.5 + ElevenLabs): ~$0.190/min

### Monthly Costs
| Item | Cost |
|------|------|
| Phone number (Retell) | $2.00/mo |
| SMS capability | $20.00/mo |
| Additional concurrent calls (beyond 20 free) | $8.00/call/mo |
| Knowledge Base (beyond 10 free) | $8.00/mo |
| Verified Phone Number | $10.00/mo |

### Add-Ons
| Feature | Cost |
|---------|------|
| Knowledge Base (RAG) | +$0.005/min |
| Batch Call | +$0.005/dial |
| Branded Call (caller ID) | +$0.10/outbound call |
| Advanced Denoising | +$0.005/min |
| Safety Guardrails | +$0.005/min |
| PII Removal | +$0.01/min |
| AI Quality Assurance | $0.10/min (first 100 free) |

### Enterprise
- Custom pricing with volume discounts (potentially as low as $0.05/min)
- No concurrent call cap
- Dedicated support

### Free Tier
- $10 in credits
- 20 concurrent calls included

**Source:** [Retell AI Pricing](https://www.retellai.com/pricing), [Ringg AI Pricing Analysis](https://www.ringg.ai/blogs/retell-ai-pricing), [Dialora Pricing Guide](https://www.dialora.ai/blog/retell-ai-pricing)

---

## 4. Voice AI for Sales / Dealership Use

### Inbound Call Handling
- Answer every call 24/7 with AI receptionist
- Route calls to correct department (sales, service, parts, finance)
- Qualify leads by asking budget, timeline, vehicle preference questions
- Book test drive appointments directly into calendar systems
- Handle inventory inquiries via custom function calls to your DMS

### Outbound Call Capabilities
- Programmatic outbound via `POST /v2/create-phone-call`
- Dynamic variables per call (customer name, vehicle of interest, etc.)
- Lead follow-up sequences triggered by CRM events
- Appointment confirmation and reminder calls
- Service recall notifications
- Past-due service reminder campaigns

### Lead Qualification via Phone
Retell supports this through:
- **Conversation Flow states** -- Build a qualification tree: greeting -> needs assessment -> budget qualification -> appointment booking -> handoff
- **Custom functions** -- Mid-call CRM lookup to check lead history in Activix
- **Dynamic variables** -- Pass lead data from Activix into the call (`retell_llm_dynamic_variables`)
- **Post-call webhooks** -- Push qualified lead data back to Activix via n8n

### Dealership-Specific Assessment
Retell does **not** have an automotive-specific product or published dealership case studies. However, the platform's capabilities map directly to dealership needs:

| Dealership Need | Retell Capability |
|----------------|-------------------|
| Missed call recovery | Inbound AI agent answers 24/7 |
| After-hours booking | Conversation Flow + calendar integration |
| Lead qualification | Multi-state prompt with scoring |
| Service scheduling | Custom functions + DMS integration |
| BDC replacement/augmentation | Outbound campaign via batch call API |
| Bilingual (EN/FR) | Native French support with auto-detection |
| Warm transfer to salesperson | Warm transfer with context briefing |

**Note:** Dedicated automotive AI platforms exist (Numa, Toma, Voiceflow for auto), but Retell offers far more customization and integration flexibility for a team building their own stack.

**Sources:** [Retell Use Cases](https://www.retellai.com/blog/best-use-cases-for-ai-voice-agents), [Retell Outbound Sales Blog](https://www.retellai.com/blog/retell-ai-voice-agents-transforms-ai-outbound-sales-calls)

---

## 5. Key Features

### Voice Quality
- Sub-second latency (~600ms typical end-to-end)
- Multiple TTS providers: Retell native, ElevenLabs, OpenAI, Cartesia, Minimax, Fish Audio
- Natural conversation with backchanneling ("uh-huh", "I see")
- Advanced denoising available as add-on

### Voice Cloning
- **Retell does NOT offer native voice cloning.** This is a known limitation.
- ElevenLabs voices (available as TTS option) do support cloning, but you would configure that on ElevenLabs side and use it within Retell.

### Multilingual Support
- **31+ languages supported**
- **Automatic language detection** for 10 languages including **English and French**
- Can dynamically switch languages mid-conversation
- Dedicated French AI page: [retellai.com/languages-ai/french-ai](https://www.retellai.com/languages-ai/french-ai)
- **Critical for Quebec dealerships** -- fully supports English/French bilingual conversations

### Conversation Intelligence
- Call Analysis: automatic post-call analysis
- Transcript generation
- User sentiment tracking
- Task completion status
- Call Completion Status metrics

### Knowledge Base (RAG)
- Upload documents for the agent to reference during calls
- +$0.005/min add-on
- 10 knowledge bases free, then $8/mo each
- Ideal for: vehicle inventory sheets, service menus, financing options, dealership policies

### Batch Calling
- Automated outbound campaigns
- +$0.005/dial
- Ideal for: service reminders, recall notices, lead follow-up campaigns

**Sources:** [Retell AI Homepage](https://www.retellai.com), [Retell AI Multilingual Blog](https://www.retellai.com/blog/how-to-use-ai-phone-agents-for-multilingual-communication), [CallBotics Review](https://callbotics.ai/blog/retell-ai-review)

---

## 6. Handoff Capabilities

### Cold Transfer
- Direct transfer to a phone number
- No context passed to the human agent
- Fast and simple
- Use case: "Please hold while I connect you to our service department"

### Warm Transfer
- AI briefs the human agent before completing the transfer
- Three-way introduce capability
- Context from the entire conversation is passed
- Can detect if the receiving party is human vs. voicemail
- Can leave a private message to the agent (not heard by customer)
- **This is the recommended approach for dealership sales handoffs**

### Configuration
1. Add "Call Transfer" function to your agent
2. Choose cold or warm transfer type
3. Specify destination phone number
4. Trigger via natural language prompt: e.g., "If the customer requests to speak with a salesperson, call 'transfer_call'"

### SIP Transfer
- Supports SIP-based transfer for PBX/phone system integration
- Can integrate with dealership phone systems directly

**Source:** [Call Transfer Feature](https://www.retellai.com/features/call-transfer), [Call Transfer Docs](https://docs.retellai.com/build/conversation-flow/call-transfer-node)

---

## 7. Competitive Landscape

| Feature | Retell AI | VAPI.ai | Bland AI | ElevenLabs | Air AI |
|---------|-----------|---------|----------|------------|--------|
| **Positioning** | Middleware platform, engineering-focused | Middleware orchestrator | Infrastructure-level, end-to-end | Audio AI platform (TTS leader) | Turnkey AI agent |
| **Latency** | ~600ms | ~700ms | ~800ms | sub-500ms (TTS ~75ms) | Not published |
| **Base price** | $0.07+/min | $0.05/min (orchestration only) | Comparable | $0.08-0.10/min | Higher |
| **Realistic cost** | $0.11-0.19/min | $0.13-0.31/min | Similar range | $0.10-0.15/min | Premium |
| **HIPAA** | Included | +$1,000/mo add-on | Included | Available | N/A |
| **Scale** | 20 free concurrent | Varies | 20,000+ calls/hr | High | Limited |
| **Custom LLM** | Yes (webhook) | Yes | Yes (built-in) | Yes | No |
| **No-code builder** | Yes (Conversation Flow) | Limited | Yes | Yes | Yes |
| **Voice cloning** | No (use ElevenLabs TTS) | Via providers | Limited | Best in class | Limited |
| **Multilingual** | 31+ languages | Multiple | Multiple | 70+ languages | English-focused |
| **n8n integration** | Community node + webhooks | Webhooks only | Webhooks only | Webhooks only | None |
| **Twilio BYO** | Yes (SIP trunk) | Yes | Yes | Yes | No |

### Verdict for Dealership Use Case
**Retell AI is the strongest choice** for this project because:
1. Best n8n integration (native community node)
2. Strong Twilio SIP trunk support (keep existing numbers)
3. French + English bilingual with auto-detection
4. Warm transfer with context (critical for sales handoffs)
5. Custom function calls mid-conversation (CRM lookups, appointment booking)
6. Conversation Flow builder (ideal for structured lead qualification)
7. Competitive pricing at scale

**Sources:** [Softcery Comparison](https://softcery.com/lab/choosing-the-right-voice-agent-platform-in-2025), [Bland AI Comparison](https://www.bland.ai/blogs/bland-ai-vs-retell-vs-vapi-vs-air), [White Space Solutions Comparison](https://www.whitespacesolutions.ai/content/bland-ai-vs-vapi-vs-retell-comparison), [GetVoIP Alternatives](https://getvoip.com/blog/retell-ai-alternatives/)

---

## 8. Automotive/Dealership Use Cases

### No Direct Case Studies Found
Retell AI does not publish automotive-specific case studies. Their documented verticals are: Healthcare, Financial Services, Insurance, Hospitality, Retail, Logistics, Home Services, Debt Collection, Telecom, and E-commerce.

### Competing Automotive-Specific Platforms
- **Numa** -- 1,200+ dealerships, purpose-built for auto (but less customizable)
- **Toma** -- "AI Operating System for Dealership Conversations"
- **Voiceflow** -- Has automotive templates

### Why Retell is Still Better for This Project
The automotive-specific platforms are walled gardens. Retell offers:
- Full API access to build exactly what a dealership needs
- Integration with your existing stack (Nexus, n8n, Activix, Twilio)
- No vendor lock-in on the AI brain (swap LLMs freely)
- Custom functions that can query any DMS/CRM
- You control the data pipeline end-to-end

**Sources:** [Numa](https://www.numa.com/), [Toma](https://www.toma.com/), [Voiceflow Auto](https://www.voiceflow.com/ai/car-dealerships)

---

## 9. n8n Integration

### Native Community Node
- **Package:** `@retellai/n8n-nodes-retellai`
- **Install:** Settings > Community Nodes > search "Retell AI" > Install
- Paste Retell API key to authenticate
- Actions available: Create phone call, manage agents, etc.

### Webhook Integration
- Configure webhook URL in Retell dashboard under agent settings > "Agent Level Webhook URL"
- Receives `call_started`, `call_ended`, `call_analyzed` events
- Each event includes `call_id` for correlation
- **Tip:** Filter on `call_analyzed` event in n8n to avoid triple-firing per call

### Custom Functions via n8n
- Retell sends POST to n8n webhook URL when agent hits a Custom Function node
- n8n processes the request (CRM lookup, calendar booking, etc.)
- n8n returns response data back to Retell agent
- Agent uses the response in the conversation

### Published n8n Workflow Templates
1. [Connect Retell Voice Agents to Custom Functions](https://n8n.io/workflows/3805-connect-retell-voice-agents-to-custom-functions/)
2. [AI Phone Agent with Google Calendar and RAG](https://n8n.io/workflows/3563-build-an-ai-powered-phone-agent-with-retell-google-calendar-and-rag/)
3. [Store Retell Transcripts in Sheets/Airtable/Notion](https://n8n.io/workflows/3504-store-retell-transcripts-in-sheets-airtable-or-notion-from-webhook/)
4. [Populate Dynamic Variables from Google Sheets](https://n8n.io/workflows/3385-populate-retell-dynamic-variables-with-google-sheets-data-for-call-handling/)

### Architecture Pattern for Dealership
```
Activix CRM (new lead)
  -> n8n webhook trigger
  -> n8n fetches lead data from Activix API
  -> n8n calls Retell API: create-phone-call with dynamic variables
  -> Retell agent calls the lead
  -> Mid-call: agent triggers custom function -> n8n -> Activix (check inventory)
  -> Call ends: Retell sends call_analyzed webhook -> n8n
  -> n8n updates Activix with call outcome, transcript, sentiment
  -> n8n triggers Nexus agent for follow-up actions if needed
```

**Sources:** [Retell n8n Integration Page](https://www.retellai.com/integrations/n8n), [n8n Workflow Templates](https://n8n.io/workflows/3805-connect-retell-voice-agents-to-custom-functions/), [DEV.to Guide](https://dev.to/mohammadarhamansari/building-ai-voice-agents-with-n8n-and-retell-ai-a-practical-guide-530l), [n8n Community Discussion](https://community.n8n.io/t/my-retell-ai-voice-agent-webhook-is-triggering-multiple-n8n-executions-per-call-and-i-only-want-one-execution-from-the-final-analyzed-event-to-run-my-automation/215323)

---

## 10. SDK/API Docs

### API Reference
- Base URL: `https://api.retellai.com`
- Auth: Bearer token (API key from dashboard)
- Key endpoints:
  - `POST /v2/create-phone-call` -- trigger outbound calls
  - Agent CRUD operations
  - Call retrieval and management
  - Phone number management

### TypeScript SDK (Most Relevant for Nexus)
```typescript
// npm install retell-sdk
import { RetellClient } from 'retell-sdk';

const client = new RetellClient({ apiKey: process.env.RETELL_API_KEY });

// Create an outbound call
const call = await client.call.createPhoneCall({
  from_number: '+15551234567',
  to_number: '+15559876543',
  retell_llm_dynamic_variables: {
    customer_name: 'John Smith',
    vehicle_interest: '2024 Honda CR-V',
    appointment_date: '2026-04-01'
  }
});
```

### Python SDK
```python
# pip install retell-python-sdk
from retell import RetellClient

client = RetellClient(api_key="your-api-key")

call = client.call.create_phone_call(
    from_number="+15551234567",
    to_number="+15559876543",
    retell_llm_dynamic_variables={
        "customer_name": "John Smith",
        "vehicle_interest": "2024 Honda CR-V"
    }
)
```

### Custom LLM Integration
- Retell can call your own LLM endpoint via webhook
- You receive conversation context, return agent response
- Enables using Claude API directly as the brain behind the voice agent
- This is how you would integrate Nexus self-healing agents as the LLM backend

### Documentation Hub
- Main docs: [docs.retellai.com](https://docs.retellai.com)
- API reference, video tutorials, changelog
- Mintlify-powered docs with search

**Sources:** [Retell Python SDK](https://github.com/RetellAI/retell-python-sdk), [Retell TypeScript SDK](https://github.com/RetellAI/retell-typescript-sdk), [Retell Docs](https://docs.retellai.com/general/introduction)

---

## Recommendations: Retell AI in the Dealership AI Stack

### Proposed Architecture

```
                    DEALERSHIP AI STACK

[Inbound Call] --> [Retell AI Voice Agent] --> [Warm Transfer to Sales Rep]
                        |        ^
                        v        |
                  [n8n Workflows]
                   /    |     \
                  v     v      v
            [Activix] [Cal] [Nexus]
              CRM    Booking  Agents
                        |
                        v
                 [Claude API]
                (via Nexus self-healing)
                        |
                        v
              [Twilio SMS/Email]
              (follow-up sequences)
```

### Integration Strategy

**Phase 1: Inbound AI Receptionist (Week 1-2)**
- Deploy Retell agent with Conversation Flow for call routing
- Connect existing Twilio numbers via SIP trunk
- Build n8n workflow: call_analyzed -> Activix CRM update
- Handle: sales inquiries, service booking, hours/directions
- Languages: English + French auto-detection
- Cost estimate: ~$0.13/min, ~2,000 calls/mo = ~$520/mo (assuming 2 min avg)

**Phase 2: Outbound Lead Follow-Up (Week 3-4)**
- n8n workflow triggered by new Activix leads
- Retell calls lead within 5 minutes of form submission
- Qualification flow: budget, timeline, vehicle type, trade-in
- Warm transfer to available salesperson if hot lead
- Post-call: update Activix with qualification score + transcript
- Cost estimate: ~$0.13/min, ~500 calls/mo = ~$130/mo

**Phase 3: Service & BDC Automation (Week 5-8)**
- Service recall outbound campaigns via batch call API
- Appointment confirmation calls
- CSI follow-up survey calls
- Nexus agent monitors call quality metrics, auto-adjusts prompts
- Knowledge Base loaded with vehicle inventory, service menu, financing

### Nexus Integration Points

1. **Self-Healing Wrapper for Retell API:**
   - Wrap all Retell API calls through Nexus self-healing pipeline
   - Classify Retell API errors using existing taxonomy (rate_limit, api_timeout, etc.)
   - Health tracking per Retell agent
   - Auto-retry with backoff on Retell API failures

2. **Custom LLM Backend (Advanced):**
   - Use Retell's Custom LLM webhook to route to Claude via Nexus
   - Nexus handles Claude API reliability (retries, fallbacks)
   - Full control over the AI brain while Retell handles voice infrastructure

3. **Quality Monitoring Agent:**
   - Nexus agent consumes call_analyzed webhooks
   - Monitors sentiment trends, call completion rates
   - Alerts on degraded performance
   - Auto-adjusts agent prompts if patterns emerge

### Cost Projection (Monthly)

| Item | Estimate |
|------|----------|
| Voice minutes (2,500 min @ $0.13) | $325 |
| Phone numbers (3) | $6 |
| Additional concurrent calls (10) | $80 |
| Knowledge Base (2) | $16 |
| Batch calling (500 dials) | $2.50 |
| **Total Retell costs** | **~$430/mo** |
| Twilio telephony (included in per-min) | $0 extra |
| n8n (self-hosted) | $0 |
| Claude API (via Nexus) | ~$50-100/mo |
| **Total stack cost** | **~$530-580/mo** |

### Key Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| No native Activix integration | Build via n8n webhooks + Activix API |
| No voice cloning | Use ElevenLabs voices within Retell (+$0.025/min) |
| No automotive case studies | Build our own; competitive advantage |
| Latency spikes | Use GPT-4.1 or Gemini Flash for faster responses |
| French accent quality | Test multiple TTS providers for Quebec French |
| Call volume scaling | Start at 20 concurrent, scale to enterprise |

### Why Retell Over Competitors for This Stack

1. **n8n community node** -- No other voice AI platform has this
2. **Twilio SIP integration** -- Keep existing dealership numbers
3. **French auto-detection** -- Critical for Quebec market
4. **Custom LLM webhook** -- Future-proof; can route to Nexus/Claude
5. **Warm transfer** -- Sales-critical feature with context handoff
6. **Pay-as-you-go** -- No upfront commitment, scale with the client
7. **Conversation Flow** -- Visual builder makes it easy to iterate with dealership staff
8. **HIPAA included** -- No extra cost for compliance (useful for financing data)

---

## All Sources

- [Retell AI Homepage](https://www.retellai.com)
- [Retell AI Pricing](https://www.retellai.com/pricing)
- [Retell AI Documentation](https://docs.retellai.com/general/introduction)
- [Retell AI n8n Integration](https://www.retellai.com/integrations/n8n)
- [Retell AI Call Transfer](https://www.retellai.com/features/call-transfer)
- [Retell AI Multilingual Support](https://www.retellai.com/blog/how-to-use-ai-phone-agents-for-multilingual-communication)
- [Retell AI French Language](https://www.retellai.com/languages-ai/french-ai)
- [Retell AI Outbound Sales](https://www.retellai.com/blog/retell-ai-voice-agents-transforms-ai-outbound-sales-calls)
- [Retell AI Use Cases](https://www.retellai.com/blog/best-use-cases-for-ai-voice-agents)
- [Retell AI Voice API Integration](https://www.retellai.com/blog/how-to-integrate-phone-ai-agents-with-your-existing-api-systems)
- [Retell AI Twilio Docs](https://docs.retellai.com/deploy/twilio)
- [Retell Python SDK (GitHub)](https://github.com/RetellAI/retell-python-sdk)
- [Retell TypeScript SDK (GitHub)](https://github.com/RetellAI/retell-typescript-sdk)
- [n8n Retell Workflow Templates](https://n8n.io/workflows/3805-connect-retell-voice-agents-to-custom-functions/)
- [n8n Retell Phone Agent Template](https://n8n.io/workflows/3563-build-an-ai-powered-phone-agent-with-retell-google-calendar-and-rag/)
- [n8n Retell Transcripts Template](https://n8n.io/workflows/3504-store-retell-transcripts-in-sheets-airtable-or-notion-from-webhook/)
- [DEV.to n8n + Retell Guide](https://dev.to/mohammadarhamansari/building-ai-voice-agents-with-n8n-and-retell-ai-a-practical-guide-530l)
- [Softcery Voice Platform Comparison](https://softcery.com/lab/choosing-the-right-voice-agent-platform-in-2025)
- [Bland AI Comparison](https://www.bland.ai/blogs/bland-ai-vs-retell-vs-vapi-vs-air)
- [White Space Solutions Comparison](https://www.whitespacesolutions.ai/content/bland-ai-vs-vapi-vs-retell-comparison)
- [GetVoIP Retell Alternatives](https://getvoip.com/blog/retell-ai-alternatives/)
- [Ringg AI Pricing Analysis](https://www.ringg.ai/blogs/retell-ai-pricing)
- [Dialora Pricing Guide](https://www.dialora.ai/blog/retell-ai-pricing)
- [CheckThat.ai Pricing](https://checkthat.ai/brands/retell-ai/pricing)
- [CallBotics Review](https://callbotics.ai/blog/retell-ai-review)
- [G2 Retell Reviews](https://www.g2.com/products/retell-ai/reviews)
- [TechCrunch Coverage](https://techcrunch.com/2024/05/09/retell-ai-lets-companies-build-agents-to-answer-their-calls/)
- [OpenAI Partnership](https://openai.com/index/retell-ai/)
- [Numa (Automotive AI)](https://www.numa.com/)
- [Toma (Dealership AI)](https://www.toma.com/)
