# ReadyRide.ca / ReadyCar.ca -- Meta Campaign Blueprints
## Ready-to-Launch Facebook & Instagram Campaigns

> **Last Updated:** 2026-03-28
> **Total Monthly Budget:** $4,800/mo ($160/day)
> **Market:** Ottawa-Gatineau, Ontario
> **Special Ad Category:** Credit (ALL campaigns)
> **Brands:** ReadyRide.ca (primary), ReadyCar.ca (secondary)
> **Copywriting Framework:** NESB (Kyle Milligan)
> **Pixel ID:** 3946664872263007

---

## BUDGET ALLOCATION

| Campaign | Daily Budget | Monthly Budget | % of Total | Objective |
|----------|-------------|---------------|------------|-----------|
| Campaign 1: Lead Gen -- "Your Job Is Your Credit" | $50/day | $1,500/mo | 30% | Leads (Lead Form) |
| Campaign 2: Retargeting | $35/day | $1,050/mo | 20% | Leads |
| Campaign 3: Video Views --> Retarget | $15/day | $450/mo | 10% | Video Views |
| Campaign 4: Automotive Inventory Ads (AIA) | $60/day | $1,800/mo | 40% | Catalog Sales |
| **TOTAL** | **$160/day** | **$4,800/mo** | **100%** | |

### Expected Performance (Based on Industry Benchmarks)

| Metric | Target | Source |
|--------|--------|--------|
| Cost per Lead (Meta Lead Forms) | $15-25 | Willowood Ventures / Driftrock |
| Cost per Lead (Retargeting) | $8-15 | Lower funnel, warm audience |
| Cost per Video View (ThruPlay) | $0.02-0.05 | Meta automotive average |
| Monthly Lead Volume (est.) | 180-300 | At $16-27 blended CPL |
| Lead-to-Appointment Rate | 25-35% | With Nexus AI <60s response |
| Appointment Show Rate | 65-72% | Willowood benchmark |

---

## PRE-LAUNCH CHECKLIST

- [ ] Meta Business Manager access confirmed
- [ ] Meta Pixel verified firing (ID: 3946664872263007)
- [ ] CAPI (server-side tracking) configured via n8n
- [ ] Custom Conversions created: Lead, InitiateCheckout, CompleteRegistration
- [ ] Privacy policy live at readyride.ca/privacy
- [ ] Lead form --> CRM sync via LeadsBridge or n8n (lead arrives in <3 seconds)
- [ ] Nexus AI instant response configured (<60 second SMS/email)
- [ ] Inventory feed URL obtained from DMS
- [ ] Customer list uploaded as Custom Audience (past buyers)
- [ ] All campaigns set to Special Ad Category: Credit

---

## CAMPAIGN 1: LEAD GEN -- "YOUR JOB IS YOUR CREDIT"

**Objective:** Leads (Facebook Lead Form)
**Budget:** $50/day ($1,500/mo) -- 30% of total
**Placements:** Facebook Feed, Instagram Feed, Instagram Stories
**Special Ad Category:** Credit
**Optimization:** Leads
**Bid Strategy:** Lowest Cost (learning phase), switch to Cost Cap at $25/lead after 50 conversions

---

### LEAD FORM CONFIGURATION

**Form Name:** ReadyRide Pre-Approval -- 60 Seconds
**Form Type:** Higher Intent (adds review screen before submit)

**Headline:** Get Pre-Approved in 60 Seconds

**Description:** See your financing options with no impact to your credit score. Quick, simple, no obligation.

**Questions:**
1. Full Name *(prefilled from Facebook)*
2. Phone Number *(prefilled from Facebook)*
3. "What vehicle are you looking for?" *(dropdown: SUV, Sedan, Truck, Van, Any)*
4. "Are you currently employed?" *(dropdown: Full-time, Part-time, Self-employed, Other)*

**Privacy Policy Link:** https://readyride.ca/privacy

**Thank You Screen:**
- Headline: "You're In! We'll Text You Within 5 Minutes."
- Description: "A ReadyRide financing specialist is reviewing your application right now. Expect a text message shortly with your options."
- CTA Button: "Browse Our Inventory" --> readyride.ca/inventory
- Call Button: "Call Us Now" --> 613-983-9834

---

### AD SET 1: WORKING PROFESSIONALS (Employer-Based Targeting)

**Audience Name:** RR-LG-WorkingPros-Ottawa50km
**Location:** Ottawa-Gatineau, 50km radius
**Age:** 18-65+ (required by Special Ad Category)
**Gender:** All (required by Special Ad Category)

**Detailed Targeting (Employers + Industries):**
- The Ottawa Hospital
- CHEO
- Queensway Carleton Hospital
- Montfort Hospital
- Bruyere Continuing Care
- City of Ottawa
- Government of Canada
- PCL Construction
- EllisDon
- Tomlinson Group
- Ottawa-Carleton District School Board
- OC Transpo
- Costco
- Amazon
- Loblaw Companies

**Estimated Audience Size:** 150,000-400,000

---

