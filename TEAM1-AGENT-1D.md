# TEAM1-AGENT-1D: Performance Profiler Report

## Summary

17 performance issues identified across the codebase. 3 CRITICAL, 5 HIGH, 6 MEDIUM, 3 LOW.
Biggest risks: Vercel Hobby 10s timeout violations in SMS processing, unbounded in-memory maps, and double Claude API calls per SMS reply.

---

## CRITICAL Issues

### 1. SMS Process Route Exceeds Vercel Hobby 10s Timeout (Double Claude Call + 3s Sleep)

- **File:** `apps/website/src/app/api/webhook/sms/process/route.ts:132`
- **Severity:** CRITICAL
- **Details:** The SMS process route has `maxDuration = 60` (line 9) but Vercel Hobby plans cap at 10s regardless of this setting. The route does:
  - 3s intentional `setTimeout` delay (line 132)
  - 2x Supabase queries for pause check (~0.5s each)
  - 1x Supabase query for conversation history (~0.5s)
  - 1x Supabase query for lead name (~0.5s)
  - 1x Claude API call for SMS reply (up to 15s timeout, typically 3-5s)
  - 1x Twilio SMS send (~1s)
  - 1x Claude API call for form extraction (up to 15s timeout, typically 3-5s) (line 197)
  - Multiple sequential Supabase writes
- **Total estimated time:** 10-20s on a good day. Will timeout on Hobby.
- **Impact:** SMS replies silently fail. Leads get no response. Lost revenue.
- **Recommended fix:** (1) Remove the 3s sleep or reduce to 1s. (2) Move the form extraction Claude call to a fire-and-forget background call or a separate endpoint. (3) Upgrade to Vercel Pro for 60s routes, or restructure as a two-phase pipeline where the webhook returns immediately and triggers processing via a queue.

### 2. Two Separate Unbounded In-Memory Rate Limit Maps

- **File:** `apps/website/src/lib/security.ts:145` and `apps/website/src/app/api/funnel-lead/route.ts:35`
- **Severity:** CRITICAL
- **Details:** Two separate `Map` objects store rate limit data in module scope. While both have cleanup intervals, they grow proportionally to unique IPs. More importantly, on Vercel serverless, each cold start creates fresh maps (making rate limiting ineffective) while warm instances accumulate entries. The `funnel-lead/route.ts` map (line 35) stores full timestamp arrays per IP, which is more memory-intensive than the simple counter in `security.ts`.
- **Impact:** Rate limiting is unreliable on serverless (different instances = different maps). Duplicate rate limit logic adds maintenance burden.
- **Recommended fix:** Replace both with a single Supabase-based or Vercel KV-based rate limiter. If staying in-memory, at least consolidate into one implementation and add a max map size cap (e.g., evict oldest entries at 10K).

### 3. `setInterval` in Module Scope Fires on Every Cold Start

- **File:** `apps/website/src/lib/security.ts:162` and `apps/website/src/app/api/funnel-lead/route.ts:52`
- **Severity:** CRITICAL
- **Details:** Two `setInterval` calls run at 120s intervals. On Vercel serverless, every cold start creates a new interval. The interval keeps the function warm artificially and is never cleaned up. Since the rate limit maps are per-instance and ineffective anyway, these intervals burn compute for nothing.
- **Impact:** Wasted Vercel function execution time. Potential billing impact if functions stay warm due to timers.
- **Recommended fix:** Remove both `setInterval` calls entirely. If using in-memory rate limiting, do lazy cleanup on access (check expiry when reading, not on a timer). Better yet, use external rate limiting (Vercel KV, Upstash Redis).

---

## HIGH Issues

### 4. Double Claude API Call Per SMS Reply (Reply + Extraction)

- **File:** `apps/website/src/app/api/webhook/sms/process/route.ts:164,197`
- **Severity:** HIGH
- **Details:** Every SMS reply triggers TWO Claude API calls sequentially:
  1. Line 164: `callClaude()` to generate the SMS reply (max_tokens: 200)
  2. Line 197: `callClaude()` for form data extraction (max_tokens: 300)
  Together these cost ~$0.01-0.03 per message and add 4-10s latency.
- **Impact:** Doubles API cost per SMS. Doubles latency. Pushes route past 10s timeout.
- **Recommended fix:** Combine into a single Claude call that returns both the reply and extracted form data in a structured JSON response. Or make the extraction call fire-and-forget after sending the SMS response.

### 5. No Index on `funnel_submissions.phone` or `lead_transcripts.lead_id + channel`

- **File:** `supabase/migrations/001_nexus_tables.sql`
- **Severity:** HIGH
- **Details:** The most frequent query patterns filter by `phone` (dedup checks, status updates, lead lookups) and by `lead_id + channel` (conversation history). Existing indexes:
  - `idx_funnel_tenant` on `(tenant_id)` -- too broad
  - `idx_transcript_tenant_lead` on `(tenant_id, lead_id)` -- missing channel
  - NO index on `funnel_submissions(phone)` or `funnel_submissions(tenant_id, phone)`
  
  Queries hitting missing indexes:
  - `funnel_submissions?tenant_id=eq.X&phone=eq.Y` (dedup check, status update) -- sequential scan
  - `lead_transcripts?tenant_id=eq.X&lead_id=eq.Y&channel=eq.sms` (conversation history) -- partial index hit
  - `v_funnel_submissions` view with `ilike` search on first_name, last_name, phone, email -- all decrypted via function, cannot use indexes at all
