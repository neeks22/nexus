# ReadyRide.ca / ReadyCar.ca -- Google Ads Campaign Blueprints
## Ready-to-Launch Search, VLA, and Performance Max Campaigns

> **Last Updated:** 2026-03-28
> **Total Monthly Budget:** $3,000/mo ($100/day)
> **Market:** Ottawa-Gatineau, Ontario (50km radius)
> **Brands:** ReadyRide.ca (primary), ReadyCar.ca (secondary)
> **Conversion Tracking:** Google Tag Manager --> Lead Form Submit, Phone Call, Chat Start
> **Google Merchant Center:** Required for Campaign 1 (VLAs)

---

## BUDGET ALLOCATION

| Campaign | Daily Budget | Monthly Budget | % of Total | Objective |
|----------|-------------|---------------|------------|-----------|
| Campaign 1: Vehicle Listing Ads (VLAs) | $40/day | $1,200/mo | 40% | Catalog/Inventory |
| Campaign 2: Search Ads | $35/day | $1,050/mo | 35% | Search Leads |
| Campaign 3: Performance Max | $25/day | $750/mo | 25% | Full Funnel |
| **TOTAL** | **$100/day** | **$3,000/mo** | **100%** | |

### Expected Performance

| Metric | Target | Benchmark Source |
|--------|--------|-----------------|
| Cost per Lead (Search) | $25-50 | AutoLeadPro industry data |
| Cost per Lead (VLA) | $15-30 | Google Automotive benchmarks |
| Cost per Lead (PMax) | $20-40 | Blended performance |
| Monthly Leads (est.) | 80-150 | At $20-38 blended CPL |
| Search Impression Share | >40% | Target for core keywords |
| Click-Through Rate (Search) | >4% | Automotive average is 3.2% |

---

## PRE-LAUNCH CHECKLIST

- [ ] Google Ads account created and linked to Google Merchant Center
- [ ] Google Tag Manager installed on readyride.ca (replace placeholder GTM-XXXXXXX)
- [ ] Conversion actions created: Lead Form Submit, Phone Call (613-983-9834), Chat Start
- [ ] Google Merchant Center verified and claimed for readyride.ca
- [ ] Vehicle inventory feed uploaded to Merchant Center (see feed spec below)
- [ ] Google Business Profile verified (ReadyRide, 1740 Queensdale Ave, Gloucester ON)
- [ ] Location extensions linked to Google Business Profile
- [ ] Call tracking number set up (CallRail or similar)
- [ ] Remarketing tag firing on all pages
- [ ] Customer match list uploaded (past buyers for audience signals)

---

## CAMPAIGN 1: VEHICLE LISTING ADS (VLAs)

**Campaign Type:** Performance Max for Vehicle Ads
**Budget:** $40/day ($1,200/mo) -- 40% of total
**Objective:** Drive inventory page views and lead form submissions
**Location:** Ottawa-Gatineau, 50km radius

---

### PRODUCT FEED FORMAT SPECIFICATION

**Feed Type:** Google Merchant Center Vehicle Ads feed
**Format:** Tab-delimited CSV or XML (Google Sheets also supported)
**Update Frequency:** Every 4 hours minimum via scheduled fetch or API

#### Required Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| id | String | VIN-1HGCV1F34NA123456 | Unique ID, use VIN |
| title | String | 2023 Honda CR-V LX -- Ottawa \| ReadyRide | year + make + model + trim + city + dealer |
| description | String | Reliable 2023 Honda CR-V LX with 45,000 km. AWD, automatic, heated seats. Financing available from $299/mo. Apply in 60 seconds at ReadyRide. | 150-500 chars, include payment anchor |
| link | URL | https://readyride.ca/inventory/2023-honda-crv-lx | Vehicle detail page |
| image_link | URL | https://readyride.ca/images/vehicles/crv-front.jpg | Primary image, 800x600 min |
| additional_image_link | URL | (up to 10 additional images) | Interior, sides, back |
| price | String | 28995.00 CAD | Must match VDP price |
| availability | String | in stock | Must be accurate |
| condition | String | used | "new" or "used" |
| brand | String | Honda | Vehicle make |
| vehicle_id | String | 1HGCV1F34NA123456 | VIN number |
| google_product_category | String | Vehicles & Parts > Motor Vehicles | Required for auto |