#### AD SET 1 -- CREATIVE 1: "Your Job Is Your Credit"

| Element | Content |
|---------|---------|
| **Primary Text** | Your pay stub opens more doors than you think. 20+ lenders. 98% track record. Apply in 60 seconds -- drive today. |
| **Headline** | Your Job Is Your Credit |
| **Description** | Pre-approved in 60 seconds |
| **CTA Button** | Apply Now |
| **Image Guidance** | Professional in work clothes (scrubs, high-vis vest, or business casual) standing next to a clean late-model SUV. Warm lighting. Text overlay: "YOUR PAY STUB IS ALL YOU NEED." ReadyRide branding. |
| **NESB Score** | N=4 E=3 S=4 B=4 -- **Total: 15/20** |
| **Compliance** | `[REVIEW]` -- "Your Job Is Your Credit" could imply credit knowledge. Monitor for rejection. Compliant backup headline: "Working? You Qualify for More Than You Think" |

---

#### AD SET 1 -- CREATIVE 2: "$0 Down -- Drive Today"

| Element | Content |
|---------|---------|
| **Primary Text** | $0 down on select vehicles. 200+ in stock. One 60-second form. The biggest selection in Ottawa -- pick yours today. |
| **Headline** | $0 Down -- Drive Today |
| **Description** | Same day, no hassle |
| **CTA Button** | Get Offer |
| **Image Guidance** | Split image: left side shows empty wallet/piggy bank, right side shows person smiling with car keys. Bold text overlay: "$0 DOWN. DRIVE TODAY." Clean, modern design. |
| **NESB Score** | N=2 E=4 S=2 B=5 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- $0 down is a financing feature, not a credit-score claim. |

---

#### AD SET 1 -- CREATIVE 3: "Fresh Start Program"

| Element | Content |
|---------|---------|
| **Primary Text** | Hundreds of families already used Fresh Start to get driving. No cosigner needed. No perfect credit needed. Apply in 60 seconds -- no obligation. |
| **Headline** | The All-New Fresh Start Program |
| **Description** | Proven -- hundreds helped |
| **CTA Button** | Apply Now |
| **Image Guidance** | Sunrise/new day imagery. Person receiving car keys with a genuine smile. Warm, hopeful tone. Text overlay: "THE ALL-NEW FRESH START PROGRAM." No desperation imagery. |
| **NESB Score** | N=4 E=4 S=4 B=2 -- **Total: 14/20** |
| **Compliance** | `[COMPLIANT]` -- "Fresh Start" is empowerment messaging, not a credit-specific claim. |

---

#### AD SET 1 -- CREATIVE 4: "Pre-Approved in 60 Seconds"

| Element | Content |
|---------|---------|
| **Primary Text** | Skip the dealership runaround. One form, 60 seconds, instant answer. Then pick your car from 200+ vehicles. That's it. |
| **Headline** | Pre-Approved in 60 Seconds Flat |
| **Description** | Push-button simple |
| **CTA Button** | Apply Now |
| **Image Guidance** | Phone screen showing a stopwatch at 60 seconds with a green checkmark. Clean, tech-forward feel. Text overlay: "60 SECONDS. THAT'S IT." Minimal text, let the visual work. |
| **NESB Score** | N=2 E=5 S=2 B=4 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Speed claim is about the process, not credit. |

---

#### AD SET 1 -- CREATIVE 5: "Build Your Future"

| Element | Content |
|---------|---------|
| **Primary Text** | Every on-time payment builds your financial future. Our lenders report to credit bureaus automatically. Drive AND build -- apply in 60 seconds. |
| **Headline** | Drive AND Build a Stronger Future |
| **Description** | Proven system -- automatic |
| **CTA Button** | Learn More |
| **Image Guidance** | Upward-trending graph overlaid on a car driving toward a horizon. Optimistic, forward-looking. Text overlay: "A PROVEN SYSTEM THAT BUILDS YOUR FUTURE." Professional, not gimmicky. |
| **NESB Score** | N=4 E=3 S=4 B=3 -- **Total: 14/20** |
| **Compliance** | `[COMPLIANT]` -- Uses "build a stronger future" not "rebuild your credit." |

---

### AD SET 2: INTEREST-BASED TARGETING (Personal Finance + Vehicle Brands)

**Audience Name:** RR-LG-FinanceInterests-Ottawa50km
**Location:** Ottawa-Gatineau, 50km radius
**Age:** 18-65+
**Gender:** All

**Detailed Targeting (Interests):**
- Personal finance
- Credit repair (if available)
- Budgeting
- Financial literacy
- Toyota
- Honda
- Hyundai
- Kia
- Chevrolet
- Four-wheel drive vehicles
- Trucks
- Auto financing
- Car loans

**Exclude:** Past 90-day converters (Custom Audience)
**Estimated Audience Size:** 200,000-500,000

---

#### AD SET 2 -- CREATIVE 1: "Financing for Every Situation"