- **Impact:** Every SMS triggers 2-3 queries that do sequential scans on funnel_submissions. With PII encryption, the `v_funnel_submissions` view decrypts every row before filtering, making search queries O(n).
- **Recommended fix:** Add `CREATE INDEX idx_funnel_tenant_phone ON funnel_submissions(tenant_id, phone);`. For the encrypted view search problem, consider maintaining a search hash column or moving search to a separate search index.

### 6. PII Encryption Makes All View Queries O(n) -- Full Table Decrypt on Every Request

- **File:** `supabase/migrations/002_pii_encryption.sql:56-66` (view definitions)
- **Severity:** HIGH
- **Details:** The `v_funnel_submissions` view calls `decrypt_pii()` on every row before any filtering. When the CRM loads leads (`/api/leads` GET with search), it decrypts ALL rows then filters client-side via `ilike`. This is O(n) per request where n = total leads.
- **Impact:** CRM page load degrades linearly with lead count. At 1000 leads, every search decrypts 1000 rows. At 10K leads, the query will timeout.
- **Recommended fix:** Add a `phone_hash` column (SHA-256 of normalized phone) for exact lookups. For search, maintain a separate unencrypted `search_index` column with partial/masked data, or use Supabase full-text search on non-PII fields only.

### 7. Claude API `callClaude()` Has 15s Timeout -- Exceeds Vercel Hobby 10s Limit

- **File:** `apps/website/src/lib/security.ts:225`
- **Severity:** HIGH
- **Details:** `callClaude()` uses `AbortSignal.timeout(15000)` but Vercel Hobby kills the function at 10s. The Claude call itself is just one step in a larger pipeline. If Claude takes 8s, the route has already timed out.
- **Impact:** Claude responses that take >6-7s (common for Sonnet under load) cause the entire route to fail silently.
- **Recommended fix:** Reduce Claude timeout to 6000ms for routes on Hobby plan. Use `claude-3-5-haiku` for lower latency on simple tasks like form extraction. Or upgrade to Vercel Pro.

### 8. `check-email` Route Makes Raw Claude API Call Instead of Using `callClaude()` Helper

- **File:** `apps/website/src/app/api/cron/check-email/route.ts:92-101`
- **Severity:** HIGH
- **Details:** This route duplicates the Claude API call logic instead of using the `callClaude()` helper from security.ts. It uses an 8s timeout (line 96) which is better, but the duplication means any future changes (model updates, error handling improvements) must be applied in two places. Also uses `max_tokens: 500` for email replies which is appropriate but inconsistent with the SMS default of 200.
- **Impact:** Maintenance burden. Inconsistent error handling (the helper silently returns empty string; this route has its own try/catch).
- **Recommended fix:** Use `callClaude()` with configurable timeout, or extend `callClaude()` to accept an options object with timeout override.

---

## MEDIUM Issues

### 9. Dynamic `import('nodemailer')` on Every Email Send

- **File:** `apps/website/src/lib/auto-response.ts:242` and `apps/website/src/app/api/cron/check-email/route.ts:75,109`
- **Severity:** MEDIUM
- **Details:** `nodemailer` is dynamically imported on every email send. The first invocation pays a cold-start penalty (~200-500ms) for module loading. Subsequent calls in the same instance are cached by Node, but each cold start pays again. This happens in 3 places.
- **Impact:** Adds 200-500ms to first email send per cold start. Nodemailer + imapflow are in `dependencies` (line 12-13 of package.json) so they're bundled regardless -- the dynamic import doesn't save bundle size.
- **Recommended fix:** Import nodemailer statically at module top. It's already in dependencies and bundled. Create a shared transport singleton with lazy initialization.

### 10. Nodemailer Transport Created Fresh on Every Email Send

- **File:** `apps/website/src/lib/auto-response.ts:243` and `apps/website/src/app/api/cron/check-email/route.ts:75,110`
- **Severity:** MEDIUM
- **Details:** `nodemailer.createTransport()` is called on every email send. Each call establishes a new SMTP connection to Gmail. SMTP connection setup involves DNS lookup + TLS handshake (~500-1000ms).
- **Impact:** ~500-1000ms wasted per email. On auto-response (SMS + email in parallel), this adds to total time.
- **Recommended fix:** Create a module-level transport singleton (lazy-initialized). Reuse across requests within the same serverless instance. Add `pool: true` for connection pooling.

### 11. Sequential Supabase Queries in SMS Process Route (Pause Check)

- **File:** `apps/website/src/app/api/webhook/sms/process/route.ts:95-128`
- **Severity:** MEDIUM
- **Details:** Two sequential Supabase queries check if a lead is paused:
  1. Line 95: Query `lead_transcripts` for status entries
  2. Line 110: Query `v_funnel_submissions` for lead status
  These run sequentially (second only runs if first says not paused), but both could run in parallel since they're independent checks.
