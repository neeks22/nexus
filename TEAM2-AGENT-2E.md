# TEAM 2 -- Agent 2E: DevOps & Deployment Audit

**Scope:** Deployment config, infrastructure security, CI/CD readiness, dependency health
**Project:** /Users/sayah/nexus (Next.js 14 on Vercel)
**Date:** 2026-04-01
**Mode:** READ ONLY -- zero code changes made

---

## Summary

The deployment configuration is **partially complete**. Security headers in `next.config.js` are well-done (CSP, HSTS, X-Frame-Options all present). However, `vercel.json` is barebones with no security headers, no function config, and no redirects. There are 2 npm vulnerabilities (1 high in `next`, 1 moderate in `@anthropic-ai/sdk`), real credentials leaked in `.env.example`, no health check endpoint, no error monitoring (Sentry), a hardcoded webhook URL, a `maxDuration` export that does nothing on Hobby plan, and a missing env var in `.env.example` that the code depends on.

**Total issues found: 12**
- CRITICAL: 3
- HIGH: 4
- MEDIUM: 4
- LOW: 1

---

## Issues

---

### Issue 1: Real Credentials Committed in .env.example

```
FILE: .env.example
LINE: 2-3, 9
SEVERITY: CRITICAL
BUG: .env.example contains real Supabase URL, a real publishable key, and a real Twilio phone number instead of placeholders.
EVIDENCE: Line 2: SUPABASE_URL=https://arnczuspgedxsxiyueup.supabase.co (real project URL). Line 3: SUPABASE_PUBLISHABLE_KEY=sb_publishable_IYFH4dxMdVpHESvrq4DRmA_ym2I7yDM (real key). Line 9: TWILIO_FROM_NUMBER=+13433125045 (real number).
FIX: Replace all real values with descriptive placeholders (e.g., SUPABASE_URL=https://your-project.supabase.co). Rotate the exposed publishable key. Since this is in git history, the key must be considered compromised even after replacement.
```

---

### Issue 2: maxDuration=60 Export Silently Ignored on Vercel Hobby Plan

```
FILE: apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 9
SEVERITY: CRITICAL
BUG: export const maxDuration = 60 only works on Vercel Pro/Enterprise. On Hobby plan, the hard cap is 10 seconds. This route includes a 3-second artificial delay, Claude API calls (2-8s), and multiple Supabase queries -- easily exceeding 10s.
EVIDENCE: `export const maxDuration = 60;` -- Vercel Hobby ignores this and enforces 10s max.
FIX: Either upgrade to Vercel Pro plan, or eliminate the 3s artificial delay and optimize the route to complete within 10s. Consider moving heavy processing to a queue (Vercel Cron, Inngest, or external worker).
```

---

### Issue 3: npm Vulnerability -- Next.js (HIGH Severity)

```
FILE: apps/website/package.json
LINE: 17
SEVERITY: CRITICAL
BUG: next@^14.0.0 has 4 known vulnerabilities (1 high): DoS via Image Optimizer, HTTP request deserialization DoS, HTTP request smuggling in rewrites, unbounded disk cache growth.
EVIDENCE: npm audit output: "next 9.5.0 - 15.5.13 Severity: high" with 4 advisories (GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf, GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8).
FIX: Upgrade to next@15.5.14+ or latest stable. Test thoroughly after upgrade as this is a major version bump.
```

---

### Issue 4: No Health Check Endpoint

```
FILE: INFRA
LINE: N/A
SEVERITY: HIGH
BUG: No /api/health endpoint exists. This means no uptime monitoring, no Vercel/external health checks, and no way to verify the deployment is functional after a release.
EVIDENCE: Glob for apps/website/src/app/api/health/** returned no files.
FIX: Create /api/health/route.ts that returns 200 with a JSON body including version, timestamp, and connectivity checks (Supabase ping). Wire up external monitoring (UptimeRobot, Better Uptime, etc.).
```

---

### Issue 5: No Error Monitoring (Sentry or Equivalent)

```
FILE: INFRA
LINE: N/A
SEVERITY: HIGH
BUG: No error monitoring service is integrated. No Sentry, no LogRocket, no Datadog. Combined with the empty catch blocks identified by Team 1, errors in production are completely invisible.
EVIDENCE: Grep for "sentry" or "@sentry" across apps/website returned no matches. No Sentry DSN in .env.example. No error reporting package in package.json.
FIX: Install @sentry/nextjs, configure with DSN, wrap API routes. This is essential for a production application handling real customer data and payments.
```

---

### Issue 6: Hardcoded n8n Webhook URL with Inadequate Fallback

```
FILE: apps/website/src/app/api/funnel-lead/route.ts
LINE: 21
SEVERITY: HIGH
BUG: The n8n webhook URL is hardcoded as a fallback: process.env.N8N_FUNNEL_WEBHOOK_URL ?? 'https://nexusagents.app.n8n.cloud/webhook/ad-lead'. The env var N8N_FUNNEL_WEBHOOK_URL is not documented in .env.example, so it will always use the hardcoded fallback.
EVIDENCE: grep confirms the hardcoded URL. grep for N8N_FUNNEL_WEBHOOK_URL in .env.example returned no matches. Only N8N_BASE_URL is documented.
FIX: Add N8N_FUNNEL_WEBHOOK_URL to .env.example. Remove the hardcoded fallback URL -- fail explicitly if the env var is missing rather than silently using a potentially wrong URL.
```

---

### Issue 7: Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.example

