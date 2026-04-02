# TEAM 2 -- Agent 2B: Database & Supabase Audit Report

## Scope
Audited all SQL migrations (001, 002, 002_simple, 003), security.ts (supaGet/supaPost/supaHeaders), auto-response.ts, leads route, SMS process route, and email cron route against 10 check categories.

---

## BUG 1: CHECK constraint on funnel_submissions.status rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 101
SEVERITY: CRITICAL
BUG: The CHECK constraint on funnel_submissions.status only allows ('new', 'contacted', 'qualified', 'converted', 'lost'). But the application writes 'appointment' (sms/process/route.ts:80), 'credit_app' (sms/process/route.ts:258), 'approved', 'delivered' (checked in sms/process/route.ts:115), and 'showed' (leads/route.ts:9 VALID_STATUSES). These PATCH operations will fail with a CHECK constraint violation at the database level.
EVIDENCE:
  SQL: CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'))
  App (sms/process/route.ts:80): body: JSON.stringify({ status: 'appointment' })
  App (sms/process/route.ts:258): body: JSON.stringify({ status: 'credit_app' })
  App (leads/route.ts:9): VALID_STATUSES = ['new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'lost']
FIX: ALTER the CHECK constraint to include all statuses the app uses:
  CHECK (status IN ('new', 'contacted', 'appointment', 'showed', 'credit_app', 'approved', 'delivered', 'qualified', 'converted', 'lost'))
```

## BUG 2: CHECK constraint on lead_transcripts.entry_type rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 26
SEVERITY: CRITICAL
BUG: The CHECK constraint on lead_transcripts.entry_type only allows ('message', 'handoff', 'compliance_check'). But the application inserts entry_type values of 'status' (sms/process/route.ts:75), 'form_data' (sms/process/route.ts:206), 'completed_form' (sms/process/route.ts:237), and 'note' (leads/route.ts:155 via type || 'note'). All of these INSERTs will be rejected by the DB.
EVIDENCE:
  SQL: CHECK (entry_type IN ('message', 'handoff', 'compliance_check'))
  App (sms/process/route.ts:75): entry_type: 'status'
  App (sms/process/route.ts:206): entry_type: 'form_data'
  App (sms/process/route.ts:237): entry_type: 'completed_form'
  App (leads/route.ts:155): entry_type: type || 'note'
FIX: ALTER the CHECK constraint:
  CHECK (entry_type IN ('message', 'handoff', 'compliance_check', 'status', 'form_data', 'completed_form', 'note'))
```

## BUG 3: CHECK constraint on lead_transcripts.channel rejects valid values the app writes

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: 29
SEVERITY: HIGH
BUG: The CHECK constraint on lead_transcripts.channel only allows ('sms', 'email', 'voice', 'chat', 'funnel'). But the application writes channel='crm' in multiple places (leads/route.ts:157, sms/process/route.ts:209, sms/process/route.ts:239). These INSERTs will be rejected.
EVIDENCE:
  SQL: CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel'))
  App (leads/route.ts:157): channel: 'crm'
  App (sms/process/route.ts:209): channel: 'crm'
FIX: Add 'crm' to the channel CHECK constraint:
  CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel', 'crm'))
```

## BUG 4: RLS policies allow full cross-tenant data access when x-tenant-id header is missing

```
FILE: /Users/sayah/nexus/supabase/migrations/003_rls_tenant_isolation.sql
LINE: 52-53 (and all subsequent policies)
SEVERITY: CRITICAL
BUG: Every RLS policy includes "OR get_request_tenant() = ''" which means: if NO x-tenant-id header is provided, the policy evaluates to TRUE and ALL rows are visible/writable. The get_request_tenant() function returns '' on any error or when the header is missing. This means any request without the header bypasses tenant isolation entirely.
EVIDENCE:
  SQL: USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
  get_request_tenant() returns '' when header is missing (line 38-41)
FIX: Remove the "OR get_request_tenant() = ''" fallback. If tenant_id cannot be determined, the policy should DENY access, not GRANT it. Use:
  USING (tenant_id = get_request_tenant() AND get_request_tenant() != '')
```

## BUG 5: Service role key used for ALL Supabase operations -- RLS completely bypassed

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 33-42, 56-71
SEVERITY: HIGH
BUG: supaHeaders() uses SUPABASE_SERVICE_KEY (service role) for every request. The service role key ALWAYS bypasses RLS in Supabase -- this is by design. Therefore all the RLS policies in 003_rls_tenant_isolation.sql are never enforced for any application query. supaAnonHeaders() exists (line 45-54) but is never called anywhere in the codebase. Tenant isolation depends entirely on application-level WHERE clauses being correct in every single query.
EVIDENCE:
  security.ts:11: export const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim()
  security.ts:34: apikey: SUPABASE_KEY,
  supaAnonHeaders() defined but unused
FIX: Use supaAnonHeaders() for read operations where RLS should be enforced. Reserve service role key only for admin operations that truly need to bypass RLS.
```

## BUG 6: supaGet and supaPost silently swallow all errors -- empty catch blocks

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 60-61 (supaGet), 69-70 (supaPost)
SEVERITY: HIGH
BUG: Both supaGet and supaPost have empty catch blocks with only "/* ignore */" comments. supaGet returns [] on ANY failure (network, auth, malformed query, table missing). supaPost silently drops data. Callers cannot distinguish "no results" from "total failure". This violates the project's own CLAUDE.md rule: "NEVER use empty catch blocks. ALL catch blocks MUST log errors."
EVIDENCE:
  supaGet: catch { /* ignore */ } return [];
  supaPost: catch { /* ignore */ }
FIX: Log errors in both catch blocks. supaGet should throw or return a discriminated union { data: [], error: string | null } so callers can distinguish empty results from failures. supaPost should at minimum log the error with console.error.
```

## BUG 7: isDuplicate in auto-response.ts queries encrypted phone column and will never find matches

```
FILE: /Users/sayah/nexus/apps/website/src/lib/auto-response.ts
LINE: 77-78
SEVERITY: CRITICAL
BUG: isDuplicate queries funnel_submissions with phone=eq.X, but the PII encryption trigger (002_pii_encryption.sql:156-158) NULLs out the plaintext phone column on INSERT and moves it to encrypted_phone. So the phone column is always NULL in the database, and this equality check will never match. Every submission is treated as non-duplicate, causing duplicate leads and duplicate SMS/email sends.
EVIDENCE:
  auto-response.ts:78: `funnel_submissions?tenant_id=eq.${tenantId}&phone=eq.${encodeURIComponent(phone)}&select=id&limit=1`
  002_pii_encryption.sql:158: NEW.phone := NULL;
  The query hits the raw table, not the decrypted view v_funnel_submissions.
FIX: Query v_funnel_submissions instead of funnel_submissions for the dedup check, or query using encrypted_phone with the encrypt_pii function.
```

## BUG 8: PATCH on funnel_submissions.phone will never match rows due to encryption

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 78
SEVERITY: CRITICAL
BUG: The PATCH to update lead status filters by phone=eq.X on the raw funnel_submissions table. But the phone column is always NULL (encrypted into encrypted_phone by the trigger). This PATCH will match zero rows and silently do nothing -- the lead status is never updated.
EVIDENCE:
  sms/process/route.ts:78: `${SUPABASE_URL}/rest/v1/funnel_submissions?phone=eq.${encodeURIComponent(fromPhone)}&tenant_id=eq.${tenant.tenant}`
  Same issue at line 256.
  Also in leads/route.ts:90: `funnel_submissions?phone=eq.${encodeSupabaseParam(phone)}&tenant_id=eq.${tenant}`
FIX: Either query v_funnel_submissions to get the ID first then PATCH by ID, or add a hashed_phone column for lookups that persists through encryption.
```

## BUG 9: Email cron route hardcodes tenant_id='readycar' -- no multi-tenant support

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 120
SEVERITY: MEDIUM
BUG: The email cron POST handler hardcodes tenant_id: 'readycar' when logging to lead_transcripts. All email replies are attributed to readycar regardless of which tenant the email belongs to. ReadyRide email replies get logged under the wrong tenant.
EVIDENCE:
  check-email/route.ts:120: body: JSON.stringify({ tenant_id: 'readycar', lead_id: senderEmail || to, ... })
FIX: Determine tenant from the sender/recipient email domain or pass tenant as a parameter.
```

## BUG 10: Email cron route hardcodes "Nicolas" / "ReadyCar" -- breaks for ReadyRide

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 76-77, 86, 105, 111-112
SEVERITY: MEDIUM
BUG: The email cron route hardcodes dealer name "Nicolas", "ReadyCar", and phone "613-363-4494" throughout. ReadyRide emails would be sent as if from ReadyCar's GM, which is incorrect and confusing for customers.
EVIDENCE:
  Line 76: const unsubMsg = '...Nicolas\nGeneral Sales Manager\nReadyCar | 613-363-4494';
  Line 86: systemPrompt = 'You are Nicolas, General Sales Manager at ReadyCar...'
  Line 112: from: '"Nicolas Sayah | ReadyCar" <${GMAIL_USER}>'
FIX: Look up tenant config based on recipient email or pass tenant parameter, then use tenant-specific name/phone/location.
```

## BUG 11: Hardcoded encryption key in 002_pii_encryption_simple.sql

```
FILE: /Users/sayah/nexus/supabase/migrations/002_pii_encryption_simple.sql
LINE: 23
SEVERITY: CRITICAL
BUG: The "simple" PII encryption migration hardcodes the encryption key as a string literal 'nexus-pii-key-2026' directly in the function body. Anyone with read access to the migration file, the pg_proc system catalog, or a SQL dump can decrypt all PII data.
EVIDENCE:
  Line 23: RETURN encode(pgp_sym_encrypt(plaintext, 'nexus-pii-key-2026'), 'base64');
  Line 31: RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), 'nexus-pii-key-2026');
FIX: Use the Vault-based approach from 002_pii_encryption.sql instead. If both migrations have been applied, the simple version's functions may have overwritten the secure versions.
```

## BUG 12: Two conflicting PII encryption migrations -- function overwrite risk

```
FILE: /Users/sayah/nexus/supabase/migrations/002_pii_encryption.sql and 002_pii_encryption_simple.sql
LINE: N/A (file-level)
SEVERITY: HIGH
BUG: Both migrations define encrypt_pii() and decrypt_pii() with CREATE OR REPLACE, but with different signatures (one takes 2 args, one takes 1 arg). If both are applied, the second one overwrites the first. The "simple" version has a hardcoded key; the "proper" version uses Vault. Depending on execution order, you may end up with the insecure version. Additionally, the views in 002_pii_encryption.sql call decrypt_pii(col, get_pii_key()) with 2 args, but if the simple version's 1-arg decrypt_pii() was applied last, these view calls will fail with a signature mismatch.
EVIDENCE:
  002_pii_encryption.sql:42: CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, key TEXT)
  002_pii_encryption_simple.sql:19: CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
FIX: Remove one migration. Keep only the Vault-based version. Ensure function signatures are consistent.
```

## BUG 13: Missing indexes on columns used in WHERE clauses

```
FILE: /Users/sayah/nexus/supabase/migrations/001_nexus_tables.sql
LINE: N/A
SEVERITY: MEDIUM
BUG: Several query patterns in application code filter on columns that have no indexes:
  1. funnel_submissions.phone -- used in PATCH WHERE clauses and dedup checks, no index exists
  2. lead_transcripts.entry_type -- used in WHERE entry_type=eq.status (sms/process/route.ts:96), no index
  3. lead_transcripts.channel -- used in WHERE channel=eq.sms and channel=eq.crm (leads/route.ts:36), no index
  4. funnel_submissions.email -- used in search ilike queries, no index
EVIDENCE:
  Existing indexes: idx_transcript_tenant_lead (tenant_id, lead_id), idx_funnel_tenant (tenant_id)
  Missing: phone, entry_type, channel columns have no indexes
FIX: Add indexes:
  CREATE INDEX idx_funnel_phone ON funnel_submissions(tenant_id, phone);
  CREATE INDEX idx_transcript_entry_type ON lead_transcripts(entry_type);
  CREATE INDEX idx_transcript_channel ON lead_transcripts(channel);
```

## BUG 14: Empty catch blocks in SMS process route swallow critical failures

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/webhook/sms/process/route.ts
LINE: 82, 141, 260, 263, 265
SEVERITY: HIGH
BUG: Multiple empty catch blocks swallow errors silently:
  - Line 82: empty catch on status PATCH -- lead status never updated, no one knows
  - Line 141: empty catch on conversation history fetch -- AI replies without context
  - Line 260: empty catch on credit_app status PATCH -- qualified lead not marked
  - Line 263: empty catch on JSON parse of extraction -- form data lost
  - Line 265: empty catch on entire extraction block -- qualification pipeline silently dead
EVIDENCE:
  Line 82: } catch {}
  Line 260: } catch {}
  Line 263: } catch { /* JSON parse failed, skip */ }
