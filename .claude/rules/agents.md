---
paths: packages/nexus-agents/**
---

# Agent Development Rules

- Every agent MUST go through the self-healing pipeline: PRE-FLIGHT → EXECUTE → VALIDATE → DIAGNOSE → RECOVER → RETRY
- Every agent MUST have CompliancePreFlight as a mandatory pipeline step — non-bypassable
- Agent system prompts MUST include safety rails: no pricing, no financing, no unverified features
- Agent responses MUST be validated against inventory data before sending
- All agents MUST support bilingual EN/FR via LanguageDetector
- Agent personality and restrictions are configured via nexus-control AgentRegistry — never hardcode
