-- ============================================================
--  012_pos_foundation.sql
--  Phase 0: POS Foundation — Canonical Order Model Extension
--  All existing online/delivery/KDS flows remain UNCHANGED.
-- ============================================================

-- ─── 1. EXTEND ORDERS TABLE FOR POS CONTEXT ─────────────────────

-- Add payment_status as a separate concept from order fulfillment status
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partially_paid','paid','refunded','partially_refunded','failed')),
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'new'
    CHECK (fulfillment_status IN ('new','confirmed','preparing','ready','handed_over','out_for_delivery','completed','cancelled')),
  ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terminal_id UUID,
  ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_id UUID,
  ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS kot_number TEXT;

-- Extend order_source to explicitly include 'pos'
-- The source column was added in migration 006 as TEXT with default 'direct'
-- We add an index to help filter by source
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- ─── 2. EXTEND ROLES TO INCLUDE POS ROLES ──────────────────────

-- Drop old constraint, add new roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'super_admin','manager','staff','viewer','customer','driver',
    'cashier','waiter','kitchen_manager','inventory_manager','accountant'
  ));

-- ─── 3. AREAS (Dining zones: Main Hall, Outdoor, Counter, etc.) ─

CREATE TABLE IF NOT EXISTS areas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default areas
INSERT INTO areas (name, description, sort_order) VALUES
  ('Main Hall',   'Main dining area',          1),
  ('Outdoor',     'Outdoor seating area',       2),
  ('Family Area', 'Family-friendly section',    3),
  ('Counter',     'Counter / takeaway section', 4)
ON CONFLICT DO NOTHING;

-- ─── 4. EXTEND TABLES FOR FULL TABLE MANAGEMENT ────────────────

ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','occupied','reserved','billing','cleaning','blocked')),
  ADD COLUMN IF NOT EXISTS assigned_waiter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_session_id UUID,  -- FK to table_sessions added after that table is created
  ADD COLUMN IF NOT EXISTS merged_with UUID;          -- FK to another table if merged

CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_area ON tables(area_id);

-- ─── 5. TABLE SESSIONS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS table_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id      UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  opened_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_count   INTEGER NOT NULL DEFAULT 1,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_order ON table_sessions(order_id);

-- ─── 6. POS TERMINALS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pos_terminals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed one default terminal
INSERT INTO pos_terminals (name, description) VALUES
  ('Counter 1', 'Main counter billing terminal')
ON CONFLICT DO NOTHING;

-- ─── 7. CASHIER SHIFTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cashier_shifts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  terminal_id       UUID NOT NULL REFERENCES pos_terminals(id) ON DELETE CASCADE,
  cashier_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  opening_cash      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  closing_cash      NUMERIC(10,2),
  expected_cash     NUMERIC(10,2),
  cash_variance     NUMERIC(10,2),
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','pending_approval')),
  opened_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at         TIMESTAMPTZ,
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON cashier_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_status ON cashier_shifts(status);

-- ─── 8. CASH MOVEMENTS (Drawer events) ─────────────────────────

CREATE TABLE IF NOT EXISTS cash_movements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id      UUID NOT NULL REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL
    CHECK (type IN ('sale','refund','paid_in','paid_out','drawer_open','no_sale','opening_float','closing_count')),
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reference_id  UUID,   -- order_id or refund_id if applicable
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON cash_movements(shift_id);

-- ─── 9. ORDER PAYMENTS (Multi-tender per order) ────────────────
-- This is separate from the existing `payments` table (which handles online gateways).
-- POS supports cash/UPI/card in a single order — this table tracks each tender.

CREATE TABLE IF NOT EXISTS order_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shift_id        UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  tender_type     TEXT NOT NULL
    CHECK (tender_type IN ('cash','upi','card','razorpay','house_account','voucher')),
  amount          NUMERIC(10,2) NOT NULL,
  change_given    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reference       TEXT,   -- UPI transaction ID, card approval code, etc.
  status          TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending','completed','failed','refunded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_shift ON order_payments(shift_id);

-- ─── 10. ORDER DISCOUNTS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS order_discounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type          TEXT NOT NULL
    CHECK (type IN ('percentage','flat','coupon','loyalty','manager','complimentary')),
  value         NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  reason        TEXT,
  approved_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  applied_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_discounts_order ON order_discounts(order_id);

-- ─── 11. HELD ORDERS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS held_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  terminal_id   UUID REFERENCES pos_terminals(id) ON DELETE SET NULL,
  label         TEXT,   -- e.g. "Table 4 – Pending", "Walk-in Customer"
  order_data    JSONB NOT NULL,   -- serialized cart snapshot
  held_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_held_orders_cashier ON held_orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_held_orders_active ON held_orders(is_active);

-- ─── 12. KOTs (Kitchen Order Tickets) ──────────────────────────

CREATE TABLE IF NOT EXISTS kots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kot_number      TEXT NOT NULL,   -- sequential per order e.g. KOT-001, KOT-002
  table_id        UUID REFERENCES tables(id) ON DELETE SET NULL,
  order_type      TEXT,            -- dine_in / takeaway / delivery / pickup
  customer_name   TEXT,
  guest_count     INTEGER,
  station         TEXT,            -- pizza_oven / prep / cold / beverage / packing
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','acknowledged','preparing','ready','cancelled','recalled')),
  sent_at         TIMESTAMPTZ,
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  voided_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kot_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kot_id          UUID NOT NULL REFERENCES kots(id) ON DELETE CASCADE,
  order_item_id   UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1,
  modifiers       JSONB,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','preparing','ready','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_kots_order ON kots(order_id);