#### Recommended Optional Fields

| Field | Type | Example |
|-------|------|---------|
| vehicle_year | Integer | 2023 |
| vehicle_make | String | Honda |
| vehicle_model | String | CR-V |
| vehicle_trim | String | LX |
| vehicle_mileage.value | Integer | 45000 |
| vehicle_mileage.unit | String | KM |
| vehicle_body_type | String | SUV |
| vehicle_drivetrain | String | AWD |
| vehicle_fuel_type | String | Gasoline |
| vehicle_transmission | String | Automatic |
| vehicle_engine | String | 1.5L Turbo |
| vehicle_exterior_color | String | White |
| vehicle_interior_color | String | Black |
| vehicle_number_of_doors | Integer | 4 |
| vehicle_number_of_passengers | Integer | 5 |
| certified_pre_owned | Boolean | yes |

#### Feed Title Best Practices

```
FORMAT: {{year}} {{make}} {{model}} {{trim}} -- {{city}} | {{dealership}}
GOOD:   2023 Honda CR-V LX -- Ottawa | ReadyRide
GOOD:   2022 Toyota RAV4 LE AWD -- Gloucester | ReadyRide
BAD:    Honda CR-V for sale (missing year, trim, city)
BAD:    AMAZING DEAL 2023 Honda (promotional language in title)
```

#### Feed Description Best Practices

```
GOOD: Reliable 2023 Honda CR-V LX with 45,000 km. AWD, automatic transmission,
      heated seats, Apple CarPlay. Financing options available from $299/mo.
      Apply in 60 seconds at ReadyRide. Serving Ottawa-Gatineau.

BAD:  Great car! Come see us! Best prices! (no specs, promotional only)
```

---

### PROMOTION TEXT OPTIONS (Rotating)

Google VLAs allow promotional text overlays. Rotate these monthly:

| # | Promotion Text | Use When |
|---|---------------|----------|
| 1 | "Apply in 60 Seconds -- Same-Day Decision" | Default / always-on |
| 2 | "$0 Down Options Available" | When $0 down program is active |
| 3 | "Financing for Every Situation" | General financing push |
| 4 | "Spring Clearance -- Prices Reduced" | March-April seasonal |
| 5 | "Tax Refund Event -- Put Your Refund to Work" | Feb-April tax season |
| 6 | "Weekend Approval Event -- Special Rates" | Event weekends |
| 7 | "Free Winter Tires with Purchase" | Oct-Nov seasonal |
| 8 | "Year-End Blowout -- Must Move Inventory" | November-December |

---

## CAMPAIGN 2: SEARCH ADS

**Campaign Type:** Search
**Budget:** $35/day ($1,050/mo) -- 35% of total
**Bid Strategy:** Maximize Conversions (with Target CPA of $40 after 30 conversions)
**Location:** Ottawa, ON + 50km radius (include Gatineau, Kanata, Orleans, Barrhaven, Kemptville, Smiths Falls, Arnprior)
**Language:** English, French
**Ad Schedule:** All hours (leads can come anytime, Nexus AI responds 24/7)
**Device:** All devices (mobile bid adjustment +15%)

---

### 20 KEYWORDS WITH MATCH TYPES

#### Tier 1: High Intent -- Auto Financing (Priority)

