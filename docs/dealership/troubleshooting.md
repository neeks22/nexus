# Dealership AI — Troubleshooting Guide

Common issues and how to resolve them.

---

## Webhook Not Firing

**Symptoms:** New leads in Activix do not trigger the instant response workflow. No executions appear in n8n.

**Diagnosis:**
1. Check the n8n execution log — are there any recent executions for the Instant Response workflow?
2. In Activix, go to Settings > Webhooks — is the webhook active? Does the URL match `https://nexusagents.app.n8n.cloud/webhook/activix-lead-webhook`?
3. Check the webhook delivery log in Activix — look for failed deliveries (4xx or 5xx responses)

**Common Causes:**
- Webhook URL is incorrect or has a typo
- Webhook secret mismatch — the `ACTIVIX_WEBHOOK_SECRET` in n8n does not match the secret configured in Activix
- n8n workflow is inactive (paused) — reactivate it
- n8n instance is down — check the n8n health endpoint
- Activix webhook event type is wrong — it must be `lead.created` for instant response

**Fix:**
- Verify the webhook URL and secret match between Activix and n8n
- Reactivate the workflow if it was paused
- Test by creating a manual lead in Activix and checking n8n execution log
- If n8n is down, restart the instance and check resource usage

---

## SMS Not Delivering

**Symptoms:** The workflow executes successfully in n8n, but the customer does not receive the SMS.

**Diagnosis:**
1. Check the n8n execution details — did the Twilio send node succeed?
2. Check the Twilio Console > Messaging > Logs for the specific message SID
3. Look for error codes in the Twilio delivery status

**Common Causes:**
- Invalid phone number format — Twilio requires E.164 format (+1XXXXXXXXXX)
- Twilio number not SMS-enabled or suspended
- Customer's carrier is blocking messages (common with short codes or unregistered numbers)
- Twilio account balance is zero
- `TWILIO_FROM_NUMBER` environment variable is incorrect
- Compliance check blocked the message (check compliance logs, not a Twilio issue)

**Fix:**
- Verify the phone number format in the Activix lead record
- Check Twilio account balance and number status
- Register the Twilio number for A2P 10DLC (required for US/Canada business messaging)
- If carrier-blocked, contact Twilio support for number reputation
- Check n8n compliance node output to confirm the message was not blocked before sending

---

## Slow AI Response (> 60 Seconds)

**Symptoms:** The AI sends the SMS, but it takes more than 60 seconds from webhook receipt to delivery.

**Diagnosis:**
1. Check the n8n execution timing — which node is taking the longest?
2. Check if the Claude API call is slow (look at the AI response generation node duration)
3. Check if Activix API calls are slow (inventory query, lead update)

**Common Causes:**
- Claude API is experiencing high latency or rate limiting
- Inventory query is scanning a large CSV file
- Multiple API calls in sequence (Activix + Claude + Twilio + Slack) add up
- n8n instance is under heavy load (too many concurrent executions)

**Fix:**
- If Claude is slow, check the Anthropic status page (status.anthropic.com)
- Switch to Claude Haiku for faster response times on standard messages
- Pre-cache inventory data instead of reading CSV on every request
- Check n8n execution concurrency settings — reduce if the instance is overloaded
- Consider splitting the notification (Slack + Activix update) into an async post-send workflow

---

## Wrong Language Detected

**Symptoms:** A French-speaking customer receives an English message, or vice versa.

**Diagnosis:**
1. Check the lead's data in Activix — what is the `locale` field set to?
2. What is the customer's phone area code?
3. What is the customer's postal code?

**How Language Detection Works:**

The system uses a priority cascade:
1. **Activix locale field** — If set to `fr` or `fr-CA`, the system uses French
2. **Phone area code** — Quebec area codes (418, 438, 450, 514, 579, 581, 819, 873) trigger French
3. **Postal code** — Prefixes G, H, J (Quebec) trigger French
4. **Fallback** — If none of the above match, the system defaults to English (en-CA)

**Common Causes:**
- The locale field is not set in Activix (system falls through to area code check)
- Customer has an Ontario number but lives in Quebec (or vice versa)
- Postal code is missing from the lead record

**Fix:**
- Set the `locale` field in Activix for the lead (this overrides all other detection)
- If the dealership is in Quebec, consider setting a default locale override in the tenant config
- Ensure your Activix lead forms capture postal code for better detection
- For known misdetections, manually update the lead's locale in Activix

