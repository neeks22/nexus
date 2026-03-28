---
name: client-health-check
description: Use for weekly check on all active client deployments. Reviews agent health, costs, alerts, and flags anything needing attention.
---

# Weekly Client Health Check

## When to Use
Every Monday morning. Takes 15 minutes. Prevents surprises.

## Process

### 1. CHECK EACH CLIENT
For every active client in ClientManager:
- Pull current agent health scores
- Check for any tombstones in the past 7 days
- Check alert history (any warnings or criticals?)
- Check budget usage (% spent vs % of month elapsed)
- Check cost trend (spending more or less than last week?)

### 2. FLAG ISSUES
Red flags that need immediate action:
- Any agent in FAILED or RECOVERING state
- Budget usage > 80% before month 20th
- More than 3 tombstones in a week
- Any critical alert that wasn't resolved
- Cost per task increasing (possible cache miss)

Yellow flags to monitor:
- Agent in DEGRADED state
- Budget usage > 60% before month 15th
- Latency increasing trend
- Quality scores dropping

### 3. ACTION ITEMS
For each flag, decide:
- Fix now (critical — client might notice)
- Fix this week (important — prevents future issues)
- Monitor (watch for another week before acting)
- Ignore (noise, not signal)

### 4. LOG
Update each client's file with:
- Date of check
- Health status summary
- Any actions taken
- Next check scheduled

## Output
Quick summary per client:
```
[Client Name] — STATUS: GREEN/YELLOW/RED
  Agents: 3/3 healthy | Tombstones: 0 | Budget: 42% used
  Notes: [any flags or actions]
```