| # | Keyword | Match Type | Est. CPC | Monthly Volume |
|---|---------|-----------|----------|---------------|
| 1 | bad credit car loans ottawa | Phrase | $4-8 | 500-1,000 |
| 2 | car dealership financing ottawa | Phrase | $3-6 | 300-700 |
| 3 | second chance auto loans ottawa | Phrase | $3-7 | 100-300 |
| 4 | car loans no credit check ottawa | Phrase | $5-10 | 200-500 |
| 5 | buy here pay here ottawa | Phrase | $3-6 | 100-300 |
| 6 | auto financing bad credit near me | Broad | $4-8 | 1,000-2,000 |
| 7 | car loans after bankruptcy ottawa | Phrase | $4-8 | 50-150 |
| 8 | zero down car dealership ottawa | Phrase | $3-7 | 100-300 |

#### Tier 2: Vehicle Shopping Intent

| # | Keyword | Match Type | Est. CPC | Monthly Volume |
|---|---------|-----------|----------|---------------|
| 9 | used cars ottawa | Broad | $2-5 | 3,000-5,000 |
| 10 | used SUV ottawa | Phrase | $2-5 | 500-1,000 |
| 11 | used trucks for sale ottawa | Phrase | $2-5 | 500-1,000 |
| 12 | cheap cars ottawa | Phrase | $2-4 | 300-700 |
| 13 | cars under 15000 ottawa | Phrase | $2-4 | 200-500 |
| 14 | pre-owned vehicles ottawa | Phrase | $2-5 | 200-500 |

#### Tier 3: Brand + Competitor

| # | Keyword | Match Type | Est. CPC | Monthly Volume |
|---|---------|-----------|----------|---------------|
| 15 | readyride ottawa | Exact | $1-2 | 50-200 |
| 16 | ready ride car dealership | Exact | $1-2 | 50-100 |
| 17 | car loans ottawa guaranteed | Phrase | $5-9 | 100-300 |
| 18 | newcomer car loans canada | Broad | $3-6 | 200-500 |
| 19 | $0 down car loans ontario | Phrase | $4-8 | 300-700 |
| 20 | credit rebuild car loan ottawa | Phrase | $4-7 | 50-200 |

---

### NEGATIVE KEYWORD LIST

Add these to the campaign-level negative keyword list to prevent wasted spend:

#### Negative Keywords (Exact & Phrase)

```
-- Irrelevant Intent --
[car rental]
[car rental ottawa]
[rent a car]
[lease vs buy]
[car insurance]
[car insurance ottawa]
[driving lessons]
[driving school]
[how to drive]
"car games"
"car simulator"
"toy car"
"rc car"

-- Job Seekers (not buyers) --
"car dealership jobs"
"auto sales jobs"
"car salesman jobs"
"mechanic jobs"
"automotive technician jobs"
[jobs at car dealership]

-- DIY / Parts --
"car parts"
"auto parts"
"car repair"
"mechanic near me"
"oil change"
"tire shop"
"junkyard"
"salvage"
"scrap car"

-- Luxury / Out of Segment --
"luxury cars"
"exotic cars"
"lamborghini"
"ferrari"
"porsche"
"tesla"
"maserati"
"bentley"
"rolls royce"

-- Other Markets --
"toronto"
"montreal" (unless running QC ads)
"vancouver"
"calgary"
"edmonton"
"winnipeg"

-- Informational Only --
"what is a car loan"
"how does car financing work"
"car loan calculator"
"credit score check"
"free credit report"
```

---

### 5 RESPONSIVE SEARCH ADS (RSAs)

Each RSA has 15 headlines and 4 descriptions. Google dynamically combines the best-performing combinations.

---

#### RSA 1: GENERAL FINANCING

**Final URL:** https://readyride.ca/apply

| # | Headline (30 chars max) | Pin Position |
|---|------------------------|--------------|
| H1 | Bad Credit Car Loans Ottawa | Pin 1 |
| H2 | Get Pre-Approved in 60 Secs | Pin 2 |
| H3 | All Credit Situations Welcome | |
| H4 | 20+ Lenders Compete for You | |
| H5 | Same-Day Financing Decisions | |
| H6 | $0 Down Options Available | |
| H7 | 200+ Vehicles in Stock | |
| H8 | No Cosigner Required | |
| H9 | ReadyRide -- Est. 2015 | |
| H10 | 4.9 Stars -- 332 Reviews | |
| H11 | Soft Pull -- No Score Impact | |
| H12 | Drive Home Today | |
| H13 | OMVIC Registered Dealer | |
| H14 | Serving Ottawa-Gatineau | |
| H15 | Payments from $199/month | |

