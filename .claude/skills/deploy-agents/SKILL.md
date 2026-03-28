---
name: deploy-agents
description: Use when deploying AI agents for a client. Guides template selection, prompt customization, self-healing configuration, testing, and launch.
---

# Client Agent Deployment Process

## When to Use
When building and deploying AI agents for a paying client.

## Process

### 1. SELECT TEMPLATE
Choose from 9 built-in templates:
| Template | Use Case | Agents |
|----------|----------|--------|
| email-auto-responder | Email handling | 4 (Classifier, Drafter, Tone, Finalizer) |
| lead-qualifier | Lead scoring | 4 (Extractor, Scorer, Enricher, Router) |
| customer-support-bot | Support tickets | 4 (Intake, Knowledge, Composer, QA) |
| document-processor | Document review | 4 (Parser, Analyzer, Planner, Reporter) |
| debate-arena | Analysis | 5 (Researcher, Philosopher, Contrarian, Pragmatist, Synthesizer) |
| code-review | Code quality | 4 (Security, Style, Logic, Orchestrator) |
| research-team | Research | 3 (Lead, DeepDiver, FactChecker) |
| brainstorm-team | Ideas | 3 (Visionary, Critic, Builder) |
| customer-support | Basic support | 3 (Triage, Specialist, QA) |

### 2. CUSTOMIZE PROMPTS
For each agent in the template:
- Rewrite system prompt with client's specific context, products, policies
- Add client terminology and brand voice
- Set appropriate tone (professional, friendly, formal)
- Configure tools (web search if needed)
- Set response length limits appropriate for use case

### 3. CONFIGURE SELF-HEALING
- Health thresholds: keep defaults unless client has specific SLA
- Circuit breaker: 3 failures = open, 60s reset (adjust for high-volume clients)
- Cost ceiling: $5/agent/run default. Increase for complex tasks.
- Alerts: configure Slack/Discord webhook for client's team
- Prompt caching: always enable (saves 50%+ on API costs)

### 4. TEST (before going live)
- Run 10 test interactions covering common scenarios
- Test edge cases: empty input, very long input, off-topic, multilingual
- Simulate failures: disconnect mid-response, rate limit, timeout
- Verify self-healing recovers correctly
- Verify alerts fire to the right channel
- Check cost tracking matches expected range

### 5. DEPLOY
- Register client in ClientManager with budget
- Start agents and verify dashboard health
- Send client their dashboard access credentials
- Set up monthly report schedule
- Document deployment in client file

### 6. MONITOR (first 48 hours)
- Check health scores every 4 hours
- Watch for unexpected error patterns
- Verify prompt caching is active (check cache hit rates)
- Confirm alert system is working
- Be ready for emergency intervention

## Post-Deploy
- Schedule 30-day check-in
- Set up monthly report generation
- Log deployment in case study template for future use
