# Pricing Guide (Internal — Do Not Share with Clients)

This document is for your eyes only. It tells you how to price every engagement so you're profitable, competitive, and not leaving money on the table. Read it before every proposal.

---

## The Pricing Philosophy

You are not an hourly contractor. You are selling outcomes. Price to the value you deliver, not to the hours you work.

The ROI model in the proposal exists for a reason: if you can show a client that your $15,000 build saves them $80,000/year, the price conversation becomes easy. If you can't quantify the value, you're competing on price — and you will lose to someone cheaper.

**Never quote a price without first building the ROI model.** If the math doesn't work for the client, either find the right numbers or walk away.

---

## How to Price an Audit

An audit means: we look at what they have, identify what's broken, and deliver a written assessment with recommendations. No building.

**Base formula:**

| Company Size | Base Price |
|-------------|-----------|
| Startup (< 20 people) | $1,500 |
| SMB (20-100 people) | $2,500 |
| Mid-market (100-500 people) | $4,000 |
| Enterprise (500+ people) | $6,000+ |

**Complexity multiplier (apply to base):**

| Situation | Multiplier |
|-----------|-----------|
| Single system, simple integrations | 1.0× |
| Multiple systems, moderate integrations | 1.3× |
| Legacy systems, complex data flows, compliance requirements | 1.6× |
| Heavily custom or undocumented stack | 2.0× |

**Examples:**
- 50-person SaaS company, straightforward HubSpot + Gmail setup: $2,500 × 1.0 = **$2,500**
- 200-person FinTech with multiple legacy CRMs and custom data pipelines: $4,000 × 1.6 = **$6,400**
- 800-person enterprise with on-premise systems: $6,000 × 2.0 = **$12,000**

**Audit-to-build conversion:** An audit is almost always the first step to a build. Price the audit to be easy to say yes to. If you've done the discovery, you should be the natural choice to build. Offer to credit the audit fee against the build if they proceed within 60 days.

---

## How to Price a Build

**Base formula:**

`Number of agents × $3,000-$5,000 per agent + integration costs + complexity overhead`

### Per-Agent Pricing

| Agent Type | Price Range | Notes |
|-----------|------------|-------|
| Simple single-task agent (categorize, extract, route) | $3,000 | Straightforward prompt, 1-2 API calls |
| Mid-complexity agent (multi-step reasoning, conditional logic) | $4,000 | More complex prompting, state management |
| Complex agent (research, debate protocol, multi-model) | $5,000+ | Requires debate/verification, multiple models, high confidence requirements |
| Recovery/orchestrator agent | $2,500 | Included in every project but simpler to build |

**Rule of thumb:** A typical 3-4 agent project runs $12,000-$18,000 before integrations.

### Integration Costs

| Integration | Add-On Cost |
|-------------|-----------|
| Simple REST API with good docs (HubSpot, Stripe, Slack, Gmail) | $500 each |
| Complex API with poor docs or quirky behavior (legacy CRMs, custom enterprise systems) | $1,000-$1,500 each |
| Real-time webhook/streaming integration | $750 |
| OAuth flow setup | $500 flat |
| Custom data transformation (cleaning messy inputs) | $500-$1,500 depending on complexity |

### Overhead and Complexity

Add these on top after calculating agent + integration costs:

| Situation | Add |
|-----------|-----|
| Tight timeline (< 4 weeks) | +20% |
| On-premise deployment (no cloud hosting) | +$2,000 |
| SOC 2 / HIPAA compliance requirements | +$3,000-$5,000 |
| Multiple environments required (dev/staging/prod) | +$1,500 |
| Bilingual AI outputs required | +$1,000 |
| High-volume processing (>10,000 transactions/month at launch) | +$1,500 for load testing and optimization |

### Build Pricing Examples

**Example 1: Lead Qualification System**
- 3 agents: Intake (simple, $3K) + Qualifier (complex, $5K) + Router (mid, $4K) = $12,000
- Integrations: HubSpot ($500) + Gmail ($500) + Slack ($500) = $1,500
- Total before overhead: $13,500
- Standard timeline, no compliance: $13,500
- **Quote: $13,500-$15,000** (round up slightly for discovery risk)

