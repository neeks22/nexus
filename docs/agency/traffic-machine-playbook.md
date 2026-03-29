# THE TRAFFIC MACHINE
## Dealership Lead Generation Playbook
## Create the Ads. Run the Campaigns. Drive Bodies Into Showrooms.

---

## WHAT THIS IS

This is NOT about handling leads after they come in. You already have that (Nexus + n8n + Activix).
This is about CREATING the leads in the first place.

You are the dealership's marketing department. You create the ads, write the copy, shoot the content, run the campaigns, optimize the spend, and deliver appointments. The dealership's only job is to sell the car when the person shows up.

---

## THE FULL PICTURE: How It All Connects

```
THE TRAFFIC MACHINE (this playbook)          THE LEAD MACHINE (already built)
═══════════════════════════════════          ═══════════════════════════════

Ad Platforms                                 Nexus AI System
├── Meta Advantage+ (AIAs)                   ├── Instant Lead Response (<60s)
├── Google Vehicle Listing Ads               ├── Cold Lead Warming (7-touch)
├── Facebook Lead Forms                      ├── Intent Classification (11 types)
├── Google Search Ads                        ├── Compliance Pre-Flight (CASL)
└── Retargeting Campaigns                    ├── Bilingual EN/FR
         │                                   ├── Human Handoff
         ▼                                   └── Self-Healing Pipeline
    LeadsBridge / n8n                                │
         │                                           ▼
         ▼                                    Activix CRM
    GoHighLevel / Activix CRM ◄──────────────── (lead updates, scoring)
         │                                           │
         ▼                                           ▼
    LEAD ARRIVES ──► Nexus AI qualifies ──► SMS/Email/Phone ──► APPOINTMENT ──► SALE
```

---

## THE CONTENT + AD CREATION STACK

### TIER 1: AD CREATION & MANAGEMENT (The Money Machines)

| Tool | What It Does | Cost | Why |
|------|-------------|------|-----|
| **AdStellar** | AI generates ad creatives + builds + launches Meta campaigns from a product URL | $49-499/mo | Feed it a vehicle URL → ad image, video, copy, targeting, and launches |
| **Meta Advantage+ / AIAs** | Meta's built-in AI for automotive inventory ads | FREE | Meta's OWN AI does the targeting. Feed it inventory and budget. |
| **Google Vehicle Listing Ads** | Shows dealer inventory in Google search with photos and prices | FREE | Highest intent leads on Earth |
| **Madgicx** | AI audience targeting optimization + creative analytics | $31-199/mo | Finds converting audiences you'd never think to test |
| **Revealbot** | Automation rules for ad campaigns. Auto-scales winners, kills losers | $49-299/mo | You sleep. Revealbot optimizes 24/7. |

### TIER 2: CONTENT CREATION (The Creative Factory)

| Tool | What It Does | Cost | Why |
|------|-------------|------|-----|
| **Zeely** | AI ad generator for inventory-based businesses. Meta partner. | $29-99/mo | Vehicle listing URL → scroll-stopping ad in 2 minutes |
| **Canva Pro** | Design tool for social posts, stories, banners, flyers | $13/mo | Quick graphics, event flyers, service specials |
| **CapCut** | Free video editor for TikTok/Reels/Shorts | FREE | Walk-around videos, testimonials, inventory spotlights |
| **InVideo AI** | AI video generator from text descriptions | $25-60/mo | "Create a 30-second ad for a 2024 Toyota Camry" → done |
| **ElevenLabs** | AI voiceover for video ads | $5-99/mo | Professional voiceovers without hiring a voice actor |
| **Opus Clip** | Turns long videos into viral short clips | $19-39/mo | 10-minute walkaround → 5 perfect 30-second clips |
| **Predis.ai** | AI social media content generator | $29-99/mo | "30 days of content for an Ottawa car dealership" → entire month |

### TIER 3: CONTENT DISTRIBUTION

| Tool | What It Does | Cost | Why |
|------|-------------|------|-----|
| **GoHighLevel** | Email, SMS, social posting, landing pages | IN STACK | Follow-up emails, texts, drip campaigns |
| **Buffer / Hootsuite** | Schedule social posts across all platforms | $6-99/mo | 30 days of posts in one sitting |
| **LeadsBridge** | Syncs Meta/Google lead forms → CRM in real-time | $29-99/mo | Lead fills Facebook form → CRM in 3 seconds |
| **Meta CAPI (via n8n)** | Server-side conversion tracking | FREE | Beats ad blockers. Improves ad optimization. |
| **Google Tag Manager** | Tracks every click, call, form submission | FREE | Know exactly which ad generated each lead |

---

## THE PROCESS (Week by Week)

### WEEK 1: SETUP (One-Time Per Dealership)

**DAY 1: ACCESS & AUDIT**
- [ ] Get access to dealer's Meta Business Manager (or create one)
- [ ] Get access to dealer's Google Ads (or create one)
- [ ] Get access to dealer's website (GTM install)
- [ ] Get inventory feed URL (from DMS — CDK, Reynolds, Dealertrack)
- [ ] Audit current ads (spend, performance, gaps)
- [ ] Audit Google Business Profile (reviews, photos, posts)
- [ ] Audit website (load speed, mobile, CTAs)

**DAY 2: PIXEL + TRACKING**
- [ ] Install Meta Pixel on dealer website
- [ ] Set up Meta CAPI via n8n (server-side tracking)
- [ ] Install Google Tag Manager
- [ ] Set up conversion events: VDP View, Lead Form, Phone Call, Chat, Schedule
- [ ] Set up Google Merchant Center + connect inventory feed
- [ ] Connect LeadsBridge: Meta Lead Forms → CRM
- [ ] Connect LeadsBridge: Google Lead Forms → CRM