| # | Description (90 chars max) |
|---|---------------------------|
| D1 | We work with 20+ lenders to find the right financing for your situation. Apply in 60 seconds. |
| D2 | 500+ Ottawa families helped. 98% track record. Same-day decisions. No obligation to proceed. |
| D3 | $0 down options on select vehicles. No cosigner needed. OMVIC registered. Apply from your phone. |
| D4 | Financing for every situation. Bankruptcy, newcomer, rebuilding -- we've seen it all. Apply now. |

---

#### RSA 2: $0 DOWN FOCUS

**Final URL:** https://readyride.ca/apply

| # | Headline (30 chars max) | Pin Position |
|---|------------------------|--------------|
| H1 | $0 Down -- Drive Today | Pin 1 |
| H2 | Ottawa Car Loans -- $0 Down | Pin 2 |
| H3 | No Down Payment Required | |
| H4 | Save Thousands on Day One | |
| H5 | 200+ Cars, Trucks, SUVs | |
| H6 | Apply in Just 60 Seconds | |
| H7 | Same-Day Approval Available | |
| H8 | ReadyRide Ottawa | |
| H9 | Payments from $199/month | |
| H10 | All Credit Levels Welcome | |
| H11 | 20+ Lending Partners | |
| H12 | No Hidden Fees -- Guaranteed | |
| H13 | 4.9 Stars on Google | |
| H14 | Free Carfax on Every Vehicle | |
| H15 | Financing Made Simple | |

| # | Description (90 chars max) |
|---|---------------------------|
| D1 | $0 down on select vehicles. No cash needed upfront. Apply online in 60 seconds -- drive today. |
| D2 | Why save for months? Our $0 down program gets you driving today. 200+ vehicles ready in Ottawa. |
| D3 | ReadyRide has helped 500+ families get driving with flexible down payment options. Apply now. |
| D4 | Same-day decisions. No obligation. Soft credit inquiry only. OMVIC registered since 2015. |

---

#### RSA 3: USED CARS OTTAWA (Vehicle Shopping Intent)

**Final URL:** https://readyride.ca/inventory

| # | Headline (30 chars max) | Pin Position |
|---|------------------------|--------------|
| H1 | Used Cars Ottawa -- 200+ | Pin 1 |
| H2 | Browse Inventory Online | Pin 2 |
| H3 | SUVs, Trucks, Sedans, Vans | |
| H4 | Financing on Every Vehicle | |
| H5 | Inspected & Ready to Drive | |
| H6 | Prices You Can Afford | |
| H7 | ReadyRide Gloucester | |
| H8 | Open Mon-Sat -- Visit Today | |
| H9 | Payments from $199/month | |
| H10 | 4.9 Stars -- 332 Reviews | |
| H11 | OMVIC Registered Dealer | |
| H12 | Certified Pre-Owned Options | |
| H13 | Toyota, Honda, Hyundai & More | |
| H14 | Apply Online -- 60 Seconds | |
| H15 | Serving All of Ottawa | |

| # | Description (90 chars max) |
|---|---------------------------|
| D1 | Browse 200+ inspected used cars, trucks, and SUVs at ReadyRide Ottawa. Financing available. |
| D2 | Every vehicle inspected. Financing for every budget. Visit us in Gloucester or apply online. |
| D3 | Ottawa's trusted used car dealer since 2015. 4.9 stars, 332 Google reviews. Shop online now. |
| D4 | Toyota, Honda, Hyundai, Kia, Chevrolet and more. Payments from $199/mo. Apply in 60 seconds. |

---

#### RSA 4: BANKRUPTCY / FRESH START

