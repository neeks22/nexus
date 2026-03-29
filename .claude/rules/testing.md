---
paths: tests/**
---

# Testing Rules

- Tests are NOT optional. Every module gets unit tests.
- Use vitest for all tests
- Test files go in tests/unit/nexus-{package}/ or tests/e2e/
- Mock external services (Activix API, Twilio, Claude API) — never hit real APIs in tests
- Test both happy path AND edge cases (empty data, invalid input, expired consent, API failures)
- Compliance tests MUST cover: valid consent, expired consent, opt-out, frequency cap, content validation, feature validation
- Run `npx vitest run` before every commit
