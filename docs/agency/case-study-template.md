# Case Study Template

*Fill this out for every completed engagement. These documents are the most valuable sales assets you have — a prospect who won't take your cold call will read a case study about a company like theirs. Get permission from the client before publishing. Most will say yes if you offer to share the draft first.*

---

# [Client Name / "A [Industry] Company"] — [One-Line Result]

*Example: "Ottawa SaaS Company Cuts AI Incident Rate 40% with Self-Healing Agent Infrastructure"*
*If client won't allow name use: "How a Series A FinTech Recovered 89% of AI Failures Automatically"*

**Industry:** [e.g., SaaS / Financial Services / Healthcare / Retail / Government]
**Company size:** [e.g., 45 employees / $8M ARR / Series A]
**Location:** [City, Country — relevant for Ottawa/Canadian government prospects]
**Use case:** [e.g., Lead qualification automation / Customer support triage / Document processing]
**Published:** [Month Year]

---

## The Challenge

**Background:**
[2-3 sentences describing the company and what they were trying to do with AI before they came to us. What was the ambition? Why were they building AI agents?]

*Example: "Meridian Growth Co., a 40-person B2B SaaS company in Ottawa, was processing over 300 inbound leads per week. Their sales team was spending 15 hours per week manually reviewing and qualifying leads before routing them to reps — a process that was slow, inconsistent, and eating into selling time."*

**What was breaking:**
[Describe the specific failure mode. Be concrete. Avoid vague language like "AI wasn't working." Say exactly what was happening and what it cost.]

- [Specific problem 1 — e.g., "Their existing AI qualification tool crashed an average of 3 times per week, requiring a developer to manually restart the pipeline each time."]
- [Specific problem 2 — e.g., "When the tool failed overnight, leads sat unprocessed until morning — an average of 6-hour response delays that cost them deals."]
- [Specific problem 3 — e.g., "The tool couldn't handle edge cases — unusual form inputs would produce hallucinated scores with no flagging, sending wrong leads to the wrong reps."]

**The cost of doing nothing:**
[Quantify the status quo. How much was this costing them in time, money, or opportunity?]

- [X] hours/week in manual labor at $[rate] = $[X]/year
- [X]% of leads lost or delayed due to system failures = estimated $[X]/year in pipeline impact
- [X] developer hours/month on incident response = $[X]/year
- **Total estimated annual cost: $[X]**

---

## The Solution

**What we built:**
[Describe the agent team in plain language. Focus on what each agent does and how they work together. Avoid technical jargon — this section needs to be readable by a non-technical exec.]

**[Agent 1 Name — e.g., Intake Agent]**
[2 sentences: what it monitors, what it does when triggered, what it passes downstream]

**[Agent 2 Name — e.g., Qualification Agent]**
[2 sentences: how it evaluates, what criteria it applies, how it handles uncertainty]

**[Agent 3 Name — e.g., Routing Agent]**
[2 sentences: how it routes, what the output looks like, where it goes]

**[Agent 4 Name — e.g., Recovery Agent]**
[2 sentences: what triggers it, what it does, how it logs incidents]

**The self-healing layer:**
Every agent in the team was built with Nexus's self-healing infrastructure:
- Circuit breakers prevent a single failure from cascading through the pipeline
- Automatic retry with exponential backoff recovers [X]% of failures without human intervention
- Fallback model routing switches from Claude to GPT-4o if the primary model is degraded
- Health scoring gives the team a real-time 0-100 score for every agent — problems show up before they become incidents
- Full conversation logging means every failure is reproducible and debuggable

**Integrations:**
[List what was connected — e.g., HubSpot CRM, Gmail, Slack, Google Sheets. 1 sentence each on what the integration does.]

**Build time:** [X] weeks
**Template used:** [email-auto-responder / lead-qualifier / customer-support-bot / document-processor / custom]

---

## The Results

*These numbers need to be real. Don't round up. Don't estimate without stating it's an estimate. Specificity is what makes a case study credible.*

### Primary Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| AI agent incidents per month | [X] | [X] | -[X]% |
| Automatic recovery rate | [X]% | [X]% | +[X]pp |
| Manual hours per week on AI maintenance | [X] hrs | [X] hrs | -[X]% |
| Lead response time | [X] hrs | [X] min | -[X]% |
| [Custom metric] | [Before] | [After] | [Change] |

### Financial Impact

- **Annual labor savings:** $[X] ([X] hours/week × $[rate] × 52 weeks)
- **Annual pipeline improvement:** $[X] (estimated, based on [X]% improvement in response time × conversion uplift)
- **Annual developer time recovered:** $[X] ([X] hours/month × $[rate] × 12 months)
- **Reduction in AI API costs:** $[X]/month (from automatic prompt caching and smart retry logic)
- **Total first-year value:** $[X]

### ROI

- **Build investment:** $[X]
- **Payback period:** [X] weeks
- **First-year ROI:** [X]%
- **3-year projected ROI:** [X]%

### Qualitative Outcomes

[1-2 sentences on what changed beyond the numbers. Did the team stop dreading Mondays? Did the CTO stop getting paged at 2am? Did the CEO get to present better metrics to the board?]

*Example: "The engineering team went from treating the AI system as a liability to treating it as infrastructure. 'I stopped thinking about it,' the CTO told us at the 90-day check-in. That's exactly what we built it to do."*

---

## Client Quote

> "[Direct quote from client. Ask for this specifically — email them: 'Could you give me 1-2 sentences about the experience? It'll be used on our website and in sales materials.' Most clients are happy to provide this if you make it easy.']"

**— [Name], [Title], [Company]**

---

## Technical Details

*This section is for technical buyers. Non-technical readers can stop above.*

**Framework:** Nexus open-source multi-agent framework (nexus-agents npm package)
**Language:** TypeScript
**AI models:** Anthropic Claude [version] (primary), OpenAI GPT-4o (fallback)
**Deployment:** [AWS Lambda / GCP Cloud Run / Azure Container Apps / Nexus Cloud]
**Template:** [email-auto-responder / lead-qualifier / customer-support-bot / document-processor]

**Agent configuration:**

| Agent | Model | Circuit breaker threshold | Retry policy | Fallback |
|-------|-------|--------------------------|--------------|---------|
| [Agent 1] | Claude Sonnet | [X] failures / [X]s window | 3 retries, exponential backoff | GPT-4o |
| [Agent 2] | Claude Sonnet | [X] failures / [X]s window | 3 retries, exponential backoff | Cached response |
| [Agent 3] | Claude Haiku | [X] failures / [X]s window | 5 retries, linear backoff | Queue for retry |

**Self-healing stats (first 30 days):**
- Total failure events detected: [X]
- Automatically recovered: [X] ([X]%)
- Escalated to human: [X] ([X]%)
- Average recovery time: [X] seconds
- Zero unplanned outages

**Prompt caching savings:**
- Cache hit rate: [X]%
- Tokens saved via caching: [X]M tokens
- API cost reduction: [X]%

---

## About This Engagement

**Services provided:** [Discovery, Architecture, Build, Deployment, Retainer]
**Project duration:** [X] weeks
**Nexus team size:** [X] people

---

*Want results like these? [Book a 20-minute call →](calendar link)*
*Nexus AI Agency | nexus.agency | "Your AI agents break. Ours heal themselves."*