**Final URL:** https://readyride.ca/car-loans-after-bankruptcy

| # | Headline (30 chars max) | Pin Position |
|---|------------------------|--------------|
| H1 | Car Loans After Bankruptcy | Pin 1 |
| H2 | Fresh Start Auto Financing | Pin 2 |
| H3 | Consumer Proposal? Approved | |
| H4 | We Specialize in Fresh Starts | |
| H5 | 20+ Lenders -- More Options | |
| H6 | Apply in 60 Seconds | |
| H7 | No Judgment. Just Solutions. | |
| H8 | ReadyRide Ottawa | |
| H9 | Build Your Credit Back Up | |
| H10 | Same-Day Decision Available | |
| H11 | 500+ Families Helped | |
| H12 | Lenders Report to Bureaus | |
| H13 | Payments That Fit Your Budget | |
| H14 | $0 Down Options Available | |
| H15 | OMVIC Registered -- Trusted | |

| # | Description (90 chars max) |
|---|---------------------------|
| D1 | Bankruptcy or consumer proposal? We help you get driving AND rebuild credit. Apply in 60 secs. |
| D2 | Our lenders report to credit bureaus. Every on-time payment strengthens your financial future. |
| D3 | No judgment. No lectures. Just reliable vehicles and financing that works. ReadyRide Ottawa. |
| D4 | 500+ families have used our Fresh Start program. 98% track record. Same-day decisions. Apply. |

---

#### RSA 5: NEWCOMERS TO CANADA

**Final URL:** https://readyride.ca/no-credit-car-loans

| # | Headline (30 chars max) | Pin Position |
|---|------------------------|--------------|
| H1 | Newcomer Car Loans Canada | Pin 1 |
| H2 | No Canadian Credit? No Problem | Pin 2 |
| H3 | Dedicated Newcomer Program | |
| H4 | All You Need Is Employment | |
| H5 | 25+ Lending Partners | |
| H6 | Apply Online -- 60 Seconds | |
| H7 | New to Canada? We Help. | |
| H8 | ReadyRide Ottawa | |
| H9 | No Canadian History Needed | |
| H10 | Build Credit From Day One | |
| H11 | Same-Day Decisions | |
| H12 | 200+ Vehicles Available | |
| H13 | Payments from $199/month | |
| H14 | 4.9 Stars -- Trusted | |
| H15 | International License OK | |

| # | Description (90 chars max) |
|---|---------------------------|
| D1 | New to Canada? Our dedicated newcomer program helps you get a vehicle with no Canadian credit. |
| D2 | We've helped hundreds of newcomers get driving. Employment is what matters. Apply in 60 seconds. |
| D3 | Build Canadian credit history with every payment. Our lenders report to Equifax and TransUnion. |
| D4 | Whether you arrived last month or last year -- if you're working, we can help. ReadyRide Ottawa. |

---

### SITELINK EXTENSIONS

| Sitelink Text | Description Line 1 | Description Line 2 | Final URL |
|--------------|--------------------|--------------------|-----------|
| Apply in 60 Seconds | Quick, no-obligation application | Get your answer today | readyride.ca/apply |
| Browse Inventory | 200+ vehicles in stock | SUVs, trucks, sedans, vans | readyride.ca/inventory |
| $0 Down Program | No cash needed upfront | Drive home today | readyride.ca/apply |
| Fresh Start Program | Bankruptcy? Consumer proposal? | We specialize in fresh starts | readyride.ca/car-loans-after-bankruptcy |
| Newcomer Program | New to Canada? | Dedicated financing for newcomers | readyride.ca/no-credit-car-loans |
| About ReadyRide | 4.9 stars, 332 reviews | Trusted since 2015 | readyride.ca/about |

### CALLOUT EXTENSIONS

- 20+ Lending Partners
- Same-Day Decisions
- OMVIC Registered
- 4.9 Google Rating
- No Cosigner Needed
- Soft Pull Only
- Free Carfax Reports
- 500+ Families Helped

