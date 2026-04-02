# Automotive Dealership Ad Lifecycle API Blueprint

> Full-stack API automation: inventory sync -> campaign creation -> optimization -> reporting

---

## Table of Contents

1. [Meta Marketing API -- Automotive Inventory Ads](#1-meta-marketing-api)
2. [Google Ads API -- Vehicle Listing Ads](#2-google-ads-api)
3. [Google Tag Manager API](#3-google-tag-manager-api)
4. [GitHub Repos & Tools](#4-github-repos--tools)
5. [End-to-End Architecture](#5-end-to-end-architecture)

---

## 1. Meta Marketing API

**Base URL:** `https://graph.facebook.com/v25.0`
**Auth:** OAuth 2.0 access token (System User recommended for server-to-server)
**Required permissions:** `ads_management`, `catalog_management`, `pages_manage_ads`, `leads_retrieval`, `pages_read_engagement`

### 1.1 Create a Vehicle Catalog

```
POST /{BUSINESS_ID}/product_catalogs
```

**Payload:**
```json
{
  "name": "Dealer X Vehicle Inventory",
  "vertical": "vehicles",
  "access_token": "<ACCESS_TOKEN>"
}
```

**Response:** `{ "id": "<CATALOG_ID>" }`

Available verticals: `vehicles`, `commerce`, `hotels`, `flights`, `destinations`, `home_listings`

### 1.2 Upload / Sync Inventory Feed

#### Option A: Scheduled Feed (URL fetch)

```
POST /{CATALOG_ID}/product_feeds
```

```json
{
  "name": "Daily Vehicle Feed",
  "schedule": {
    "interval": "HOURLY",
    "url": "https://dealer-x.com/feeds/vehicles.csv",
    "hour": "4"
  },
  "access_token": "<ACCESS_TOKEN>"
}
```

Supported formats: CSV, TSV, XLSX, XML (RSS/ATOM), Google Sheets.
Max file size: 8 GB (recommended < 4 GB).
Schedule options: `HOURLY`, `DAILY`, `WEEKLY`.

#### Option B: Direct File Upload

```
POST /{FEED_ID}/uploads
```

Parameters: `file` (multipart) or `url` (hosted file URL), `update_only` (boolean).

#### Option C: Catalog Batch API (Real-time sync, recommended)

```
POST /{CATALOG_ID}/items_batch
```

```json
{
  "item_type": "VEHICLE",
  "allow_upsert": true,
  "requests": [
    {
      "method": "CREATE",
      "data": {
        "vehicle_id": "VH-001",
        "vin": "1HGCM82633A004352",
        "make": "Honda",
        "model": "Accord",
        "year": 2024,
        "body_style": "SEDAN",
        "state_of_vehicle": "NEW",
        "mileage": { "value": 15, "unit": "KM" },
        "price": 3500000,
        "currency": "CAD",
        "exterior_color": "Silver",
        "transmission": "AUTOMATIC",
        "fuel_type": "GASOLINE",
        "drivetrain": "FWD",
        "trim": "EX-L",
        "description": "2024 Honda Accord EX-L, loaded",
        "title": "2024 Honda Accord EX-L",
        "url": "https://dealer-x.com/inventory/VH-001",
        "images": [
          { "image_url": "https://dealer-x.com/photos/VH-001-1.jpg" }
        ],
        "address": {
          "city": "Toronto",
          "region": "ON",
          "country": "CA",
          "postal_code": "M5V 3L9"
        },
        "availability": "IN_STOCK"
      }
    }
  ]
}
```

Methods: `CREATE`, `UPDATE`, `DELETE`. Max 5000 items per request (recommended < 3000).

#### Required Vehicle Fields

| Field | Type | Example |
|-------|------|---------|
| `vehicle_id` | string | `"VH-001"` |
| `vin` | string | `"1HGCM82633A004352"` |
| `make` | string | `"Honda"` |
| `model` | string | `"Accord"` |
| `year` | int | `2024` |
| `body_style` | enum | `SEDAN`, `SUV`, `TRUCK`, `COUPE`, `CONVERTIBLE`, `HATCHBACK`, `MINIVAN`, `VAN`, `WAGON`, `CROSSOVER` |
| `state_of_vehicle` | enum | `NEW`, `USED`, `CPO` |
| `mileage` | object | `{ "value": 15, "unit": "KM" }` |
| `price` | int64 | `3500000` (in cents) |
| `currency` | ISO 4217 | `"CAD"` |
| `exterior_color` | string | `"Silver"` |
| `description` | string | Vehicle description |
| `title` | string | Listing headline |
| `url` | URI | VDP link |
| `images` | array | `[{ "image_url": "..." }]` |
| `address` | object | Dealership location |

### 1.3 Create Vehicle Sets (Filtering)

```
POST /{CATALOG_ID}/product_sets
```

```json
{
  "name": "Used SUVs Under 30K",
  "filter": {
    "body_style": { "eq": "SUV" },
    "state_of_vehicle": { "eq": "USED" },
    "price": { "lt": 3000000 }
  }
}
```

Filter operators: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `not_contains`, `i_contains`, `i_not_contains`.

### 1.4 Create AIA Campaigns

#### Step 1: Campaign

```
POST /act_{AD_ACCOUNT_ID}/campaigns
```

```json
{
  "name": "AIA - Used Vehicles - Toronto",
  "objective": "OUTCOME_SALES",
  "status": "PAUSED",
  "special_ad_categories": [],
  "access_token": "<ACCESS_TOKEN>"
}
```

#### Step 2: Ad Set

```
POST /act_{AD_ACCOUNT_ID}/adsets
```

```json
{
  "name": "Used Vehicles - 30km Radius",
  "campaign_id": "<CAMPAIGN_ID>",
  "promoted_object": {
    "product_catalog_id": "<CATALOG_ID>",
    "product_set_id": "<PRODUCT_SET_ID>",
    "pixel_id": "<PIXEL_ID>",
    "custom_event_type": "VIEW_CONTENT"
  },
  "daily_budget": 5000,
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "targeting": {
    "geo_locations": {
      "custom_locations": [{
        "latitude": 43.6532,
        "longitude": -79.3832,
        "radius": 30,
        "distance_unit": "kilometer"
      }]
    },
    "age_min": 25,
    "age_max": 65
  },
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP"
}
```

#### Step 3: Ad Creative (Dynamic/Catalog)

```
POST /act_{AD_ACCOUNT_ID}/adcreatives
```

```json
{
  "name": "AIA Dynamic Creative",
  "product_set_id": "<PRODUCT_SET_ID>",
  "object_story_spec": {
    "page_id": "<PAGE_ID>",
    "template_data": {
      "call_to_action": { "type": "LEARN_MORE" },
      "description": "{{vehicle.description}}",
      "link": "{{vehicle.url}}",
      "message": "Check out this {{vehicle.year}} {{vehicle.make}} {{vehicle.model}}!",
      "name": "{{vehicle.title}}"
    }
  }
}
```

#### Step 4: Ad

```
POST /act_{AD_ACCOUNT_ID}/ads
```

```json
{
  "name": "AIA Ad",
  "adset_id": "<ADSET_ID>",
  "creative": { "creative_id": "<CREATIVE_ID>" },
  "status": "ACTIVE"
}
```

### 1.5 Advantage+ Shopping Campaigns (for Automotive)

> As of API v24.0+, Meta unified ASC/AAC into a single creation flow. Campaigns automatically enter Advantage+ mode when configured with three automation levers.

```
POST /act_{AD_ACCOUNT_ID}/campaigns
```

```json
{
  "name": "Advantage+ Vehicle Sales",
  "objective": "OUTCOME_SALES",
  "smart_promotion_type": "AUTOMATED_SHOPPING_ADS",
  "special_ad_categories": [],
  "status": "PAUSED"
}
```

Ad Set (only ONE per campaign):

```json
{
  "campaign_id": "<CAMPAIGN_ID>",
  "promoted_object": {
    "pixel_id": "<PIXEL_ID>",
    "custom_event_type": "PURCHASE"
  },
  "daily_budget": 10000,
  "billing_event": "IMPRESSIONS",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "targeting": {
    "geo_locations": { "countries": ["CA"] }
  },
  "existing_customer_budget_percentage": 30,
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP"
}
```

Note: `smart_promotion_type=AUTOMATED_SHOPPING_ADS` is being deprecated in API v24.0+. New approach uses three automation levers (Advantage+ budget, audience, placement) to automatically qualify as Advantage+.

### 1.6 Custom Audiences (VDP Retargeting)

```
POST /act_{AD_ACCOUNT_ID}/product_audiences
```

```json
{
  "name": "VDP Viewers - Last 14 Days",
  "product_set_id": "<PRODUCT_SET_ID>",
  "inclusions": [
    {
      "retention_seconds": 1209600,
      "rule": {
        "event": { "eq": "ViewContent" }
      }
    }
  ],
  "exclusions": [
    {
      "retention_seconds": 1209600,
      "rule": {
        "event": { "eq": "Lead" }
      }
    }
  ]
}
```

Key events: `ViewContent` (VDP view), `Lead` (form submit), `Search` (SRP search), `AddToCart` (save/compare), `Purchase` (deal closed).

Retention max: 180 days (15,552,000 seconds).

### 1.7 Conversions API (CAPI) -- Server-Side Tracking

**Endpoint:**
```
POST https://graph.facebook.com/{API_VERSION}/{PIXEL_ID}/events?access_token={TOKEN}
```

**Payload:**
```json
{
  "data": [
    {
      "event_name": "ViewContent",
      "event_time": 1711900800,
      "event_id": "vdp.12345.1711900800",
      "event_source_url": "https://dealer-x.com/inventory/VH-001",
      "action_source": "website",
      "user_data": {
        "em": ["309a0a5c3e211326ae75ca18196d301a9bdbd1a882a4d2569511033da23f0abd"],
        "ph": ["254aa248acb47dd654ca3ea53f48c2c26d641d23d7e2e93a1ec56258df7674c4"],
        "client_ip_address": "192.168.1.1",
        "client_user_agent": "Mozilla/5.0...",
        "fbc": "fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
        "fbp": "fb.1.1558571054389.1098115397"
      },
      "custom_data": {
        "content_ids": ["VH-001"],
        "content_type": "vehicle",
        "content_name": "2024 Honda Accord EX-L",
        "value": 35000,
        "currency": "CAD"
      }
    }
  ]
}
```

**Hashing requirements:** `em` (email), `ph` (phone), `fn` (first name), `ln` (last name), `ct` (city), `st` (state), `zp` (zip) -- all must be SHA-256 hashed before sending. The SDK handles this automatically.

**Automotive event names to track:**
| Event | Trigger |
|-------|---------|
| `ViewContent` | VDP page view |
| `Search` | SRP search |
| `Lead` | Form submission |
| `Schedule` | Test drive / appointment |
| `Contact` | Phone click / chat start |
| `Purchase` | Deal closed (offline) |

**Limits:** Up to 1,000 events per batch. No specific rate limit. Events must be sent within 7 days (ideally within 1 hour). Dual tracking (Pixel + CAPI) recommended -- use `event_id` for deduplication.

### 1.8 Lead Ads (Instant Forms)

#### Create Lead Form

```
POST /{PAGE_ID}/leadgen_forms
```

```json
{
  "name": "Vehicle Inquiry - Dealer X",
  "questions": [
    { "type": "FULL_NAME", "key": "full_name" },
    { "type": "EMAIL", "key": "email" },
    { "type": "PHONE", "key": "phone" },
    { "type": "CUSTOM", "key": "vehicle_interest", "label": "Which vehicle are you interested in?" },
    { "type": "CUSTOM", "key": "trade_in", "label": "Do you have a trade-in? (Year/Make/Model)" }
  ],
  "block_display_for_non_targeted_viewer": false,
  "is_optimized_for_quality": true,
  "privacy_policy": {
    "url": "https://dealer-x.com/privacy"
  },
  "access_token": "<PAGE_ACCESS_TOKEN>"
}
```

Question types: `FULL_NAME`, `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `PHONE`, `CUSTOM`, `DATE_TIME`, `STORE_LOOKUP`.

#### Create Lead Campaign

```json
// Campaign
{ "objective": "OUTCOME_LEADS", "buying_type": "AUCTION" }

// Ad Set
{ "optimization_goal": "LEAD_GENERATION" }  // or "QUALITY_LEAD"

// Creative
{
  "object_story_spec": {
    "page_id": "<PAGE_ID>",
    "link_data": {
      "link": "https://fb.me/",
      "call_to_action": {
        "type": "SIGN_UP",
        "value": { "lead_gen_form_id": "<FORM_ID>" }
      },
      "message": "Get the best deal on your next vehicle!",
      "image_hash": "<IMAGE_HASH>"
    }
  }
}
```

#### Retrieve Leads

```
GET /{FORM_ID}/leads?fields=created_time,field_data
```

Webhook for real-time: subscribe to `leadgen` on the Page.

### 1.9 Campaign Performance Reporting

```
GET /act_{AD_ACCOUNT_ID}/insights
```

**Parameters:**
```
?level=campaign
&date_preset=last_30d
&fields=campaign_name,impressions,reach,clicks,ctr,cpc,spend,actions,cost_per_action_type,action_values,purchase_roas
&filtering=[{"field":"campaign.objective","operator":"IN","value":["OUTCOME_SALES","OUTCOME_LEADS"]}]
```

**Key fields:**
| Field | Description |
|-------|-------------|
| `impressions` | Total impressions |
| `reach` | Unique users reached |
| `clicks` | All clicks |
| `ctr` | Click-through rate |
| `cpc` | Cost per click |
| `spend` | Total spend |
| `actions` | Array of action objects (lead, purchase, etc.) |
| `cost_per_action_type` | Cost per lead, cost per purchase, etc. |
| `action_values` | Revenue values per action |
| `purchase_roas` | Return on ad spend |

Breakdowns: `age`, `gender`, `placement`, `device_platform`, `region`.
Attribution windows: `1d_click`, `7d_click`, `1d_view`.
Pagination: cursor-based (`before`/`after`).

### 1.10 Rate Limits

| Operation | Standard Tier Limit |
|-----------|-------------------|
| `ads_management` | 100,000 points/hr + 40/active ad |
| `ads_insights` | 190,000 points/hr + 400/active ad |
| `custom_audiences` | 700,000 points/hr + 40/active audience |
| Read calls | 1 point each |
| Write calls | 3 points each |
| Real-time mutations | 100 requests/sec per app+account |
| CAPI | No rate limit (1000 events/batch) |

---

## 2. Google Ads API

**Base URL:** `https://googleads.googleapis.com/v18`
**Auth:** OAuth 2.0 with developer token
**Required:** Google Ads developer token, OAuth client ID, customer ID

### 2.1 Vehicle Feed in Merchant Center

#### New Merchant API (replaces Content API, sunsetted Feb 2026)

**Insert vehicle product:**
```
POST https://merchantapi.googleapis.com/products/v1/accounts/{ACCOUNT_ID}/productInputs:insert?dataSource=accounts/{ACCOUNT_ID}/dataSources/{DATASOURCE_ID}
```

**OAuth scope:** `https://www.googleapis.com/auth/content`

**Required vehicle feed fields:**

| Field | Required | Example |
|-------|----------|---------|
| `offerId` | Yes | `"VH-001"` |
| `title` | Yes | `"2024 Honda Accord EX-L"` |
| `description` | Yes | Vehicle description |
| `link` | Yes | VDP URL |
| `image_link` | Yes | Primary photo URL |
| `price` | Yes | `{ "amountMicros": 35000000000, "currencyCode": "CAD" }` |
| `condition` | Yes | `"new"` or `"used"` |
| `availability` | Yes | `"in_stock"` |
| `brand` (make) | Yes | `"Honda"` |
| `model` | Yes | `"Accord"` |
| `vehicle_id` / `vin` | Yes | VIN |
| `year` | Yes | `2024` |
| `mileage` | Used only | `"15000 km"` |
| `store_code` | Yes | Dealer location ID |
| `contentLanguage` | Yes | `"en"` |
| `feedLabel` | Yes | `"CA"` |
| `channel` | Yes | `"LOCAL"` |

**Recommended additional fields:** `trim`, `color`, `exterior_color`, `interior_color`, `transmission`, `fuel_type`, `drivetrain`, `body_style`, `engine`, `number_of_doors`, `vehicle_option`, `vehicle_history_report_link`.

Feed update frequency: minimum daily, recommended every 4 hours.

### 2.2 Vehicle Listing Ad Campaigns (Performance Max)

All vehicle listing ads run through Performance Max campaigns.

**Mutate endpoint:**
```
POST https://googleads.googleapis.com/v18/customers/{CUSTOMER_ID}/googleAds:mutate
```

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
developer-token: <DEV_TOKEN>
login-customer-id: <MCC_CUSTOMER_ID>
```

**Batch mutation (single request creates everything):**

```json
{
  "mutateOperations": [
    {
      "campaignBudgetOperation": {
        "create": {
          "resourceName": "customers/{CID}/campaignBudgets/-1",
          "name": "Vehicle PMax Budget",
          "amountMicros": "5000000000",
          "deliveryMethod": "STANDARD",
          "explicitlyShared": false
        }
      }
    },
    {
      "campaignOperation": {
        "create": {
          "resourceName": "customers/{CID}/campaigns/-2",
          "name": "Vehicle Listing Ads - Toronto",
          "advertisingChannelType": "PERFORMANCE_MAX",
          "status": "PAUSED",
          "campaignBudget": "customers/{CID}/campaignBudgets/-1",
          "maximizeConversions": {
            "targetCpaMicros": "5000000"
          },
          "startDate": "2026-04-01",
          "endDate": "2026-12-31"
        }
      }
    },
    {
      "campaignCriterionOperation": {
        "create": {
          "campaign": "customers/{CID}/campaigns/-2",
          "location": {
            "geoTargetConstant": "geoTargetConstants/1002184"
          }
        }
      }
    },
    {
      "assetGroupOperation": {
        "create": {
          "resourceName": "customers/{CID}/assetGroups/-3",
          "campaign": "customers/{CID}/campaigns/-2",
          "name": "Vehicle Assets",
          "status": "ENABLED"
        }
      }
    },
    {
      "assetGroupListingGroupFilterOperation": {
        "create": {
          "assetGroup": "customers/{CID}/assetGroups/-3",
          "type": "UNIT_INCLUDED",
          "listingSource": "SHOPPING"
        }
      }
    }
  ]
}
```

Key constraints:
- `advertisingChannelType` must be `PERFORMANCE_MAX`
- Do NOT set `advertisingChannelSubType`
- Bidding: only `MaximizeConversions` or `MaximizeConversionValue`
- Budget cannot be shared
- Campaign-level bidding only (no portfolio strategies)
- Brand assets (BUSINESS_NAME + LOGO) required at campaign level in v21+

### 2.3 Search Terms Report

**GAQL query via GoogleAdsService.SearchStream:**

```
POST https://googleads.googleapis.com/v18/customers/{CID}/googleAds:searchStream
```

```json
{
  "query": "SELECT segments.date, segments.device, campaign.name, ad_group.name, segments.keyword.info.text, search_term_view.search_term, search_term_view.status, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM search_term_view WHERE segments.date DURING LAST_30_DAYS AND campaign.advertising_channel_type = 'PERFORMANCE_MAX' ORDER BY metrics.cost_micros DESC LIMIT 1000"
}
```

Note: Google redacts ~50% of search terms for privacy. You will not get full visibility.

### 2.4 Offline Conversion Tracking (Closed Deal Attribution)

**Upload click conversions:**
```
POST https://googleads.googleapis.com/v18/customers/{CID}:uploadClickConversions
```

```json
{
  "conversions": [
    {
      "gclid": "EAIaIQobChMI...",
      "conversionAction": "customers/{CID}/conversionActions/{CONV_ACTION_ID}",
      "conversionDateTime": "2026-03-28 14:30:00-04:00",
      "conversionValue": 35000.00,
      "currencyCode": "CAD"
    }
  ],
  "partialFailure": true
}
```

**Setup requirements:**
1. Store GCLID from URL params when lead arrives (e.g., `?gclid=EAIaIQob...`)
2. Create a conversion action of type `UPLOAD_CLICKS` in Google Ads
3. Accept customer data terms in Google Ads UI
4. Upload conversion when deal closes (match GCLID to lead)

**Find conversion action resource name:**
```sql
SELECT conversion_action.resource_name, conversion_action.name
FROM conversion_action
WHERE conversion_action.type = 'UPLOAD_CLICKS'
```

**Enhanced conversions (no GCLID):**
Include `user_identifiers` (hashed email/phone/address) for probabilistic matching when GCLID is unavailable.

Date format: `yyyy-mm-dd HH:mm:ss+|-HH:mm`

### 2.5 Automated Bidding Rules

Google Ads API does not have a direct "rules" endpoint equivalent to the UI rules. Instead:

1. **Use bid strategies on campaigns:**
   - `MaximizeConversions` with `targetCpaMicros`
   - `MaximizeConversionValue` with `targetRoas`

2. **Budget adjustments via mutate:**
```json
{
  "mutateOperations": [{
    "campaignBudgetOperation": {
      "update": {
        "resourceName": "customers/{CID}/campaignBudgets/{BUDGET_ID}",
        "amountMicros": "7500000000"
      },
      "updateMask": "amountMicros"
    }
  }]
}
```

3. **Programmatic rules:** Build your own rule engine:
   - Query performance via `searchStream` GAQL
   - Evaluate conditions (e.g., CPA > $50 for 3 days)
   - Mutate budgets/statuses/bids accordingly
   - Schedule via cron/n8n

---

## 3. Google Tag Manager API

**Base URL:** `https://tagmanager.googleapis.com/tagmanager/v2`
**Auth:** OAuth 2.0
**Scopes:**
- `https://www.googleapis.com/auth/tagmanager.edit.containers`
- `https://www.googleapis.com/auth/tagmanager.manage.accounts`
- `https://www.googleapis.com/auth/tagmanager.publish`
- `https://www.googleapis.com/auth/tagmanager.edit.containerversions`

### 3.1 Create GTM Container

```
POST /accounts/{ACCOUNT_ID}/containers
```

```json
{
  "name": "Dealer X - Website",
  "usageContext": ["web"],
  "domainName": ["dealer-x.com"],
  "notes": "Auto-provisioned for dealership tracking"
}
```

### 3.2 Create Workspace

```
POST /accounts/{ACCOUNT_ID}/containers/{CONTAINER_ID}/workspaces
```

```json
{
  "name": "Conversion Tracking Setup"
}
```

### 3.3 Deploy Tags

#### Meta Pixel Base Tag

```
POST /accounts/{ACCOUNT_ID}/containers/{CONTAINER_ID}/workspaces/{WORKSPACE_ID}/tags
```

```json
{
  "name": "Meta Pixel - Base",
  "type": "html",
  "parameter": [{
    "key": "html",
    "type": "template",
    "value": "<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','{{Meta Pixel ID}}');fbq('track','PageView');</script>"
  }],
  "firingTriggerId": ["ALL_PAGES_TRIGGER_ID"]
}
```

#### Google Ads Conversion Tag

```json
{
  "name": "Google Ads - Lead Conversion",
  "type": "awct",
  "parameter": [
    { "key": "conversionId", "type": "template", "value": "AW-XXXXXXXXX" },
    { "key": "conversionLabel", "type": "template", "value": "XXXXXXXXX" },
    { "key": "conversionValue", "type": "template", "value": "{{Conversion Value}}" },
    { "key": "currencyCode", "type": "template", "value": "CAD" }
  ],
  "firingTriggerId": ["<LEAD_TRIGGER_ID>"]
}
```

### 3.4 Create Triggers

#### VDP View Trigger

```
POST .../workspaces/{WORKSPACE_ID}/triggers
```

```json
{
  "name": "VDP Page View",
  "type": "PAGEVIEW",
  "filter": [{
    "type": "MATCH_REGEX",
    "parameter": [
      { "key": "arg0", "type": "template", "value": "{{Page URL}}" },
      { "key": "arg1", "type": "template", "value": ".*\\/inventory\\/.*" }
    ]
  }]
}
```

#### Lead Form Submit Trigger

```json
{
  "name": "Lead Form Submission",
  "type": "FORM_SUBMISSION",
  "filter": [{
    "type": "EQUALS",
    "parameter": [
      { "key": "arg0", "type": "template", "value": "{{Form ID}}" },
      { "key": "arg1", "type": "template", "value": "lead-form" }
    ]
  }]
}
```

#### Phone Click Trigger

```json
{
  "name": "Phone Click",
  "type": "CLICK",
  "filter": [{
    "type": "MATCH_REGEX",
    "parameter": [
      { "key": "arg0", "type": "template", "value": "{{Click URL}}" },
      { "key": "arg1", "type": "template", "value": "^tel:.*" }
    ]
  }]
}
```

#### Chat Widget Trigger

```json
{
  "name": "Chat Initiated",
  "type": "CUSTOM_EVENT",
  "customEventFilter": [{
    "type": "EQUALS",
    "parameter": [
      { "key": "arg0", "type": "template", "value": "{{_event}}" },
      { "key": "arg1", "type": "template", "value": "chat_started" }
    ]
  }]
}
```

#### Schedule/Appointment Trigger

```json
{
  "name": "Appointment Scheduled",
  "type": "CUSTOM_EVENT",
  "customEventFilter": [{
    "type": "EQUALS",
    "parameter": [
      { "key": "arg0", "type": "template", "value": "{{_event}}" },
      { "key": "arg1", "type": "template", "value": "appointment_scheduled" }
    ]
  }]
}
```

### 3.5 Create Variables

#### Data Layer Variable

```json
{
  "name": "Vehicle ID",
  "type": "v",
  "parameter": [
    { "key": "name", "type": "template", "value": "vehicleId" },
    { "key": "dataLayerVersion", "type": "integer", "value": "2" }
  ]
}
```

#### Constant Variable (Pixel ID)

```json
{
  "name": "Meta Pixel ID",
  "type": "c",
  "parameter": [
    { "key": "value", "type": "template", "value": "XXXXXXXXXXXXXXX" }
  ]
}
```

### 3.6 Publish Container Version

```
POST /accounts/{ACCOUNT_ID}/containers/{CONTAINER_ID}/workspaces/{WORKSPACE_ID}:create_version
```

```json
{
  "name": "v1.0 - Conversion Tracking",
  "notes": "Initial setup: Meta Pixel, Google Ads, conversion events"
}
```

Then publish:

```
POST /accounts/{ACCOUNT_ID}/containers/{CONTAINER_ID}/versions/{VERSION_ID}:publish
```

---

## 4. GitHub Repos & Tools

### Official SDKs

| Repo | Language | Purpose |
|------|----------|---------|
| [facebook/facebook-python-business-sdk](https://github.com/facebook/facebook-python-business-sdk) | Python | Official Meta Marketing API SDK. CRUD for campaigns, catalogs, audiences, insights. |
| [google-ads-python](https://github.com/googleads/google-ads-python) | Python | Official Google Ads API client library. |
| [google-api-python-client](https://github.com/googleapis/google-api-python-client) | Python | Google APIs including GTM, Merchant Center. |

### Meta Ads Automation

| Repo | Description |
|------|-------------|
| [pipeboard-co/meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) | MCP server for managing Meta Ads via AI interface. Performance monitoring, budget optimization, creative feedback. Works with Claude Desktop. |
| [Erriccc/meta-ads-mcp-python](https://github.com/Erriccc/meta-ads-mcp-python) | Python port of the Meta Ads MCP server. |
| [brijr/meta-mcp](https://github.com/brijr/meta-mcp) | MCP server connecting to Meta Marketing API for insights and reporting. |
| [facebook-python-business-sdk](https://github.com/facebook/facebook-python-business-sdk) | Official SDK supporting catalog management, campaign CRUD, audience creation, CAPI events, insights. |

### Google Ads Automation

| Repo | Description |
|------|-------------|
| [digital-boss/n8n-nodes-google-ads](https://github.com/digital-boss/n8n-nodes-google-ads) | Community n8n node for Google Ads API. Extended operations beyond built-in node. |
| [google-ads-python](https://github.com/googleads/google-ads-python) | Official client library with full GAQL support, mutate operations, reporting. |

### n8n Integrations

| Integration | Status |
|-------------|--------|
| **Google Ads** (built-in) | Native n8n node. Supports campaign reads. For writes, use HTTP Request node with Google Ads REST API. |
| **Facebook Graph API** (built-in) | Native trigger node for ad account events (campaign changes, ad performance). |
| **Meta CAPI via n8n** | Workflow template available: [n8n.io/workflows/11089](https://n8n.io/workflows/11089-send-server-side-conversions-to-the-meta-ads-api-capi/) |
| **Google Tag Manager** | No native node. Use HTTP Request node with GTM API v2. |
| **Merchant Center** | No native node. Use HTTP Request node with Merchant API. |

### Automotive-Specific

No dedicated open-source automotive ad management repos exist on GitHub. The space is dominated by proprietary platforms (Dealer.com, CDK, Sincro, Naked Lime). The opportunity is to build this as a service layer connecting:
- DMS/inventory feed -> Meta Catalog + Google Merchant Center
- Lead capture -> CRM -> Offline conversion upload
- Performance data -> Optimization rules -> Budget/bid adjustments

---

## 5. End-to-End Architecture

```
                         INVENTORY SOURCE
                              |
                    [DMS / Dealer Website DB]
                              |
                    +---------+---------+
                    |                   |
            Meta Catalog API    Google Merchant API
            (items_batch)       (productInputs:insert)
                    |                   |
            Vehicle Sets         Data Source
            (product_sets)       (vehicle feed)
                    |                   |
            +-------+-------+   +------+------+
            |               |   |             |
        AIA Campaign    Advantage+   Performance Max
        (OUTCOME_SALES)  Shopping    Campaign
            |               |         |
        Ad Sets          Ad Set    Asset Groups
        (geo+audience)   (single)  (brand+listing)
            |               |         |
        Dynamic Ads      Auto Ads  Vehicle Listing Ads
            |               |         |
            +-------+-------+---------+
                    |
              WEBSITE / VDP
                    |
            GTM Container
            (auto-provisioned)
                    |
        +-----------+-----------+
        |           |           |
    Meta Pixel   Google Ads   Custom Events
    (ViewContent) (Conversion) (chat, phone,
                               schedule)
        |           |           |
        +-----+-----+-----+----+
              |           |
        Meta CAPI    Google Offline
        (server-side) Conversions
              |           |
        Dedup via      GCLID match
        event_id       to closed deal
              |           |
        +-----+-----------+-----+
                    |
            REPORTING LAYER
                    |
        +-----------+-----------+
        |                       |
    Meta Insights API     Google Ads GAQL
    (cost_per_lead,       (SearchTermView,
     ROAS, CTR)            conversions,
                           cost_micros)
                    |
            OPTIMIZATION ENGINE
            (n8n workflow / cron)
                    |
        +-----------+-----------+
        |           |           |
    Budget      Bid          Campaign
    Adjustments Strategy     Status
    (mutate)    (targetCPA)  (pause/enable)
```

### Implementation Order

1. **Tracking first:** GTM container provisioning + Meta Pixel + Google Ads tags + conversion events
2. **CAPI setup:** Server-side event pipeline (VDP view, lead, phone, chat, schedule)
3. **Catalog sync:** Connect DMS inventory to Meta Catalog (items_batch) + Google Merchant (productInputs:insert)
4. **Campaign creation:** AIA campaigns on Meta + Performance Max on Google
5. **Audience building:** Dynamic product audiences from VDP viewers
6. **Lead capture:** Meta Lead Ads with Instant Forms + webhook to CRM
7. **Offline conversions:** GCLID capture at lead -> upload on deal close
8. **Reporting:** Scheduled pulls from Meta Insights + Google GAQL
9. **Optimization:** Automated budget/bid rules based on CPL and ROAS thresholds
10. **Lead Ads:** Instant Forms for top-of-funnel capture

### Required Credentials per Dealer

| Credential | Source |
|------------|--------|
| Meta Business ID | Meta Business Manager |
| Meta Ad Account ID | Meta Business Manager |
| Meta Pixel ID | Meta Events Manager |
| Meta Page ID | Facebook Page |
| Meta System User Token | Meta Business Manager (long-lived) |
| Google Ads Customer ID | Google Ads account |
| Google Ads Developer Token | Google Ads API Center |
| Google OAuth Client ID/Secret | Google Cloud Console |
| Google Merchant Center ID | Merchant Center |
| GTM Account ID | Tag Manager |
| GTM Container ID | Tag Manager |

### Key API Docs

- Meta Marketing API: https://developers.facebook.com/docs/marketing-api
- Meta Catalog API: https://developers.facebook.com/docs/marketing-api/catalog/
- Meta CAPI: https://developers.facebook.com/docs/marketing-api/conversions-api/
- Meta Lead Ads: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/
- Meta Insights: https://developers.facebook.com/docs/marketing-api/insights/
- Google Ads API: https://developers.google.com/google-ads/api/docs/start
- Google Merchant API: https://developers.google.com/merchant/api
- Google PMax: https://developers.google.com/google-ads/api/performance-max
- Google Offline Conversions: https://developers.google.com/google-ads/api/docs/conversions/upload-offline
- GTM API v2: https://developers.google.com/tag-platform/tag-manager/api/v2
- Vehicle Feed Spec (Google): https://developers.google.com/vehicle-listings/reference/feed-specification
