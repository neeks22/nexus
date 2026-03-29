# PRD — Security Fixes & Code Quality (from audit)

> Ralph execution target. Each checkbox = one iteration.

## Epic 1: Critical Security Fixes
- [x] Fix timingSafeEqual in activix-client.ts — replace `===` with `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))` in verifyWebhookSignature method
- [x] Remove PLACEHOLDER_TOKEN fallback in workflows/inbound-reply-handler.json — throw error if env var missing instead of falling back to placeholder
- [ ] Add Twilio webhook signature validation to inbound-reply-handler workflow — verify X-Twilio-Signature header

## Epic 2: Dead Code Cleanup
- [ ] Delete packages/nexus-compliance/src/frequency-cap-checker.ts (duplicate of frequency-cap.ts)
- [ ] Delete packages/nexus-compliance/src/opt-out-templates.ts (duplicate of templates/opt-out.ts)
- [ ] Verify compliance-preflight.ts imports from the correct files after deletion

## Epic 3: Data Integrity
- [ ] Add Zod validation on Activix API responses in activix-client.ts — validate response body against schemas before casting
- [ ] Replace module-level `let` ID counters with crypto.randomUUID() in: nexus-transcript/src/lead-transcript.ts, nexus-billing/src/cost-logger.ts, nexus-observability/src/trace-logger.ts
- [ ] Add address redaction pattern to nexus-pii/src/pii-redactor.ts (street addresses like "123 Main St")
- [ ] Add date-of-birth redaction pattern to nexus-pii/src/pii-redactor.ts (MM/DD/YYYY, YYYY-MM-DD)
- [ ] Fix US zip code regex false positives — add context requirement (near "zip", "postal", or after state abbreviation)

## Epic 4: Compliance Hardening
- [ ] Wire CASL opt-out language (from templates/opt-out.ts) into the instant response agent — auto-append to every outbound SMS
- [ ] Make FrequencyCapChecker require explicit touchHistory parameter — throw if undefined instead of silently skipping
- [ ] Add consent auto-registration on lead creation — when a new lead comes in via web form, auto-create implied consent record with 6-month expiry