**Example 2: Customer Support Bot**
- 4 agents: Intake ($3K) + Classifier ($4K) + Responder ($5K) + Escalation ($3K) = $15,000
- Integrations: Zendesk ($1,000 — complex API) + Slack ($500) + CRM ($500) = $2,000
- Complexity: tight 4-week timeline (+20%) = $3,400
- Total: $15,000 + $2,000 + $3,400 = **$20,400**
- **Quote: $20,000-$22,000**

**Example 3: Government/Enterprise Document Processor**
- 5 agents: 2 complex, 2 mid, 1 simple = $5K + $5K + $4K + $4K + $3K = $21,000
- Integrations: SharePoint ($1,500) + legacy data system ($1,500) + custom data transform ($1,500) = $4,500
- On-premise deployment: +$2,000
- Compliance (PIPEDA/federal): +$4,000
- Total: $21,000 + $4,500 + $2,000 + $4,000 = $31,500
- **Quote: $30,000-$35,000**

### Never Quote Below $8,000 for a Build

Below $8,000, you can't do the job properly. You'll cut corners on self-healing, skip edge case testing, write poor documentation. The client will be unhappy and you'll have a bad case study instead of a good one. If someone wants this done for $5,000, tell them the audit is $2,000 and the build is $12,000. If they have $5,000 total, help them with the audit and revisit the build when they have budget.

---

## How to Price a Retainer

**Base formula:**

`Number of agents × $500-$1,000/month per agent + support tier`

### Per-Agent Retainer Rates

| Agent Complexity | Monthly Rate |
|-----------------|-------------|
| Simple agent (low maintenance) | $500/month |
| Mid-complexity agent | $700/month |
| Complex or high-volume agent | $1,000/month |

**Rule of thumb:** A 3-4 agent system retainer runs $1,800-$3,500/month before support tier.

### Support Tiers

| Tier | Monthly Add-On | What's Included |
|------|----------------|-----------------|
| Basic | $0 | Monthly report, email support, bug fixes, 5 hrs modifications |
| Standard | +$500 | Monthly report, Slack support, bug fixes, 10 hrs modifications, quarterly architecture review |
| Premium | +$1,000 | Monthly report, Slack + phone support, bug fixes, 15 hrs modifications, monthly strategy call, priority response SLA |

### Retainer Pricing Examples

**Example 1: Small startup, 3 agents, basic support**
- 2 simple agents × $500 + 1 complex agent × $1,000 = $2,000
- Basic support tier: $0 add-on
- **Quote: $2,000/month**

**Example 2: Mid-market, 4 agents, standard support**
- 2 mid agents × $700 + 2 complex agents × $1,000 = $3,400
- Standard support: +$500
- Total: $3,900
- **Quote: $3,500-$4,000/month** (round to clean number)

**Example 3: Enterprise, 6 agents, premium support**
- 3 complex agents × $1,000 + 2 mid × $700 + 1 simple × $500 = $4,900
- Premium support: +$1,000
- Total: $5,900
- **Quote: $6,000/month**

### Build + Retainer Bundling

When a client takes a build and a retainer together, discount the first month's retainer by 25% as a launch incentive. It costs you little and closes deals faster.

---

## Discount Rules

**Annual prepay discount: 15% off total annual retainer**
- Example: $3,000/month retainer × 12 months = $36,000. Annual prepay = $30,600.
- Use this to close deals where the monthly feels too high. "If you commit to 12 months upfront, I can do $30,600 instead of $36,000."
- This also protects your cash flow — $30K now beats $3K/month in uncertainty.

**Referral discount: 10% off referred client's first month**
- Applies to the new client, not the referrer (simpler to administer)
- Alternatively: give the referring client a $500 credit on their next invoice
- Referrals should be your #1 growth channel — make it worthwhile

**Pilot discount: 10% off build price for first-time clients who are hesitant**
- Use sparingly. Only for clients who are genuinely uncertain about ROI, not just negotiating.
- Say it this way: "I'll take $[X] off the build if you'll commit to the 30-day check-in and let us write a case study if the results are what we're projecting."
- The case study is worth more than the discount.

