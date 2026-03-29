# Screen Recording Script — Nexus AI Demo Capture

## Purpose
Step-by-step guide for recording the demo video. Each scene lists exact screens, clicks, and what to capture.

---

## Pre-Recording Setup

1. **Browser tabs open (in order):**
   - Tab 1: ReadyRide website application form (readyride.ca/apply)
   - Tab 2: n8n workflow dashboard (n8n.nexusagents.com)
   - Tab 3: Activix CRM lead view (logged in, filtered to "New Leads")
   - Tab 4: Slack workspace (#dealership-leads channel)
   - Tab 5: Nexus AI landing page (nexusagents.ca/dealerships)

2. **Phone (real or simulator):**
   - iPhone mockup showing Messages app
   - Pre-load a conversation thread labeled "ReadyRide AI"

3. **Screen resolution:** 1920×1080, browser at 90% zoom for readability
4. **Dark mode:** ON for n8n and Slack. Light mode for Activix CRM (matches dealer's view).
5. **Notifications:** All OFF except Slack (for the alert moment)

---

## SCENE 1: Lead Submission (Capture ~30s)

### What to show:
The lead arriving — from the customer's perspective, then from the system's perspective.

### Exact steps:
1. **Show phone screen** — open browser to readyride.ca/apply
2. **Fill out the form live on camera:**
   - First name: Sarah
   - Last name: Martin
   - Phone: (613) 555-0147
   - Email: sarah.m.test@gmail.com
   - Employment: "Full-time — 2 years at current job"
   - Monthly income: Select "$3,000–$4,000"
   - Vehicle preference: "Sedan — reliable commuter"
   - Credit situation: Select "Rebuilding / Past Issues"
3. **Tap "Get Pre-Qualified"** — show the confirmation screen
4. **Cut to:** Desktop — switch to n8n tab

### Recording notes:
- Use slow, deliberate typing — viewer needs to read along
- Pause 1 second on the confirmation screen before cutting

---

## SCENE 2: n8n Workflow Fires (Capture ~20s)

### What to show:
The automation pipeline processing the lead in real-time.

### Exact steps:
1. **n8n dashboard** — show "Instant Lead Response" workflow
2. **Click into the latest execution** (should be the one triggered by the form)
3. **Scroll through the execution nodes — pause on each:**
   - Webhook Received → show the payload (name, phone, email)
   - Parse Lead Data → show extracted fields
   - CASL Compliance Check → show "consent: verified" output
   - Language Detection → show "detected: en"
   - Generate AI Response → show the personalized SMS text
   - Send SMS via NioText → show "status: sent, delivery: 47 seconds"
   - Create CRM Lead → show "activix_lead_id: 28491"
   - Slack Notification → show "channel: #dealership-leads, status: sent"
4. **Hover over the execution time** at the top — highlight total: ~12 seconds

### Recording notes:
- Use mouse pointer highlighting (yellow circle) so viewer can follow
- Zoom into each node output for 2–3 seconds
- The execution timeline at the top is the money shot — total pipeline in seconds

---

## SCENE 3: SMS Arrives on Phone (Capture ~15s)

### What to show:
The customer's phone receiving the AI response — proving speed and personalization.

### Exact steps:
1. **Show the phone screen** — Messages app, no new messages yet
2. **Wait for the SMS to arrive** (or simulate with pre-timed send)
3. **Show the full message:**
   > "Hi Sarah! 👋 Thanks for reaching out to ReadyRide. I see you're looking into financing options — great news, we specialize in helping people in exactly your situation. Your job IS your credit here. Can I ask a couple quick questions to get you pre-qualified? It takes about 2 minutes. — Alyssa, ReadyRide AI Assistant"
4. **Show timestamp** — compare to form submission time (47 seconds gap)

### Recording notes:
- If live demo, trigger the real workflow. If staged, use a test number.
- The timestamp comparison is critical — viewer needs to SEE the speed.

---

## SCENE 4: Activix CRM Updated (Capture ~15s)

### What to show:
The lead automatically created and tagged in the CRM the dealer already uses.

### Exact steps:
1. **Switch to Activix CRM tab** — refresh the lead list
2. **Show the new lead "Sarah Martin" at the top** with status: "AI — First Contact Sent"
3. **Click into the lead record — show:**
   - Contact info auto-populated
   - Lead source: "Website Application"
   - AI Status: "Nurture — Touch 1 of 7 Complete"
   - Language: "English"
   - Credit tier: "Subprime — Rebuilding"
   - AI Conversation Log: Show the SMS that was sent
   - Next scheduled touch: "Touch 2 — in 4 hours"
4. **Scroll to the activity timeline** — show the AI actions logged

### Recording notes:
- This proves "no new software" — it's their CRM, just smarter
- Highlight that zero manual entry was required

---

## SCENE 5: Slack Alert for Hot Lead (Capture ~10s)

### What to show:
What happens when the lead becomes hot — the human handoff moment.

### Exact steps:
1. **Switch to Slack tab** — #dealership-leads channel
2. **Show the notification that fired:**
   ```
   🔥 HOT LEAD — Sarah Martin
   ━━━━━━━━━━━━━━━━━━━━━━━━
   Phone: (613) 555-0147
   Status: Responded 4x, pre-qualified
   Interest: 2022 Honda Civic — reliable commuter
   Credit: Rebuilding (employed 2yr, $3-4K/mo income)
   AI Summary: "Engaged, asking about approval process.
                Ready for human conversation."
   ━━━━━━━━━━━━━━━━━━━━━━━━
   📞 Call now | 📋 View in Activix | 💬 Full AI conversation
   ```
3. **Click "View in Activix"** — show it jumps straight to the CRM record

### Recording notes:
- The Slack alert is the "aha moment" for sales managers watching the demo
- Show that it includes everything the closer needs — no research required

---

## SCENE 6: ROI Summary (Capture ~15s)

### What to show:
The before/after numbers — make the business case undeniable.

### Exact steps:
1. **Switch to a clean slide or full-screen graphic** showing the comparison table:

   | Metric | Before | After Nexus |
   |--------|--------|-------------|
   | Response time | 47 min+ | 47 seconds |
   | After-hours | ❌ None | ✅ 24/7/365 |
   | Follow-ups per lead | 1–2 | 7 automated |
   | Appointments/month | Baseline | +20–40% |
   | BDC cost/year | $150K–$210K | $30K/year |
   | Languages | English only | EN + FR auto |

2. **Animate each row** appearing one at a time (in post-production)
3. **End on the CTA slide:**
   - "Free 30-day pilot. Live in 48 hours."
   - nexusagents.com/book
   - Nico Sayah | nico@nexusagents.com

### Recording notes:
- This can be a Canva/Keynote slide captured as screen recording
- Each row animating in gives the viewer time to absorb

---

## Post-Production Checklist

- [ ] Add voiceover (record separately, layer in editing)
- [ ] Add subtle background music (royalty-free, builds energy)
- [ ] Add text callouts for key stats (78% first responder, 47-second response)
- [ ] Add yellow mouse-pointer highlight effect for n8n walkthrough
- [ ] Add transition effects between scenes (quick fade or slide)
- [ ] Add Nexus AI watermark/logo in bottom-right corner
- [ ] Export: 1080p MP4, under 50MB for email attachment
- [ ] Create thumbnail: Phone showing SMS + "47 seconds" in bold text
- [ ] Upload to: YouTube (unlisted), Vimeo, attach to outreach emails
