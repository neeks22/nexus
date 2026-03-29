---
paths: packages/nexus-compliance/**
---

# Compliance Rules

- CASL compliance is NON-NEGOTIABLE. Every outbound message MUST pass CompliancePreFlight
- Implied consent expires after 6 months — enforce with ConsentTracker
- Every SMS MUST include opt-out language in the correct locale (EN/FR)
- Content validation MUST block: interest rates, monthly payments, financing terms, credit scores, insurance, negotiation language
- Feature validation MUST cross-check against inventory record — no hallucinated features
- FrequencyCapChecker MUST require explicit touchHistory — never silently skip
- All compliance check results MUST be logged immutably
