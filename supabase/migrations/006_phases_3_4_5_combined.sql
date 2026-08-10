-- ============================================================
--  Phases 3, 4, 5: Combined Database Migration
-- ============================================================

-- ─── PHASE 3: MULTI-CHANNEL, GST & SUPPLIERS ────────────────

-- 1. Orders Enhancements
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct', -- 'direct', 'zomato', 'swiggy'
ADD COLUMN IF NOT EXISTS external_order_id TEXT,
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'delivery', -- 'delivery', 'pickup', 'dine_in'
ADD COLUMN IF NOT EXISTS table_id UUID;

-- 2. Tax Invoices Table (Sequential GST Invoices)
CREATE TABLE IF NOT EXISTS tax_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL UNIQUE,
  gstin             TEXT DEFAULT '09AAECP1234F1Z5',
  cgst              NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  sgst              NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  igst              NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_tax         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  contact_person    TEXT,
  phone             TEXT,
  email             TEXT,
  payment_terms     TEXT DEFAULT 'Net 30',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'ordered', 'received', 'paid'
  total_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ordered_at        TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PHASE 4: STAFFING, DINE-IN & DRIVER PWA ────────────────

-- 5. Staff Shifts Table
CREATE TABLE IF NOT EXISTS staff_shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'staff',
  shift_start       TIMESTAMPTZ NOT NULL,
  shift_end         TIMESTAMPTZ NOT NULL,
  checked_in_at     TIMESTAMPTZ,
  checked_out_at    TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tables Table (Dine-In QR Table Ordering)
CREATE TABLE IF NOT EXISTS tables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number      TEXT NOT NULL UNIQUE,
  qr_code_url       TEXT,
  capacity          INTEGER DEFAULT 4,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Dine-In Tables
INSERT INTO tables (table_number, capacity) VALUES
  ('T-01', 2), ('T-02', 4), ('T-03', 4), ('T-04', 6), ('T-05', 8)
ON CONFLICT (table_number) DO NOTHING;

-- 7. Deliveries Proof & OTP Enhancement
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS proof_photo_url TEXT,
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- ─── PHASE 5: SUBSCRIPTIONS & REFUNDS API ──────────────────

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  frequency         TEXT NOT NULL DEFAULT 'weekly', -- 'weekly', 'biweekly', 'monthly'
  next_delivery     DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Refund Requests Table
CREATE TABLE IF NOT EXISTS refund_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_gateway   TEXT NOT NULL DEFAULT 'razorpay',
  gateway_refund_id TEXT,
  amount            NUMERIC(10, 2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  reason            TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RLS POLICIES & SECURITY REMEDIATION ───────────────────
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Enable RLS on previous un-shielded tables
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;

-- Add RLS Access Policies
DROP POLICY IF EXISTS "Public read catalog tables" ON product_images;
CREATE POLICY "Public read catalog tables" ON product_images FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read product_options" ON product_options;
CREATE POLICY "Public read product_options" ON product_options FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read coupons" ON coupons;
CREATE POLICY "Public read coupons" ON coupons FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read tables" ON tables;
CREATE POLICY "Public read tables" ON tables FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage tax_invoices" ON tax_invoices;
CREATE POLICY "Admins manage tax_invoices" ON tax_invoices FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Admins manage suppliers" ON suppliers;
CREATE POLICY "Admins manage suppliers" ON suppliers FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Admins manage purchase_orders" ON purchase_orders;
CREATE POLICY "Admins manage purchase_orders" ON purchase_orders FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Admins manage staff_shifts" ON staff_shifts;
CREATE POLICY "Admins manage staff_shifts" ON staff_shifts FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Users manage own subscriptions" ON subscriptions;
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (TRUE);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tax_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_shifts;