| Element | Content |
|---------|---------|
| **Primary Text** | We work with 20+ lenders to find the right fit for your budget. No judgment. No pressure. Apply in 60 seconds -- answer in minutes. |
| **Headline** | Financing That Works for You |
| **Description** | 20+ lenders compete for you |
| **CTA Button** | Apply Now |
| **Image Guidance** | Clean graphic showing multiple lender logos funneling into one "APPROVED" checkmark. Professional, trustworthy. Text overlay: "20+ LENDERS. ONE APPLICATION." |
| **NESB Score** | N=3 E=4 S=4 B=3 -- **Total: 14/20** |
| **Compliance** | `[COMPLIANT]` -- Highlights the service (lender network), not the person's situation. |

---

#### AD SET 2 -- CREATIVE 2: "Ottawa's Trusted Choice"

| Element | Content |
|---------|---------|
| **Primary Text** | 4.9 stars. 332 Google reviews. 500+ Ottawa families helped. Same-day decisions since 2015. See why Ottawa trusts ReadyRide. |
| **Headline** | Ottawa's Most Trusted Dealer |
| **Description** | 4.9 stars -- 332 reviews |
| **CTA Button** | Learn More |
| **Image Guidance** | Collage of real customer photos with vehicles (with permission). Gold star rating prominently displayed. Text overlay: "4.9 STARS. 500+ FAMILIES." Warm, community feel. |
| **NESB Score** | N=2 E=2 S=5 B=3 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` -- Social proof only, no credit claims. |

---

#### AD SET 2 -- CREATIVE 3: "200+ Vehicles, Your Payment"

| Element | Content |
|---------|---------|
| **Primary Text** | SUVs from $279/mo. Trucks from $319/mo. Sedans from $199/mo. 200+ vehicles ready. Find yours -- 60-second application. |
| **Headline** | Reliable Rides from $199/mo |
| **Description** | Find your payment today |
| **CTA Button** | Get Offer |
| **Image Guidance** | Carousel showing 3 vehicle categories (SUV, truck, sedan) each with payment overlay. Clean, bold typography. Real inventory photos preferred over stock. |
| **NESB Score** | N=2 E=3 S=3 B=5 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Payment-focused, no credit references. Use "from" qualifier. |

---

#### AD SET 2 -- CREATIVE 4: "No Cosigner Needed"

| Element | Content |
|---------|---------|
| **Primary Text** | No cosigner. No large down payment. No hours at the dealership. Just one 60-second form and a decision in minutes. That simple. |
| **Headline** | No Cosigner. No Hassle. |
| **Description** | Simple 60-second application |
| **CTA Button** | Apply Now |
| **Image Guidance** | Person relaxing on couch with phone, applying from home. Casual, stress-free setting. Text overlay: "NO COSIGNER. NO HASSLE." |
| **NESB Score** | N=3 E=5 S=2 B=3 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- "Not Statements" about process barriers, not credit status. |

---

#### AD SET 2 -- CREATIVE 5: "Newcomers Welcome"

| Element | Content |
|---------|---------|
| **Primary Text** | New to Canada? No Canadian credit history? We have a dedicated program for newcomers. 25+ lending partners. Apply in 60 seconds. |
| **Headline** | New to Canada? We Can Help. |
| **Description** | Dedicated newcomer program |
| **CTA Button** | Apply Now |
| **Image Guidance** | Diverse group of people (various ethnicities) with a clean vehicle. Canadian flag subtly in background. Text overlay: "NEWCOMERS PROGRAM." Welcoming, inclusive. |
| **NESB Score** | N=4 E=4 S=3 B=2 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Newcomer program is a service offering, not a credit claim. |

---

### AD SET 3: UNION & TRADES WORKERS (Healthcare + Construction + Municipal)

**Audience Name:** RR-LG-TradesUnion-Ottawa50km
**Location:** Ottawa-Gatineau, 50km radius
**Age:** 18-65+
**Gender:** All

**Detailed Targeting:**
- Interests: Construction, Home improvement, Welding, Plumbing, Electrical work, HVAC, Nursing, Healthcare
- Employers: Unifor employers, CUPE employers, OPSEU employers, IBEW local employers
- Industries: Agriculture and construction workers
- Behaviors: Four-wheel drive interest, truck interest
- Life Events: New job, Recently moved

**Estimated Audience Size:** 100,000-250,000

---

#### AD SET 3 -- CREATIVE 1: "Built for Hard Workers"

| Element | Content |
|---------|---------|
| **Primary Text** | You show up every day. You work hard. You deserve a vehicle that works as hard as you do. 20+ lenders. 60-second application. Drive today. |
| **Headline** | Built for Hard Workers |
| **Description** | You earned this -- apply now |
| **CTA Button** | Apply Now |
| **Image Guidance** | Person in work boots/high-vis vest standing next to a truck or rugged SUV. Construction or industrial background. Text overlay: "YOU EARNED THIS." Real, authentic feel -- not glossy. |
| **NESB Score** | N=3 E=3 S=3 B=4 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Identity-based messaging about work ethic, not credit. |

---

#### AD SET 3 -- CREATIVE 2: "Nurses, This One's for You"

| Element | Content |
|---------|---------|
| **Primary Text** | You take care of everyone else. Let us take care of your ride. Flexible financing built around YOUR schedule. Apply from your phone -- 60 seconds. |
| **Headline** | Healthcare Heroes Deserve Better |
| **Description** | Flexible financing for you |
| **CTA Button** | Apply Now |
| **Image Guidance** | Healthcare worker in scrubs next to a clean, reliable sedan or SUV. Hospital parking lot setting. Text overlay: "FLEXIBLE FINANCING FOR HEALTHCARE HEROES." |
| **NESB Score** | N=3 E=4 S=2 B=3 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` -- Occupation-based, not credit-based. |