FIX: Add console.error logging to every catch block. For critical operations (status updates), add Slack notifications on failure.
```

## BUG 15: supaGet does not pass tenant_id header -- no defense-in-depth

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 58
SEVERITY: MEDIUM
BUG: supaGet() calls supaHeaders() without passing a tenant parameter. This means the x-tenant-id header is never set on any supaGet request. Even if RLS policies were enforced (they aren't due to service key usage), the tenant header would be missing, causing get_request_tenant() to return '' and the OR fallback to grant access to all rows.
EVIDENCE:
  security.ts:58: const res = await fetch(..., { headers: supaHeaders(), ... });
  supaGet callers like isDuplicate (auto-response.ts:77) don't pass tenant through supaGet.
FIX: Modify supaGet to accept and pass a tenant parameter:
  export async function supaGet(path: string, tenant?: string): Promise<unknown[]>
  Then pass tenant in supaHeaders(tenant).
```

## BUG 16: supaPost does not pass tenant_id header

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 66-67
SEVERITY: MEDIUM
BUG: Same issue as supaGet -- supaPost calls supaHeaders() without a tenant parameter. The x-tenant-id header is never set on POST requests through this helper.
EVIDENCE:
  security.ts:67: method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=minimal' },
FIX: Add tenant parameter to supaPost and pass it through to supaHeaders.
```

## BUG 17: encodeSupabaseParam preserves literal '+' which breaks PostgREST filter syntax

```
FILE: /Users/sayah/nexus/apps/website/src/lib/security.ts
LINE: 188-191
SEVERITY: MEDIUM
BUG: encodeSupabaseParam intentionally un-encodes %2B back to '+'. But in PostgREST URL query strings, an unencoded '+' is interpreted as a space character (URL encoding standard). So a phone number like +16135551234 becomes " 16135551234" (with leading space) in the PostgREST filter, which will never match any row.
EVIDENCE:
  security.ts:189: .replace(/%2B/g, '+')
  Used in leads/route.ts:33: encodeSupabaseParam(phone) for lead_transcripts queries
  Used in leads/route.ts:90: encodeSupabaseParam(phone) for funnel_submissions PATCH
