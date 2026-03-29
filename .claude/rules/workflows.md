---
paths: workflows/**
---

# n8n Workflow Rules

- All workflows MUST be CRM-agnostic — support both Activix and GHL via provider config
- Credentials are HARDCODED in Code nodes (n8n Cloud free plan does not support $env vars)
- workflows/ directory is in .gitignore — NEVER commit workflow JSON files (they contain secrets)
- To update credentials, edit the local JSON files and redeploy via mcp__n8n-mcp tools
- Webhook endpoints MUST verify signatures (Activix HMAC-SHA256, Twilio X-Twilio-Signature)
- All workflows MUST have error handling — continueOnFail on send/update nodes
- Workflow JSON files MUST be saved to workflows/ directory for version control
- Deploy via mcp__n8n-mcp tools — validate before activating