---

#### AD SET 3 -- CREATIVE 3: "Trucks from $319/mo"

| Element | Content |
|---------|---------|
| **Primary Text** | Need a truck that can handle the job? We have 50+ trucks in stock from $319/mo. Apply in 60 seconds -- drive it to the job site tomorrow. |
| **Headline** | Trucks from $319/mo |
| **Description** | 50+ in stock -- apply now |
| **CTA Button** | Get Offer |
| **Image Guidance** | Clean, rugged truck (RAM, F-150, Silverado) on a job site or gravel road. Text overlay: "TRUCKS FROM $319/MO." Bold, masculine feel. |
| **NESB Score** | N=2 E=3 S=2 B=5 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` -- Payment-anchored, vehicle-focused. |

---

#### AD SET 3 -- CREATIVE 4: "The $100 Down Event"

| Element | Content |
|---------|---------|
| **Primary Text** | This week: $100 down on select vehicles. Bring your pay stub and valid ID. We handle the rest. 200+ vehicles in stock. First come, first served. |
| **Headline** | $100 Down -- This Week Only |
| **Description** | Limited time -- act fast |
| **CTA Button** | Apply Now |
| **Image Guidance** | Bold "$100 DOWN" in large text over a vehicle lineup. Red/black color scheme matching ReadyRide brand. Urgency feel with "THIS WEEK ONLY" banner. |
| **NESB Score** | N=3 E=4 S=2 B=5 -- **Total: 14/20** |
| **Compliance** | `[COMPLIANT]` -- Down payment offer is a financing feature. Ensure it is substantiable. |

---

#### AD SET 3 -- CREATIVE 5: "Saturday Approval Event"

| Element | Content |
|---------|---------|
| **Primary Text** | This Saturday: our finance team secured special rates from 20+ lenders. Walk in with your pay stub. Walk out with keys. Ends Saturday at 4PM. |
| **Headline** | Saturday Approval Event |
| **Description** | Special rates -- this Saturday |
| **CTA Button** | Apply Now |
| **Image Guidance** | Event-style graphic with "SATURDAY APPROVAL EVENT" as main headline. Date prominently displayed. Vehicle lot background. Countdown/urgency element. ReadyRide branding. |
| **NESB Score** | N=4 E=3 S=3 B=5 -- **Total: 15/20** |
| **Compliance** | `[COMPLIANT]` -- Event-based urgency is standard automotive advertising. |

---

## CAMPAIGN 2: RETARGETING

**Objective:** Leads
**Budget:** $35/day ($1,050/mo) -- 20% of total
**Placements:** Facebook Feed, Instagram Feed, Audience Network
**Special Ad Category:** Credit
**Frequency Cap:** 3 impressions per person per week
**Optimization:** Leads

---

### CUSTOM AUDIENCES

| Audience Name | Source | Window | Est. Size |
|---------------|--------|--------|-----------|
| RR-RT-WebVisitors-7d | Meta Pixel -- All website visitors | 7 days | 500-2,000 |
| RR-RT-WebVisitors-30d | Meta Pixel -- All website visitors | 30 days | 2,000-8,000 |
| RR-RT-LeadFormOpeners | Lead form openers who did NOT submit | 30 days | 200-1,000 |
| RR-RT-VideoViewers-50pct | People who watched 50%+ of any video ad | 30 days | 1,000-5,000 |
| RR-RT-VDP-Visitors | Meta Pixel -- Vehicle Detail Page visitors | 14 days | 300-1,500 |

**Exclusion:** All people who already submitted a lead form (converted)

---

### RETARGETING CREATIVE 1: "Still Thinking About It?"

| Element | Content |
|---------|---------|
| **Primary Text** | That vehicle you were looking at? Still available -- but not for long. All you have to do is apply. Takes 60 seconds. |
| **Headline** | Still Here -- But Not for Long |
| **Description** | Apply before it's gone |
| **CTA Button** | Get Offer |
| **Image Guidance** | Dynamic catalog image (pulls the exact vehicle they viewed). "LOW STOCK" badge overlay in red. |
| **NESB Score** | N=2 E=4 S=2 B=5 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Behavioral retargeting, no credit reference. |

---

### RETARGETING CREATIVE 2: "Something Changed"

| Element | Content |
|---------|---------|
| **Primary Text** | We just added a new lender to our panel. Rates may be lower than when you last looked. 5 minutes. Soft pull only. Decision before lunch. |
| **Headline** | New Rates Just Dropped |
| **Description** | Better options now available |
| **CTA Button** | Apply Now |
| **Image Guidance** | Clean, modern graphic with a downward arrow on a rate chart. "NEW LENDER ADDED" callout. Professional, trustworthy design. |
| **NESB Score** | N=5 E=3 S=3 B=4 -- **Total: 15/20** |
| **Compliance** | `[COMPLIANT]` -- Highlights service change (new lender), not user's credit. Ensure the new lender claim is real. |

---

### RETARGETING CREATIVE 3: "Join 500+ Ottawa Families"

| Element | Content |
|---------|---------|
| **Primary Text** | 500+ Ottawa families drove away happy. The track record speaks for itself. See your options in 60 seconds. Soft pull only. |
| **Headline** | 500+ Families Can't Be Wrong |
| **Description** | Proven track record |
| **CTA Button** | Apply Now |
| **Image Guidance** | Collage of happy customers with vehicles (real photos with permission). Gold stars. Text overlay: "500+ HAPPY FAMILIES." Community feel. |
| **NESB Score** | N=2 E=3 S=5 B=3 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- Social proof only. Ensure the 500+ number is accurate and updated. |

---

### RETARGETING CREATIVE 4: "Your Application Is Waiting"

| Element | Content |
|---------|---------|
| **Primary Text** | You started but didn't finish. No worries -- pick up right where you left off. Your pre-approval options are still waiting. Takes 60 seconds. |
| **Headline** | Pick Up Where You Left Off |
| **Description** | Your options are waiting |
| **CTA Button** | Apply Now |
| **Image Guidance** | Phone screen showing a partially completed form with a green "RESUME" button. Clean, modern. Text overlay: "PICK UP WHERE YOU LEFT OFF." |
| **NESB Score** | N=2 E=5 S=2 B=4 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- References their site behavior (started application), not credit status. |

---

### RETARGETING CREATIVE 5: "Last 3 at This Price"

| Element | Content |
|---------|---------|
| **Primary Text** | Only 3 vehicles left at this week's pricing. Once they're gone, they're gone. Lock in your rate -- 60 seconds. |
| **Headline** | Only 3 Left at This Price |
| **Description** | Gone by Sunday |
| **CTA Button** | Get Offer |
| **Image Guidance** | Vehicle photo with a bold "ONLY 3 LEFT" counter badge. Red urgency coloring matching ReadyRide brand. "SOLD" stickers on other vehicles in background. |
| **NESB Score** | N=2 E=3 S=2 B=5 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` -- Scarcity is fine as long as it is truthful. Update counts to reflect actual inventory. False scarcity violates Competition Bureau rules. |