- **Impact:** ~0.5-1s wasted. Combined with other sequential operations, this compounds.
- **Recommended fix:** Run both queries with `Promise.all()` and merge results.

### 12. Conversation History + Lead Name Lookup Are Sequential

- **File:** `apps/website/src/app/api/webhook/sms/process/route.ts:137-149`
- **Severity:** MEDIUM
- **Details:** Conversation history fetch (line 137) and lead name lookup (line 146) run sequentially. Both are independent reads that could be parallelized.
- **Impact:** ~0.5s wasted.
- **Recommended fix:** Use `Promise.all([fetchHistory(), fetchLeadName()])`.

### 13. Form Extraction Sends Full Conversation to Claude Every Time

- **File:** `apps/website/src/app/api/webhook/sms/process/route.ts:178-196`
- **Severity:** MEDIUM
- **Details:** The form extraction prompt includes the full conversation history on every message. As conversations grow (10+ messages), this wastes input tokens. The extraction also runs even when data was already extracted in a previous message.
- **Impact:** Increasing API cost per message as conversations grow. Redundant extractions when form data hasn't changed.
- **Recommended fix:** (1) Check if form data was already extracted before running extraction again. (2) Only send the last 2-3 messages for extraction, not the full history. (3) Cache previously extracted fields and only look for new ones.

### 14. `imapflow` in Dependencies But Never Used in Code

- **File:** `apps/website/package.json:12`
- **Severity:** MEDIUM
- **Details:** `imapflow` (IMAP client library) is listed as a dependency but never imported anywhere in the codebase. The check-email cron comments say "IMAP takes too long" and uses a webhook approach instead.
- **Impact:** Adds ~2-3MB to the bundle/node_modules. Increases cold start time.
- **Recommended fix:** Remove `imapflow` from dependencies.

---

## LOW Issues

### 15. `max_tokens: 200` May Be Wasteful for Short SMS Replies

- **File:** `apps/website/src/lib/security.ts:208` (default), used at `auto-response.ts:148` and `sms/process/route.ts:164`
- **Severity:** LOW
- **Details:** SMS replies are 2-3 sentences (~50-80 tokens). Setting `max_tokens: 200` means Claude allocates capacity for 200 tokens but typically outputs 50-80. The overhead is minimal since Anthropic charges for actual output tokens, not max_tokens. However, it may cause slightly slower responses as the model has more "room" to generate.
- **Impact:** Minimal cost impact. Slight latency increase.
- **Recommended fix:** Reduce to `max_tokens: 120` for SMS replies. Keep 200+ for email replies and form extraction.

### 16. Slack Notification After Auto-Response Is Sequential

- **File:** `apps/website/src/lib/auto-response.ts:297`
- **Severity:** LOW
- **Details:** The Slack notification at line 297 runs after `Promise.allSettled([sendSMS, sendWelcomeEmail])` completes. It could be fire-and-forget.
- **Impact:** ~200-500ms added to total auto-response time, though this runs in background already.
- **Recommended fix:** Make it fire-and-forget: `slackNotify(...).catch(() => {})` without awaiting.

### 17. n8n Webhook in funnel-lead Has No Retry Logic

- **File:** `apps/website/src/app/api/funnel-lead/route.ts:267-303`
- **Severity:** LOW
- **Details:** The n8n webhook call is fire-and-forget with a 10s timeout. If n8n is down, the lead data is lost from the CRM sync perspective (though it's saved to Supabase via auto-response).
- **Impact:** Missed CRM syncs when n8n is unavailable. Low severity because Supabase is the primary store.
- **Recommended fix:** Log failures to a Supabase retry queue. Or rely entirely on Supabase as source of truth and have n8n poll.

---

## Priority Action Plan

| Priority | Issue | Est. Effort | Impact |
|----------|-------|-------------|--------|
| P0 | #1 Remove 3s sleep, split form extraction to background | 2h | Prevents SMS timeout failures |
| P0 | #3 Remove setInterval calls | 15min | Stops wasted compute |
| P0 | #7 Reduce Claude timeout to 6s | 5min | Prevents timeout cascades |
| P1 | #2 Replace in-memory rate limiting with Vercel KV | 2h | Reliable rate limiting |
| P1 | #4 Combine double Claude calls into one | 1h | 50% API cost reduction on SMS |
| P1 | #5 Add phone index to funnel_submissions | 10min | Faster dedup and lookups |
| P1 | #6 Add phone_hash column for encrypted lookups | 2h | CRM search stays fast at scale |
| P2 | #11-12 Parallelize sequential Supabase queries | 30min | Save ~1s per SMS |
| P2 | #9-10 Static import + singleton transport for nodemailer | 30min | Save ~500ms per email |
| P2 | #14 Remove unused imapflow dependency | 5min | Smaller bundle |
| P3 | #8 Consolidate Claude API call duplication | 30min | Maintainability |
| P3 | #13 Skip redundant form extractions | 1h | Lower API costs |

**Total estimated effort:** ~10 hours for all fixes.
**Highest ROI:** Issues #1, #3, #7 (30min total, prevents all timeout failures).
