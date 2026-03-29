---
paths: workflows/**
---

# n8n Workflow Rules

- All workflows MUST be CRM-agnostic — read CRM_PROVIDER and MESSAGING_PROVIDER env vars
- NEVER hardcode API tokens — always use $env variables
- NEVER use PLACEHOLDER_TOKEN fallbacks — throw error if env var missing
- All Slack notifications use SLACK_WEBHOOK_URL env var — never hardcode the URL
- Webhook endpoints MUST verify signatures (Activix HMAC-SHA256, Twilio X-Twilio-Signature)
- All workflows MUST have error handling — continueOnFail on send/update nodes
- Workflow JSON files MUST be saved to workflows/ directory for version control
- Deploy via mcp__n8n-mcp tools — validate before activating
