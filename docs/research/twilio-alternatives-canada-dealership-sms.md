# Twilio Alternatives for Canadian Car Dealership SMS Automation

**Research Date:** 2026-03-28
**Use Case:** Automated SMS to leads from a Canadian car dealership AI system
**Volume:** 2,000-5,000 SMS/month
**Requirements:** Canadian numbers, A2P 10DLC, two-way SMS, CASL compliance, n8n integration, French character support

---

## Regulatory Context: What Every Provider Must Handle

### A2P 10DLC in Canada (as of March 2025)
- Canadian 10DLC numbers purchased **on or after March 26, 2025** must complete A2P registration or Persona verification before sending messages to Canadian recipients.
- A2P registration is required for **all** Canadian 10DLC numbers (new and existing) when messaging US recipients.
- Registration is managed by CSPs (Campaign Service Providers), not centrally by the CRTC like in the US.
- Source: [GoHighLevel Canadian 10DLC Policy](https://help.gohighlevel.com/support/solutions/articles/155000004915-updated-messaging-policies-for-canadian-10dlc-numbers-a2p-registration-requirements)

### CASL Compliance Requirements
- Express consent required (opt-in) before sending commercial electronic messages.
- Implied consent valid for 2 years after a purchase or 6 months after an inquiry.
- Must include sender identification and a functioning unsubscribe mechanism.
- Recipients can opt out via STOP, END, QUIT, or UNSUBSCRIBE keywords.
- Violations: up to $1M per violation (individuals), $10M per violation (businesses).
- Source: [CRTC CASL FAQ](https://crtc.gc.ca/eng/com500/faq500.htm), [Mogli CASL Guide](https://www.mogli.com/blog/all-about-canadas-casl-text-messaging-laws-regulations)

### French Character Support (Quebec)
- SMS with accented characters (e, a, c, etc.) use GSM extended or UCS-2 encoding.
- UCS-2 encoding reduces segment size from 160 to 70 characters per segment.
- A single French message can cost 2-3x a plain English message due to segmentation.
- All API-level providers handle this transparently; platform-level tools may not expose this.

---

## Provider-by-Provider Analysis

---

### 1. Telnyx

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound)** | ~$0.004/msg base + carrier surcharges |
| **SMS price (Canada inbound)** | Free on long codes |
| **Canadian phone number** | $1.00-2.00/month (local numbers available in all provinces) |
| **Email capability** | No native email; voice + SMS + fax only |
| **Webhook/API** | Full REST API, webhooks for inbound/delivery status |
| **n8n integration** | Official Telnyx AI node for voice; SMS via HTTP Request node + webhooks. Community blog post demonstrates full SMS automation with n8n. |
| **A2P 10DLC** | Supported. One-time brand registration ~$4, campaign registration ~$10/month |
| **CASL compliance** | Automatic STOP keyword handling, opt-out management via API |
| **Two-way SMS** | Full two-way with inbound webhooks |
| **French support** | Full UTF-8/UCS-2 support |

**Pros:**
- Owns its own network (not a reseller) -- lower latency, better control
- Cheapest per-message rate among serious providers
- 10 messages/second per long code (vs Twilio's 1 MPS)
- Free inbound SMS
- No monthly minimums
- Free 24/7 support via chat/phone
- Mission Control portal is developer-friendly

**Cons:**
- No native n8n node for SMS (must use HTTP Request node)
- Requires telecom knowledge for initial setup
- Smaller ecosystem than Twilio
- Less known in automotive vertical

**Monthly cost estimate (3,000 msgs):** ~$12-18/msg cost + $2/number = **~$14-20/month**

**Sources:**
- [Telnyx Messaging Pricing](https://telnyx.com/pricing/messaging)
- [Telnyx 10DLC Fees](https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges)
- [n8n Telnyx AI Integration](https://n8n.io/integrations/telnyx-ai/)
- [Telnyx + n8n SMS Automation Blog](https://blog.anpulabs.com/p/automating-customer-conversations)
- [Knock SMS Provider Comparison](https://knock.app/blog/the-top-sms-providers-for-developers)

---

### 2. Vonage (Nexmo)

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound)** | ~$0.00846/msg |
| **SMS price (Canada inbound)** | ~$0.00679/msg |
| **Canadian phone number** | ~$1.00-4.00/month |
| **Email capability** | No native email API (Vonage focuses on comms APIs) |
| **Webhook/API** | Full REST API, webhooks for delivery receipts and inbound |
| **n8n integration** | No official n8n node. Must use HTTP Request node. |
| **A2P 10DLC** | Supported via The Campaign Registry |
| **CASL compliance** | Automatic keyword opt-out handling |
| **Two-way SMS** | Full two-way with inbound webhooks |
| **French support** | Full Unicode support |

**Pros:**
- Mature, well-documented API (formerly Nexmo)
- Adaptive routing with automatic carrier failover
- Strong global coverage (1,600+ carriers)
- Built-in Verify API for OTP (useful for customer verification)
- Canadian .ca domain and local presence

**Cons:**
- More expensive per message than Telnyx or Plivo
- Premium support requires expensive contracts ($3,300+/month)
- Basic analytics and dashboard
- No n8n native node
- Inbound messages are not free

**Monthly cost estimate (3,000 msgs):** ~$25-30/msg cost + $2-4/number = **~$27-34/month**

**Sources:**
- [Vonage SMS Pricing](https://www.vonage.ca/en/communications-apis/sms/pricing/)
- [Vonage API Pricing Calculator](https://www.buildmvpfast.com/tools/api-pricing-estimator/vonage)
- [Knock SMS Provider Comparison](https://knock.app/blog/the-top-sms-providers-for-developers)

---

### 3. MessageBird (now Bird)

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound)** | ~$0.008-0.01/msg (varies by volume) |
| **SMS price (Canada inbound)** | Included in some plans |
| **Canadian phone number** | Available |
| **Email capability** | YES -- Bird handles 40% of global commerce email. Full email API. |
| **Webhook/API** | Full REST API, webhooks |
| **n8n integration** | No official n8n node |
| **A2P 10DLC** | Supported; 10DLC fees apply |
| **CASL compliance** | Opt-out keyword handling available |
| **Two-way SMS** | Supported |
| **French support** | Full Unicode support |

**Pros:**
- Combined SMS + Email platform (single provider for both channels)
- Strong omnichannel: SMS, WhatsApp, email, voice
- Flow Builder for visual automation
- Good European/global presence

**Cons:**
- Rebranded from MessageBird to Bird -- documentation can be confusing
- High minimum commitments reported ($50/month minimum)
- Complex, unpredictable pricing tiers
- No n8n native node
- Less US/Canada focused than competitors
- Prepaid account model

**Monthly cost estimate (3,000 msgs):** ~$24-30/msg cost + $50 minimum + number fee = **~$50-80/month**

**Sources:**
- [Bird SMS Pricing](https://bird.com/en/pricing/connectivity/sms)
- [Bird SMS CRM Pricing](https://bird.com/en/pricing/sms)
- [MessageBird Pricing Analysis 2025](https://www.oreateai.com/blog/messagebird-pricing-in-2025-navigating-the-complexities-and-finding-smarter-alternatives/aedc1efc03b0cf80019fd746d365681d)

---

### 4. Sinch

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound)** | Custom/negotiated (requires sales contact) |
| **SMS price (Canada inbound)** | Custom/negotiated |
| **Canadian phone number** | Available |
| **Email capability** | YES -- Sinch acquired Mailgun and Mailjet. Full email API. |
| **Webhook/API** | Full REST API, webhooks |
| **n8n integration** | No official n8n node |
| **A2P 10DLC** | Supported |
| **CASL compliance** | Enterprise compliance expertise |
| **Two-way SMS** | Supported |
| **French support** | Full Unicode support |

**Pros:**
- Direct carrier access and SS7 connectivity
- Multi-channel Conversations API (SMS, WhatsApp, RCS, email via Mailgun)
- Enterprise-grade compliance tools
- Acquired SimpleTexting for SMB market
- Strong in automotive and enterprise verticals

**Cons:**
- No transparent pricing -- must talk to sales
- Enterprise-focused overhead; overkill for 3K msgs/month
- Support quality varies by account size
- Complex setup for basic use cases
- No n8n native node

**Monthly cost estimate (3,000 msgs):** Unknown without sales quote. Likely **$50-150/month** range based on enterprise positioning.

**Sources:**
- [Sinch SMS API Pricing](https://sinch.com/pricing/sms/)
- [Sinch USA/Canada Surcharges](https://support.messagemedia.com/hc/en-us/articles/4624035425935-USA-Canada-Charges-surcharges)
- [Knock SMS Provider Comparison](https://knock.app/blog/the-top-sms-providers-for-developers)

---

### 5. Bandwidth

| Attribute | Detail |
|-----------|--------|
| **SMS price (US 10DLC outbound)** | $0.004/msg |
| **SMS price (Canada outbound)** | Not publicly listed; likely similar to US rates |
| **SMS price (toll-free outbound)** | $0.007/msg |
| **Canadian phone number** | Available (US + Canada focus) |
| **Email capability** | No |
| **Webhook/API** | Full REST API, webhooks |
| **n8n integration** | No official n8n node |
| **A2P 10DLC** | Native support (Bandwidth is a Tier 1 carrier) |
| **CASL compliance** | Carrier-level compliance tools |
| **Two-way SMS** | Supported |
| **French support** | Full Unicode support |

**Pros:**
- Tier 1 US carrier -- owns the network (not a reseller)
- Direct-to-carrier pricing, no middlemen
- Powers many other CPaaS providers (Twilio, RingCentral, etc.)
- Strong US/Canada coverage
- Enterprise reliability

**Cons:**
- Enterprise-focused; minimum spend requirements likely
- Canada pricing not publicly transparent
- Minimal self-service dashboard
- No n8n native node
- Developer documentation less polished than Twilio/Telnyx
- Not ideal for small-volume senders

**Monthly cost estimate (3,000 msgs):** Likely **$15-25/month** for messaging + number fees, but requires sales engagement.

**Sources:**
- [Bandwidth Pricing](https://www.bandwidth.com/pricing/)
- [Bandwidth SMS API](https://www.bandwidth.com/products/sms-messaging/)
- [Bandwidth Carrier Surcharges](https://www.bandwidth.com/support/en/articles/12823178-carrier-surcharges)

---

### 6. Plivo

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound)** | $0.0055/msg + carrier surcharges ($0.0072-$0.0100 per carrier) |
| **SMS price (Canada inbound)** | $0.0055/msg |
| **Canadian phone number** | $10.00/month (long code or toll-free) |
| **MMS price (Canada)** | $0.018/msg (long code), $0.020/msg (toll-free) |
| **Email capability** | No native email |
| **Webhook/API** | Full REST API, webhooks for inbound and delivery status |
| **n8n integration** | No official n8n node; HTTP Request node works |
| **A2P 10DLC** | Supported |
| **CASL compliance** | Automatic STOP keyword handling |
| **Two-way SMS** | Full two-way with webhooks |
| **French support** | Full Unicode/UCS-2 support |

**Canadian Carrier Surcharges (verified from Plivo pricing page):**
| Carrier | SMS Outbound Surcharge |
|---------|----------------------|
| Bell / Virgin | $0.0088 |
| Rogers / Fido | $0.0097 |
| Telus | $0.0100 |
| Freedom | $0.0072 |
| Videotron | $0.0072 |
| Other Networks | $0.0080 |

**True cost per message to Canada:** $0.0055 base + ~$0.0085 avg surcharge = **~$0.014/msg**

**Pros:**
- Transparent, published Canada pricing (rare among providers)
- Twilio-like API design (easy migration)
- 99.99% uptime SLA
- Pay-as-you-go, no minimums
- Claims 53% savings vs competitors

**Cons:**
- Phone number cost is high ($10/month vs $1-2 at Telnyx)
- True per-message cost (with surcharges) is comparable to Twilio
- Limited to SMS/voice (no email, no omnichannel)
- Sparse community resources
- No n8n native node

**Monthly cost estimate (3,000 msgs):** ~$42 msg cost ($0.014 x 3000) + $10/number = **~$52/month**

**Sources:**
- [Plivo Canada SMS Pricing](https://www.plivo.com/sms/pricing/ca/) -- verified via direct page fetch
- [Plivo Canada SMS Coverage](https://www.plivo.com/sms/coverage/ca/)
- [Plivo vs Twilio Comparison](https://getvoip.com/blog/plivo-vs-twilio/)

---

### 7. Amazon SNS

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada outbound via toll-free)** | $0.00581/msg + $0.00705 carrier fee = ~$0.013/msg |
| **SMS price (Canada inbound)** | $0.0075/msg (estimated) |
| **Canadian phone number** | Toll-free available; dedicated short codes $995/month + $3,000 setup |
| **Email capability** | YES -- Amazon SES for email (separate service, ~$0.10/1000 emails) |
| **Webhook/API** | AWS SDK, SNS topics, Lambda triggers |
| **n8n integration** | Official AWS SNS node in n8n |
| **A2P 10DLC** | Supported for US; toll-free verification for Canada |
| **CASL compliance** | Basic opt-out handling; STOP keyword support |
| **Two-way SMS** | LIMITED -- requires SNS + Pinpoint + Lambda for inbound. Complex setup. |
| **French support** | Full Unicode support |

**Pros:**
- Very cheap per-message rate
- Native n8n node available
- Combined with SES gives SMS + email from one cloud provider
- Pay-per-use, no minimums
- If already on AWS, no new vendor relationship

**Cons:**
- Two-way SMS is extremely complex (requires multiple AWS services wired together)
- No conversation threading or inbox
- No built-in CASL compliance management
- Terrible for conversational/two-way use cases
- AWS console UX is poor for non-developers
- Short code setup is prohibitively expensive ($995/month)
- Not designed for business texting workflows

**Monthly cost estimate (3,000 msgs):** ~$39 msg cost + number fee = **~$42-45/month**

**VERDICT: Not suitable for two-way dealership SMS.** SNS is a notification service, not a conversation platform.

**Sources:**
- [Amazon SNS SMS Pricing](https://aws.amazon.com/sns/sms-pricing/)
- [AWS End User Messaging Pricing](https://aws.amazon.com/end-user-messaging/pricing/)
- [AWS SNS Pricing Guide](https://costq.ai/blog/sns-pricing-guide/)

---

### 8. Podium

| Attribute | Detail |
|-----------|--------|
| **Pricing** | Core: $399/month, Pro: $599/month, Signature: custom |
| **SMS included** | Unlimited 1:1 texts on all plans |
| **Email capability** | Basic email within platform |
| **Webhook/API** | Limited API; not a developer platform |
| **n8n integration** | No official n8n node; limited API makes custom integration difficult |
| **A2P 10DLC** | Handled for you ($5/month 10DLC fee per US location) |
| **CASL compliance** | Built-in opt-out handling, designed for regulated industries |
| **Two-way SMS** | Full two-way with unified inbox |
| **French support** | Supported |
| **Activix integration** | Not confirmed directly; Activix lists 15+ integrations but Podium is not explicitly named. Matador AI has confirmed Activix integration instead. |

**Pros:**
- Purpose-built for dealerships (23% of users are automotive)
- Unlimited 1:1 texting
- Review management + payments + chat + SMS in one platform
- Handles all compliance/registration for you
- Mobile app for sales team
- AI Concierge for auto-responses (Pro plan)

**Cons:**
- Very expensive ($399-599/month minimum)
- Not an API platform -- cannot deeply integrate with custom AI automation
- Limited webhook/API access makes n8n integration difficult
- Walled garden approach
- Reports of prices rising quickly with add-ons
- $500 network optimization fee per location
- Overkill if you only need SMS

**Monthly cost estimate:** **$399-599/month** (all-inclusive but inflexible)

**Sources:**
- [Podium Pricing](https://www.podium.com/getpricing)
- [Podium Auto Dealership Pricing](https://www.podium.com/getpricing/auto)
- [Podium Pricing Breakdown 2026](https://www.socialpilot.co/reviews/blogs/podium-pricing)
- [Activix Integrations](https://www.activix.ca/en/integrations)

---

### 9. Textline

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada)** | ~$0.015/msg (add-on credits at $0.03 each) |
| **Base price** | Essentials: $50/agent/month (3 agents, 600 credits), Pro: $70/agent/month (5 agents, 2000 credits) |
| **Email capability** | No |
| **Webhook/API** | API + webhooks on all plans |
| **n8n integration** | No official n8n node; API/webhook integration possible |
| **A2P 10DLC** | $15/month campaign fee through The Campaign Registry |
| **CASL compliance** | STOP keyword handling, SOC 2 certified, HIPAA compliant |
| **Two-way SMS** | Full two-way with universal inbox |
| **French support** | Supported |

**Pros:**
- Clean business texting UI with universal inbox
- SOC 2 and HIPAA compliant
- Good integration ecosystem (Salesforce, HubSpot, Zendesk, Zapier)
- Time-based automations on Pro plan
- Dedicated customer success manager on Pro

**Cons:**
- Per-agent pricing adds up fast (dealership with 5 salespeople = $250-350/month)
- Add-on message credits are expensive ($0.03 each)
- 600 included credits on Essentials is not enough for 3K msgs/month
- No native n8n node
- No Canadian-specific features highlighted
- Limited to SMS (no voice, no email)

**Monthly cost estimate (3,000 msgs, 3 agents):** $150 base + ~$72 extra credits (2,400 x $0.03) = **~$222/month**

**Sources:**
- [Textline Pricing](https://www.textline.com/pricing)
- [Textline Plan Comparison](https://www.textline.com/plan-comparison)
- [Textline Review 2026](https://research.com/software/reviews/textline)

---

### 10. Sakari

| Attribute | Detail |
|-----------|--------|
| **SMS price** | Tiered: ~$0.029/msg (Starter 500), ~$0.029/msg (Business 3125 for $90/mo) |
| **Base price** | Starter: $25/month (was $16), Business: $90/month, Team: $170/month |
| **Email capability** | No |
| **Webhook/API** | Full API + webhooks |
| **n8n integration** | No official n8n node; API integration possible |
| **A2P 10DLC** | Supported |
| **CASL compliance** | Opt-out handling built in |
| **Two-way SMS** | Full two-way with MMS support in US/Canada |
| **French support** | Supported |
| **Canadian focus** | One free Canadian number included; Canadian MMS supported |

**Pros:**
- Canadian-founded, understands Canadian market
- One free Canadian phone number included with all plans
- MMS in Canada (not all providers offer this)
- Unlimited users and contacts on all plans
- 90-day credit rollover
- 1,000+ app integrations via Zapier
- Month-to-month, no contract

**Cons:**
- Per-message cost is high compared to API providers (~$0.029 vs $0.004-0.014)
- Not a developer API platform (more SaaS tool)
- No n8n native node
- Limited automation capabilities
- Additional numbers are $4/month
- Credits expire after 90 days

**Monthly cost estimate (3,000 msgs):** Business plan at $90/month covers 3,125 msgs = **~$90/month**

**Sources:**
- [Sakari Pricing](https://sakari.io/pricing) -- verified via direct page fetch
- [Sakari Product Features](https://sakari.io/product)
- [Sakari Business Texting](https://sakari.io/features/business-text-messaging-software)

---

### 11. GoHighLevel (GHL)

| Attribute | Detail |
|-----------|--------|
| **SMS price (Canada)** | ~$0.015/segment (some sources say $0.00747 with 10% CA discount) |
| **Base price** | Starter: $97/month, Unlimited: $297/month, Agency Pro: $497/month |
| **Email capability** | YES -- built-in email marketing |
| **Webhook/API** | Full API + webhooks + native automation builder |
| **n8n integration** | No official n8n node, but API + webhooks work well. Some dealers use GHL instead of n8n entirely. |
| **A2P 10DLC** | Built-in registration. One-time: ~$24.50, monthly campaign: ~$11.03 |
| **CASL compliance** | STOP keyword handling; compliance features built in |
| **Two-way SMS** | Full two-way with conversation inbox |
| **French support** | Supported |
| **Phone number cost** | $1.15/month (local), $2.15/month (toll-free) |

**Pros:**
- All-in-one platform: CRM, SMS, email, funnels, automations, calendar, reviews, websites
- Many Canadian dealers already use it
- Built-in automation builder may replace n8n for some workflows
- White-label capable (agency model)
- Large community and template marketplace
- Handles 10DLC registration in-app
- LC Phone pricing matches Twilio rates

**Cons:**
- SMS pricing uses Twilio under the hood (LeadConnector = Twilio reseller)
- $97-497/month base before any messaging costs
- Per-segment billing means French messages cost more
- Jack of all trades, master of none
- Can be buggy; frequent platform updates
- Learning curve is steep
- If you already have a CRM, this is redundant

**Monthly cost estimate (3,000 msgs):** $97 base + ~$45-60 SMS cost + $11 10DLC = **~$153-168/month** (Starter plan)

**IMPORTANT NOTE:** If the dealership already uses GHL, adding SMS is incremental. If not, the $97/month minimum makes this expensive just for SMS.

**Sources:**
- [GHL Pricing](https://www.gohighlevel.com/pricing)
- [GHL Texting Costs Explained 2026](https://nexghl.com/gohighlevel-texting-costs/)
- [GHL SMS Pricing 2026](https://leadsflex.com/how-much-does-ghl-charge-for-text-messages/)
- [LC Phone Pricing Guide](https://help.gohighlevel.com/support/solutions/articles/48001223556-lc-phone-pricing-billing-guide)
- [GHL Canadian 10DLC Policy](https://help.gohighlevel.com/support/solutions/articles/155000004915-updated-messaging-policies-for-canadian-10dlc-numbers-a2p-registration-requirements)

---

## Comparison Matrix

| Provider | Canada SMS/msg | Monthly Base | n8n Node | Two-Way | Email | CASL Tools | Est. Cost/mo (3K msgs) |
|----------|---------------|-------------|----------|---------|-------|------------|----------------------|
| **Telnyx** | ~$0.004 + fees | $0 | Via HTTP | Yes | No | Yes | **$14-20** |
| **Vonage** | ~$0.0085 | $0 | Via HTTP | Yes | No | Yes | **$27-34** |
| **Plivo** | ~$0.014 (w/surcharge) | $0 | Via HTTP | Yes | No | Yes | **$52** |
| **Bandwidth** | ~$0.004-0.007 | Likely min. | Via HTTP | Yes | No | Yes | **$15-25** |
| **Sinch** | Custom | $0 | Via HTTP | Yes | Yes (Mailgun) | Yes | **$50-150** |
| **MessageBird** | ~$0.008-0.01 | $50 min | Via HTTP | Yes | Yes | Yes | **$50-80** |
| **Amazon SNS** | ~$0.013 | $0 | **Native** | Limited | Yes (SES) | Basic | **$42-45** |
| **Sakari** | ~$0.029 | $25+ | Via HTTP | Yes | No | Yes | **$90** |
| **Textline** | ~$0.015-0.03 | $150+ | Via HTTP | Yes | No | Yes | **$222** |
| **Podium** | Unlimited | $399+ | Limited | Yes | Basic | Yes | **$399-599** |
| **GoHighLevel** | ~$0.015 | $97+ | Via HTTP | Yes | Yes | Yes | **$153-168** |

---

## Ranked Recommendations

### Best Overall: Telnyx

**Why:** Telnyx offers the lowest per-message cost, owns its network (not a reseller), provides full two-way SMS with webhooks, handles A2P 10DLC registration, and integrates with n8n via HTTP Request nodes and webhooks. At an estimated $14-20/month for 3,000 messages, it is 3-10x cheaper than platform solutions. The 10 msg/second throughput rate is excellent for batch sends. The documented n8n + Telnyx SMS integration pattern (using webhooks for inbound, HTTP requests for outbound) is proven in production.

**The one gap:** No native email. Pair with a separate email provider (Resend, Postmark, or Amazon SES) for email workflows.

### Best Budget Option: Telnyx

Telnyx wins this category too. At $0.004/message base with free inbound, no monthly minimums, and $1-2/month phone numbers, nothing else comes close on pure cost. Bandwidth could compete but requires sales engagement and likely has minimum commitments.

### Best for Canadian Dealerships Specifically: GoHighLevel (if already in use) or Telnyx + n8n (if building custom)

**If the dealership already uses GoHighLevel:** Do not switch. GHL has built-in SMS, email, CRM, automations, review management, and 10DLC registration. Adding SMS to an existing GHL account is just incremental per-message cost (~$0.015/segment). Many Canadian dealers already use GHL and its community has Canadian-specific templates and workflows.

**If building a custom AI automation system with n8n:** Use Telnyx as the SMS provider. Wire it to n8n via:
1. Outbound: n8n HTTP Request node calling Telnyx Messages API
2. Inbound: Telnyx webhook pointing to n8n Webhook trigger node
3. Opt-out: Telnyx auto-handles STOP keywords; also track in your database
4. 10DLC: Register through Telnyx portal before going live

### Providers to Avoid for This Use Case

1. **Amazon SNS** -- Two-way SMS is too complex. Not designed for conversational texting.
2. **Podium** -- $399+/month is excessive when you only need SMS. Limited API makes AI integration difficult.
3. **Textline** -- Per-agent pricing makes it expensive. $222/month for basic SMS is not competitive.
4. **Sinch** -- No transparent pricing. Enterprise overhead. Overkill for 3K msgs/month.

---

## Implementation Recommendation for Nexus Dealership AI

```
Architecture:
  n8n workflow <-> Telnyx SMS API (outbound + inbound webhooks)
  n8n workflow <-> Resend/SES (email)
  n8n workflow <-> Activix CRM (lead data)

Monthly cost projection (3,000 SMS/month):
  Telnyx SMS:        ~$12-18 (messages)
  Telnyx number:     ~$2 (1 local Canadian number)
  10DLC campaign:    ~$10/month
  Total SMS:         ~$24-30/month

  vs. Twilio:        ~$45-60/month (same volume)
  vs. GoHighLevel:   ~$153-168/month (Starter + SMS)
  vs. Podium:        ~$399-599/month

  Annual savings vs Twilio: ~$180-360/year
  Annual savings vs GHL:    ~$1,476-1,656/year
  Annual savings vs Podium: ~$4,428-6,828/year
```

**Note on Twilio for reference:** Twilio charges ~$0.0079/msg outbound to Canada + carrier surcharges, with Canadian numbers at ~$1.15/month. True per-message cost is ~$0.015-0.018 including surcharges. So for 3,000 messages, Twilio costs roughly $45-54 in messaging alone. Telnyx delivers approximately 40-60% savings on a like-for-like basis.
