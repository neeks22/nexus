# Nexus Codebase Score V3 — Final Assessment

**Date:** 2026-04-01
**Scorer:** Claude Opus 4.6 (read-only audit)
**Tests:** 29 files, 1185 tests, all passing

---

## 1. API SECURITY — 8.5/10

**Verified:**
- Middleware enforces CSRF (Origin/Referer check) on all mutating API requests
- Twilio signature validation with `crypto.timingSafeEqual` (sms/route.ts)
- API key auth (`requireApiKey`) with same-origin fallback
- Auth route uses timing-safe password comparison with padded buffers
- Signed session cookies (HMAC-SHA256) with 24h expiry
- Rate limiting on every API route (Upstash Redis with in-memory fallback)
- Rate limit factory correctly respects per-route `maxRequests` parameter
- Zod schema validation with SQL injection + XSS regex blocking on funnel-lead
- Input sanitization strips control characters
- Webhook/cron endpoints correctly exempted from CSRF (they have their own auth)
- Prompt injection filtering on SMS customer messages

**Gaps:**
- API key comparison (`apiKey !== NEXUS_API_KEY`) is not timing-safe (line 147 of security.ts) — minor since it falls through to origin check
- CSP allows `unsafe-inline` and `unsafe-eval` for scripts — common Next.js compromise but weakens CSP value

## 2. DATA INTEGRITY — 8.0/10

**Verified:**
- Phone normalization to E.164 before all DB operations
- Dedup check before lead insertion with safe default (treat as duplicate on error)
- `insertLead` isolated in its own try/catch so SMS+email still fire if DB insert fails
- MessageSid dedup prevents Twilio double-processing
- Supabase operations use `AbortSignal.timeout()` to prevent hanging requests
- `supaGet` returns typed `{ data, error }` result for proper error discrimination
- Data retention cron purges PII per PIPEDA (90 days credit, 6 months transcripts)
- All DB writes include `tenant_id` for data isolation

**Gaps:**
- MessageSid dedup is in-memory only (100 entries, resets on cold start) — serverless limitation, acceptable with Twilio's own retry behavior
- No database-level unique constraint enforcement visible (relies on application-level dedup)
- `encodeURIComponent` used for Supabase query params but no parameterized queries — REST API constraint

## 3. ERROR HANDLING — 8.0/10

**Verified:**
- Sentry.captureException in 26 catch blocks across 8 API route files
- All catch blocks in auto-response.ts log AND send to Sentry
- funnel-lead route: Sentry on auto-response failure, n8n webhook failure, and outer catch
- sms/route.ts: Sentry on process trigger failure
- sms/process/route.ts: Sentry on PATCH failures, history load, name lookup, form extraction, outer catch
- check-email cron: Sentry on Claude API failure and Supabase log failure
- leads/route.ts: Sentry in all 8 catch blocks
- auth/route.ts: console.error in catches (no Sentry import, but auth errors are expected flow)
- No empty catch blocks that swallow errors silently — `catch {}` blocks either return 400 (JSON parse) or log with console.error

**Gaps:**
- `dashboard/route.ts` catch block logs but does NOT call Sentry.captureException
- `data-retention/route.ts` catch block logs but does NOT call Sentry.captureException
- 3 catch blocks in `sms/process/route.ts` (lines 106, 122, 236) use `catch {}` with console.error but no Sentry — these are deliberate (safe defaults for HOT check), but Sentry would aid debugging
- `credit-analyze/route.ts` line 65 `catch {}` for JSON parse — acceptable pattern

## 4. MESSAGING PIPELINE — 8.5/10

**Verified:**
- Full SMS lifecycle: inbound webhook -> signature validation -> dedup -> delayed processor -> intent classification -> AI response -> Twilio send -> transcript logging
- HOT lead detection with immediate handoff + AI pause mechanism
- Dual pause check (transcript status entries + funnel_submissions status)
- Safe default: if pause check fails, do NOT reply (prevents spamming hot leads)
- Form extraction runs fire-and-forget after SMS response (off hot path)
- NESB sales framework with comprehensive prompt engineering
- Anti-prompt-injection filtering on customer messages
- Fallback SMS when Claude API fails
- Welcome email with HTML + plaintext variants via Gmail SMTP
- Slack notifications at every critical point (hot lead, failures, new leads)
- Auto-response orchestrator with dedup -> insert -> parallel(SMS, email) flow
- `maxDuration = 60` set on process route for Vercel Pro

