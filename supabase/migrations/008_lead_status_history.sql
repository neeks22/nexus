-- Records every lead status transition so we can compute cohort conversion (not just snapshot counts).
-- Powers Pipeline Funnel v3: "of 100 leads from last 30d, X% reached delivered" and avg-days-per-stage.

CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT
);

CREATE INDEX IF NOT EXISTS lead_status_history_tenant_lead_idx
  ON lead_status_history(tenant_id, lead_phone);
CREATE INDEX IF NOT EXISTS lead_status_history_tenant_changed_at_idx
  ON lead_status_history(tenant_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_lead_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO lead_status_history (tenant_id, lead_phone, from_status, to_status, changed_at)
    VALUES (NEW.tenant_id, NEW.phone, OLD.status, NEW.status, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_funnel_status_change ON funnel_submissions;
CREATE TRIGGER on_funnel_status_change
  AFTER UPDATE ON funnel_submissions
  FOR EACH ROW EXECUTE FUNCTION log_lead_status_change();

-- RLS: tenant isolation (matches existing pattern in 003_rls_tenant_isolation.sql)
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_status_history_tenant_isolation ON lead_status_history
  USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
         OR current_setting('request.jwt.claims', true) IS NULL);
