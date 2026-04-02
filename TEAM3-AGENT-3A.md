# Agent 3A: Critical Bug Fixer — Change Log

## CRITICAL FIX 1: Fire-and-forget on Vercel
**Files:** `apps/website/src/app/api/funnel-lead/route.ts`

- Changed `handleAutoResponse(lead, body.tenant).catch(...)` from fire-and-forget to `await handleAutoResponse(lead, body.tenant).catch(...)`
- Changed `fetch(N8N_WEBHOOK_URL, ...)` from fire-and-forget to `await fetch(N8N_WEBHOOK_URL, ...)`
- **Why:** Vercel kills the function after sending the HTTP response. Without await, SMS + email never send. The response is now ~5-10s slower but the lead actually gets contacted.

## CRITICAL FIX 2: SMS pipeline timeout (3s sleep + double Claude)
**File:** `apps/website/src/app/api/webhook/sms/process/route.ts`

1. Removed `await new Promise(resolve => setTimeout(resolve, 3000))` — this 3s sleep wasted 30% of the 10s Vercel budget
2. Extracted form extraction (second Claude call) into `runFormExtraction()` helper, called as fire-and-forget after the SMS response is returned. The primary SMS reply is no longer blocked by the extraction Claude call.
3. Claude timeout reduced to 8s in security.ts (see Fix 5)

## CRITICAL FIX 3: DB CHECK constraints
**File:** `supabase/migrations/004_fix_check_constraints.sql` (new file)

- `funnel_submissions.status`: Added 'appointment', 'showed', 'credit_app', 'approved', 'delivered'
- `lead_transcripts.entry_type`: Added 'status', 'form_data', 'completed_form', 'note'
- `lead_transcripts.channel`: Added 'crm'

## CRITICAL FIX 4: In-memory rate limiting setInterval cleanup
**Files:** `apps/website/src/lib/security.ts`, `apps/website/src/app/api/funnel-lead/route.ts`

- Removed `setInterval` cleanup timer in `security.ts` (line 165-172) — fires on every cold start, serves no purpose on serverless
- Removed `setInterval` cleanup timer in `funnel-lead/route.ts` (line 52-60) — same issue
- Added comments documenting that in-memory rate limiting is best-effort on serverless

## CRITICAL FIX 5: Reduce Claude API timeout
**File:** `apps/website/src/lib/security.ts`

- Changed `AbortSignal.timeout(15000)` to `AbortSignal.timeout(8000)` in `callClaude()`
- **Why:** Vercel Hobby has a 10s limit. A 15s timeout guarantees the function gets killed before Claude responds.

## Verification
- `npx tsc --noEmit` — PASS (no type errors)
- `npm run build` — PASS (clean build)
