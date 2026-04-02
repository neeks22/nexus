# SCORE-FIX-3: Sentry Error Tracking

**Date:** 2026-04-01
**Target dimension:** #10 Production Ready (was 6.0/10)
**Issue addressed:** "No Sentry or equivalent error tracking service" + "Production errors only visible in Vercel logs (15min retention on Hobby)"

## Changes Made

### New files
- `apps/website/sentry.client.config.ts` -- Client-side Sentry init (DSN via `NEXT_PUBLIC_SENTRY_DSN`, 10% traces, 10% error replays)
- `apps/website/sentry.server.config.ts` -- Server-side Sentry init (DSN via `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN`, 10% traces)
- `apps/website/sentry.edge.config.ts` -- Edge runtime Sentry init (same config as server)
- `apps/website/src/instrumentation.ts` -- Next.js instrumentation hook, loads server/edge configs at runtime
- `apps/website/src/app/global-error.tsx` -- Root error boundary, reports unhandled errors to Sentry

### Modified files
- `apps/website/next.config.js` -- Wrapped with `withSentryConfig()` for source map upload and webpack integration
- `apps/website/package.json` -- Added `@sentry/nextjs` dependency
- `apps/website/.gitignore` -- Added `.sentryclirc`

## Design Decisions
- **Opt-in via env var:** Sentry is disabled when `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` are not set (`enabled: !!dsn`). Zero impact on existing deployments.
- **Low sample rates:** 10% traces, 0% session replays, 10% error replays. Keeps costs minimal on free/hobby Sentry tier.
- **Source maps hidden:** `hideSourceMaps: true` prevents exposing source in browser devtools.
- **Silent builds:** `silent: true` suppresses Sentry CLI output during builds when auth token is absent.

## Activation
Set these env vars in Vercel (or `.env.local` for dev):
```
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123.ingest.sentry.io/456
SENTRY_ORG=nexus-auto
SENTRY_PROJECT=website
SENTRY_AUTH_TOKEN=sntrys_... (for source map uploads only)
```

## Build Status
- TypeScript: No new type errors (pre-existing errors in auth/route.ts and other files remain)
- Webpack compilation: Successful (Sentry plugin loaded correctly)
- Build fails on pre-existing type error in `auth/route.ts:31` (not related to this change)

## Expected Score Impact
- Production Ready: 6.0 -> 6.5-7.0 (error tracking closes the biggest monitoring gap)
- Error Handling: 7.5 -> 7.5 (no change -- Sentry captures but doesn't fix empty catches)
