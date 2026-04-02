-- =============================================================================
-- FIX: RLS tenant isolation bypass
--
-- The original 003_rls_tenant_isolation.sql policies all had:
--   OR get_request_tenant() = ''
-- This meant that when no x-tenant-id header was set (or JWT had no tenant_id),
-- get_request_tenant() returned '' and the OR clause granted full cross-tenant
-- access. This migration drops all affected policies and recreates them WITHOUT
-- the empty-string fallback.
--
-- After this migration, requests without a valid tenant header will be denied
-- by RLS (unless using the service role key, which always bypasses RLS).
-- =============================================================================

-- Also fix the function: return NULL instead of '' when tenant is missing,
-- so RLS comparisons fail closed (tenant_id = NULL is always false).
CREATE OR REPLACE FUNCTION get_request_tenant() RETURNS TEXT AS $$
DECLARE
  _tenant TEXT;
BEGIN
  _tenant := COALESCE(
    current_setting('request.headers', true)::json->>'x-tenant-id',
    current_setting('request.jwt.claims', true)::json->>'tenant_id'
  );
  -- Return NULL if empty or missing so RLS denies by default
  IF _tenant IS NULL OR _tenant = '' THEN
    RETURN NULL;
  END IF;
  RETURN _tenant;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Drop all existing tenant policies from 003
-- =============================================================================

-- funnel_submissions
DROP POLICY IF EXISTS "tenant_select" ON funnel_submissions;
DROP POLICY IF EXISTS "tenant_insert" ON funnel_submissions;
DROP POLICY IF EXISTS "tenant_update" ON funnel_submissions;
DROP POLICY IF EXISTS "tenant_delete" ON funnel_submissions;

-- lead_transcripts
DROP POLICY IF EXISTS "tenant_select" ON lead_transcripts;
DROP POLICY IF EXISTS "tenant_insert" ON lead_transcripts;
DROP POLICY IF EXISTS "tenant_update" ON lead_transcripts;
DROP POLICY IF EXISTS "tenant_delete" ON lead_transcripts;

-- consent_records
DROP POLICY IF EXISTS "tenant_select" ON consent_records;
DROP POLICY IF EXISTS "tenant_insert" ON consent_records;
DROP POLICY IF EXISTS "tenant_delete" ON consent_records;

-- api_costs
DROP POLICY IF EXISTS "tenant_select" ON api_costs;
DROP POLICY IF EXISTS "tenant_insert" ON api_costs;

-- twilio_costs
DROP POLICY IF EXISTS "tenant_select" ON twilio_costs;
DROP POLICY IF EXISTS "tenant_insert" ON twilio_costs;

-- trace_logs
DROP POLICY IF EXISTS "tenant_select" ON trace_logs;
DROP POLICY IF EXISTS "tenant_insert" ON trace_logs;

-- agent_toggles
DROP POLICY IF EXISTS "tenant_all" ON agent_toggles;

-- failover_queue
DROP POLICY IF EXISTS "tenant_all" ON failover_queue;

-- tenant_configs
DROP POLICY IF EXISTS "tenant_all" ON tenant_configs;

-- =============================================================================
-- Recreate policies WITHOUT the empty-string bypass
-- =============================================================================

-- funnel_submissions
CREATE POLICY "tenant_select" ON funnel_submissions FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON funnel_submissions FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());
CREATE POLICY "tenant_update" ON funnel_submissions FOR UPDATE
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_delete" ON funnel_submissions FOR DELETE
  USING (tenant_id = get_request_tenant());

-- lead_transcripts
CREATE POLICY "tenant_select" ON lead_transcripts FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON lead_transcripts FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());
CREATE POLICY "tenant_update" ON lead_transcripts FOR UPDATE
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_delete" ON lead_transcripts FOR DELETE
  USING (tenant_id = get_request_tenant());

-- consent_records
CREATE POLICY "tenant_select" ON consent_records FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON consent_records FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());
CREATE POLICY "tenant_delete" ON consent_records FOR DELETE
  USING (tenant_id = get_request_tenant());

-- api_costs
CREATE POLICY "tenant_select" ON api_costs FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON api_costs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());

-- twilio_costs
CREATE POLICY "tenant_select" ON twilio_costs FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON twilio_costs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());

-- trace_logs
CREATE POLICY "tenant_select" ON trace_logs FOR SELECT
  USING (tenant_id = get_request_tenant());
CREATE POLICY "tenant_insert" ON trace_logs FOR INSERT
  WITH CHECK (tenant_id = get_request_tenant());

-- agent_toggles
CREATE POLICY "tenant_all" ON agent_toggles FOR ALL
  USING (tenant_id = get_request_tenant());

-- failover_queue
CREATE POLICY "tenant_all" ON failover_queue FOR ALL
  USING (tenant_id = get_request_tenant());

-- tenant_configs
CREATE POLICY "tenant_all" ON tenant_configs FOR ALL
  USING (tenant_id = get_request_tenant());