### CALL EXTENSION

- Phone: 613-983-9834
- Hours: Mon-Fri 10am-6pm, Sat 10am-4pm

### LOCATION EXTENSION

- Linked to Google Business Profile
- 1740 Queensdale Avenue, Gloucester, Ontario K1T 1J6

### STRUCTURED SNIPPET EXTENSIONS

| Header | Values |
|--------|--------|
| Types | SUVs, Sedans, Trucks, Vans, Crossovers |
| Brands | Toyota, Honda, Hyundai, Kia, Chevrolet, Ford, Nissan |
| Neighborhoods | Gloucester, Orleans, Kanata, Barrhaven, Gatineau, Nepean |

---

## CAMPAIGN 3: PERFORMANCE MAX (PMax)

**Campaign Type:** Performance Max
**Budget:** $25/day ($750/mo) -- 25% of total
**Objective:** Maximize Conversions (Lead Form Submits)
**Location:** Ottawa-Gatineau, 50km radius
**Final URL:** https://readyride.ca/apply

---

### ASSET GROUP 1: "GENERAL FINANCING"

#### 15 Headlines (30 chars max)

| # | Headline |
|---|----------|
| H1 | Get Pre-Approved in 60 Seconds |
| H2 | Bad Credit Car Loans Ottawa |
| H3 | All Credit Situations Welcome |
| H4 | $0 Down -- Drive Today |
| H5 | 20+ Lenders Compete for You |
| H6 | Same-Day Financing Decisions |
| H7 | ReadyRide -- Ottawa's Choice |
| H8 | No Cosigner Required |
| H9 | 200+ Vehicles in Stock Now |
| H10 | Payments from $199/month |
| H11 | 4.9 Stars -- 332 Reviews |
| H12 | Your Fresh Start Begins Here |
| H13 | OMVIC Registered Since 2015 |
| H14 | Financing for Every Situation |
| H15 | Soft Pull -- No Score Impact |

#### 5 Long Headlines (90 chars max)

| # | Long Headline |
|---|--------------|
| LH1 | Get Pre-Approved for a Car Loan in 60 Seconds -- All Credit Situations Welcome at ReadyRide |
| LH2 | Ottawa's Trusted Dealer for Auto Financing -- 500+ Families Helped, 4.9 Stars, OMVIC Registered |
| LH3 | $0 Down Options Available on 200+ Vehicles -- Apply Online in 60 Seconds, Drive Home Today |
| LH4 | Your Job Is Your Qualification -- 20+ Lenders Compete for the Best Rate for Your Situation |
| LH5 | Fresh Start Auto Financing in Ottawa -- Bankruptcy, Newcomer, Rebuilding? We've Helped 500+ |

#### 5 Descriptions (90 chars max)

| # | Description |
|---|-------------|
| D1 | ReadyRide works with 20+ lenders to find the best financing for your situation. Apply in 60 secs. |
| D2 | 500+ Ottawa families approved. $0 down options. Same-day decisions. No cosigner needed. Apply now. |
| D3 | Bankruptcy, consumer proposal, newcomer -- we've seen it all. 98% track record. ReadyRide Ottawa. |
| D4 | Browse 200+ inspected vehicles. Payments from $199/mo. OMVIC registered dealer since 2015. |
| D5 | Soft credit pull only. No impact to your score. No obligation. Get your answer in minutes. |

#### Images (Required Assets)

| # | Image Description | Specs |
|---|------------------|-------|
| 1 | Vehicle lineup on ReadyRide lot (landscape) | 1200x628 |
| 2 | Happy customer receiving keys (landscape) | 1200x628 |
| 3 | ReadyRide storefront exterior (landscape) | 1200x628 |
| 4 | Phone showing "Pre-Approved" screen (square) | 1200x1200 |
| 5 | Customer testimonial style with vehicle (square) | 1200x1200 |
| 6 | SUV/truck with payment overlay (portrait) | 960x1200 |
| 7 | ReadyRide team photo (landscape) | 1200x628 |
| 8 | "$0 DOWN" bold graphic (square) | 1200x1200 |

