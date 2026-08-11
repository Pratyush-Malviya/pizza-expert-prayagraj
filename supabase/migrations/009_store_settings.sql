-- ============================================================
--  009_store_settings.sql
--  Sprint 2: Store Settings & Delivery Zone Configuration
-- ============================================================

-- ─── 1. STORE SETTINGS — Key-Value Config Table ────────────────
CREATE TABLE IF NOT EXISTS store_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Public read for delivery zone checks on checkout
DROP POLICY IF EXISTS "Public can read store_settings" ON store_settings;
CREATE POLICY "Public can read store_settings"
  ON store_settings FOR SELECT
  USING (true);

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update store_settings" ON store_settings;
CREATE POLICY "Admins can update store_settings"
  ON store_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'manager')
    )
  );

-- ─── 2. SEED DEFAULT SETTINGS ──────────────────────────────────
INSERT INTO store_settings (key, value, description) VALUES
  ('delivery_radius_km',         '8',        'Maximum delivery radius from restaurant in kilometres'),
  ('min_delivery_order_value',   '149',      'Minimum cart value (INR) required to place a delivery order'),
  ('free_delivery_threshold',    '499',      'Cart value (INR) above which delivery is free'),
  ('cod_verification_threshold', '1000',     'COD orders above this amount (INR) require admin phone verification'),
  ('restaurant_lat',             '25.4358',  'Restaurant latitude (Allapur, Prayagraj)'),
  ('restaurant_lng',             '81.8463',  'Restaurant longitude (Allapur, Prayagraj)'),
  ('restaurant_name',            'Pizza Expert Prayagraj', 'Restaurant display name'),
  ('restaurant_phone',           '+91 XXXXXXXXXX', 'Restaurant contact phone'),
  ('estimated_prep_min',         '15',       'Base food preparation time in minutes (peak adjustment is dynamic)'),
  ('estimated_delivery_min',     '15',       'Average delivery travel time in minutes')
ON CONFLICT (key) DO NOTHING;
