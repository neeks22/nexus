-- 007_crm_features.sql
-- Vehicle Inventory, Appointments, Deal Desking for CRM

-- ============================================
-- 1. INVENTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  color TEXT,
  price NUMERIC(10,2),
  mileage INTEGER,
  stock_number TEXT,
  vin TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX idx_inventory_status ON inventory(tenant_id, status);
CREATE INDEX idx_inventory_stock ON inventory(tenant_id, stock_number);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_tenant_select ON inventory FOR SELECT
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY inventory_tenant_insert ON inventory FOR INSERT
  WITH CHECK (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY inventory_tenant_update ON inventory FOR UPDATE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY inventory_tenant_delete ON inventory FOR DELETE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY inventory_service_all ON inventory FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. APPOINTMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('test_drive', 'financing', 'trade_appraisal', 'general')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  assigned_to TEXT,
  notes TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  vehicle_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_scheduled ON appointments(tenant_id, scheduled_at);
CREATE INDEX idx_appointments_lead ON appointments(tenant_id, lead_phone);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_tenant_select ON appointments FOR SELECT
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY appointments_tenant_insert ON appointments FOR INSERT
  WITH CHECK (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY appointments_tenant_update ON appointments FOR UPDATE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY appointments_tenant_delete ON appointments FOR DELETE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY appointments_service_all ON appointments FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. DEALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  vehicle_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  vehicle_description TEXT,
  sale_price NUMERIC(10,2),
  trade_in_value NUMERIC(10,2),
  down_payment NUMERIC(10,2),
  monthly_payment NUMERIC(10,2),
  term_months INTEGER,
  lender TEXT,
  status TEXT NOT NULL DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'approved', 'funded', 'delivered', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deals_tenant ON deals(tenant_id);
CREATE INDEX idx_deals_status ON deals(tenant_id, status);
CREATE INDEX idx_deals_lead ON deals(tenant_id, lead_phone);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_tenant_select ON deals FOR SELECT
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY deals_tenant_insert ON deals FOR INSERT
  WITH CHECK (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY deals_tenant_update ON deals FOR UPDATE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY deals_tenant_delete ON deals FOR DELETE
  USING (tenant_id = current_setting('request.header.x-tenant-id', true));
CREATE POLICY deals_service_all ON deals FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