**Gaps:**
- No retry logic on Twilio SMS send failure (fire-and-forget with Slack notification as fallback)
- No dead letter queue for failed messages
- Email template has hardcoded inline styles (minor, HTML email constraint)

## 5. PERFORMANCE — 7.5/10

**Verified:**
- `Promise.allSettled` for parallel auto-response + n8n webhook in funnel-lead
- `Promise.all` for parallel dashboard queries (4 concurrent Supabase fetches)
- `Promise.allSettled` for parallel SMS + email in auto-response
- `AbortSignal.timeout()` on all external API calls (5-10s depending on criticality)
- Form extraction moved off hot path (fire-and-forget after SMS sent)
- Removed artificial 3s delay in SMS processing
- Rate limiter factory caches Ratelimit instances per config key
- `no-store` cache headers on API responses

**Gaps:**
- No edge caching for read-heavy dashboard queries
- No connection pooling for Supabase (using REST API, new connection per request)
- No streaming responses for long-running operations
- Dashboard loads ALL leads for pipeline counts (`select=phone,first_name,last_name,status` with no limit) — will degrade with scale

## 6. DEPLOYMENT — 8.0/10

**Verified:**
- CI pipeline (.github/workflows/ci.yml): checkout -> install -> tsc --noEmit -> vitest run -> build
- Runs on push to main and PRs to main
- Node 22, npm caching enabled
- vercel.json with build/output config and security headers
- HSTS header in both middleware AND vercel.json (belt and suspenders)
- Sentry DSN set to empty string in CI to avoid build failure
- `maxDuration = 60` on long-running routes

