---
paths: packages/nexus-crm/**, packages/nexus-activix/**
---

# CRM Integration Rules

- All CRM operations MUST go through the CrmAdapter interface — never call APIs directly
- Use CrmFactory to create adapters — `createCrmAdapter(provider, config)`
- Normalize all lead data to CrmLead universal format
- Activix-specific: phones/emails are append-only, advisor assignment by name matching
- Webhook signature verification MUST use timingSafeEqual — never string ===
- Rate limiting MUST be client-side enforced (200/min, 2000/hr for Activix)
- Circuit breaker: OPEN after 3 failures, HALF_OPEN test at 60s
- Failed CRM operations MUST queue to failover — never lose a lead