---

## CAMPAIGN 3: VIDEO VIEWS --> RETARGET

**Objective:** Video Views (ThruPlay)
**Budget:** $15/day ($450/mo) -- 10% of total
**Placements:** Reels, Stories, In-Feed Video
**Special Ad Category:** Credit
**Optimization:** ThruPlay (15-second views)
**Purpose:** Build warm video viewer audiences, then retarget with Campaign 1 lead forms

---

### VIDEO AD 1: "3 Things Your Dealer Won't Tell You"

**Duration:** 30 seconds
**Format:** Vertical 9:16 (Reels/Stories) + 4:5 (Feed)
**Hook (first 3 seconds):** Text overlay on screen: "3 things most dealers won't tell you about financing"

**FULL SCRIPT:**

| Timestamp | Text on Screen | Visual | Audio (for sound-on viewers) |
|-----------|---------------|--------|------|
| 0-3s | "3 things most dealers won't tell you about financing" | Talking head -- real salesperson speaking directly to camera. Casual setting, not behind a desk. | "Here are 3 things most car dealers won't tell you." |
| 3-8s | "#1: You have more financing options than you think" | Text pops in with number graphic. Quick cut to wall of lender partner logos. | "Number 1: you have way more financing options than you think." |
| 8-15s | "#2: More lenders means better rates for YOU" | Show phone screen with multiple rate offers. Person scrolling and comparing. | "Number 2: the more lenders a dealer works with, the better your rate." |
| 15-22s | "#3: Stable income opens more doors than you'd expect" | Person in work clothes (scrubs/vest) getting keys at dealership. Warm lighting. | "And number 3: stable income opens more doors than you'd expect." |
| 22-28s | "ReadyRide works with 20+ lenders" | Quick montage of happy customers driving off lot. | "We work with over 20 lenders. That's why our rates are competitive and our track record speaks for itself." |
| 28-30s | "Apply in 60 seconds. Link in bio." + ReadyRide logo | Logo + CTA button animation. | "Link in bio. 60 seconds." |

| Element | Content |
|---------|---------|
| **Primary Text** | 3 things most dealers won't tell you about financing. Watch this before you apply anywhere. |
| **Headline** | 3 Insider Financing Tips |
| **Description** | Watch before you apply |
| **CTA Button** | Learn More |
| **NESB Score** | N=5 E=4 S=3 B=3 -- **Total: 15/20** |
| **Compliance** | `[COMPLIANT]` -- Uses compliant alternatives: "more options than you think" instead of "you don't need perfect credit." |

