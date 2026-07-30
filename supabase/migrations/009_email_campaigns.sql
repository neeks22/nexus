-- 009_email_campaigns.sql
-- Email reactivation campaign tracker — contacts roster + per-send log
-- Supports the manual Gmail send workflow: render → copy → send → mark sent

-- ============================================
-- 1. CAMPAIGN CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS email_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  zip TEXT,
  lead_source TEXT,
  lead_created_at TIMESTAMPTZ,
  -- CASL: implied consent from an inquiry expires 6 months after the inquiry.
  -- Set at import time from lead_created_at; drives the consent filter in the UI.
  consent_basis TEXT NOT NULL DEFAULT 'implied_expired'
    CHECK (consent_basis IN ('implied_active', 'implied_expired', 'express')),
  sequence_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_sequence', 'replied', 'unsubscribed', 'bounced', 'closed', 'sold')),
  last_template TEXT,
  last_sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per email per tenant — re-importing the CSV must not duplicate the roster
CREATE UNIQUE INDEX idx_campaign_contacts_email ON email_campaign_contacts(tenant_id, lower(email));
CREATE INDEX idx_campaign_contacts_tenant ON email_campaign_contacts(tenant_id);
CREATE INDEX idx_campaign_contacts_status ON email_campaign_contacts(tenant_id, status);
-- Drives the "today's wave" query: who is due for their next touch
CREATE INDEX idx_campaign_contacts_due ON email_campaign_contacts(tenant_id, status, sequence_step, last_sent_at);

ALTER TABLE email_campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_contacts_tenant_select ON email_campaign_contacts FOR SELECT
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_contacts_tenant_insert ON email_campaign_contacts FOR INSERT
  WITH CHECK (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_contacts_tenant_update ON email_campaign_contacts FOR UPDATE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_contacts_tenant_delete ON email_campaign_contacts FOR DELETE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_contacts_service_all ON email_campaign_contacts FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER email_campaign_contacts_updated_at
  BEFORE UPDATE ON email_campaign_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. SEND LOG — one row per email actually sent
-- ============================================

CREATE TABLE IF NOT EXISTS email_campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES email_campaign_contacts(id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (template IN ('A', 'B', 'C', 'D', 'E')),
  subject TEXT,
  outcome TEXT NOT NULL DEFAULT 'sent'
    CHECK (outcome IN ('sent', 'replied', 'bounced', 'unsubscribed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_tenant ON email_campaign_sends(tenant_id);
CREATE INDEX idx_campaign_sends_contact ON email_campaign_sends(contact_id);
-- Drives the daily-cap check: how many went out today
CREATE INDEX idx_campaign_sends_sent_at ON email_campaign_sends(tenant_id, sent_at);

ALTER TABLE email_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_sends_tenant_select ON email_campaign_sends FOR SELECT
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_sends_tenant_insert ON email_campaign_sends FOR INSERT
  WITH CHECK (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_sends_tenant_update ON email_campaign_sends FOR UPDATE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_sends_tenant_delete ON email_campaign_sends FOR DELETE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY campaign_sends_service_all ON email_campaign_sends FOR ALL
  USING (true) WITH CHECK (true);