**DAY 3: CREATIVE PRODUCTION**
- [ ] AdStellar/Zeely: Generate 20 ad creatives from top 10 vehicles
- [ ] Create 3 video ads (InVideo/CapCut): New Arrivals, Weekend Event, Testimonial
- [ ] Create 5 carousel ads showing best inventory
- [ ] Create 3 retargeting ads (show exact vehicle person viewed)
- [ ] Create 30 social media posts for the month (Predis.ai)

**DAY 4: CAMPAIGN BUILD**

Meta Campaigns:
- Campaign 1: Automotive Inventory Ads (AIA) — 40% of spend
- Campaign 2: Lead Gen (Facebook Lead Forms) — 30% of spend
- Campaign 3: Retargeting (7-day + 30-day audiences) — 20% of spend
- Campaign 4: Video Views → Retarget viewers — 10% of spend

Google Campaigns:
- Campaign 1: Vehicle Listing Ads (VLAs)
- Campaign 2: Search Ads (make/model/location keywords)
- Campaign 3: Performance Max (auto-optimizes across all Google properties)

**DAY 5: LAUNCH + AI INTEGRATION**
- [ ] Launch all campaigns
- [ ] Verify LeadsBridge syncing to CRM
- [ ] Verify n8n: new lead → Nexus AI qualifies → SMS + email
- [ ] Set up Revealbot: pause ads CPA > $40, scale ads CPA < $20
- [ ] Schedule 30 days social posts via Buffer
- [ ] Send dealer "We're Live" report with dashboard access

### WEEK 2-4: OPTIMIZE + SCALE

**Daily (15 min):**
- Check ad performance
- Revealbot auto-manages, verify: winners scaling, losers dying
- Target CPL: $15-25 Meta, $25-50 Google

**Weekly (1 hour):**
- Create 5 new ad creatives (prevent ad fatigue)
- Test new offers
- Review lead quality with dealer
- Post 3-5x/week on social

**Monthly (2 hours):**
- Generate performance report (Nexus report generator)
- Present to dealer: leads, appointments, CPL, ROI
- Plan next month's campaigns
- Update inventory feed
- Request Google reviews from recent buyers

---

## CONTENT CALENDAR

### Social Media (Facebook + Instagram + TikTok)

| Day | Content Type |
|-----|-------------|
| Monday | New Arrival Spotlight (photo/video of hottest vehicle) |
| Tuesday | Customer Story / Testimonial / Delivery Photo |
| Wednesday | Tip / Educational ("5 Things to Check Before Buying Used") |
| Thursday | Inventory Highlight (carousel of 3-5 vehicles) |
| Friday | Weekend Sale / Event Promo |
| Saturday | Behind-the-Scenes / Team Photo / Fun Content |
| Sunday | Coming Soon / Weekly Preview |

Every post includes: high-quality photo/video, price or "Starting at $XXX", clear CTA, location tag, 3-5 hashtags.

### Weekly Video Content

1. Walkaround Video (60s) — highlight features
2. Comparison Video (90s) — "RAV4 vs CR-V — which one?"
3. Customer Testimonial (30s) — happy customers at delivery
4. Deal of the Week (30s) — "$0 down, $299/month"
5. Behind the Scenes (60s) — service dept, detailing, new arrivals

---

## THE PACKAGE (What You Sell)

### "FULL-STACK AI MARKETING" PACKAGE

**Setup: $5,000-10,000 (one-time)**
- AI phone agent (24/7 call answering)
- AI chatbot on website
- AI email/SMS follow-up sequences
- Meta Pixel + GTM installation
- Inventory feed connection
- CRM pipeline setup
- First month of ad creative production

**Monthly: $5,000-10,000/mo (retainer)**
- Run all Meta + Google ad campaigns
- Create 20+ new ad creatives/month
- 30 days of social media content (posted for them)
- AI lead qualification + instant follow-up
- AI phone agent operation (24/7)
- Monthly performance report with ROI
- Weekly campaign optimization
- Reputation management (review requests + responses)

**NOT included:** Ad spend (dealer pays Meta/Google directly, typically $3-10K/mo)

**Guarantee:** "30 qualified appointments in 60 days or full refund."

---

## THE ECONOMICS

### Dealer ROI
- Dealer spends: $8K retainer + $5K ad spend = $13K/month
- Dealer gets: 150-300 leads → 50-100 appointments → 15-25 cars sold
- At $3K avg gross profit/car: $45K-75K gross profit
- **ROI: 346-577%** — dealer will NEVER cancel

### Agency Economics (Your Margins)

| Clients | Revenue | Your Costs | Profit | Annual |
|---------|---------|------------|--------|--------|
| 5 | $40K/mo | $1,648/mo | $38,352/mo | $460K/yr |
| 10 | $80K/mo | $2,898/mo | $77,102/mo | $925K/yr |
| 20 | $160K/mo | $5,398/mo | $154,602/mo | $1.86M/yr |

Agency tool costs: ~$398/mo. Per-client costs: ~$250/mo.
**Margin: 92-97%.**

---

## START TODAY

1. Sign up: AdStellar, Zeely, Predis.ai (all have free trials), download CapCut (free)
2. Find a dealership's website
3. AdStellar: paste vehicle listing URL → generate 10 ad creatives
4. Zeely: generate 5 more variations
5. Predis.ai: generate 30 days of social content
6. Film a 60-second walkaround of ANY car → edit in CapCut

**Now you have a demo portfolio.** Walk in and say: "Here's what your marketing COULD look like." They've never seen anything this good. You close the deal.
