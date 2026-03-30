# Nexus Security Hardening Checklist

**Date:** 2026-03-28
**Scope:** Full security audit and hardening of the Nexus website application (`apps/website/`), which handles real customer PII (names, phones, emails, credit info) for car dealerships.

---

## 1. Credential Security [CRITICAL]

| Item | Status | Details |
|------|--------|---------|
| Remove hardcoded Twilio SID from source | DONE | Was in `api/messages/route.ts` line 3 |
| Remove hardcoded Twilio Auth Token from source | DONE | Was in `api/messages/route.ts` line 4 |
| Remove hardcoded Supabase service key from source | DONE | Was in `api/messages/route.ts` line 9 |
| Move all credentials to `process.env.*` | DONE | `.env.local` for dev, Vercel env vars for prod |
| Create `.env.local` with all required vars | DONE | `apps/website/.env.local` |
| Verify `.env.local` in `.gitignore` | DONE | Both root and `apps/website/.gitignore` |
| Verify `.env`, `.env.*` in `.gitignore` | DONE | Root `.gitignore` |
| Verify `workflows/` in `.gitignore` | DONE | Root `.gitignore` |
| Verify `.mcp.json` in `.gitignore` | DONE | Root `.gitignore` |
| Fail fast if credentials missing at runtime | DONE | Both API routes check for env vars |

**ACTION REQUIRED:** After deploying this code, you MUST rotate the Twilio Auth Token and Supabase service key, as they were committed to git history. Set the new values in Vercel Environment Variables.

---

## 2. API Route Security [HIGH]

| Item | Status | Details |
|------|--------|---------|
| Rate limiting on `/api/messages` | DONE | 60 req/min per IP (sliding window) |
| Rate limiting on `/api/funnel-lead` | DONE | 10 req/min per IP (sliding window) |
| E.164 phone validation on POST `/api/messages` | DONE | Regex + normalization |
| SMS body length limit (1600 chars) | DONE | `sanitizeText()` with max length |
| Control character stripping on all text input | DONE | Null bytes, control chars removed |
| Zod schema validation on `/api/funnel-lead` | DONE | Full schema with type safety |
| SQL injection pattern blocking | DONE | Regex filter on all string fields |
| XSS pattern blocking | DONE | Script/iframe/event handler detection |
| CORS headers (restrict to nexusagents.ca) | DONE | Both routes + middleware |
| Error responses never expose credentials/stack traces | DONE | Generic error messages only |
| No-cache headers on API responses | DONE | `Cache-Control: no-store` on all `/api/*` |
| OPTIONS handler for CORS preflight | DONE | Both routes return 204 |

---

## 3. CSRF Protection [HIGH]

| Item | Status | Details |
|------|--------|---------|
| Origin header validation on POST requests | DONE | Middleware + route-level |
| Referer header fallback validation | DONE | When Origin header absent |
| Reject cross-origin mutating requests | DONE | Returns 403 Forbidden |
| Allow localhost in development mode | DONE | `NODE_ENV === 'development'` check |

---

## 4. Security Headers [MEDIUM]

| Item | Status | Details |
|------|--------|---------|
| `X-Content-Type-Options: nosniff` | DONE | `next.config.js` + middleware |
| `X-Frame-Options: DENY` | DONE | Prevents clickjacking |
| `X-XSS-Protection: 1; mode=block` | DONE | Legacy browser XSS filter |
| `Referrer-Policy: strict-origin-when-cross-origin` | DONE | Limits referrer leakage |
| `Permissions-Policy: camera=(), microphone=(), geolocation=()` | DONE | Disable unnecessary APIs |
| `Content-Security-Policy` | DONE | Restricts script/style/connect sources |
| `Strict-Transport-Security` | DONE | HSTS with preload |

---

## 5. XSS Protection [MEDIUM]

| Item | Status | Details |
|------|--------|---------|
| No `dangerouslySetInnerHTML` usage | VERIFIED | Not used anywhere in the app |
| React default escaping intact | VERIFIED | All user content rendered via JSX expressions |
| CSP header blocks inline scripts | DONE | Except `unsafe-inline` needed for Next.js |
| Input sanitization strips script tags | DONE | XSS regex on funnel-lead inputs |

---

## 6. PII Protection [HIGH]

