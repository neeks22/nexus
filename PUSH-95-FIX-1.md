# PUSH-95-FIX-1: Security Hardening

**Date:** 2026-04-01
**Commit:** 6f0012e

## Changes Made

### FIX 1: CSP + HSTS Headers
- **Files:** `apps/website/src/middleware.ts`, `vercel.json`
- Added `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (2-year HSTS with preload)
- Added `Content-Security-Policy` with locked-down directives: self-only defaults, whitelisted connect-src for Supabase/Anthropic/Twilio/Sentry, frame-ancestors none
- Headers set in both middleware (runtime) and vercel.json (CDN edge)

### FIX 2: Upstash Rate Limit Parameter Pass-Through
- **File:** `apps/website/src/lib/security.ts`
- **Bug:** Single `Ratelimit` instance was hardcoded to `slidingWindow(30, '60s')` -- callers passing `maxRequests=10` were ignored
- **Fix:** Factory pattern with `Map<string, Ratelimit>` keyed by `maxRequests:windowSec` -- creates and caches per-route limiters on demand
- Added try/catch around Upstash calls with fallback to in-memory limiter (was previously unguarded)

### FIX 3: Tenant Session Scoping
- **File:** `apps/website/src/middleware.ts`
- After session signature/expiry verification, extract `session.tenant` and enforce route scoping:
  - `/readycar/*` routes reject non-readycar sessions (redirect + cookie clear)
  - `/readyride/*` routes reject non-readyride sessions (redirect + cookie clear)
- Inject `x-session-tenant` header on protected API responses for downstream handlers to enforce cross-tenant data isolation
- Structured to preserve CSRF check flow (no early returns that skip origin validation)

## Verification
- `tsc --noEmit` -- zero errors
- `npm run build` -- success (middleware 82.9 kB)
- `vitest run` -- 1185/1185 tests passing (29 test files)
