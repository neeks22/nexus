# GTM Dealership Template - Setup Guide

**Template:** `config/gtm/dealership-gtm-template.json`
**Version:** 1.0
**Time to deploy:** ~15 minutes per dealer

---

## Quick Start

### 1. Import the Container

1. Log into [Google Tag Manager](https://tagmanager.google.com)
2. Select the dealer's GTM container (or create one)
3. Go to **Admin** > **Import Container**
4. Upload `dealership-gtm-template.json`
5. Choose **New workspace** named "Nexus Import"
6. Select **Merge** > **Rename conflicting tags** (keeps existing tags safe)
7. Click **Confirm**

### 2. Set the 3 Required Constants

After import, go to **Variables** > **User-Defined Variables** and update:

| Variable | What to enter | Where to find it |
|---|---|---|
| `META_PIXEL_ID` | e.g. `123456789012345` | Meta Events Manager > Data Sources |
| `GOOGLE_ADS_CONVERSION_ID` | e.g. `AW-1234567890/AbCdEfGhIjKlMnOp` | Google Ads > Tools > Conversions |
| `GA4_MEASUREMENT_ID` | e.g. `G-ABC123DEF4` | GA4 Admin > Data Streams |

### 3. Preview and Publish

1. Click **Preview** in GTM
2. Enter the dealer's website URL
3. Walk through the test checklist below
4. Once verified, click **Submit** > **Publish**

---

## What's Included

### Tags (12 total)

| # | Tag | Fires On | Purpose |
|---|-----|----------|---------|
| 1 | Meta Pixel - Base | All pages | Initializes pixel, tracks PageView |
| 2 | Meta Pixel - Lead Event | Form submit, thank-you pages | Tracks Lead conversion |
| 3 | Meta Pixel - ViewContent (VDP) | Vehicle detail pages | Tracks vehicle views with make/model/year/price |
| 4 | Meta Pixel - Schedule | Test drive booking | Tracks appointment scheduling |
| 5 | Google Ads Conversion - Lead | Form submit, thank-you pages | Lead conversion for Google Ads |
| 6 | Google Ads Conversion - Call | Click-to-call | Call conversion for Google Ads |
| 7 | GA4 - Page View | All pages | Standard GA4 page tracking |
| 8 | GA4 - VDP View | Vehicle detail pages | Custom event with vehicle data |
| 9 | GA4 - Lead Form Submit | Form submit, thank-you pages | Custom lead event |
| 10 | GA4 - Click to Call | Click-to-call | Custom call tracking event |
| 11 | GA4 - Chat Widget Open | Chat open event | Custom chat engagement event |
| 12 | CAPI Event Forwarder | All conversion events | Sends to n8n webhook for server-side Meta CAPI |

### Triggers (10 total)

| # | Trigger | Type | Condition |
|---|---------|------|-----------|
| 1 | All Pages | Page View | Every page load |
| 2 | Form Submission - Dealer Forms | Form Submit | CSS selectors matching common dealer form patterns |
| 3 | VDP Page View | Page View | URL contains `/inventory/` |
| 4 | VDP Page View - Vehicle Path | Page View | URL contains `/vehicle/` |
| 5 | Click to Call | Click | Click URL starts with `tel:` |
| 6 | Chat Widget Open | Custom Event | `chat_widget_open` event |
| 7 | Application Complete - Thank You | Page View | URL contains `/thank-you` |
| 8 | Application Complete - Confirmation | Page View | URL contains `/confirmation` |
| 9 | Test Drive Booking | Custom Event | `test_drive_booking` event |
| 10 | VDP Data Layer Event | Custom Event | `vdp_view` event |

### Variables (11 user-defined)

- 3 constants (Pixel ID, Google Ads ID, GA4 ID)
- 5 vehicle data layer variables (make, model, year, price, VIN)
- 1 form ID variable
- 1 user IP variable (for CAPI)
- 1 event ID variable (for deduplication)

---

## Data Layer Specification

The dealer's website **must** push data layer events for full tracking coverage. Provide this spec to the dealer's web developer.

### Vehicle Detail Page (VDP) View

Fire this when a user lands on any single-vehicle page:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'vdp_view',
  vehicle_make: 'Honda',
  vehicle_model: 'CR-V',
  vehicle_year: 2024,
  vehicle_price: 32490,
  vehicle_vin: '2HKRW2H83RH123456',
  event_id: 'vdp_' + Date.now()  // for CAPI deduplication
});
```

### Lead Form Submission

Fire this on successful form submission (in addition to native form submit):

```javascript
window.dataLayer.push({
  event: 'lead_form_submit',
  form_id: 'contact-form-vdp',
  event_id: 'lead_' + Date.now(),
  user_ip: '{{SERVER_SIDE_IP}}'  // optional, set server-side if possible
});
```

### Test Drive Booking

```javascript
window.dataLayer.push({
  event: 'test_drive_booking',
  vehicle_make: 'Toyota',
  vehicle_model: 'RAV4',
  vehicle_year: 2025,
  event_id: 'td_' + Date.now()
});
```

### Chat Widget Open

Most chat widgets support an "on open" callback. Wire it to:

```javascript
window.dataLayer.push({
  event: 'chat_widget_open',
  event_id: 'chat_' + Date.now()
});
```

### User IP for CAPI

If the dealer's platform supports it (server-rendered pages), inject the user IP into the data layer so the CAPI forwarder can send it:

```javascript
window.dataLayer.push({
  user_ip: '<?php echo $_SERVER["REMOTE_ADDR"]; ?>'
});
```

This improves Meta CAPI match rates significantly but is optional -- the webhook will work without it.

---

## CAPI Event Forwarder Details

The CAPI forwarder tag sends a JSON payload to:

```
POST https://nexusagents.app.n8n.cloud/webhook/meta-capi
```

### Payload Schema

```json
{
  "event_name": "Lead",
  "event_id": "lead_1711612800000_abc123",
  "event_time": 1711612800,
  "event_source_url": "https://dealer.com/inventory/2024-honda-crv",
  "user_agent": "Mozilla/5.0 ...",
  "pixel_id": "123456789012345",
  "action_source": "website",
  "vehicle_make": "Honda",
  "vehicle_model": "CR-V",
  "vehicle_year": 2024,
  "vehicle_price": 32490,
  "vehicle_vin": "2HKRW2H83RH123456",
  "user_ip": "192.168.1.1",
  "fbc": "fb.1.1711612800000.AbCdEfGh",
  "fbp": "fb.1.1711612800000.1234567890"
}
```

The `fbc` and `fbp` cookies are automatically extracted from the browser. The `event_id` enables deduplication between browser pixel and server-side CAPI events.

---

## Pre-Publish Test Checklist

Use GTM Preview mode and walk through each scenario:

- [ ] **All pages** -- Meta Pixel Base fires, GA4 Page View fires
- [ ] **VDP page** -- Navigate to any `/inventory/` or `/vehicle/` page. Verify:
  - Meta Pixel ViewContent fires with vehicle data
  - GA4 VDP View fires with make/model/year
  - CAPI Forwarder fires
- [ ] **Lead form** -- Submit a test lead form. Verify:
  - Meta Pixel Lead fires
  - Google Ads Lead conversion fires
  - GA4 Lead Form Submit fires
  - CAPI Forwarder fires
- [ ] **Click to call** -- Click any phone number link. Verify:
  - Google Ads Call conversion fires
  - GA4 Click to Call fires
  - CAPI Forwarder fires
- [ ] **Thank-you page** -- Navigate to `/thank-you` or `/confirmation`. Verify:
  - Meta Pixel Lead fires
  - Google Ads Lead conversion fires
  - GA4 Lead Form Submit fires
- [ ] **Chat widget** -- Open the chat widget. Verify:
  - GA4 Chat Widget Open fires
  - CAPI Forwarder fires
- [ ] **Test drive** -- Complete a test drive booking. Verify:
  - Meta Pixel Schedule fires
  - CAPI Forwarder fires

### Verification Tools

- **Meta Pixel Helper** (Chrome extension) -- shows pixel fires in real time
- **Google Tag Assistant** (built into GTM Preview) -- shows all tag firings
- **GA4 DebugView** (GA4 Admin > DebugView) -- shows events in real time
- **n8n Execution Log** -- check that webhooks are received at the n8n instance

---

## Common Customizations

### Different URL Patterns

If the dealer's VDP pages don't use `/inventory/` or `/vehicle/`, update triggers 3 and 4:

1. In GTM, go to **Triggers**
2. Edit "VDP Page View" or "VDP Page View - Vehicle Path"
3. Change the URL match to the dealer's pattern (e.g., `/cars/`, `/details/`, `/listing/`)

### Form Selectors

The form submission trigger uses broad CSS selectors. If the dealer's forms don't match, update trigger 2:

Current selectors:
```
form[id*='lead'], form[class*='lead'], form[id*='contact'],
form[class*='contact'], form[action*='lead'], form[data-form-type='lead'],
#contactForm, .contact-form, .lead-form, #leadForm
```

Inspect the dealer's form HTML and add their specific selectors.

### Multiple Conversion Actions in Google Ads

The template uses a single `GOOGLE_ADS_CONVERSION_ID` for both leads and calls. If the dealer has separate conversion actions:

1. Create a second constant variable (e.g., `GOOGLE_ADS_CALL_CONVERSION_ID`)
2. Update tag "Google Ads Conversion - Call" to use the new variable

### Currency

The Meta Pixel ViewContent tag defaults to `CAD`. For US dealers, edit tag 3 ("Meta Pixel - ViewContent") and change `currency: 'CAD'` to `currency: 'USD'`.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Pixel not firing | Pixel ID not set | Check `META_PIXEL_ID` variable has real value |
| Double-counting leads | Form + thank-you both fire | Normal -- Meta dedupes by event_id. If problematic, remove thank-you page triggers from Lead tags |
| VDP tags not firing | URL pattern mismatch | Check dealer's VDP URL structure, update triggers |
| CAPI webhook failing | n8n workflow not active | Verify workflow is active at n8n dashboard |
| GA4 events not showing | Measurement ID wrong | Verify `GA4_MEASUREMENT_ID` matches GA4 data stream |
| Click-to-call not tracking | Phone links not using tel: | Dealer needs `<a href="tel:...">` links |