CREATE INDEX IF NOT EXISTS idx_kots_status ON kots(status);
CREATE INDEX IF NOT EXISTS idx_kot_items_kot ON kot_items(kot_id);

-- ─── 13. LOYALTY TRANSACTIONS LEDGER ───────────────────────────
-- Replace the single `loyalty_points` counter with a proper ledger

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('earn','redeem','adjust','expire','bonus')),
  points          INTEGER NOT NULL,   -- positive for earn, negative for redeem
  balance_after   INTEGER NOT NULL,
  note            TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_txn_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_txn_order ON loyalty_transactions(order_id);

-- ─── 14. TAX GROUPS & RATES (Configurable Tax Engine) ──────────

CREATE TABLE IF NOT EXISTS tax_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,   -- e.g. "GST 5%", "GST 18%"
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tax_group_id    UUID NOT NULL REFERENCES tax_groups(id) ON DELETE CASCADE,
  component_name  TEXT NOT NULL,   -- "CGST", "SGST", "IGST", "Service Charge"
  rate            NUMERIC(5,2) NOT NULL,   -- e.g. 2.5 for 2.5%
  is_inclusive    BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE
);

-- Seed India restaurant GST 5% (2.5% CGST + 2.5% SGST — intra-state)
INSERT INTO tax_groups (name, description, is_default) VALUES
  ('GST 5%', 'Restaurant service other than specified-premises — CBIC rate', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed the component rates
WITH inserted_group AS (
  SELECT id FROM tax_groups WHERE name = 'GST 5%' LIMIT 1
)
INSERT INTO tax_rates (tax_group_id, component_name, rate, effective_from)
SELECT id, 'CGST', 2.5, '2024-01-01' FROM inserted_group
ON CONFLICT DO NOTHING;

WITH inserted_group AS (
  SELECT id FROM tax_groups WHERE name = 'GST 5%' LIMIT 1
)
INSERT INTO tax_rates (tax_group_id, component_name, rate, effective_from)
SELECT id, 'SGST', 2.5, '2024-01-01' FROM inserted_group
ON CONFLICT DO NOTHING;

-- ─── 15. RLS POLICIES ──────────────────────────────────────────

ALTER TABLE areas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_terminals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_shifts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kots               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kot_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions     ENABLE ROW LEVEL SECURITY;

-- Areas: public read, admin write
CREATE POLICY "Public read areas" ON areas FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage areas" ON areas FOR ALL USING (is_admin());

-- POS terminals: admin only
CREATE POLICY "Admins manage pos_terminals" ON pos_terminals FOR ALL USING (is_admin());

-- Cashier shifts: admin + own cashier
CREATE POLICY "Admins manage cashier_shifts" ON cashier_shifts FOR ALL USING (is_admin());
CREATE POLICY "Cashiers view own shifts" ON cashier_shifts FOR SELECT USING (cashier_id = auth.uid());

-- Cash movements: admin + shift cashier
CREATE POLICY "Admins manage cash_movements" ON cash_movements FOR ALL USING (is_admin());

-- Order payments
CREATE POLICY "Admins manage order_payments" ON order_payments FOR ALL USING (is_admin());
CREATE POLICY "Users view own order_payments" ON order_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_payments.order_id AND orders.user_id = auth.uid())
);

-- Order discounts
CREATE POLICY "Admins manage order_discounts" ON order_discounts FOR ALL USING (is_admin());

-- Held orders: cashier's own + admin
CREATE POLICY "Admins manage held_orders" ON held_orders FOR ALL USING (is_admin());
CREATE POLICY "Cashiers manage own held_orders" ON held_orders FOR ALL USING (cashier_id = auth.uid());

-- KOTs: admin + kitchen staff
CREATE POLICY "Admins manage kots" ON kots FOR ALL USING (is_admin());
CREATE POLICY "Public read kots" ON kots FOR SELECT USING (is_admin());
CREATE POLICY "Admins manage kot_items" ON kot_items FOR ALL USING (is_admin());
CREATE POLICY "Public read kot_items" ON kot_items FOR SELECT USING (is_admin());

-- Loyalty transactions
CREATE POLICY "Admins manage loyalty_transactions" ON loyalty_transactions FOR ALL USING (is_admin());
CREATE POLICY "Users view own loyalty_transactions" ON loyalty_transactions FOR SELECT USING (customer_id = auth.uid());

-- Tax config: public read (needed for checkout), admin write
CREATE POLICY "Public read tax_groups" ON tax_groups FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage tax_groups" ON tax_groups FOR ALL USING (is_admin());
CREATE POLICY "Public read tax_rates" ON tax_rates FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage tax_rates" ON tax_rates FOR ALL USING (is_admin());

-- Table sessions
CREATE POLICY "Admins manage table_sessions" ON table_sessions FOR ALL USING (is_admin());
CREATE POLICY "Staff read table_sessions" ON table_sessions FOR SELECT USING (is_admin());

-- ─── 16. REALTIME SUBSCRIPTIONS ────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE kots;
ALTER PUBLICATION supabase_realtime ADD TABLE kot_items;
ALTER PUBLICATION supabase_realtime ADD TABLE cashier_shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE order_payments;