**Gaps:**
- No staging/preview deployment configuration
- No integration tests or E2E tests in CI
- No Sentry release tracking (source maps, commits)
- No health check endpoint for uptime monitoring
- No environment validation at startup (validateRequiredEnv exists but isn't called on boot)

## 7. CODE QUALITY — 8.0/10

**Verified:**
- Centralized security module (security.ts) — single source for auth, rate limiting, Supabase, Twilio, Claude, Slack
- Consistent error message formatting: `err instanceof Error ? err.message : 'unknown'`
- Zod schemas for input validation
- TypeScript strict mode with explicit types
- Clean separation: middleware for global concerns, route-level for specific logic
- Tenant configuration centralized in TENANT_MAP
- Helper functions well-documented with JSDoc comments
- No hardcoded secrets (all from env vars)
- PII redaction in logs (only last 4 digits of phone)

**Gaps:**
- Some code duplication: `cleanEnv()` defined in both middleware.ts and auth/route.ts
- `getClientIp` duplicated in funnel-lead route (has its own copy alongside the shared import)
- `securityHeaders()` in funnel-lead duplicates what middleware already sets
- sms/process/route.ts is 365 lines — borderline for single-file complexity
- `ALLOWED_ORIGIN` defined in multiple files instead of imported from security.ts

## 8. SECURITY — 8.5/10

**Verified:**
- HSTS with 2-year max-age, includeSubDomains, preload (middleware + vercel.json)
- CSP header blocking frame-ancestors, restricting connect-src to known domains
- X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- HttpOnly + Secure + SameSite=strict session cookies
- HMAC-SHA256 signed session tokens with constant-time comparison
- No secrets in source code — all from environment variables
- Prompt injection filtering on customer SMS input
- CASL consent enforcement (z.literal(true))
- Data retention cron for PIPEDA compliance
- Anti-caching headers on all API responses (Cache-Control: no-store)
- Internal process endpoint protected by PROCESS_SECRET header

**Gaps:**
- CSP `unsafe-inline` + `unsafe-eval` significantly weakens script protection
- No CORS headers on most routes (only funnel-lead has explicit CORS handling)
- No request body size limiting (relies on Vercel's default 4.5MB)
- Session cookie has no domain restriction (defaults to current domain, acceptable for single-domain)

## 9. MULTI-TENANT — 8.0/10

**Verified:**
- Tenant scoping enforced in middleware: `/readycar` routes require readycar session, `/readyride` requires readyride session
- `x-session-tenant` header injected by middleware for downstream route handlers
- `validateTenant()` normalizes tenant with safe default
- All Supabase operations include `tenant_id` in queries and writes
- `supaHeaders()` supports optional `x-tenant-id` for RLS enforcement
- TENANT_MAP maps phone numbers to tenant configs
- Per-tenant passwords for CRM access
- Separate tenant configs in auto-response (TENANTS record)

**Gaps:**
- API routes don't consistently read `x-session-tenant` header — most still accept tenant from query params, which could be spoofed on authenticated routes
- No RLS policies visible in codebase (comment says "TODO: Switch to supaAnonHeaders once RLS policies migration 005 deployed")
- Using service role key for reads means Supabase-side tenant isolation is not enforced yet
- TENANT_MAP is hardcoded — adding a tenant requires code change + deploy

## 10. PRODUCTION READINESS — 7.5/10

**Verified:**
- 1185 tests passing across 29 test files
- CI pipeline gates builds on type check + tests + build
- Error monitoring via Sentry across critical paths
- Slack notifications as operational alerting
- Data retention for compliance
- Security headers comprehensive
- Graceful degradation: rate limiter falls back to in-memory, Claude falls back to static SMS
- PII redaction in logs
- PIPEDA data retention implemented

**Gaps:**
- No health check / readiness endpoint
- No structured logging (uses console.error/log — not JSON structured)
- No OpenTelemetry / APM tracing
- No runbook or incident response documentation
- No database migrations in the codebase (Supabase migrations managed externally)
- No feature flags
- No load testing evidence
- Dashboard query has no pagination — will break at scale

---

## FINAL SCORES

| Dimension | Score |
|---|---|
| 1. API Security | 8.5/10 |
| 2. Data Integrity | 8.0/10 |
| 3. Error Handling | 8.0/10 |
| 4. Messaging Pipeline | 8.5/10 |
| 5. Performance | 7.5/10 |
| 6. Deployment | 8.0/10 |
| 7. Code Quality | 8.0/10 |
| 8. Security | 8.5/10 |
| 9. Multi-Tenant | 8.0/10 |
| 10. Production Ready | 7.5/10 |

## OVERALL SCORE: 8.05/10

## PROGRESSION: 6.7 -> 7.3 -> 7.9 -> 8.0 -> 8.05

---

## Summary

The codebase has crossed the 8.0 threshold and holds steady. The improvements since the last score are real but incremental:

**What moved the needle:**
- CSP + HSTS headers provide genuine browser-side protection
- Sentry coverage across 26 catch blocks in 8 API files gives production visibility
- Rate limit factory fix means per-route limits actually work (funnel at 10/min, auth at 5/min, SMS at 60/min)
- Tenant session scoping in middleware prevents cross-tenant access at the edge
- CI pipeline gates merges on type safety + tests + build

**What prevents a higher score:**
- RLS not deployed yet — service role key bypasses Supabase-level tenant isolation
- No structured logging or APM (Sentry covers exceptions, not performance/traces)
- Dashboard has no pagination and will degrade under load
- CSP `unsafe-inline`/`unsafe-eval` weakens what should be the strongest header
- A few catch blocks still missing Sentry (dashboard, data-retention)
- Code duplication across files (cleanEnv, getClientIp, ALLOWED_ORIGIN, securityHeaders)

**To reach 8.5+:**
1. Deploy Supabase RLS policies and switch reads to anon key
2. Add structured logging (pino) and request tracing
3. Paginate dashboard queries
4. Tighten CSP (nonce-based scripts instead of unsafe-inline)
5. Add health check endpoint and uptime monitoring
6. Consolidate duplicated utilities into security.ts