#### Logo

- ReadyRide logo (landscape): 1200x300
- ReadyRide logo (square): 1200x1200

#### Videos (Optional but Recommended)

- Reuse Campaign 3 video creatives from Meta campaigns (re-export in landscape 16:9)
- 15-second lot walkthrough
- 30-second customer testimonial

---

### AUDIENCE SIGNALS

Performance Max uses audience signals as hints (not restrictions). Google's AI uses these to find the right people faster.

#### Custom Segments

**Custom Segment 1: Search Intent -- Auto Financing**
- People who searched for:
  - bad credit car loans
  - car dealership financing near me
  - auto loans no credit check
  - second chance car loans
  - $0 down car dealership
  - buy here pay here near me
  - car loans after bankruptcy
  - newcomer car loans canada

**Custom Segment 2: Search Intent -- Vehicle Shopping**
- People who searched for:
  - used cars for sale near me
  - cheap cars ottawa
  - used SUV under 20000
  - used trucks for sale
  - certified pre-owned cars
  - best used cars canada

**Custom Segment 3: URL-Based -- Competitor Visitors**
- People who browse URLs similar to:
  - canadadrives.ca
  - clutch.ca
  - autotrader.ca
  - kijiji.ca/cars
  - carpages.ca
  - goauto.ca

#### In-Market Audiences

- Motor Vehicles (In-Market)
- Motor Vehicle Parts & Accessories
- Vehicle Loans (In-Market)
- Used Motor Vehicles (In-Market)

#### Demographic Signals

- Household Income: Lower 50% to Top 30% (broad, to capture near-prime)
- Parental Status: All
- Age: 25-64 (signal only, not exclusion)

#### Your Data (Customer Match)

- Upload past buyer list (email + phone)
- Upload past lead list (all leads from last 12 months)
- Website visitors (Google Ads remarketing tag)

---

### ASSET GROUP STRUCTURE

For Performance Max, organize assets into logical groups:

| Asset Group | Theme | Final URL | Audience Signal Focus |
|-------------|-------|-----------|----------------------|
| AG1: General Financing | Broad financing offer | /apply | Custom Segment 1 + In-Market Vehicle Loans |
| AG2: $0 Down | Zero down payment focus | /apply | Custom Segment 1 + search "$0 down" |
| AG3: Used Cars Ottawa | Vehicle shopping | /inventory | Custom Segment 2 + In-Market Used Vehicles |
| AG4: Fresh Start | Bankruptcy/rebuilding | /car-loans-after-bankruptcy | Custom Segment 1 + search "bankruptcy car loan" |
| AG5: Newcomers | New to Canada | /no-credit-car-loans | Custom Segment 1 + search "newcomer car loan" |

Each asset group should have its own set of images and headlines tailored to the theme. Reuse the 15 headlines and 5 descriptions from above as a starting base, then customize per group.

---

## CONVERSION TRACKING SETUP

### Primary Conversions (Optimize toward these)

| Conversion Action | Trigger | Value | Count |
|------------------|---------|-------|-------|
| Lead Form Submit | Thank-you page load OR form submit event | $50 | Every |
| Phone Call (60s+) | Call from ad > 60 seconds | $50 | Every |

### Secondary Conversions (Observe only, do not optimize)

