-- ============================================================
--  015_owner_intelligence.sql
--  Phase 4: Day-End Z-Reports, Loyalty Rewards & P&L Intelligence
-- ============================================================

-- ─── 1. DAY-END CLOSING (Z-REPORTS) ────────────────────────────

CREATE TABLE IF NOT EXISTS day_end_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date         DATE NOT NULL UNIQUE,
  total_gross_sales   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_net_sales     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_tax_cgst      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_tax_sgst      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_discounts     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_cash          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_upi           NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_card          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_refunds       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_wastage_loss  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_cogs          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gross_profit        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  cash_opening_float  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cash_expected       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cash_actual         NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cash_variance       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_orders        INTEGER NOT NULL DEFAULT 0,
  cashier_shifts_count INTEGER NOT NULL DEFAULT 0,
  closed_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_day_end_date ON day_end_reports(report_date);

-- ─── 2. LOYALTY REWARDS CATALOG ────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  points_required   INTEGER NOT NULL,
  reward_type       TEXT NOT NULL CHECK (reward_type IN ('flat_discount', 'percentage_discount', 'free_item')),
  discount_value    NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  min_order_amount  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Loyalty Rewards
INSERT INTO loyalty_rewards (name, description, points_required, reward_type, discount_value, min_order_amount) VALUES
  ('₹50 Off Voucher',  'Redeem 100 points for ₹50 discount on any order',  100, 'flat_discount', 50.00, 200.00),
  ('₹120 Off Voucher', 'Redeem 200 points for ₹120 discount on any order', 200, 'flat_discount', 120.00, 400.00),
  ('15% Off Total',    'Redeem 300 points for 15% discount on dining bill', 300, 'percentage_discount', 15.00, 500.00)
ON CONFLICT DO NOTHING;

-- ─── 3. RLS POLICIES ───────────────────────────────────────────

ALTER TABLE day_end_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage day_end_reports" ON day_end_reports FOR ALL USING (is_admin());
CREATE POLICY "Public read loyalty_rewards" ON loyalty_rewards FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage loyalty_rewards" ON loyalty_rewards FOR ALL USING (is_admin());

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE day_end_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_rewards;