FIX: Keep '+' encoded as %2B in URL query parameters. The phone number in the database already has a literal '+', so PostgREST needs the encoded form to match correctly. Remove the .replace(/%2B/g, '+') line.
```

## BUG 18: Leads route activity query uses channel=eq.crm but 'crm' fails CHECK constraint

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/leads/route.ts
LINE: 36-37
SEVERITY: HIGH
BUG: The activity endpoint queries lead_transcripts with channel=eq.crm, but 'crm' is not in the CHECK constraint for channel. This means no rows with channel='crm' can exist in the database (INSERTs would be rejected), so this query will always return empty results. This is a downstream effect of BUG 3.
EVIDENCE:
  leads/route.ts:36: `lead_transcripts?...&channel=eq.crm&...`
  001_nexus_tables.sql:29: CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel'))
FIX: Add 'crm' to the channel CHECK constraint (same fix as BUG 3).
```

## BUG 19: Email cron fires-and-forgets Supabase log and Slack notify without await

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/cron/check-email/route.ts
LINE: 118-126
SEVERITY: MEDIUM
BUG: The Supabase lead_transcripts insert and Slack webhook are called without await -- just .catch(() => {}). On Vercel serverless, these fire-and-forget fetches will be killed when the function returns the response on line 128. The email reply transcript may never be logged.
EVIDENCE:
  Line 118: fetch(`${SUPABASE_URL}/rest/v1/lead_transcripts`, {...}).catch(() => {});
  Line 123: fetch(SLACK_WEBHOOK, {...}).catch(() => {});
  Line 128: return NextResponse.json({ sent: true, ... });