| Conversion Action | Trigger | Value | Count |
|------------------|---------|-------|-------|
| Chat Started | Chat widget opened + message sent | $10 | Every |
| Inventory Page View | /inventory/* pageview | $1 | One |
| Application Started | Form step 1 completion | $5 | One |
| Get Directions Click | Directions link click | $5 | One |

### Enhanced Conversions

Enable Enhanced Conversions in Google Ads settings. This sends hashed first-party data (email, phone) back to Google for better attribution, especially important for offline conversions (someone who clicked an ad, then called or walked in).

---

## OPTIMIZATION RULES

| Rule | Trigger | Action |
|------|---------|--------|
| Pause expensive keywords | CPC > $12 AND conversion rate < 2% | Pause keyword |
| Add negative keywords | Search term irrelevant + 3+ clicks | Add as negative |
| Scale winning keywords | Conversion rate > 8% AND CPA < $30 | Increase bid 15% |
| RSA creative refresh | Any RSA with "Low" ad strength for 14 days | Replace weakest headlines |
| Budget reallocation | PMax CPA 2x better than Search | Shift 10% from Search to PMax |
| Location bid adjustment | Gatineau converting 30%+ worse than Ottawa | Reduce Gatineau bid -20% |
| Device bid adjustment | Mobile CPA > Desktop CPA by 40%+ | Reduce mobile bid -15% |
| Day-of-week adjustment | Weekend CPA 30%+ worse | Reduce weekend budget 20% |

---

## WEEKLY OPTIMIZATION CHECKLIST

- [ ] Review search terms report -- add negatives for irrelevant queries
- [ ] Check keyword quality scores -- improve landing pages for scores <5
- [ ] Review RSA ad strength -- aim for "Good" or "Excellent"
- [ ] Check PMax asset performance -- replace "Low" performing assets
- [ ] Review location performance -- adjust bids by area
- [ ] Monitor impression share -- increase bids if <40% on core keywords
- [ ] Check conversion tracking -- ensure all events firing correctly
- [ ] Review competitor landscape -- adjust bids if new competitor enters
- [ ] Update promotion extensions for any current events/offers
- [ ] Verify inventory feed is current (no sold vehicles showing)

---

## KPIs & REPORTING

| KPI | Target | Frequency |
|-----|--------|-----------|
| Cost per Lead (Search) | <$50 | Weekly |
| Cost per Lead (VLA) | <$30 | Weekly |
| Cost per Lead (PMax) | <$40 | Weekly |
| Blended CPL (all Google) | <$35 | Monthly |
| Total Google Leads | 80-150/month | Monthly |
| Click-Through Rate | >4% (Search), >1% (PMax) | Weekly |
| Quality Score (avg) | >6/10 | Monthly |
| Impression Share (core KWs) | >40% | Weekly |
| Conversion Rate | >5% (Search), >3% (PMax) | Monthly |
| ROAS | 5:1 minimum | Monthly |
| Cars Sold from Google Leads | 8-15/month | Monthly |

---

## COMBINED PLATFORM SUMMARY (META + GOOGLE)

| Platform | Monthly Budget | Est. Leads/Mo | Target CPL | Est. Cars Sold |
|----------|---------------|--------------|------------|---------------|
| Meta (Facebook/Instagram) | $4,800 | 180-300 | $16-27 | 15-25 |
| Google (Search + VLA + PMax) | $3,000 | 80-150 | $20-38 | 8-15 |
| **TOTAL** | **$7,800** | **260-450** | **$17-30 blended** | **23-40** |

### Monthly ROI Projection

- Ad spend: $7,800
- Agency retainer: $5,000-10,000 (if applicable)
- Total investment: $12,800-17,800
- Cars sold: 23-40
- Avg gross profit per car: $3,000-4,500
- Gross profit: $69,000-180,000
- **ROI: 387-1,306%**

---

## LAUNCH SEQUENCE

**Week 1:**
- Day 1: Set up Google Ads account, GTM, Merchant Center
- Day 2: Upload inventory feed, verify products
- Day 3: Launch Campaign 2 (Search) with all 5 RSAs
- Day 4: Launch Campaign 1 (VLAs) once feed is approved
- Day 5: Launch Campaign 3 (PMax) with all asset groups

**Week 2-4:**
- Daily: Monitor search terms, add negatives
- Weekly: Review performance, adjust bids
- End of Week 2: First optimization pass

**Month 2+:**
- Bi-weekly creative refresh
- Monthly keyword expansion based on search terms report
- Quarterly campaign structure review
