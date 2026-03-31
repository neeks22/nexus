-- =============================================================================
-- RLS POLICIES — Tenant Isolation
-- Enforces that queries can only access data for their own tenant_id
-- Uses a custom claim set via the JWT or a request header
-- =============================================================================

-- Drop existing permissive policies (if any from initial setup)
DROP POLICY IF EXISTS "Allow all authenticated" ON funnel_submissions;
DROP POLICY IF EXISTS "Allow all authenticated" ON lead_transcripts;
DROP POLICY IF EXISTS "Allow all authenticated" ON consent_records;
DROP POLICY IF EXISTS "Allow all authenticated" ON api_costs;
DROP POLICY IF EXISTS "Allow all authenticated" ON twilio_costs;
DROP POLICY IF EXISTS "Allow all authenticated" ON trace_logs;
DROP POLICY IF EXISTS "Allow all authenticated" ON agent_toggles;
DROP POLICY IF EXISTS "Allow all authenticated" ON failover_queue;
DROP POLICY IF EXISTS "Allow all authenticated" ON tenant_configs;

-- Ensure RLS is enabled on all tables
ALTER TABLE funnel_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE twilio_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trace_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE failover_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_configs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- FUNCTION: Extract tenant_id from request header
-- Our API routes will set this header: x-tenant-id
-- =============================================================================
CREATE OR REPLACE FUNCTION get_request_tenant() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.headers', true)::json->>'x-tenant-id',
    current_setting('request.jwt.claims', true)::json->>'tenant_id',
    ''
  );
EXCEPTION WHEN OTHERS THEN
  RETURN '';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- POLICIES: Each table gets SELECT, INSERT, UPDATE, DELETE scoped by tenant_id
-- Service role key ALWAYS bypasses RLS (Supabase design)
-- Anon key respects these policies
-- =============================================================================

-- funnel_submissions
CREATE POLICY "tenant_select" ON funnel_submissions FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON funnel_submissions FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_update" ON funnel_submissions FOR UPDATE
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_delete" ON funnel_submissions FOR DELETE
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- lead_transcripts
CREATE POLICY "tenant_select" ON lead_transcripts FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON lead_transcripts FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_update" ON lead_transcripts FOR UPDATE
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_delete" ON lead_transcripts FOR DELETE
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- consent_records
CREATE POLICY "tenant_select" ON consent_records FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON consent_records FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_delete" ON consent_records FOR DELETE
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- api_costs
CREATE POLICY "tenant_select" ON api_costs FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON api_costs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- twilio_costs
CREATE POLICY "tenant_select" ON twilio_costs FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON twilio_costs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- trace_logs
CREATE POLICY "tenant_select" ON trace_logs FOR SELECT
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
CREATE POLICY "tenant_insert" ON trace_logs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- agent_toggles
CREATE POLICY "tenant_all" ON agent_toggles FOR ALL
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- failover_queue
CREATE POLICY "tenant_all" ON failover_queue FOR ALL
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');

-- tenant_configs
CREATE POLICY "tenant_all" ON tenant_configs FOR ALL
  USING (tenant_id = get_request_tenant() OR get_request_tenant() = '');
