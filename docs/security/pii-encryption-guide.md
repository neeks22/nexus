# PII Encryption Guide — Nexus Dealership AI

## What's Encrypted and Why

Canadian privacy law (CASL and PIPEDA) requires that personally identifiable information (PII) be protected with appropriate safeguards. Storing names, phone numbers, and email addresses in plaintext in a database — even one with RLS — does not meet the standard.

Migration `002_pii_encryption.sql` adds **column-level PGP symmetric encryption** to all PII fields using PostgreSQL's `pgcrypto` extension.

### Encrypted Fields

| Table | Encrypted Column | Original Column | Contains |
|---|---|---|---|
| `funnel_submissions` | `encrypted_first_name` | `first_name` | Customer first name |
| `funnel_submissions` | `encrypted_last_name` | `last_name` | Customer last name |
| `funnel_submissions` | `encrypted_phone` | `phone` | Phone number |
| `funnel_submissions` | `encrypted_email` | `email` | Email address |
| `lead_transcripts` | `encrypted_content` | `content` | Conversation content (may contain PII) |
| `lead_transcripts` | `encrypted_metadata` | `metadata` | JSONB metadata (may contain PII) |
| `consent_records` | `encrypted_lead_id` | `lead_id` | Lead identifier |

After migration, the original plaintext columns are NULLed out. New inserts into `funnel_submissions` are automatically encrypted via a BEFORE INSERT trigger.

## How to Set the Encryption Key in Supabase Vault

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run:

```sql
SELECT vault.create_secret('NEXUS_PII_ENCRYPTION_KEY', 'your-strong-256-bit-key-here');
```

Generate a strong key (run locally):

```bash
openssl rand -base64 32
```

**Important:** Do this BEFORE running the migration. The migration's backfill step and the INSERT trigger both call `get_pii_key()`, which reads from Vault and will raise an error if the key is missing.

To rotate the key later, you must:
1. Decrypt all data with the old key
2. Update the Vault secret
3. Re-encrypt all data with the new key

## How to Query Encrypted Data

### Using the Decryption Views (Recommended)

The migration creates views that auto-decrypt using the Vault key:

```sql
-- Decrypted funnel submissions
SELECT * FROM v_funnel_submissions WHERE tenant_id = 'dealer-123';

-- Decrypted lead transcripts
SELECT * FROM v_lead_transcripts WHERE lead_id = 'lead-456';
```

These views call `get_pii_key()` internally, so no key needs to be passed in the query.

### Using the Helper Functions Directly

```sql
-- Encrypt a value
SELECT encrypt_pii('John', get_pii_key());

-- Decrypt a value
SELECT decrypt_pii(encrypted_first_name, get_pii_key())
FROM funnel_submissions
WHERE id = 'some-uuid';
```

### From n8n / Backend Code

Use the views (`v_funnel_submissions`, `v_lead_transcripts`) instead of the base tables. The service role bypasses RLS and the views handle decryption transparently.

```
// n8n Supabase node: query v_funnel_submissions instead of funnel_submissions
```

### Raw Table Access (No Decryption)

Querying the base tables directly will return:
- `first_name`, `last_name`, `phone`, `email` = NULL
- `encrypted_first_name`, etc. = base64-encoded PGP ciphertext

This is by design. PII is not readable without the Vault key.

## CASL/PIPEDA Compliance Notes

### CASL (Canada's Anti-Spam Legislation)
- **Express consent** is recorded in `consent_records` with timestamps and source
- The `lead_id` linking consent to a person is now encrypted
- Consent expiry is tracked; revocation is supported via `revoked_at`
- All commercial electronic messages require prior consent — the `casl_consent` boolean on `funnel_submissions` enforces this at the application layer

### PIPEDA (Personal Information Protection and Electronic Documents Act)
- **Principle 7 (Safeguards):** PII is encrypted at rest using PGP symmetric encryption (AES-256 under the hood via pgcrypto)
- **Principle 4 (Limiting Collection):** Only necessary PII fields are collected
- **Principle 5 (Limiting Use):** Encrypted data can only be read through authorized views with the Vault key
- **Principle 9 (Individual Access):** Use `v_funnel_submissions` to fulfill Subject Access Requests
- **Principle 10 (Challenging Compliance):** This guide serves as documentation of the safeguards in place

### What This Does NOT Cover
- **Encryption in transit:** Handled by Supabase (TLS/SSL by default)
- **Application-layer access control:** Handled by RLS policies (migration 001) and Supabase auth
- **Data retention/deletion:** Requires a separate policy and automated purge process
- **Breach notification:** Requires an incident response plan (separate document)

### Audit Trail
The encryption migration itself is version-controlled. Combined with the existing `agent_toggles` audit log and `trace_logs`, there is a full audit trail of system access and changes.
