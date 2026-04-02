# PUSH-95-FIX-2: Sentry Integration + CI Pipeline

**Date:** 2026-04-01
**Commit:** b8908c4
**Status:** COMPLETE

---

## FIX 1: Sentry.captureException in All API Routes

Added `import * as Sentry from '@sentry/nextjs'` and `Sentry.captureException()` to every catch block in:

| File | Catch blocks updated |
|------|---------------------|
| `funnel-lead/route.ts` | 3 (auto-response, n8n webhook, main) |
| `auto-response.ts` | 5 (dedup, insertLead, SMS fail, email send, fatal) |
| `sms/process/route.ts` | 7 (PATCH status, HOT check history, lead name, form extraction bg, main, lead status update, conversation history) |
| `sms/route.ts` | 1 (process trigger) |
| `webhook/email/route.ts` | 1 (main) |
| `cron/check-email/route.ts` | 4 (Claude API, Supabase log, Slack notify, main) |
| `leads/route.ts` | 8 (activity, GET, PATCH parse, PATCH, POST parse, POST, DELETE parse, DELETE) |
| `messages/route.ts` | 2 (GET, POST) |
| `credit-analyze/route.ts` | 1 (main) |

**Pattern used:** `Sentry.captureException(err instanceof Error ? err : new Error(String(err)))` -- ensures non-Error values are wrapped.

**console.error kept** alongside Sentry for Vercel log visibility.

## FIX 2: CI/CD Pipeline

Created `.github/workflows/ci.yml`:
- Triggers on push/PR to main
- Node 22, npm cache
- Steps: install deps -> type check -> vitest run -> next build
- NEXT_PUBLIC_SENTRY_DSN set to empty string for build

Also fixed `.gitignore`: changed `workflows/` to `/workflows/` so `.github/workflows/` is not ignored.

## Verification

- `tsc --noEmit`: clean (0 errors)
- `npm run build`: clean
- `vitest run`: 1185/1185 tests passing (29 files)