| Item | Status | Details |
|------|--------|---------|
| Inbox page does NOT cache in localStorage | VERIFIED | No localStorage usage in inbox |
| Funnel progress saves only NON-PII fields | DONE | Stripped name, phone, email, income, job from localStorage save |
| Contact form localStorage fallback flagged | NOTED | `ContactForm.tsx` stores submissions in localStorage -- needs real API endpoint |
| No-cache headers on `/api/messages` | DONE | Prevents browser/proxy caching of PII |
| Twilio credentials server-side only | DONE | In `process.env`, never in client bundle |
| Console.log stripped of PII | DONE | Funnel-lead logs only vehicle/budget/credit, not names/phones |
| Supabase view (`v_funnel_submissions`) | VERIFIED | Used for read-only lead matching |

---

## 7. .gitignore Coverage [LOW]

| Pattern | In Root | In apps/website |
|---------|---------|-----------------|
| `.env` | Yes | Yes |
| `.env.local` | Yes | Yes |
| `.env.*` | Yes | Yes |
| `workflows/` | Yes | N/A |
| `.mcp.json` | Yes | N/A |
| `node_modules/` | Yes | Yes |
| `.next/` | Yes (root) | Yes |

---

## 8. Webhook Security [MEDIUM]

| Webhook | Validation | Status |
|---------|-----------|--------|
| `/webhook/ad-lead` (n8n) | Payload forwarded from validated API route | PROTECTED (funnel-lead validates first) |
| `/webhook/inbound-sms` (n8n) | Twilio signature verification | RECOMMENDED -- implement via `twilio.validateRequest()` in n8n |
| `/webhook/crm-lead-webhook` (n8n) | Payload structure validation | RECOMMENDED -- add Zod validation node in n8n |
| `/webhook/meta-capi` (n8n) | Source verification | RECOMMENDED -- verify Meta signature |

---

## 9. Next.js Middleware [MEDIUM]

| Item | Status | Details |
|------|--------|---------|
| Middleware created at `src/middleware.ts` | DONE | Runs before all route handlers |
| Applies security headers to all routes | DONE | |
| CSRF check on mutating API requests | DONE | Origin/Referer validation |
| No-cache on all API responses | DONE | Prevents PII caching |

---

## 10. Remaining Action Items

### CRITICAL -- Must Do Before Production
1. **Rotate Twilio Auth Token** -- the old token was committed to git history. Generate a new one in the Twilio console and set it in Vercel env vars.
2. **Rotate Supabase Service Key** -- same issue. Generate new key in Supabase dashboard.
3. **Set Vercel Environment Variables** -- all values from `.env.local` must be set in Vercel dashboard under the production environment.
4. **Wire up ContactForm.tsx** -- currently saves to localStorage (data loss risk + PII exposure). Connect to `/api/contact` or Supabase.

### HIGH -- Should Do Soon
5. **Twilio webhook signature verification** -- the n8n `/webhook/inbound-sms` endpoint should verify the `X-Twilio-Signature` header using `twilio.validateRequest()`.
6. **Authentication on /inbox** -- the inbox page is currently accessible without login. Add auth (NextAuth, Clerk, or Supabase Auth).
7. **Run `git filter-branch` or BFG** -- to scrub the hardcoded credentials from git history entirely.

### MEDIUM -- Good Practice
8. **Structured logging** -- replace `console.error` with a structured logger (pino) that redacts PII fields automatically.
9. **Dependency audit** -- run `npm audit` regularly and pin dependency versions.
10. **Penetration testing** -- schedule a pen test before handling live credit applications.

---

## Files Modified

| File | Changes |
|------|---------|
| `apps/website/src/app/api/messages/route.ts` | Removed hardcoded creds, added rate limiting, input validation, CORS, origin check, security headers, no-cache |
| `apps/website/src/app/api/funnel-lead/route.ts` | Added Zod validation, rate limiting, injection blocking, CORS, origin check, security headers, PII-safe logging |
| `apps/website/next.config.js` | Added security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `apps/website/src/middleware.ts` | Created -- CSRF protection, security headers, no-cache for APIs |
| `apps/website/src/app/apply/page.tsx` | Stripped PII from localStorage auto-save |
| `apps/website/.gitignore` | Added `.env`, `.env.local`, `.env.*`, `node_modules/`, `.next/` |
| `apps/website/.env.local` | Created with all credentials (NOT committed to git) |
