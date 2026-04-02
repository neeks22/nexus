# Test Suite Log

**Date:** 2026-04-01
**Author:** Claude Opus 4.6 (automated test generation)
**Result:** 54 tests passing, 0 failing
**Duration:** 236ms

---

## Test Files

### 1. `apps/website/src/lib/__tests__/auto-response.test.ts` (13 tests)

**normalizePhone** (6 tests):
- Parenthesized format: `(613) 555-1234` -> `+16135551234`
- 10-digit: `6135551234` -> `+16135551234`
- 11-digit with country code: `16135551234` -> `+16135551234`
- Already E.164: `+16135551234` -> `+16135551234`
- Dashed format: `613-555-1234` -> `+16135551234`
- Whitespace trimming: ` (613) 555-1234 ` -> `+16135551234`

**handleAutoResponse** (7 tests):
- Full happy path: insert, Claude SMS, Twilio send, email, transcript logging, Slack notification
- Duplicate lead: returns early, no SMS/email/insert
- Claude failure: falls back to template SMS containing GM name and dealership
- Twilio failure: sends Slack alert with "SMS FAILED"
- insertLead failure: SMS + email still fire (isolation verified)
- Invalid tenant: defaults to readycar config
- readyride tenant: uses correct fromPhone

### 2. `apps/website/src/lib/__tests__/security.test.ts` (26 tests)

**sanitizeInput** (7 tests):
- Passthrough, null byte stripping, control char stripping, newline/tab preservation, maxLength truncation, default 500 limit, empty string

**validateTenant** (6 tests):
- readycar, readyride valid; invalid/null/empty/unknown default to readycar

**getClientIp** (5 tests):
- x-forwarded-for (first IP), x-real-ip fallback, 0.0.0.0 default, whitespace trimming, x-forwarded-for priority over x-real-ip

**rateLimit** (3 tests):
- First call not limited, calls within limit pass, exceeding limit triggers rate limiting (in-memory fallback)

**encodeSupabaseParam** (5 tests):
- Normal string encoding, + preserved for phone numbers, @ encoded, parentheses encoded, commas encoded

### 3. `apps/website/src/app/api/__tests__/funnel-lead.test.ts` (15 tests)

**POST /api/funnel-lead**:
- Valid payload -> 200 + `{ success: true }`
- Verifies handleAutoResponse called with parsed lead data
- Missing firstName -> 400
- Missing email -> 400
- Invalid email format -> 400
- Invalid phone format -> 400
- `caslConsent: false` -> 400 with "CASL consent is required"
- SQL injection in firstName -> 400 with "Invalid characters detected"
- XSS in vehicleType -> 400 with "Invalid characters detected"
- Rate limited -> 429
- Invalid JSON body -> 400
- Security headers present (nosniff, DENY, XSS protection)
- CORS headers for allowed origin
- readyride tenant accepted
- handleAutoResponse crash doesn't break response (fire-and-forget via Promise.allSettled)

---

## Config Changes

- Updated `vitest.config.ts` include pattern to also match `apps/website/src/**/__tests__/**/*.test.ts`

## Bugs Found (not fixed per instructions)

1. **Rate limiter parameter ignored** (documented in FINAL-CODEBASE-SCORE.md): `rateLimit(ip, 10)` in funnel-lead route passes `maxRequests=10` but when Upstash is configured, the hardcoded `Ratelimit.slidingWindow(30, '60 s')` is used instead. Only the in-memory fallback respects the parameter.
