-- Fix CHECK constraints to match all values the application writes

-- funnel_submissions: add missing status values
ALTER TABLE funnel_submissions DROP CONSTRAINT IF EXISTS funnel_submissions_status_check;
ALTER TABLE funnel_submissions ADD CONSTRAINT funnel_submissions_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'appointment', 'showed', 'credit_app', 'approved', 'delivered'));

-- lead_transcripts: add missing entry_type values
ALTER TABLE lead_transcripts DROP CONSTRAINT IF EXISTS lead_transcripts_entry_type_check;
ALTER TABLE lead_transcripts ADD CONSTRAINT lead_transcripts_entry_type_check
  CHECK (entry_type IN ('message', 'handoff', 'compliance_check', 'status', 'form_data', 'completed_form', 'note'));

-- lead_transcripts: add missing channel values
ALTER TABLE lead_transcripts DROP CONSTRAINT IF EXISTS lead_transcripts_channel_check;
ALTER TABLE lead_transcripts ADD CONSTRAINT lead_transcripts_channel_check
  CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel', 'crm'));

-- Add composite index for phone dedup queries used in auto-response
CREATE INDEX IF NOT EXISTS idx_funnel_phone_tenant ON funnel_submissions(tenant_id, phone);
