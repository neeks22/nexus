-- ============================================
-- NEXUS DEALERSHIP AI — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com → SQL)
-- ============================================

-- 1. CONSENT RECORDS (CASL compliance)
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('express', 'implied')),
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_expiry TIMESTAMPTZ,
  consent_source TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_consent_tenant_lead ON consent_records(tenant_id, lead_id);

-- 2. LEAD TRANSCRIPTS (conversation history)
CREATE TABLE IF NOT EXISTS lead_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('message', 'handoff', 'compliance_check')),
  role TEXT CHECK (role IN ('ai', 'customer', 'system')),
  content TEXT,
  channel TEXT CHECK (channel IN ('sms', 'email', 'voice', 'chat', 'funnel')),
  touch_number INTEGER,
  intent TEXT,
  confidence REAL,
  compliance_pass BOOLEAN,
  compliance_failures TEXT[],
  handoff_rep_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transcript_tenant_lead ON lead_transcripts(tenant_id, lead_id);
CREATE INDEX idx_transcript_created ON lead_transcripts(created_at);

-- 3. API COSTS (per-tenant billing)
CREATE TABLE IF NOT EXISTS api_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  operation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_costs_tenant ON api_costs(tenant_id);
CREATE INDEX idx_costs_created ON api_costs(created_at);

-- 4. TWILIO COSTS (SMS/email tracking)
CREATE TABLE IF NOT EXISTS twilio_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'voice')),
  cost_usd REAL NOT NULL DEFAULT 0,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_twilio_tenant ON twilio_costs(tenant_id);

-- 5. CRM FAILOVER QUEUE (when Activix/GHL is down)
CREATE TABLE IF NOT EXISTS failover_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create_lead', 'update_lead', 'add_note', 'add_communication')),
  lead_data JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_queue_status ON failover_queue(status);
CREATE INDEX idx_queue_tenant ON failover_queue(tenant_id);

-- 6. FUNNEL SUBMISSIONS (7-step wizard data)
CREATE TABLE IF NOT EXISTS funnel_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  vehicle_type TEXT,
  budget_range TEXT,
  employment TEXT,
  credit_situation TEXT,
  has_trade_in BOOLEAN,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  casl_consent BOOLEAN NOT NULL DEFAULT FALSE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  pre_approval_score REAL,
  crm_lead_id TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_funnel_tenant ON funnel_submissions(tenant_id);
CREATE INDEX idx_funnel_status ON funnel_submissions(status);
CREATE INDEX idx_funnel_created ON funnel_submissions(created_at);

-- 7. AGENT TOGGLE LOG (audit trail for agent changes)
CREATE TABLE IF NOT EXISTS agent_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  toggled_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_toggles_tenant_agent ON agent_toggles(tenant_id, agent_id);

-- 8. TRACE LOG (observability)
CREATE TABLE IF NOT EXISTS trace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  agent_type TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_traces_tenant ON trace_logs(tenant_id);
CREATE INDEX idx_traces_created ON trace_logs(created_at);
CREATE INDEX idx_traces_status ON trace_logs(status);

-- 9. TENANT CONFIG (Layer 2 + Layer 3 in DB)
CREATE TABLE IF NOT EXISTS tenant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT UNIQUE NOT NULL,
  layer2_config JSONB NOT NULL DEFAULT '{}',
  layer3_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. RLS POLICIES (security)
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE failover_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_configs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so backend can access everything
-- For client dashboard access, add tenant-scoped policies later

-- 11. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tenant_configs_updated_at
  BEFORE UPDATE ON tenant_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
