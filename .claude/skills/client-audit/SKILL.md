---
name: client-audit
description: Use when conducting an AI audit for a new client. Guides the process of analyzing their operations, identifying automation opportunities, and calculating ROI.
---

# Client AI Audit Process

## When to Use
When a client has paid for an AI Audit ($5,000-$15,000) and we need to analyze their business.

## Process

### 1. GATHER
Collect information about the client's operations:
- What processes are manual and repetitive?
- How many people are involved in each process?
- What's the volume? (emails/day, leads/month, documents/week)
- What systems do they use? (CRM, email, support tickets)
- What are average salaries for the roles doing this work?
- What breaks most often? What causes 2am calls?

### 2. ANALYZE
For each process identified, calculate:
- Hours per week spent on this task
- Annual cost: hours × hourly rate × 52
- Automation potential: what % can AI handle? (typically 60-80%)
- Estimated savings: annual cost × automation %
- Implementation complexity: low (template exists) / medium (customization needed) / high (custom build)

### 3. PRIORITIZE
Rank opportunities by:
- ROI (highest savings relative to implementation cost)
- Complexity (start with easiest wins — low complexity first)
- Impact (which one impresses the client most / removes most pain)

### 4. MAP TO TEMPLATES
For each opportunity, identify which Nexus template fits:
- Email handling → email-auto-responder template
- Lead intake → lead-qualifier template
- Support tickets → customer-support-bot template
- Document review → document-processor template
- Multi-perspective analysis → debate template
- Custom → design from scratch

### 5. DELIVERABLE
Generate an audit report including:
- Executive summary (2 paragraphs a CEO reads in 30 seconds)
- Process analysis table (each process with current cost, savings, complexity)
- Top 3 recommended automations with projected ROI
- Implementation timeline (90-day roadmap)
- Total projected annual savings
- Investment options (build-only vs build+retainer vs managed)

## Pricing Reference
- Company size 1-50 employees, 1 department: $5,000
- Company size 50-200, 2-3 departments: $8,000-$10,000
- Company size 200+, enterprise: $12,000-$15,000

## Output
Use toClientReport() from nexus-core for HTML output, or Markdown for email delivery.
