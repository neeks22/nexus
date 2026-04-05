-- 006_crm_users.sql
-- Per-user authentication for CRM multi-tenant access

CREATE TABLE IF NOT EXISTS crm_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_users_email ON crm_users (email);
CREATE INDEX idx_crm_users_tenant ON crm_users (tenant_id);

ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_users_service_all ON crm_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_crm_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crm_users_updated_at
  BEFORE UPDATE ON crm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_users_updated_at();
