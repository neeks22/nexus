---
name: monthly-report
description: Use when generating monthly performance reports for clients. Pulls data, calculates ROI, and formats for CEO consumption.
---

# Monthly Client Report Process

## When to Use
First week of each month, for every active retainer client.

## Process

### 1. GATHER DATA
- Total tasks handled by AI agents this month
- Agent health scores (average, min, max per agent)
- Self-healing events (incidents caught, recovered, escalated)
- Uptime percentage (healthy hours / total hours)
- API costs for this client this month
- Average response time per agent
- Tombstones (if any — what failed permanently)

### 2. CALCULATE VALUE
- Hours saved = tasks handled × avg minutes per task / 60
- Cost savings = hours saved × client's hourly rate (default $75/hr)
- Incidents prevented = self-healing recoveries × $500/incident
- Cache savings = cost without caching - cost with caching
- Total value = cost savings + incidents prevented + cache savings
- ROI = total value / retainer fee × 100%
- Month-over-month comparison (if not first month)

### 3. GENERATE REPORT
Use toClientReport() from nexus-core with ClientReportContext:
```typescript
{
  clientName: "[Client Name]",
  projectName: "[Project Name]",
  preparedBy: "Nexus AI Agency",
  monthlyRetainer: [retainer amount in cents],
  hoursReduced: [calculated hours saved],
  incidentsPrevented: [self-healing recoveries]
}
```

Report sections:
- Executive summary (2-3 sentences a CEO reads in 10 seconds)
- Key metrics (4 cards: success rate, response time, recoveries, cost)
- Agent performance table
- Self-healing summary (the wow factor — proves reliability)
- Value delivered (the money section — ROI, savings, hours freed)
- Recommendations (1-2 optimization ideas for next month)
- Month-over-month trend (if applicable)

### 4. DELIVER
- Email report with 3-sentence summary in the body
- Attach HTML report as file or inline
- Schedule monthly check-in call if applicable
- Log delivery in client tracker
- Note any upsell triggers observed (see expansion-playbook.md)

## First Month Special
The first monthly report is the most important — it either proves the value or loses the client. Make the ROI section prominent. If ROI is strong, use it. If ROI is weak, lead with operational improvements and set expectations for month 2.