---

### VIDEO AD 2: "POV: You Just Got Approved"

**Duration:** 15 seconds
**Format:** Vertical 9:16 (Reels native)
**Hook (first 3 seconds):** Text overlay: "POV: You just got approved for your dream car"

**FULL SCRIPT:**

| Timestamp | Text on Screen | Visual | Audio |
|-----------|---------------|--------|-------|
| 0-3s | "POV: You just got approved for your dream car" | TikTok-style POV. Camera is the viewer's eyes. Walking into dealership. | Trending Reels audio OR cinematic "achievement" sound. No voiceover. |
| 3-6s | No text -- pure visual | Hand touching car hood. Walking around vehicle. | Music builds. |
| 6-10s | "This could be you tomorrow." | Open door, sit inside, grab steering wheel. | Music crescendo. |
| 10-13s | "60-second application." | Keys being handed over. Engine starts. | Engine purr. |
| 13-15s | "ReadyRide.ca -- Link in bio" | Driving away shot. Golden hour lighting. | Music fade. |

| Element | Content |
|---------|---------|
| **Primary Text** | POV: You just got approved. This could be you tomorrow. 60-second application at ReadyRide.ca. |
| **Headline** | Your Dream Car Is Waiting |
| **Description** | Apply in 60 seconds |
| **CTA Button** | Apply Now |
| **NESB Score** | N=4 E=3 S=2 B=4 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- POV format is aspirational, not making credit claims. |

**Production Notes:** Shoot entirely on iPhone for authenticity. Golden hour lighting. Raw, real, not polished. Use lot at ReadyRide (1740 Queensdale Ave) for authenticity.

---

### VIDEO AD 3: "From Searching to Driving in 48 Hours"

**Duration:** 30 seconds
**Format:** Vertical 9:16 + 4:5
**Hook (first 3 seconds):** Text overlay: "From searching to driving in 48 hours"

**FULL SCRIPT:**

| Timestamp | Text on Screen | Visual | Audio |
|-----------|---------------|--------|-------|
| 0-3s | "From searching to driving in 48 hours" | Real customer (or actor) scrolling phone, looking stressed at old car. | Quiet piano. "I needed a reliable car. Didn't know where to start." |
| 3-8s | "Found ReadyRide. Applied on my phone." | Show person tapping phone. Cut to application screen. 60 seconds timer. | "I found ReadyRide online. Applied from my couch. Took a minute." |
| 8-15s | "Approved. Same day." | Phone shows "Congratulations" screen. Person's face lights up. | Piano builds. "Got a call that same afternoon. I was approved." |
| 15-22s | "Picked my car. Drove it home." | At the dealership. Walking the lot. Sitting in vehicle. Signing papers. | "Two days later, I drove home in THIS." Uplifting crescendo. |
| 22-28s | "48 hours. That's all it took." | Driving away. Smiling. | "If you're looking for a car, just apply. Worst case, you know your options." |
| 28-30s | "ReadyRide.ca -- Apply in 60 seconds" + logo | Logo, CTA, URL. | "Link in bio." |

| Element | Content |
|---------|---------|
| **Primary Text** | From searching online to driving home in 48 hours. Hear how it happened. Apply at ReadyRide.ca -- 60 seconds. |
| **Headline** | Searching to Driving in 48 Hours |
| **Description** | Real story -- watch this |
| **CTA Button** | Apply Now |
| **NESB Score** | N=4 E=4 S=4 B=4 -- **Total: 16/20** |
| **Compliance** | `[COMPLIANT]` -- Uses "from searching to driving" (not "from denied to driving"). Testimonial-style without credit references. |

**Production Notes:** Offer real customers a $50 gas card to film a 30-second testimonial at vehicle pickup. Subtitles mandatory (92% watch muted). Cut every 2-3 seconds to maintain attention.

---

### VIDEO VIEWER RETARGETING FLOW

After Campaign 3 builds video viewer audiences:
1. People who watched 50%+ of any video --> Add to Custom Audience `RR-RT-VideoViewers-50pct`
2. This audience feeds into Campaign 2 (Retargeting) automatically
3. They see Campaign 1-style lead form ads with social proof + urgency messaging
4. Expected flow: Video View --> Retarget --> Lead Form --> Nexus AI qualifies --> SMS in <60s --> Appointment

---

## CAMPAIGN 4: AUTOMOTIVE INVENTORY ADS (AIA)

**Objective:** Catalog Sales
**Budget:** $60/day ($1,800/mo) -- 40% of total
**Campaign Type:** Advantage+ Catalog Ads (formerly Dynamic Ads)
**Placements:** Facebook Feed, Instagram Feed, Facebook Marketplace, Audience Network
**Special Ad Category:** Credit
**Optimization:** Leads or Link Clicks (start with Link Clicks, switch to Leads after pixel matures)

---

### INVENTORY FEED SETUP