FIX: Await both fetch calls before returning the response, or use waitUntil() if available on the platform.
```

## BUG 20: Leads DELETE endpoint has no rate limiting

```
FILE: /Users/sayah/nexus/apps/website/src/app/api/leads/route.ts
LINE: 169-192
SEVERITY: MEDIUM
BUG: The DELETE endpoint (which deletes all customer data across 3 tables) has no rate limiting, unlike GET/PATCH/POST which all check rateLimit(). An attacker with a valid API key or same-origin access could mass-delete customer data.
EVIDENCE:
  GET (line 17): if (rateLimit(ip, 60))
  PATCH (line 78): if (rateLimit(ip, 30))
  POST (line 106): if (rateLimit(ip, 20))
  DELETE (line 169): no rate limit check
FIX: Add rate limiting to the DELETE handler, e.g., rateLimit(ip, 5) for a stricter limit.
```

---

## SUMMARY

| Severity | Count | Bug IDs |
|----------|-------|---------|
| CRITICAL | 6     | 1, 2, 4, 7, 8, 11 |
| HIGH     | 6     | 3, 5, 6, 12, 14, 18 |
| MEDIUM   | 8     | 9, 10, 13, 15, 16, 17, 19, 20 |

### Top 3 Showstoppers (fix immediately):
1. **BUG 1 + 2 + 3**: CHECK constraints reject values the app writes -- funnel_submissions.status, lead_transcripts.entry_type, and lead_transcripts.channel. This means status updates, CRM notes, form extraction, and activity logging ALL silently fail at the database level. Combined with empty catch blocks (BUG 6, 14), nobody knows.
2. **BUG 7 + 8**: PII encryption NULLs out the phone column, but queries filter on the plaintext phone column. Dedup never works (duplicate leads created), status PATCHes never match (leads stuck in 'new' forever).
3. **BUG 4**: RLS policies have an OR fallback that grants access to ALL rows when the tenant header is missing. Combined with BUG 5 (service key bypasses RLS entirely), there is zero tenant isolation at the database level.
