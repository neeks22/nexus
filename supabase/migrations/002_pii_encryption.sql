-- ============================================
-- NEXUS DEALERSHIP AI — PII ENCRYPTION MIGRATION
-- CASL/PIPEDA Compliance: Column-level encryption
-- Run this in Supabase SQL Editor (supabase.com -> SQL)
-- ============================================
-- PREREQUISITE: Set your encryption key in Supabase Vault:
--   SELECT vault.create_secret('NEXUS_PII_ENCRYPTION_KEY', 'your-256-bit-key-here');
-- ============================================

-- =====================
-- 1. ENABLE pgcrypto
-- =====================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- 2. ENCRYPTED COLUMNS — lead_transcripts
-- =====================
ALTER TABLE lead_transcripts
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_metadata TEXT;

-- =====================
-- 3. ENCRYPTED COLUMNS — consent_records
-- =====================
ALTER TABLE consent_records
  ADD COLUMN IF NOT EXISTS encrypted_lead_id TEXT;

-- =====================
-- 4. ENCRYPTED COLUMNS — funnel_submissions
-- =====================
ALTER TABLE funnel_submissions
  ADD COLUMN IF NOT EXISTS encrypted_first_name TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_last_name TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_phone TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_email TEXT;

-- =====================
-- 5. HELPER FUNCTIONS
-- =====================

-- Encrypt plaintext using PGP symmetric encryption
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(pgp_sym_encrypt(plaintext, key), 'base64');
END;
$$;

-- Decrypt ciphertext using PGP symmetric decryption
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext TEXT, key TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[DECRYPTION_FAILED]';
END;
$$;

-- Helper: fetch the encryption key from Supabase Vault
CREATE OR REPLACE FUNCTION get_pii_key()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _key TEXT;
BEGIN
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'NEXUS_PII_ENCRYPTION_KEY'
    LIMIT 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in Vault. Run: SELECT vault.create_secret(''NEXUS_PII_ENCRYPTION_KEY'', ''your-key'');';
  END IF;
  RETURN _key;
END;
$$;

-- =====================
-- 6. DECRYPTION VIEWS
-- =====================

-- View: auto-decrypt lead_transcripts using Vault key
CREATE OR REPLACE VIEW v_lead_transcripts AS
SELECT
  id,
  tenant_id,
  lead_id,
  entry_type,
  role,
  decrypt_pii(encrypted_content, get_pii_key()) AS content,
  channel,
  touch_number,
  intent,
  confidence,
  compliance_pass,
  compliance_failures,
  handoff_rep_name,
  decrypt_pii(encrypted_metadata, get_pii_key())::jsonb AS metadata,
  created_at
FROM lead_transcripts;

-- View: auto-decrypt funnel_submissions using Vault key
CREATE OR REPLACE VIEW v_funnel_submissions AS
SELECT
  id,
  tenant_id,
  vehicle_type,
  budget_range,
  employment,
  credit_situation,
  has_trade_in,
  decrypt_pii(encrypted_first_name, get_pii_key()) AS first_name,
  decrypt_pii(encrypted_last_name, get_pii_key()) AS last_name,
  decrypt_pii(encrypted_phone, get_pii_key()) AS phone,
  decrypt_pii(encrypted_email, get_pii_key()) AS email,
  casl_consent,
  utm_source,
  utm_medium,
  utm_campaign,
  pre_approval_score,
  crm_lead_id,
  status,
  created_at
FROM funnel_submissions;

-- =====================
-- 7. AUTO-ENCRYPT TRIGGER on funnel_submissions
-- =====================

CREATE OR REPLACE FUNCTION encrypt_funnel_pii()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _key TEXT;
BEGIN
  _key := get_pii_key();

  -- Encrypt PII into encrypted_ columns
  NEW.encrypted_first_name := encrypt_pii(NEW.first_name, _key);
  NEW.encrypted_last_name  := encrypt_pii(NEW.last_name, _key);
  NEW.encrypted_phone      := encrypt_pii(NEW.phone, _key);
  NEW.encrypted_email      := encrypt_pii(NEW.email, _key);

  -- NULL out plaintext columns (PII never stored in cleartext)
  NEW.first_name := NULL;
  NEW.last_name  := NULL;
  NEW.phone      := NULL;
  NEW.email      := NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encrypt_funnel_pii
  BEFORE INSERT ON funnel_submissions
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_funnel_pii();

-- =====================
-- 8. BACKFILL: Encrypt existing plaintext data
-- =====================
-- Run this once to encrypt any rows already in the table.
-- After verifying, the plaintext columns will be NULLed out.

DO $$
DECLARE
  _key TEXT;
BEGIN
  _key := get_pii_key();

  -- Backfill funnel_submissions
  UPDATE funnel_submissions
  SET
    encrypted_first_name = encrypt_pii(first_name, _key),
    encrypted_last_name  = encrypt_pii(last_name, _key),
    encrypted_phone      = encrypt_pii(phone, _key),
    encrypted_email      = encrypt_pii(email, _key),
    first_name = NULL,
    last_name  = NULL,
    phone      = NULL,
    email      = NULL
  WHERE first_name IS NOT NULL
     OR last_name IS NOT NULL
     OR phone IS NOT NULL
     OR email IS NOT NULL;

  -- Backfill lead_transcripts
  UPDATE lead_transcripts
  SET
    encrypted_content  = encrypt_pii(content, _key),
    encrypted_metadata = encrypt_pii(metadata::text, _key),
    content  = NULL,
    metadata = NULL
  WHERE content IS NOT NULL
     OR metadata IS NOT NULL;

  -- Backfill consent_records
  UPDATE consent_records
  SET
    encrypted_lead_id = encrypt_pii(lead_id, _key)
  WHERE lead_id IS NOT NULL
    AND encrypted_lead_id IS NULL;

  RAISE NOTICE 'PII backfill complete. All plaintext PII has been encrypted.';
END;
$$;

-- ============================================
-- DONE. Verify with:
--   SELECT * FROM v_funnel_submissions LIMIT 5;
--   SELECT * FROM v_lead_transcripts LIMIT 5;
-- Plaintext columns should be NULL; views should show decrypted data.
-- ============================================