---

## Compliance Failure — Message Blocked

**Symptoms:** The AI does not send a message to a lead. The compliance check node shows a failure.

**Diagnosis:**
1. Check the n8n execution details — which compliance checker failed?
2. Check the failure reason in the compliance log

**Compliance Checkers and Common Failures:**

| Checker | Failure Reason | What It Means |
|---------|---------------|---------------|
| `consent` | No consent record found | Lead has no recorded consent in the system |
| `consent` | Implied consent expired | Implied consent is older than 6 months (CASL) |
| `consent` | Consent has been revoked | Lead explicitly revoked consent |
| `opt-out` | Lead unsubscribed from SMS | `unsubscribe_sms_date` is set in Activix |
| `opt-out` | Lead unsubscribed from all | `unsubscribe_all_date` is set in Activix |
| `frequency-cap` | Exceeded max touches | Lead has received too many messages in the time window (default: 7 in 30 days) |
| `content` | Forbidden financial language | The AI's message contained pricing, payment, or financing language |
| `features` | Unverified vehicle feature | The AI mentioned a feature not in the inventory record |

**Fix:**
- `consent` failures: Record consent for the lead, or verify the consent date is recent enough
- `opt-out` failures: Do not override — this is legally required under CASL. The lead has unsubscribed.
- `frequency-cap` failures: Wait for the time window to pass, or adjust the cap in config (not recommended)
- `content` failures: This means the AI generated forbidden content and it was caught. No action needed — the system correctly blocked it. If it happens frequently, review the system prompt.
- `features` failures: Update the inventory CSV to include the correct features for the vehicle

---

## Lead Not in CRM After AI Response

**Symptoms:** The AI sent the SMS, but the Activix lead was not updated with the AI's activity.

**Diagnosis:**
1. Check the n8n execution — did the "Update Activix Lead" node succeed?
2. Check for Activix API errors (401, 403, 429, 500)
3. Check the failover queue — is the update queued for retry?

**Common Causes:**
- Activix API token expired or revoked
- Activix API rate limit hit (200/min or 2000/hr)
- Activix API is temporarily down
- The lead ID in the webhook does not match a valid lead in Activix

**Fix:**
- Regenerate the Activix API token and update `ACTIVIX_API_TOKEN` in n8n
- Check the failover queue (Workflow 4) — it retries failed Activix calls every 15 minutes
- If the Activix circuit breaker is OPEN, wait for it to transition to HALF_OPEN (60 seconds) and test
- Verify the lead exists in Activix by searching with the lead ID

---

## Handoff Not Reaching Sales Rep

**Symptoms:** A customer replied with a pricing question, but the sales rep did not receive a notification.

**Diagnosis:**
1. Check the n8n Inbound Reply Handler execution — was the intent classified correctly?
2. Did the handoff branch execute?
3. Did the Slack notification node succeed?

**Common Causes:**
- The Inbound Reply Handler workflow (Workflow 3) is not active
- The Twilio inbound webhook URL is not configured on the Twilio number
- The intent confidence was below the handoff threshold (default: 0.8)
- Slack OAuth token expired
- The Slack channel does not exist or the bot is not a member

**Fix:**
- Activate Workflow 3 if it is inactive
- Verify the Twilio inbound webhook URL in Twilio Console
- Check intent classification results — if confidence is low, review the message patterns
- Refresh the Slack OAuth token in n8n credentials
- Invite the Slack bot to the notification channel

---

## High Costs

**Symptoms:** The cost report shows unexpectedly high AI or Twilio costs.

**Diagnosis:**
1. Run the cost report for the tenant: `CostReporter.generateSummary(tenantId, dateRange)`
2. Check the breakdown by operation type
3. Check Twilio message volume

**Common Causes:**
- Using Claude Opus instead of Haiku for standard responses (Opus is ~19x more expensive)
- High lead volume with long follow-up sequences
- Twilio costs from international numbers or MMS
- Failed retries causing duplicate API calls

**Fix:**
- Switch to Claude Haiku for instant response and cold warming (Haiku: $0.80/$4 per million tokens vs Opus: $15/$75)
- Review the touch schedule — consider reducing from 7 touches to 5 for low-value leads
- Ensure Twilio numbers are local Canadian numbers (cheapest rate)
- Check for retry loops in n8n workflows — add proper error handling to prevent infinite retries
