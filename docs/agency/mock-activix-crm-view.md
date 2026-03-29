# Mock Activix CRM View — AI Conversation Logged

## Purpose
Visual mockup of what a dealer sees in Activix CRM when Nexus AI has handled a lead. Shows the AI activity logged natively inside the CRM they already use — proving "no new software."

---

## Mock 1: Lead Record — Summary View

```
┌──────────────────────────────────────────────────────────────────┐
│  ACTIVIX CRM                          ReadyRide Auto | Ottawa   │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                   │
│  ◀ Back to Leads                                    Edit | Print │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  SARAH MARTIN                              🟢 Active Lead   ││
│  │  ────────────────────────────────────────────────────────────││
│  │                                                              ││
│  │  📞 (613) 555-0147          📧 sarah.m@gmail.com            ││
│  │  🏠 Gatineau, QC            🌐 English                      ││
│  │                                                              ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      ││
│  │  │ Lead Source   │  │ Credit Tier  │  │ AI Status    │      ││
│  │  │ Website App  │  │ Subprime     │  │ Touch 5 of 7 │      ││
│  │  │              │  │ Rebuilding   │  │ 🔥 HOT       │      ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘      ││
│  │                                                              ││
│  │  Employment: Full-time — 2 years at current job              ││
│  │  Income: $3,000–$4,000/month                                 ││
│  │  Vehicle Interest: Sedan — reliable commuter                 ││
│  │  Preferred: 2022 Honda Civic (identified by AI)              ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                   │
│  ACTIVITY TIMELINE                                                │
│  ─────────────────                                                │
│                                                                   │
│  Mar 28, 11:47 PM  📥  LEAD CREATED (Website Application)       │
│  ├─ Source: readyride.ca/apply                                   │
│  ├─ CASL Consent: ✅ Verified (form submission)                  │
│  └─ Assigned to: Nexus AI (auto)                                 │
│                                                                   │
│  Mar 28, 11:48 PM  💬  AI — SMS SENT (Touch 1 of 7)             │
│  ├─ Response time: 47 seconds                                    │
│  ├─ Channel: SMS to (613) 555-0147                               │
│  └─ Message: "Hi Sarah! 👋 Thanks for reaching out to           │
│     ReadyRide. I see you're looking into financing options —     │
│     great news, we specialize in helping people in exactly       │
│     your situation. Your job IS your credit here. Can I ask      │
│     a couple quick questions to get you pre-qualified?           │
│     It takes about 2 minutes. — Alyssa, ReadyRide AI"           │
│                                                                   │
│  Mar 29, 3:48 AM   💬  AI — SMS SENT (Touch 2 of 7)             │
│  ├─ Channel: SMS                                                 │
│  └─ Message: "Sarah, just wanted to let you know — checking     │
│     your approval doesn't affect your credit score. Zero risk.   │
│     Want me to start the process?"                               │
│                                                                   │
│  Mar 29, 8:12 AM   📩  AI — EMAIL SENT (Touch 3 of 7)           │
│  ├─ Channel: Email to sarah.m@gmail.com                          │
│  ├─ Subject: "Your financing options at ReadyRide, Sarah"        │
│  └─ Content: Personalized email with vehicle recommendations,    │
│     approval FAQ, and one-click scheduling link                  │
│                                                                   │
│  Mar 29, 9:03 AM   📲  CUSTOMER REPLIED (SMS)                   │
│  └─ "Hi! Yes I'm interested. What documents do I need?"         │
│                                                                   │
│  Mar 29, 9:03 AM   💬  AI — SMS SENT (Auto-reply)               │
│  ├─ Response time: 11 seconds                                    │
│  └─ Message: "Great question Sarah! You just need: 1) Valid     │
│     driver's license, 2) Recent pay stub, 3) Proof of address   │
│     (utility bill or bank statement). That's it! Would you      │
│     like to schedule a visit this week to get everything         │
│     started? We have openings Thursday and Friday afternoon."    │
│                                                                   │
│  Mar 29, 2:14 PM   📲  CUSTOMER REPLIED (SMS)                   │
│  └─ "Thursday works! Can I come at 4pm?"                        │
│                                                                   │
│  Mar 29, 2:14 PM   🔥  AI — HOT LEAD HANDOFF                    │
│  ├─ Status changed: Nurture → Hot Lead                           │
│  ├─ Slack alert sent to #dealership-leads                        │
│  ├─ AI Summary: "Sarah has responded to 4 messages over         │
│  │   3 days. She asked about required documents and wants       │
│  │   to visit Thursday at 4pm. Pre-qualified based on           │
│  │   employment (2yr) and income ($3-4K/mo). Recommend          │
│  │   confirming appointment and having 2022 Civic ready."       │
│  └─ Assigned to: Sales Team (manual follow-up)                   │
│                                                                   │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                   │
│  AI ENGAGEMENT SCORE                                              │
│  ───────────────────                                              │
│  ████████████████████████████░░  87/100 — High Intent            │
│                                                                   │
│  Signals:                                                         │
│  ✅ Responded within 24 hours of first AI contact                │
│  ✅ Asked specific questions (documents, scheduling)             │
│  ✅ Initiated appointment request                                │
│  ✅ Stable employment (2+ years)                                 │
│  ✅ Income supports financing ($3-4K/mo)                         │
│  ⚠️ Credit: Rebuilding (subprime — may need flexible lender)    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Mock 2: Lead List View (Multiple Leads)

Shows the dealer's lead list with AI status visible at a glance.

```
┌──────────────────────────────────────────────────────────────────┐
│  ACTIVIX CRM — Lead Management          ReadyRide | This Week   │
│  ═══════════════════════════════════════════════════════════════  │
│                                                                   │
│  Filter: All Sources ▼ | Status: Active ▼ | Sort: Newest ▼     │
│                                                                   │
│  ┌────────┬───────────────────┬──────────┬─────────┬───────────┐│
│  │ Status │ Name              │ Source   │ AI Step │ Action    ││
│  ├────────┼───────────────────┼──────────┼─────────┼───────────┤│
│  │ 🔥 HOT │ Sarah Martin      │ Website  │ 5 of 7  │ Call Now  ││
│  │ 🔥 HOT │ Marc Tremblay     │ Facebook │ 6 of 7  │ Call Now  ││
│  │ 🟡 WARM│ David Chen        │ Google   │ 3 of 7  │ AI Active ││
│  │ 🟡 WARM│ Julie Bouchard    │ Website  │ 4 of 7  │ AI Active ││
│  │ 🟢 NEW │ Ryan O'Brien      │ Facebook │ 1 of 7  │ AI Active ││
│  │ 🟢 NEW │ Fatima Hassan     │ Website  │ 1 of 7  │ AI Active ││
│  │ 🟢 NEW │ Mike Lapointe     │ Referral │ 2 of 7  │ AI Active ││
│  │ ⚪ COLD│ Steve Williams    │ Google   │ 7 of 7  │ Re-engage ││
│  │ ✅ SOLD│ Lisa Nguyen       │ Facebook │ Done    │ Delivered ││
│  └────────┴───────────────────┴──────────┴─────────┴───────────┘│
│                                                                   │
│  📊 Summary: 9 leads | 2 hot | 3 warm | 3 new | 1 cold        │
│  🤖 AI handled: 100% first response | Avg: 41 seconds          │
│  📅 Appointments this week: 3 (2 from AI, 1 walk-in)           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Design Notes

- **Recreate in:** Canva (use a "dashboard" template), Figma, or screenshot a real Activix test account
- **Key visual:** The activity timeline is the most important element — it shows the AI working inside their existing CRM
- **Color coding:** Green = new, Yellow = warm/nurturing, Red/Orange = hot/ready, Grey = cold
- **Font:** System sans-serif, clean and professional
- **Export:** 2x resolution PNG for slide deck, annotated version for walkthrough
- **Critical message:** "This is YOUR CRM. No new logins. No new software. Just smarter."
