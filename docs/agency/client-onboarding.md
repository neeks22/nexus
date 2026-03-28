# Client Onboarding Checklist

**Project:** [Project Name]
**Client:** [Client Name]
**Project Lead (Nexus):** [Your Name]
**Client Point of Contact:** [Name, Title, Email, Phone]
**SOW Reference:** NEXUS-SOW-[YYYY]-[###]
**Kickoff Date:** [Date]

Use this document as the single source of truth for onboarding. Check off each item as complete. Both parties should have a copy.

---

## Pre-Kickoff (Complete before kickoff call)

### Nexus Responsibilities

- [ ] Send signed SOW to client and collect countersignature
- [ ] Collect 50% deposit — confirm payment received before booking kickoff
- [ ] Create shared Slack channel: `nexus-[clientname]` — invite client contacts
- [ ] Create shared project folder (Google Drive / Notion / Linear — client's preference)
- [ ] Send pre-kickoff questionnaire (see below) with 3-day response deadline
- [ ] Research client's tech stack before the call — don't ask what you can Google
- [ ] Book kickoff call — 60 minutes, video on, send calendar invite with agenda attached
- [ ] Send kickoff agenda 24 hours before the call

### Pre-Kickoff Questionnaire (send to client, collect answers before kickoff)

**Technical access needed before we can start:**

| System | What we need | Who provides it | Status |
|--------|-------------|-----------------|--------|
| [CRM / HubSpot / Salesforce] | API key with read+write, sandbox access | [name] | [ ] |
| [Email / Gmail / Outlook] | OAuth credentials or service account | [name] | [ ] |
| [Notification / Slack] | Webhook URL for designated channel | [name] | [ ] |
| [Cloud platform] | IAM role or service account with deploy permissions | [name] | [ ] |
| [Database] | Read-only access to relevant tables | [name] | [ ] |
| [Other] | [Describe] | [name] | [ ] |

**Context we need:**
- [ ] Org chart / who owns this process day-to-day
- [ ] Any existing documentation on the current process (SOPs, flowcharts, training docs)
- [ ] Examples of real inputs the system will handle (anonymized if needed — 10-20 examples minimum)
- [ ] Examples of desired outputs for those inputs ("for this lead, the right answer was X")
- [ ] Any previous AI tools tried and why they didn't work
- [ ] Definition of success: what does "working" look like to you in 90 days?

### Client Responsibilities (Pre-Kickoff)

- [ ] Return the pre-kickoff questionnaire
- [ ] Identify all stakeholders who need to be in the kickoff call
- [ ] Designate one primary technical contact who can provide API access
- [ ] Designate one primary business contact who can answer process questions and approve deliverables
- [ ] Confirm the communications preference (Slack, email, weekly calls)

---

## Week 0: Kickoff Call

**Duration:** 60 minutes
**Attendees (Nexus):** Project lead + [developer if separate]
**Attendees (Client):** Business contact, technical contact, and any key stakeholders

### Kickoff Call Agenda

*Send this agenda with the calendar invite. Don't wing the kickoff.*

**0:00 — Introductions (5 min)**
- Each person: name, role, what you're hoping to get from this project
- Set the tone: we're a small, focused team, you'll have direct access to the people building this

**0:05 — Confirm scope (15 min)**
- Walk through the SOW together — not the legal language, the actual deliverables
- Ask: "Is there anything here that doesn't match what you were expecting?"
- Ask: "Is there anything you were expecting that's not here?"
- Document any gaps — these become Change Orders if they're out of scope

**0:20 — Current process deep-dive (15 min)**
- Have the business contact walk you through the process as they do it today
- Ask: "Walk me through the last time this went well. What happened?"
- Ask: "Walk me through the last time this went badly. What happened?"
- Ask: "What's the most common failure mode?"
- Take notes. This is gold for discovery.

**0:35 — Timeline and communication plan (10 min)**
- Confirm the milestone dates from the SOW
- Set expectations: you'll get a Friday update every week, no surprises
- Establish: who reviews deliverables? What's the turnaround time for feedback? (Target: 48 hours)
- Confirm Slack channel is set up and everyone's in it

**0:45 — Technical access review (10 min)**
- Go through the credentials checklist together — what's been provided, what's still needed
- Assign owners and deadlines for anything outstanding
- Critical: if you don't have API access, you can't start building. Be direct about this.

**0:55 — Q&A and next steps (5 min)**
- What happens next: you'll send a summary of this call by EOD
- Ask: "Any questions or concerns before we kick off?"
- Confirm: discovery begins [date], first check-in [date]

### Post-Kickoff (Nexus does within 24 hours)

- [ ] Send written summary of the kickoff call to all attendees
- [ ] Confirm milestone dates in writing
- [ ] Log any scope ambiguities or open questions in shared project doc
- [ ] Begin discovery immediately — don't wait for perfect credentials, start with what you have

---

## Week 1: Discovery

**Goal:** Fully understand the current state before designing anything. Never design what you don't understand.

### Nexus Tasks

- [ ] **Stakeholder interviews** (30-45 min each):
  - Interview the person who does this process manually today — they know the edge cases no one documented
  - Interview the manager who owns the outcome — they know what "good" looks like
  - If relevant: interview a downstream user (e.g., the sales rep who receives qualified leads)
  - Document verbatim: the weird exceptions, the workarounds, the "we do it this way because..." stories

- [ ] **Process mapping:**
  - Create a flowchart of the current process: every step, every decision point, every system touched
  - Mark the steps that are highest cost, highest error rate, or biggest bottleneck
  - Share with client for validation — they'll always find something wrong with the first version

- [ ] **Data flow mapping:**
  - Document every piece of data that enters and exits this process
  - Where does it come from? What format? How clean is it?
  - Where does it go? Who consumes it? In what form?
  - Identify data quality issues now — better to surface them in Week 1 than Week 4

- [ ] **Integration audit:**
  - Test each API credential provided — do they actually work? Do they have the right permissions?
  - Check API rate limits — will they be a constraint at production volume?
  - Identify any undocumented APIs or systems that come up in interviews
  - Flag anything that might require vendor support or additional procurement

- [ ] **Edge case collection:**
  - Collect 20-30 real examples of inputs (anonymize if needed)
  - Ask: "What's the weirdest thing that comes in that we have to handle?"
  - Ask: "What's the case that always breaks the current system?"
  - These become your test cases for Week 5

### End of Week 1 Deliverable

- [ ] Discovery document (process map + data flow + edge cases) shared with client
- [ ] Client confirms the process map is accurate — get this in writing (Slack message is fine)
- [ ] Any discovered risks or blockers escalated immediately, not held until Friday update

---

## Week 2: Design Review

**Goal:** Client approves the architecture before a single line of production code is written.

### Nexus Tasks

- [ ] Draft architecture document:
  - Agent team: name, role, inputs, outputs, failure behavior for each agent
  - Integration specs for each system
  - Data schemas: what goes in, what comes out, how it's stored
  - Self-healing configuration: retry policies, fallback models, escalation thresholds

- [ ] Schedule architecture review call (60 min):
  - Present the architecture in plain language — no jargon
  - Walk through each agent: "This one watches your inbox. When it sees a new form submission, it does X, then passes Y to the next agent."
  - Walk through failure scenarios: "If the CRM is down, here's what happens."
  - Collect feedback in real time

- [ ] Update architecture doc based on feedback

- [ ] Get written sign-off from client before build begins:
  - "We approve the architecture as described in [document name] dated [date] and authorize Nexus to begin building."
  - Slack message is sufficient. Email preferred. Formal signature not required.

### Client Tasks

- [ ] Review architecture document within 48 hours
- [ ] Attend architecture review call
- [ ] Provide written approval to proceed
- [ ] Surface any concerns before sign-off — changes after build begins require Change Orders

---

## Weeks 3-4: Build

**Goal:** Build it right the first time. No cowboy code.

### Communication During Build

- [ ] **Daily async update** posted in Slack by Nexus: what was built yesterday, what's being built today, any blockers
- [ ] **No surprises rule:** If something is harder than expected and will affect timeline, say so the day you discover it — not on Friday
- [ ] **Client response expectation:** If Nexus has a question, client responds within 1 business day. Delays compound.

### Week 3 Checkpoints

- [ ] Core agents built and individually tested
- [ ] Integration connections established (even if not fully wired)
- [ ] Share a short screen recording (Loom) of one agent running — gives client confidence something real is happening
- [ ] Identify any technical risks discovered during build and communicate immediately

### Week 4 Checkpoints

- [ ] Full pipeline assembled and running end-to-end in staging
- [ ] Self-healing layer configured and tested: simulate an API failure, confirm automatic recovery
- [ ] Health scoring operational — Nexus can see agent health scores in real time
- [ ] All edge cases from discovery loaded as test cases
- [ ] Internal pass/fail against acceptance criteria — fix everything before UAT begins
- [ ] Prepare UAT guide for client (see Week 5)

---

## Week 5: User Acceptance Testing (UAT)

**Goal:** Client breaks it before real users do.

### Nexus Tasks

- [ ] Prepare UAT guide:
  - Step-by-step instructions for how to test each function
  - Specific test cases to run (using the edge cases from discovery)
  - How to report issues: use the shared bug tracker, include steps to reproduce
  - What counts as a "bug" vs. a "new feature request" (new features = Change Order)

- [ ] Deploy to staging environment — identical to production, separate from it
- [ ] Be available during UAT week — respond to bugs same day
- [ ] Triage each reported issue: bug (we fix it) vs. new request (Change Order) vs. user error (we explain it)

### Client Tasks

- [ ] Run through the UAT guide with real data
- [ ] Test the scenarios that matter most to you — don't just run the happy path
- [ ] Report issues in the shared tracker with steps to reproduce
- [ ] Provide consolidated feedback by end of Week 5 — no new feedback after sign-off

### UAT Sign-Off

- [ ] All acceptance criteria met (verified against Section 5 of SOW)
- [ ] No open bugs classified as "blockers"
- [ ] Client provides written UAT sign-off: "We approve this system for production deployment."
- [ ] Final invoice issued upon UAT sign-off (payment due before production deployment)

---

## Week 6: Production Deployment and Go-Live

### Deployment Day

- [ ] Final payment received before production deployment begins
- [ ] Deploy to production environment
- [ ] Smoke test every function in production with real data
- [ ] Confirm health scoring is operational and alerts are routing correctly
- [ ] Both parties on standby for the first 2 hours post-deployment

### 48-Hour Monitoring Period

- [ ] Nexus monitors agent health scores every few hours
- [ ] Any issues addressed immediately — this is the highest-priority period
- [ ] Nexus sends a brief status update at 24 hours and 48 hours post-launch
- [ ] If a critical issue is found: fix it. Don't wait for a scheduled call.

### Handoff Documentation

- [ ] Technical documentation delivered (how each agent works, how to configure it)
- [ ] Operations runbook delivered (how to monitor, restart, debug, and extend the system)
- [ ] Credentials audit: confirm client has all credentials stored securely and Nexus test credentials are revoked
- [ ] Recorded Loom walkthrough of the full system delivered
- [ ] 60-minute live walkthrough call with client's technical team

### Go-Live Checklist Sign-Off

- [ ] System running in production
- [ ] Client has all documentation
- [ ] Client has all credentials and can operate without Nexus
- [ ] All Nexus access to client systems revoked or formally transitioned
- [ ] Project marked complete in Nexus project tracker

---

## Post-Launch

### 30-Day Check-In

- [ ] Schedule 30-minute call at Day 30
- [ ] Review: Has the system performed as expected? Any surprises?
- [ ] Review actual metrics vs. projected ROI from proposal
- [ ] Ask: "Is there anything you wish was different?" — this surfaces retainer and upsell opportunities
- [ ] Document any modifications requested — quote Change Orders or retainer as appropriate

### First Monthly Report (if on retainer)

- [ ] Send first monthly performance report by Day 35
- [ ] Use the Monthly Report Template
- [ ] Include: transaction volume, success rate, recovery events, cost savings, value delivered
- [ ] Include: one recommendation for next month (shows you're paying attention, not just watching dashboards)

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|-------------|
| Nexus Project Lead | [Name] | [Email / Phone] | Business hours + urgent after-hours |
| Nexus Technical Lead | [Name] | [Email / Phone] | Business hours |
| Client Business Contact | [Name] | [Email / Phone] | [Hours] |
| Client Technical Contact | [Name] | [Email / Phone] | [Hours] |

**Production emergency?** Text [Nexus phone] with "NEXUS URGENT" in the message. Response within 1 hour.

---

*Onboarding Checklist | Nexus AI Agency | NEXUS-SOW-[YYYY]-[###]*