**Feed URL:** `[PLACEHOLDER -- obtain from DMS: CDK, Reynolds, or Dealertrack]`
**Feed Format:** CSV or XML
**Update Frequency:** Every 4 hours minimum (avoid showing sold inventory)

**Required Feed Fields:**

| Field | Example | Notes |
|-------|---------|-------|
| id | VIN-1HGCV1F34NA123456 | Unique vehicle ID (use VIN) |
| title | 2023 Honda CR-V LX -- Ottawa | year + make + model + trim + city |
| description | Reliable 2023 Honda CR-V LX. 45,000 km. Financing from $299/mo. Apply in 60 seconds at ReadyRide. | Include payment anchor |
| availability | in stock | Must be accurate |
| condition | used | or "new" |
| price | 28995.00 | Actual price in CAD |
| link | https://readyride.ca/inventory/2023-honda-crv-lx | VDP URL |
| image_link | https://readyride.ca/images/vehicles/crv-lx-front.jpg | 1200x628 minimum |
| brand | Honda | Make |
| vehicle_id | 1HGCV1F34NA123456 | VIN |
| year | 2023 | Model year |
| make | Honda | Manufacturer |
| model | CR-V | Model name |
| trim | LX | Trim level |
| mileage.value | 45000 | Odometer reading |
| mileage.unit | KM | Always KM for Canada |
| body_style | SUV | SUV, Sedan, Truck, Van, etc. |
| drivetrain | AWD | AWD, FWD, RWD, 4WD |
| fuel_type | Gasoline | Gasoline, Diesel, Hybrid, Electric |
| transmission | Automatic | Automatic or Manual |
| exterior_color | White | Color name |

---

### AIA AD TEMPLATE (Dynamic Creative)

| Element | Content |
|---------|---------|
| **Primary Text** | Just arrived: {{product.title}}. {{product.mileage.value}} km. Proven financing options available. Apply in 60 seconds -- drive today. |
| **Headline** | {{product.title}} |
| **Description** | From ${{product.price}}/mo* |
| **CTA Button** | Get Offer |
| **Image** | Dynamic -- pulls from feed (product.image_link) |
| **Compliance** | `[COMPLIANT]` -- Dynamic inventory display with general financing mention. |

### AIA OVERLAY TEMPLATES

Use Facebook's built-in catalog creative tools to add dynamic overlays:

| Overlay | Content | Position |
|---------|---------|----------|
| Price | "${{price}}" | Bottom-left |
| Badge | "JUST IN" or "LOW KM" | Top-right corner |
| Frame | ReadyRide branded frame (red accent) | Border |
| Promotion | "Apply in 60 Seconds" | Bottom banner |

---

### AIA TARGETING

**Ad Set 1: Broad -- In-Market Auto Shoppers**
- Location: Ottawa-Gatineau, 50km radius
- Age: 18-65+
- Interests: Automobile (broad), In-market for vehicles
- Let Meta Advantage+ optimize delivery
- Audience expansion: ON

**Ad Set 2: Retargeting -- Product Catalog**
- Audience: People who viewed products in catalog but did not purchase/apply
- Window: 14 days
- Dynamic creative showing the EXACT vehicles they viewed

**Ad Set 3: Broad -- Advantage+ Shopping (if available)**
- Full broad targeting
- Let Meta's algorithm find buyers
- This is Meta's recommended approach for 2026

---

### AIA ALTERNATE CREATIVES (5 Variations)

**AIA Creative 1: "Just Arrived"**

| Element | Content |
|---------|---------|
| **Primary Text** | Just arrived in Ottawa: {{product.title}}. Proven financing options. Apply in 60 seconds. |
| **Headline** | Just In: {{product.title}} |
| **Description** | Apply in 60 seconds |
| **CTA Button** | Get Offer |
| **NESB Score** | N=4 E=3 S=3 B=3 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` |

**AIA Creative 2: "Payment Anchor"**

| Element | Content |
|---------|---------|
| **Primary Text** | {{product.title}} -- financing options from ${{weekly_payment}}/week. 200+ vehicles. Apply and drive today. |
| **Headline** | {{product.title}} -- Affordable |
| **Description** | From ${{weekly_payment}}/week |
| **CTA Button** | Get Offer |
| **NESB Score** | N=2 E=3 S=2 B=4 -- **Total: 11/20** |
| **Compliance** | `[COMPLIANT]` -- Payment-focused. Use "from" qualifier. |

**AIA Creative 3: "Proven Financing"**

| Element | Content |
|---------|---------|
| **Primary Text** | {{product.title}}. Proven track record. 500+ families helped. Apply in 60 seconds -- no impact to your score. |
| **Headline** | {{product.title}} |
| **Description** | 500+ families trust us |
| **CTA Button** | Learn More |
| **NESB Score** | N=2 E=3 S=5 B=2 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` |

**AIA Creative 4: "Won't Last"**

