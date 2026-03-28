# Statement of Work

**Project:** [Project Name — e.g., Lead Qualification Agent System]
**Client:** [Client Legal Name] ("Client")
**Contractor:** Nexus AI Agency, operated by [Your Legal Name] ("Nexus")
**Effective Date:** [Date]
**SOW Reference:** NEXUS-SOW-[YYYY]-[###]

This Statement of Work is entered into pursuant to the Master Services Agreement between Client and Nexus dated [date], or if no MSA exists, stands as the governing agreement for this engagement. Both parties agree to the following terms.

---

## 1. Scope of Work

### 1.1 Project Overview

Nexus will design, build, test, and deploy a self-healing multi-agent AI system for Client as described below. The system will be built using the Nexus open-source framework and delivered as fully owned, documented code.

### 1.2 Deliverables

The following deliverables are included in this engagement. Anything not listed here is out of scope and subject to a Change Order (see Section 6).

**Deliverable 1: Discovery Documentation**
- Current process map showing all steps, decision points, and systems involved
- Data flow diagram showing inputs, outputs, and integration points
- Integration audit listing all API credentials and access requirements
- Acceptance criteria document approved by both parties before build begins

**Deliverable 2: Architecture Document**
- Written description of each agent in the team: name, role, inputs, outputs, failure behavior
- Integration specifications for each third-party system
- Infrastructure diagram showing deployment topology
- Sign-off required from Client before development begins

**Deliverable 3: Agent Codebase**
- [X] production-ready agents built on the Nexus framework
- Unit tests for each agent with minimum [80]% code coverage
- Integration tests covering the full pipeline end-to-end
- Self-healing configuration: circuit breakers, retry policies, health scoring thresholds

**Deliverable 4: Integrations**
- [List each integration: e.g., HubSpot CRM read/write, Gmail OAuth, Slack webhooks]
- Each integration includes error handling, retry logic, and fallback behavior
- Credentials stored securely using [Client's preferred secret management: AWS Secrets Manager / environment variables / etc.]

**Deliverable 5: Deployment**
- Deployment to [Client's environment: AWS / GCP / Azure / Nexus Cloud]
- Infrastructure-as-code (deployment scripts) so Client can redeploy independently
- Environment configuration for staging and production
- 48-hour post-launch monitoring period with Nexus on call

**Deliverable 6: Documentation and Handoff**
- Technical documentation: how each agent works, how to configure it, how to extend it
- Operations runbook: how to monitor, restart, scale, and debug the system
- 60-minute walkthrough call with Client's technical team
- Recorded video walkthrough (Loom or equivalent)

### 1.3 Explicitly Out of Scope

The following are not included unless added via Change Order:
- Changes to Client's existing systems (CRM customization, website changes, etc.)
- Data migration or historical data processing
- Mobile applications or front-end user interfaces
- Ongoing monitoring after the 48-hour post-launch period (covered by retainer, if applicable)
- Any integrations not listed in Section 1.2
- Training Client's staff beyond the handoff call described above
- HIPAA compliance infrastructure (available as add-on — contact Nexus)

---

## 2. Timeline and Milestones

| Milestone | Description | Due Date | Payment Trigger |
|-----------|-------------|----------|-----------------|
| M1: Project Start | Discovery begins | [Date] | 50% deposit received |
| M2: Architecture Approved | Client signs off on architecture doc | [Date + 14 days] | — |
| M3: Internal Testing Complete | Nexus completes end-to-end testing | [Date + 28 days] | — |
| M4: UAT Complete | Client testing and all issues resolved | [Date + 35 days] | — |
| M5: Production Deployment | System live in production | [Date + 42 days] | Final 50% due |
| M6: Handoff Complete | Documentation delivered, walkthrough done | [Date + 45 days] | — |

**Schedule assumptions:** Timeline assumes Client provides all required credentials, access, and feedback within 2 business days of each request. Delays caused by Client-side response time will extend the timeline accordingly and will not constitute a breach by Nexus.

---

## 3. Payment Schedule

| Invoice | Amount | Due |
|---------|--------|-----|
| Invoice 1 — Deposit | 50% of total project fee = $[X] | Upon signing this SOW |
| Invoice 2 — Delivery | 50% of total project fee = $[X] | Upon production deployment (M5) |

**Total project fee: $[X]**

For retainer engagements (if applicable):
- Monthly retainer: $[X]/month
- First month billed on the production deployment date
- Subsequent months billed on the same day each month
- 30 days written notice required to cancel retainer

**Late payments:** Invoices unpaid after 15 days accrue interest at 1.5% per month. Nexus reserves the right to suspend work if invoices are more than 30 days overdue.

**Accepted payment methods:** Bank transfer (EFT), credit card (3% processing fee applies), or [other method].

---

## 4. Intellectual Property

### 4.1 Client Owns Everything We Build

All code, configurations, documentation, agent definitions, prompt templates, and other work product created by Nexus specifically for this engagement ("Project IP") is work-for-hire. Upon receipt of final payment, all rights, title, and interest in Project IP transfer exclusively to Client. Nexus retains no license, ownership, or claim on Project IP after final payment.

### 4.2 Nexus Framework

The underlying Nexus open-source framework (nexus-agents npm package) is MIT licensed and is not subject to this transfer. Client receives the same rights as any open-source user: full right to use, modify, and deploy it without restriction, with no ongoing fees or permissions required.

### 4.3 No Vendor Lock-In

Client can operate, modify, extend, or replace the delivered system at any time without Nexus's involvement or permission. Nexus will not build dependencies into the system that require ongoing Nexus involvement to function.

### 4.4 Pre-Existing IP

Each party retains ownership of any intellectual property created prior to this engagement. Nexus may reuse general knowledge, patterns, and non-Client-specific techniques learned during this engagement in future projects, provided no Client confidential information is disclosed.

---

## 5. Acceptance Criteria

The project is considered complete and delivery payment is due when all of the following are true:

**Functional criteria:**
- [ ] All agents defined in the architecture document are deployed and running in production
- [ ] All integrations listed in Section 1.2 are connected and functioning
- [ ] The pipeline processes [X] real test cases provided by Client with [Y]% accuracy
- [ ] Self-healing: system recovers from simulated API failures without manual intervention
- [ ] Health scoring dashboard shows real-time agent status

**Performance criteria:**
- [ ] End-to-end pipeline completes in under [X] seconds for a typical transaction
- [ ] System handles [X] concurrent requests without degradation
- [ ] No data loss during recovery events

**Documentation criteria:**
- [ ] Technical documentation covers all agents and integrations
- [ ] Operations runbook allows Client's team to restart and debug without Nexus
- [ ] Handoff walkthrough completed and recorded

If any criterion is not met, Nexus will continue working to resolve it at no additional charge. Client will not withhold final payment for issues outside the defined acceptance criteria.

---

## 6. Change Order Process

### 6.1 What Requires a Change Order

Any request that adds to, removes from, or materially changes the scope defined in Section 1 requires a written Change Order signed by both parties before work begins.

Examples:
- Adding a new agent or integration not listed in Section 1.2
- Changing the target platform or deployment environment mid-project
- Requesting features discovered during UAT that are not in the original scope
- Accelerating the timeline

### 6.2 Change Order Process

1. Either party identifies a potential scope change
2. Nexus provides a written Change Order within 3 business days: description, impact on timeline, and additional cost (if any)
3. Client approves or declines in writing
4. Approved Change Orders are appended to this SOW and become binding

**Emergency changes:** If Client requires an urgent out-of-scope change, Nexus will make a good-faith effort to accommodate, billed at $[X]/hour. Emergency rate is $[X]/hour.

---

## 7. Confidentiality

### 7.1 Mutual NDA

Both parties agree to keep confidential all non-public information received from the other party in connection with this engagement, including but not limited to: business processes, technical architecture, pricing, customer data, and API credentials.

### 7.2 Duration

Confidentiality obligations survive termination of this SOW for a period of 3 years.

### 7.3 Exceptions

Information is not confidential if it: (a) is or becomes publicly known through no breach of this SOW; (b) was already known to the receiving party; (c) is independently developed without reference to the confidential information; or (d) must be disclosed by law, provided the disclosing party gives maximum advance notice permitted.

### 7.4 Client Data

Nexus will not use, sell, or share Client's data for any purpose other than performing the services in this SOW. Client data processed by agents remains Client's property. Nexus will delete or return all Client data within 30 days of project completion upon request.

---

## 8. Termination

### 8.1 Termination for Cause

Either party may terminate this SOW immediately upon written notice if the other party: (a) materially breaches this SOW and fails to cure within 15 days of written notice; (b) becomes insolvent or files for bankruptcy; or (c) engages in fraud or willful misconduct.

### 8.2 Termination for Convenience

Client may terminate this SOW for any reason with 15 days written notice. Upon termination:
- Nexus will deliver all work completed to date in its current state
- Client will pay for all work completed prior to termination, prorated against the project fee
- The deposit is non-refundable if termination occurs after discovery phase begins
- All IP created to date transfers to Client upon payment of amounts owed

### 8.3 Nexus Termination

Nexus may terminate this SOW if Client's invoice is more than 45 days overdue after written notice, or if Client fails to provide access or information necessary to proceed for more than 30 days.

---

## 9. Warranties and Liability

### 9.1 Nexus Warranties

Nexus warrants that: (a) delivered work will conform to the acceptance criteria in Section 5; (b) Nexus has the right to enter this agreement; (c) the work will not infringe third-party IP rights.

### 9.2 Warranty Period

Nexus will fix bugs (deviations from acceptance criteria) at no charge for 30 days after production deployment. This warranty covers defects in the delivered code, not changes in third-party APIs, AI model behavior, or Client-initiated modifications.

### 9.3 Limitation of Liability

Nexus's total liability under this SOW shall not exceed the total fees paid by Client in the 3 months preceding the claim. Neither party is liable for indirect, consequential, or punitive damages.

### 9.4 AI Outputs

Client acknowledges that AI agents may produce incorrect outputs and that human review is advisable for high-stakes decisions. Nexus is not liable for business decisions made based on agent outputs.

---

## 10. General

- **Governing Law:** This SOW is governed by the laws of the Province of Ontario, Canada.
- **Dispute Resolution:** Parties will attempt to resolve disputes in good faith. If unresolved within 30 days, disputes go to binding arbitration in Ottawa, Ontario.
- **Independent Contractor:** Nexus is an independent contractor. Nothing in this SOW creates an employment or partnership relationship.
- **Entire Agreement:** This SOW, together with any attached Change Orders, constitutes the entire agreement for this engagement and supersedes all prior discussions.
- **Amendments:** Must be in writing and signed by both parties.
- **Severability:** If any provision is unenforceable, the remaining provisions remain in effect.

---

## Signatures

By signing below, both parties agree to the terms of this Statement of Work.

**Client:**

Name: ___________________________
Title: ___________________________
Date: ___________________________
Signature: ___________________________

**Nexus AI Agency:**

Name: ___________________________
Title: ___________________________
Date: ___________________________
Signature: ___________________________

---

*SOW Reference: NEXUS-SOW-[YYYY]-[###] | Generated by Nexus AI Agency*