**No other discounts.** Don't negotiate off-menu. "I'll throw in X" or "let me split the difference" makes you look desperate. If a client pushes on price, go back to the ROI model: "The build is $15,000 and it saves you $80,000/year. What number would make the ROI feel better?" Usually the answer is: they need to see the numbers more clearly, not that you need to lower your price.

---

## When to Walk Away

Walk away if any of these are true. Don't try to make it work.

**Budget under $8,000 for a build.** You can't deliver quality work at that price. An unhappy $5,000 client costs you more than a great $15,000 client. Refer them to a cheaper freelancer and move on.

**No clear decision maker.** If you can't get a yes/no from someone in the first two calls, the deal won't close. Ask directly on the first call: "If we decide to move forward, who signs the contract?" If the answer is vague, you're talking to someone without authority. Get to the decision maker or don't build a proposal.

**"We're just exploring."** This phrase means one of three things: (a) they have budget but no urgency — not yet; (b) they want free consulting — be careful; (c) they have no authority and are doing research for someone else — move on. Ask: "When would you need this built by, and is there a budget allocated for this?" If neither answer is specific, this isn't a live opportunity.

**They want to own the Nexus framework.** The code you build for them? Yes, they own it. The Nexus framework itself is MIT licensed — they already own it. But if they're asking to "white-label your platform" or "buy your IP," they don't understand the offering. Clarify. If they still want something that isn't what you sell, walk.

**They want you to guarantee specific AI output accuracy above 95%.** You can guarantee the infrastructure (uptime, self-healing, reliability). You cannot guarantee that an LLM will be correct 99% of the time on real-world data. Any client who won't accept "we'll build accuracy measurement and feedback loops" as the answer to accuracy questions is going to be a legal liability. Walk.

**Red flags in negotiation:** Asking for Net 90 payment terms, asking for penalties if the project is late without similar bonuses for early delivery, or wanting you to sign their MSA without your own counsel reviewing it first.

---

## Upsell Triggers

Watch for these signals in client calls and retainer check-ins. Each one is an opportunity.

**"We're looking at [another department] for something similar."**
This is a referral to yourself. Ask immediately: "Tell me more about what they're trying to do." You already have the relationship, you already know their tech stack, you already built the infrastructure. Adding a second agent team is faster and cheaper for you than starting from scratch — pass some of that saving to the client and you'll close it fast.

**"The reports show that [usage metric] is really high."**
High usage means high value. It also means they might be ready for a higher tier. "You processed 2,200 leads last month — we originally scoped for 1,500. You might be approaching a point where we should talk about [adding agents / increasing capacity / moving to a managed service tier]."

**"Is there a way to make it do X?"**
Anything that starts with "is there a way" is a Change Order or an upsell. Take the question seriously, scope it quickly, and follow up with a written estimate within 24 hours. Hot leads go cold fast.

**"Our team loves this / leadership is impressed."**
This is social proof being created in real time. Ask if they'd be open to a case study. Ask if they have colleagues at other companies who might have similar needs. Warm referrals from happy clients are the best pipeline you have.

**Retainer clients who are not using their included modification hours.****
In Month 4 or 5, if a client has barely touched their included hours, they either don't know what to ask for (educate them) or they're too busy (check in on their priorities). Unused hours feel like unused value — which means they'll start questioning the retainer. Keep their hours full with proactive recommendations.

**The 90-day check-in.**
Every build client gets a 90-day check-in call whether they're on retainer or not. This call has one job: find out if the system is delivering value. If it is, this is when you propose the retainer. If it isn't, this is when you fix it before they go somewhere else.

---

## Internal Rate Card Summary

| Service | Price Range |
|---------|------------|
| AI Agent Audit | $1,500-$12,000+ |
| Agent Build (per agent) | $3,000-$5,000 |
| Integrations | $500-$1,500 each |
| Full Build Project | $8,000-$35,000+ |
| Monthly Retainer (per agent) | $500-$1,000 |
| Full Retainer Package | $1,500-$6,000+/month |
| Emergency / Out-of-Scope Hourly | $200/hr |
| Emergency Rate | $300/hr |

**Minimum engagement:** $8,000 for a build project, $1,500/month for a retainer.

---

*Pricing Guide — Internal Use Only | Nexus AI Agency | Last updated [Date]*
*Review and update this guide every 6 months, or when you win or lose a deal because of pricing.*