| Element | Content |
|---------|---------|
| **Primary Text** | This {{product.title}} won't last. Vehicles like this move fast. Apply in 60 seconds -- drive it home today. |
| **Headline** | Going Fast: {{product.title}} |
| **Description** | Apply before it's gone |
| **CTA Button** | Get Offer |
| **NESB Score** | N=2 E=3 S=2 B=5 -- **Total: 12/20** |
| **Compliance** | `[COMPLIANT]` |

**AIA Creative 5: "$0 Down Options"**

| Element | Content |
|---------|---------|
| **Primary Text** | {{product.title}} -- $0 down options available. Simple application. Same-day decisions. Drive today. |
| **Headline** | $0 Down: {{product.title}} |
| **Description** | $0 down -- drive today |
| **CTA Button** | Get Offer |
| **NESB Score** | N=2 E=4 S=2 B=5 -- **Total: 13/20** |
| **Compliance** | `[COMPLIANT]` -- $0 down is a financing feature. Ensure it is available on select vehicles. |

---

## NAMING CONVENTIONS

Use consistent naming across all campaigns for reporting and optimization:

```
Campaign:  [Brand]-[Objective]-[Theme]-[Date]
           ReadyRide-LeadGen-YourJobIsYourCredit-2026Q2
           ReadyRide-Retarget-WarmAudiences-2026Q2
           ReadyRide-VideoViews-TopFunnel-2026Q2
           ReadyRide-AIA-InventoryAds-2026Q2

Ad Set:    [Brand]-[Campaign]-[Audience]-[Geo]
           RR-LG-WorkingPros-Ottawa50km
           RR-LG-FinanceInterests-Ottawa50km
           RR-LG-TradesUnion-Ottawa50km
           RR-RT-WebVisitors7d-Ottawa50km
           RR-VV-Broad-Ottawa50km
           RR-AIA-InMarket-Ottawa50km

Ad:        [Brand]-[Campaign]-[Creative#]-[Angle]
           RR-LG-C1-YourJobIsYourCredit
           RR-LG-C2-ZeroDown
           RR-RT-C1-StillThinking
           RR-VV-V1-3ThingsYourDealer
           RR-AIA-C1-JustArrived
```

---

## OPTIMIZATION RULES (Revealbot or Manual)

| Rule | Trigger | Action |
|------|---------|--------|
| Kill underperformers | CPA > $40 for 3 consecutive days | Pause ad |
| Scale winners | CPA < $15 AND 10+ conversions | Increase budget 20% |
| Creative fatigue | Frequency > 3.5 in 7 days | Swap creative |
| Low CTR | CTR < 0.8% after 1,000 impressions | Pause and test new creative |
| High CPM | CPM > $30 for 3 days | Check audience overlap, adjust |
| Budget shift | Campaign 4 CPA 2x better than Campaign 1 | Shift 10% budget to Campaign 4 |

---

## FRENCH LANGUAGE VARIANTS (GATINEAU / QUEBEC AUDIENCE)

For Gatineau-side targeting, create duplicate ad sets with French creative. Quebec law requires French-first advertising.

### Sample French Creatives:

**French Creative 1: "Votre emploi, c'est votre credit"**

| Element | Content |
|---------|---------|
| **Primary Text** | Votre talon de paie ouvre plus de portes que vous pensez. 20+ preteurs. 98% de reussite. Appliquez en 60 secondes. |
| **Headline** | Votre emploi, c'est votre credit |
| **Description** | Pre-approuve en 60 secondes |
| **CTA Button** | Faire une demande |
| **Compliance** | `[REVIEW]` -- Same review flag as English version. |

**French Creative 2: "Programme Nouveau Depart"**

| Element | Content |
|---------|---------|
| **Primary Text** | Des centaines de familles ont deja utilise le programme Nouveau Depart. Pas de cosignataire. Appliquez en 60 secondes -- sans obligation. |
| **Headline** | Programme Nouveau Depart |
| **Description** | Prouve -- des centaines aides |
| **CTA Button** | Faire une demande |
| **Compliance** | `[COMPLIANT]` |

---

## LAUNCH SEQUENCE

**Day 1:** Launch Campaign 3 (Video Views) to start building audiences
**Day 1:** Launch Campaign 4 (AIA) with broad targeting
**Day 3:** Launch Campaign 1 (Lead Gen) with all 3 ad sets
**Day 7:** Launch Campaign 2 (Retargeting) once pixel audiences reach 100+ people
**Day 14:** First optimization pass -- kill losers, scale winners
**Day 30:** Full performance review and creative refresh

---

## KPIs & REPORTING

| KPI | Target | Reporting Frequency |
|-----|--------|-------------------|
| Cost per Lead | <$25 | Daily |
| Lead Volume | 180-300/month | Weekly |
| Lead-to-Appointment Rate | 25-35% | Weekly |
| Appointment Show Rate | 65-72% | Weekly |
| Cost per Appointment | <$75 | Weekly |
| Cars Sold from Meta Leads | 15-25/month | Monthly |
| ROAS | 5:1 minimum | Monthly |
| Ad Frequency | <3.5/week | Daily |
| CTR | >1.0% | Daily |
| Video ThruPlay Rate | >15% | Weekly |