```
FILE: .env.example
LINE: N/A (missing)
SEVERITY: HIGH
BUG: The code at security.ts:12 reads process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, but this variable is not listed in .env.example. Developers setting up the project will not know to configure it.
EVIDENCE: security.ts:12 exports SUPABASE_ANON_KEY from NEXT_PUBLIC_SUPABASE_ANON_KEY. The .env.example only has SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY -- neither matches NEXT_PUBLIC_SUPABASE_ANON_KEY.
FIX: Add NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here to .env.example. Verify that SUPABASE_PUBLISHABLE_KEY is not an unused duplicate.
```

---

### Issue 8: vercel.json is Barebones -- No Function Config, No Redirects

```
FILE: vercel.json
LINE: 1-5
SEVERITY: MEDIUM
BUG: vercel.json only specifies buildCommand, outputDirectory, and installCommand. Missing: function memory/timeout config, redirects (www -> apex or vice versa), rewrites, region selection. Security headers are in next.config.js (good) but Vercel-level headers can provide defense-in-depth.
EVIDENCE: Full vercel.json content is 5 lines with only build configuration.
FIX: Add function configuration (memory limits), region selection (closest to target users), and www/non-www redirect. Consider adding Vercel-level security headers as a secondary layer.
```

---

### Issue 9: npm Vulnerability -- @anthropic-ai/sdk (MODERATE)

```
FILE: package.json (root)
LINE: N/A
SEVERITY: MEDIUM
BUG: @anthropic-ai/sdk has a moderate vulnerability -- Memory Tool Path Validation allows sandbox escape to sibling directories (GHSA-5474-4w2j-mq4c).
EVIDENCE: npm audit output: "Severity: moderate, fix available via npm audit fix --force, Will install @anthropic-ai/sdk@0.82.0 (breaking change)"
FIX: Upgrade @anthropic-ai/sdk to 0.82.0+. Review changelog for breaking changes before upgrading.
```

---

### Issue 10: CSP Allows unsafe-inline and unsafe-eval

```
FILE: apps/website/next.config.js
LINE: 25
SEVERITY: MEDIUM
BUG: The Content-Security-Policy script-src includes 'unsafe-inline' and 'unsafe-eval', which significantly weakens XSS protection. While Next.js may need unsafe-inline for its runtime, unsafe-eval should not be required in production.
EVIDENCE: script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com ...
FIX: Remove 'unsafe-eval' and test. If Next.js requires it in dev only, use an environment-conditional config. For production, use nonce-based CSP instead of unsafe-inline where possible.
```

---

### Issue 11: No lint Script in Website package.json

```
FILE: apps/website/package.json
LINE: 6-9
SEVERITY: MEDIUM
BUG: The scripts section only has dev, build, and start. No lint, no test, no type-check script. This means CI/CD cannot run automated quality checks on the website specifically.
EVIDENCE: scripts: { "dev": "next dev --port 3000", "build": "next build", "start": "next start" } -- no lint or test scripts.
FIX: Add "lint": "next lint", "typecheck": "tsc --noEmit", and "test": "vitest" scripts. Wire these into a CI pipeline (Vercel build step or GitHub Actions).
```

---

### Issue 12: TypeScript Compiles Clean (Positive Finding)

```
FILE: apps/website/tsconfig.json
LINE: N/A
SEVERITY: LOW
BUG: Not a bug -- positive finding. TypeScript strict mode is enabled and tsc --noEmit passes with zero errors. The tsconfig uses bundler module resolution (correct for Next.js 14) and has path aliases configured.
EVIDENCE: npx tsc --noEmit completed with no output (zero errors).
FIX: No action needed. Maintain this standard.
```

---

## Deployment Readiness Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Security headers (CSP, HSTS, X-Frame) | PASS | Well configured in next.config.js |
| .env.local in .gitignore | PASS | Both root and website .gitignore exclude .env.* |
| Secrets in git history | PASS | No .env files ever committed |
| Secrets in .env.example | FAIL | Real Supabase URL, key, and phone number |
| TypeScript strict + clean build | PASS | Zero type errors |
| npm audit clean | FAIL | 2 vulnerabilities (1 high, 1 moderate) |
| Health check endpoint | FAIL | None exists |
| Error monitoring | FAIL | No Sentry or equivalent |
| Env vars documented | FAIL | NEXT_PUBLIC_SUPABASE_ANON_KEY and N8N_FUNNEL_WEBHOOK_URL missing |
| maxDuration compatible with plan | FAIL | 60s export on Hobby plan (10s cap) |
| Hardcoded URLs | FAIL | n8n webhook hardcoded as fallback |
| CI/CD quality gates | FAIL | No lint or test scripts in website package.json |

---

## Priority Actions (Ordered)

1. **IMMEDIATE:** Rotate the Supabase publishable key exposed in .env.example. Replace all real values with placeholders.
2. **IMMEDIATE:** Upgrade Next.js to patch the 4 security vulnerabilities.
3. **BEFORE LAUNCH:** Add Sentry or equivalent error monitoring.
4. **BEFORE LAUNCH:** Create /api/health endpoint.
5. **BEFORE LAUNCH:** Resolve the maxDuration/Hobby plan conflict (upgrade plan or optimize route).
6. **SHORT-TERM:** Add missing env vars to .env.example, remove hardcoded webhook URL.
7. **SHORT-TERM:** Add lint and typecheck scripts, set up CI quality gates.
8. **SHORT-TERM:** Upgrade @anthropic-ai/sdk to fix moderate vulnerability.
9. **MEDIUM-TERM:** Tighten CSP by removing unsafe-eval.
