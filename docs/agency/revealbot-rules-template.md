# Revealbot Automation Rules — Dealership Ad Campaigns

> Ready-to-implement rules for Facebook/Instagram dealership campaigns.
> Copy these directly into Revealbot. Adjust dollar thresholds per market.

---

## Table of Contents

1. [Auto-Kill Rules (Stop Wasting Money)](#auto-kill-rules)
2. [Auto-Scale Rules (Double Down on Winners)](#auto-scale-rules)
3. [Alert Rules (Notify the Team)](#alert-rules)
4. [Budget Rules](#budget-rules)
5. [Creative Rotation Rules](#creative-rotation-rules)
6. [Subprime-Specific Rules](#subprime-specific-rules)
7. [Implementation Checklist](#implementation-checklist)

---

## Auto-Kill Rules

These rules exist to stop bleeding money on ads that will never convert. In dealership campaigns, bad ads can burn through hundreds of dollars in a single afternoon. Every dollar wasted on a dead ad is a dollar that could have gone to a winner.

### Rule 1: Kill High-CPA Ads

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Cost per Lead > $40 AND Impressions > 1,000 |
| **Action** | Pause ad |
| **Lookback Window** | Lifetime of the ad |
| **Check Frequency** | Every 30 minutes |

**Revealbot Setup:**
```
IF cost_per_lead > 40
AND impressions > 1000
THEN pause ad
```

**Why this matters for dealerships:** At $40 CPA, your cost-to-close math breaks. If your show rate is 50% and close rate is 30%, you need ~6.7 leads per sale. At $40/lead that is $267 per sale in ad cost alone. For a front-end gross of $1,500-2,000 on a prime deal, that eats too much margin. The 1,000-impression minimum prevents killing ads before they have enough data to judge fairly.

---

### Rule 2: Kill Low-CTR Ads

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | CTR (link) < 0.5% AND Impressions > 2,000 |
| **Action** | Pause ad |
| **Lookback Window** | Lifetime of the ad |
| **Check Frequency** | Every 1 hour |

**Revealbot Setup:**
```
IF ctr_link < 0.5
AND impressions > 2000
THEN pause ad
```

**Why this matters for dealerships:** A CTR below 0.5% means the creative is not resonating. In automotive, strong ads hit 1.5-3.0% CTR. Anything below 0.5% after 2,000 impressions is statistically significant enough to call dead. Letting it run just trains Meta's algorithm to show your ads to people who do not click, poisoning your audience targeting over time.

---

### Rule 3: Kill Zero-Lead High-Spend Ads

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Spend > $50 AND Leads = 0 |
| **Action** | Pause ad |
| **Lookback Window** | Lifetime of the ad |
| **Check Frequency** | Every 30 minutes |

**Revealbot Setup:**
```
IF spend > 50
AND leads == 0
THEN pause ad
```

**Why this matters for dealerships:** $50 with zero leads is the clearest signal an ad will never work. Either the targeting is wrong, the creative is off, or the landing page is broken. Do not wait to find out which one. Kill it, diagnose offline, and redeploy a fixed version. This is your "stop the bleeding" rule.

---

### Rule 4: Kill High-Frequency Ad Sets

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Frequency > 3.5 |
| **Action** | Pause ad set |
| **Lookback Window** | Last 7 days |
| **Check Frequency** | Every 6 hours |

**Revealbot Setup:**
```
IF frequency > 3.5
(lookback: last 7 days)
THEN pause ad_set
```

**Why this matters for dealerships:** Frequency above 3.5 means the same people are seeing your ad nearly four times in a week. For dealership ads, this causes two problems: (1) ad fatigue tanks CTR and drives up CPA, and (2) people start hiding your ads, which signals Meta to suppress future delivery across your entire account. Dealership audiences are geographically limited (30-60 mile radius), so frequency climbs faster than in e-commerce.

---

### Rule 5: Kill Negative-ROAS Campaigns

| Field | Value |
|---|---|
| **Level** | Campaign |
| **Condition** | ROAS < 1.0 AND Campaign has been active > 7 days |
| **Action** | Pause campaign |
| **Lookback Window** | Last 7 days |
| **Check Frequency** | Every 24 hours (run at 6 AM) |

**Revealbot Setup:**
```
IF purchase_roas < 1.0
AND days_since_creation > 7
THEN pause campaign
```

**Why this matters for dealerships:** Seven days gives Meta enough time to exit learning phase and optimize. If ROAS is still below 1.0 after a full week, the campaign structure has a fundamental problem: wrong objective, wrong audience, or wrong offer. Note: most dealerships track ROAS via offline conversion uploads or CRM integration. If you do not have ROAS data flowing into Meta, substitute this rule with a CPA-based equivalent (CPA > $35 after 7 days).

---

## Auto-Scale Rules

These rules automatically increase budget on winning ads so you capture more volume while the creative is hot. In dealership campaigns, a winning ad has a short shelf life (7-21 days typically), so scaling fast matters.

### Rule 1: Moderate Scale on Good Performers

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Cost per Lead < $20 AND Leads > 3 (last 24 hours) |
| **Action** | Increase daily budget by 20% |
| **Lookback Window** | Last 24 hours |
| **Check Frequency** | Every 12 hours |
| **Budget Cap** | Do not exceed 2x original budget |

**Revealbot Setup:**
```
IF cost_per_lead < 20
AND leads > 3
(lookback: last 24 hours)
THEN increase daily_budget by 20%
(max daily_budget: 2x original)
```

**Why this matters for dealerships:** Three leads in 24 hours at under $20 CPA is a solid performer. The 20% increase is conservative enough to avoid shocking Meta's algorithm (increases over 20% can reset learning phase). The 2x cap prevents runaway spending if the rule fires repeatedly before you review.

---

### Rule 2: Aggressive Scale on Top Performers

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Cost per Lead < $15 AND Leads > 5 (last 24 hours) |
| **Action** | Increase daily budget by 30% |
| **Lookback Window** | Last 24 hours |
| **Check Frequency** | Every 12 hours |
| **Budget Cap** | Do not exceed 3x original budget |

**Revealbot Setup:**
```
IF cost_per_lead < 15
AND leads > 5
(lookback: last 24 hours)
THEN increase daily_budget by 30%
(max daily_budget: 3x original)
```

**Why this matters for dealerships:** Five leads at under $15 CPA is exceptional. This is your best creative hitting the right audience at the right time. The 30% bump is more aggressive but justified by the stronger signal. At $15 CPA with a 15% close rate, you are paying $100 per sale in ad cost, which is outstanding for automotive.

---

### Rule 3: Duplicate Winning Ad Sets

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Cost per Lead < $15 for 3 consecutive days |
| **Action** | Duplicate ad set to a new saved audience (manual step: Revealbot sends alert, you duplicate with new audience) |
| **Lookback Window** | Last 3 days |
| **Check Frequency** | Every 24 hours (run at 7 AM) |

**Revealbot Setup:**
```
IF cost_per_lead < 15
(lookback: last 3 days, every day must qualify)
THEN send Slack notification: "WINNER — Duplicate [ad_set_name] to new audience. CPA: $[cost_per_lead] for 3 days straight."
```

**Why this matters for dealerships:** Three consecutive days of sub-$15 CPA proves the creative works, not just that you got lucky on one good day. Duplicating to a new audience (e.g., different zip codes, different interest targeting, lookalike of converters) lets you expand reach without fatiguing the original audience. Revealbot cannot auto-duplicate to a new audience natively, so this fires as an alert for your media buyer to act on.

---

## Alert Rules

Alerts keep your team informed without requiring them to stare at Ads Manager all day. For dealership campaigns, timing matters because inventory changes, manufacturer incentives expire, and sales events have hard deadlines.

### Rule 1: Overspend Alert

| Field | Value |
|---|---|
| **Level** | Campaign |
| **Condition** | Spend today > (Daily Budget x 1.2) |
| **Action** | Send Slack notification |
| **Lookback Window** | Today |
| **Check Frequency** | Every 2 hours |

**Revealbot Setup:**
```
IF spend > daily_budget * 1.2
(lookback: today)
THEN send Slack message: "OVERSPEND ALERT: [campaign_name] has spent $[spend] against a $[daily_budget] daily budget. Review immediately."
```

**Why this matters for dealerships:** Meta can overspend daily budgets by up to 25% (they balance over the week). But if multiple campaigns overspend simultaneously, you can blow through your weekly budget by Thursday. This alert gives you time to intervene before it compounds.

---

### Rule 2: CPA Spike Alert

| Field | Value |
|---|---|
| **Level** | Campaign |
| **Condition** | Cost per Lead > $35 AND Cost per Lead (previous 7 days) < $25 |
| **Action** | Send Slack notification |
| **Lookback Window** | Last 24 hours vs. Previous 7 days |
| **Check Frequency** | Every 4 hours |

**Revealbot Setup:**
```
IF cost_per_lead > 35
(lookback: last 24 hours)
AND cost_per_lead < 25
(lookback: last 7 days)
THEN send Slack message: "CPA SPIKE: [campaign_name] jumped from $[cost_per_lead_7d] avg to $[cost_per_lead_today]. Check for creative fatigue, audience saturation, or landing page issues."
```

**Why this matters for dealerships:** A sudden CPA spike usually means one of three things: (1) a competitor launched heavy spend in your geo, (2) your creative fatigued, or (3) Meta changed delivery. Catching it within hours instead of days can save hundreds of dollars.

---

### Rule 3: Lead Volume Drop Alert

| Field | Value |
|---|---|
| **Level** | Account |
| **Condition** | Leads today < (Leads yesterday x 0.5) |
| **Action** | Send Slack notification |
| **Lookback Window** | Today vs. Yesterday |
| **Check Frequency** | Every 4 hours (first check at 2 PM to allow morning data to accumulate) |

**Revealbot Setup:**
```
IF leads < leads_yesterday * 0.5
(lookback: today vs yesterday)
THEN send Slack message: "LEAD DROP ALERT: Only [leads] leads today vs [leads_yesterday] yesterday. 50%+ decline. Check: pixel firing? Forms working? Campaigns active?"
```

**Why this matters for dealerships:** A 50% lead drop is almost never normal market fluctuation. It is usually a technical issue: broken form, pixel stopped firing, campaign accidentally paused, or payment method declined. The faster you catch this, the fewer leads you lose. For a dealership generating 10-20 leads/day, losing half a day of leads means 5-10 missed opportunities.

---

### Rule 4: Daily Performance Summary

| Field | Value |
|---|---|
| **Level** | Account |
| **Condition** | Scheduled (no condition, runs daily) |
| **Action** | Send Slack summary |
| **Lookback Window** | Last 24 hours |
| **Check Frequency** | Once daily at 8 AM |

**Revealbot Setup:**
```
SCHEDULE: Daily at 8:00 AM
SEND Slack message:
"DAILY SUMMARY — [date]
Total Spend: $[total_spend]
Total Leads: [total_leads]
Avg CPA: $[avg_cost_per_lead]
Top 3 Ads (by leads): [top_3_ads]
Bottom 3 Ads (by CPA): [bottom_3_ads]
Active Campaigns: [active_campaigns_count]"
```

**Why this matters for dealerships:** The GM or dealer principal wants a daily number. This gives them a clean snapshot without requiring logins. It also gives your media buyer a starting point for the day: celebrate the winners, investigate the losers, and know the budget status before making any changes.

---

## Budget Rules

Dealership ad budgets are not static. They shift based on campaign type, day of week, and time of month. These rules automate the most common budget patterns.

### Rule 1: Campaign Type Budget Allocation

This is not a Revealbot rule per se but a structural guideline enforced through budget caps.

| Campaign Type | Budget Share | Example ($3,000/mo total) | Rationale |
|---|---|---|---|
| AIA (Automotive Inventory Ads) | 40% | $1,200/mo ($40/day) | Highest intent. Shows actual inventory to in-market shoppers. |
| Lead Generation | 30% | $900/mo ($30/day) | Form fills and Messenger leads. Volume driver. |
| Retargeting | 20% | $600/mo ($20/day) | Cheapest leads. People who already visited your site/VDPs. |
| Video/Awareness | 10% | $300/mo ($10/day) | Feeds the top of funnel. Builds retargeting audiences. |

**Implementation:** Set daily budget caps in Revealbot for each campaign. Use naming conventions (prefix campaigns with AIA_, LEAD_, RETARGET_, VIDEO_) so rules can target by campaign name.

---

### Rule 2: Weekend Budget Increase

| Field | Value |
|---|---|
| **Level** | All Campaigns |
| **Condition** | Day of week is Saturday or Sunday |
| **Action** | Increase daily budget by 15% |
| **Lookback Window** | N/A (schedule-based) |
| **Check Frequency** | Runs Friday at 11 PM, reverts Monday at 6 AM |

**Revealbot Setup:**
```
SCHEDULE: Friday at 11:00 PM
IF day_of_week IN [Saturday, Sunday]
THEN increase daily_budget by 15%

SCHEDULE: Monday at 6:00 AM
THEN reset daily_budget to weekday amount
```

**Why this matters for dealerships:** Weekend browsing spikes for automotive. People research cars Saturday morning, visit showrooms Saturday afternoon. Higher budgets on weekends capture this intent when competition for attention is actually lower (many agencies do not adjust for weekends). The 15% bump is enough to capture incremental leads without blowing the weekly budget.

---

### Rule 3: Month-End Budget Surge

| Field | Value |
|---|---|
| **Level** | All Campaigns |
| **Condition** | Day of month >= 25 |
| **Action** | Increase daily budget by 20% |
| **Lookback Window** | N/A (schedule-based) |
| **Check Frequency** | Runs on the 25th at 6 AM, reverts on the 1st at 6 AM |

**Revealbot Setup:**
```
SCHEDULE: 25th of month at 6:00 AM
THEN increase daily_budget by 20%

SCHEDULE: 1st of month at 6:00 AM
THEN reset daily_budget to standard amount
```

**Why this matters for dealerships:** The last week of the month is when manufacturer incentives hit their peak, sales managers push hardest to hit unit targets, and buyers feel urgency from expiring offers. Historically, 30-40% of monthly car sales happen in the last 10 days. Increasing ad spend during this window captures buyers who are ready to act.

---

## Creative Rotation Rules

Dealership creatives die faster than most industries because audiences are geographically small and frequency builds quickly. These rules keep your ads fresh.

### Rule 1: Pause Fatigued Creatives

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Frequency > 4.0 |
| **Action** | Pause ad |
| **Lookback Window** | Last 7 days |
| **Check Frequency** | Every 6 hours |

**Revealbot Setup:**
```
IF frequency > 4.0
(lookback: last 7 days)
THEN pause ad
```

**Why this matters for dealerships:** At frequency 4.0, your audience has seen the ad four times in a week. Click-through rates drop 50%+ after the third impression for automotive creative. This is different from the ad set frequency kill rule (Rule 4 in Auto-Kill). This one operates at the ad level, pausing individual creatives while the ad set can continue serving other creatives.

---

### Rule 2: Stale Creative Alert

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Days since creation > 14 AND Status = Active |
| **Action** | Send Slack notification |
| **Lookback Window** | Lifetime |
| **Check Frequency** | Every 24 hours (run at 9 AM) |

**Revealbot Setup:**
```
IF days_since_creation > 14
AND status == active
THEN send Slack message: "CREATIVE REFRESH NEEDED: [ad_name] has been running for [days_since_creation] days. Prepare replacement creative."
```

**Why this matters for dealerships:** Even if frequency has not hit the kill threshold, a 14-day-old creative is losing effectiveness. This alert gives your design team a 2-3 day head start to prepare fresh creative before the current one gets paused by the frequency rule. Inventory-specific creatives (featuring specific vehicles) may also be outdated if those units have sold.

---

### Rule 3: Auto-Rotate Backup Creatives

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Primary ad in ad set is paused (by frequency or performance rule) AND Backup ad exists in same ad set with status = Paused |
| **Action** | Activate the backup ad |
| **Lookback Window** | N/A (event-triggered) |
| **Check Frequency** | Every 1 hour |

**Revealbot Setup:**
```
IF ad_status == paused
AND ad_name CONTAINS "primary"
AND ad_set HAS ad WHERE ad_name CONTAINS "backup" AND status == paused
THEN activate ad WHERE ad_name CONTAINS "backup"
```

**Implementation Note:** This requires a naming convention. For every ad set, create:
- `[offer]_primary_v1` (starts active)
- `[offer]_backup_v1` (starts paused)
- `[offer]_backup_v2` (starts paused)

When the primary pauses, backup_v1 activates. When backup_v1 pauses, backup_v2 activates. When backup_v2 pauses, you get a Slack alert that the ad set is out of creatives.

**Why this matters for dealerships:** Downtime kills momentum. If a winning ad set goes dark because its only creative fatigued, you lose leads until someone manually intervenes. Pre-loading backup creatives and auto-rotating them keeps the ad set alive 24/7. This is especially critical during sales events where you cannot afford gaps.

---

## Subprime-Specific Rules

Subprime (Special Finance / Credit Challenged) campaigns operate under different economics and regulatory constraints. These rules account for both.

### Special Ad Category Restrictions

**Facebook requires all credit-related ads to run under Special Ad Category: Credit.** This imposes hard restrictions:

| Restriction | Impact | Workaround |
|---|---|---|
| No age targeting | Cannot target 25-54 (typical subprime demo) | Use creative messaging to self-select ("Rebuilding your credit?") |
| No zip code targeting | Cannot target specific low-income zips | Use 15-mile radius minimum around dealership |
| No income/behavior targeting | Cannot target "subprime" behaviors | Use broad targeting; let Meta optimize to converters |
| No lookalike audiences | Cannot build lookalikes from subprime buyers | Use broad + creative-based self-selection |
| No optimization for credit events | Cannot optimize for "credit application submitted" | Optimize for landing page views or lead form opens instead |

**Critical: Never optimize for "credit application" or "loan inquiry" as a conversion event in Special Ad Category campaigns.** This violates Meta policy and will get the ad account restricted or banned.

---

### Subprime CPA Thresholds (Higher Than Prime)

Subprime leads are worth significantly more per deal closed:

| Metric | Prime | Subprime |
|---|---|---|
| Avg front-end gross | $1,500-2,000 | $2,500-4,500 |
| Avg back-end gross (F&I) | $800-1,200 | $1,500-3,000 |
| Total gross per deal | $2,300-3,200 | $4,000-7,500 |
| Acceptable CPA | $15-30 | $40-75 |
| Target ROAS | 3.0+ | 2.0+ |

---

### Subprime Rule 1: Adjusted Kill Threshold

| Field | Value |
|---|---|
| **Level** | Ad |
| **Condition** | Cost per Lead > $75 AND Impressions > 1,500 |
| **Action** | Pause ad |
| **Lookback Window** | Lifetime of the ad |
| **Check Frequency** | Every 30 minutes |

**Revealbot Setup:**
```
IF cost_per_lead > 75
AND impressions > 1500
AND campaign_name CONTAINS "subprime" OR campaign_name CONTAINS "SF" OR campaign_name CONTAINS "special_finance"
THEN pause ad
```

**Why the higher threshold:** A subprime deal at $4,000+ gross easily justifies a $75 CPA. At a 10% close rate (lower than prime because subprime has more lender declines), you spend $750 in ad cost per sale against $4,000+ gross. That is still excellent ROI. The 1,500-impression minimum is higher than prime because Special Ad Category targeting is broader, so ads need more impressions to find the right audience.

---

### Subprime Rule 2: Extended Attribution Window

| Field | Value |
|---|---|
| **Level** | Campaign |
| **Condition** | All subprime campaign rules use 14-day lookback instead of 7-day |
| **Action** | Apply to all performance evaluations |
| **Lookback Window** | 14 days (vs. 7 days for prime) |
| **Check Frequency** | Varies by rule |

**Implementation:** When setting up kill rules and scale rules for subprime campaigns, double the lookback window:
- Kill campaign ROAS rule: 14 days instead of 7
- Scale rules: Use "last 3 days" instead of "last 24 hours"
- CPA evaluation: Use 14-day rolling average, not 7-day

**Why the longer window:** Subprime buyers take longer to convert. Their journey often includes: see ad (Day 1) -> submit lead (Day 3) -> get called back (Day 4) -> come to dealership (Day 7) -> lender submissions (Day 7-10) -> approval and delivery (Day 10-14). Judging subprime campaigns on a 7-day window will kill campaigns that would have converted in week two.

---

### Subprime Rule 3: Lower Scale Threshold

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Cost per Lead < $40 AND Leads > 2 (last 48 hours) |
| **Action** | Increase daily budget by 20% |
| **Lookback Window** | Last 48 hours |
| **Check Frequency** | Every 12 hours |
| **Budget Cap** | Do not exceed 2x original budget |

**Revealbot Setup:**
```
IF cost_per_lead < 40
AND leads > 2
(lookback: last 48 hours)
AND campaign_name CONTAINS "subprime"
THEN increase daily_budget by 20%
(max daily_budget: 2x original)
```

**Why different numbers:** Subprime campaigns generate fewer leads at higher CPAs, so the thresholds are adjusted: $40 CPA (vs. $20 for prime), 2 leads (vs. 3 for prime), 48-hour window (vs. 24 hours for prime). Two subprime leads at $40 CPA in 48 hours is a strong signal worth scaling.

---

### Subprime Rule 4: Frequency Tolerance

| Field | Value |
|---|---|
| **Level** | Ad Set |
| **Condition** | Frequency > 5.0 (vs. 3.5 for prime) |
| **Action** | Pause ad set |
| **Lookback Window** | Last 7 days |
| **Check Frequency** | Every 6 hours |

**Revealbot Setup:**
```
IF frequency > 5.0
(lookback: last 7 days)
AND campaign_name CONTAINS "subprime"
THEN pause ad_set
```

**Why higher frequency tolerance:** Subprime audiences need more touchpoints before they act. They are used to being told "no" and often need to see an ad multiple times before believing the offer is real. A frequency of 5.0 is acceptable for subprime where 3.5 would be fatiguing for prime audiences.

---

## Implementation Checklist

### Before You Start
- [ ] Confirm Revealbot is connected to the correct Facebook Ad Account
- [ ] Confirm Slack workspace and channel are connected for alerts
- [ ] Establish campaign naming convention (e.g., `[TYPE]_[AUDIENCE]_[OFFER]_[DATE]`)
  - Types: `AIA_`, `LEAD_`, `RETARGET_`, `VIDEO_`, `SUBPRIME_`, `SF_`
- [ ] Set up backup creatives for every active ad set (primary + 2 backups)
- [ ] Confirm conversion tracking: pixel fires, lead events track, offline conversions upload

### Rule Deployment Order
1. **Week 1:** Deploy Auto-Kill rules and Alert rules (stop bleeding, start monitoring)
2. **Week 2:** Deploy Budget rules (weekend/month-end adjustments)
3. **Week 3:** Deploy Creative Rotation rules (requires naming convention in place)
4. **Week 4:** Deploy Auto-Scale rules (only after kill rules have been validated)
5. **Ongoing:** Deploy Subprime rules once Special Finance campaigns launch

### Monthly Review
- [ ] Review all rule trigger counts (how many times each rule fired)
- [ ] Adjust CPA thresholds based on actual close rates from CRM data
- [ ] Update budget allocation percentages based on campaign type performance
- [ ] Refresh backup creative queue (always have 2 backups per ad set)
- [ ] Verify Slack alerts are reaching the right people

### Threshold Adjustment Guide

These dollar amounts are starting points. Adjust based on your market:

| Market Type | CPA Kill (Prime) | CPA Kill (Subprime) | CPA Scale (Prime) | CPA Scale (Subprime) |
|---|---|---|---|---|
| Tier 1 Metro (Toronto, Vancouver) | $45 | $85 | $25 | $50 |
| Tier 2 City (Ottawa, Calgary) | $40 | $75 | $20 | $40 |
| Tier 3 / Rural | $35 | $65 | $15 | $35 |

Tier 1 markets have higher CPMs and more competition, so thresholds are higher. Rural markets are cheaper but have smaller audiences, so frequency rules become more important.

---

*Last updated: 2026-03-28*
*For use with Nexus agency client deployments*
