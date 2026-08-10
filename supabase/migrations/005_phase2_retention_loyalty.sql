-- ============================================================
--  Phase 2: Customer Retention & Loyalty Migration
-- ============================================================

-- ─── 1. PROFILES ENHANCEMENTS ────────────────────────────────
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS tier_id UUID;

-- ─── 2. REVIEWS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment           TEXT,
  image_url         TEXT,
  is_approved       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. LOYALTY TIERS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL UNIQUE, -- 'Silver', 'Gold', 'VIP'
  min_points        INTEGER NOT NULL DEFAULT 0,
  perks             JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Loyalty Tiers
INSERT INTO loyalty_tiers (name, min_points, perks) VALUES
  ('Silver', 0, '{"discount_percent": 0, "free_delivery": false, "badge": "🥈 Silver Member"}'::jsonb),
  ('Gold', 500, '{"discount_percent": 5, "free_delivery": true, "badge": "🥇 Gold VIP"}'::jsonb),
  ('VIP', 1500, '{"discount_percent": 10, "free_delivery": true, "priority_support": true, "badge": "👑 Platinum VIP"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ─── 4. CART SESSIONS TABLE (Server-Side Cart Persistence) ──
CREATE TABLE IF NOT EXISTS cart_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. NOTIFICATION LOGS TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel           TEXT NOT NULL, -- 'email', 'sms', 'push'
  template          TEXT NOT NULL, -- 'abandoned_cart', 'winback', 'birthday'
  status            TEXT NOT NULL DEFAULT 'sent',
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. RLS POLICIES ──────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT USING (is_approved = TRUE);

DROP POLICY IF EXISTS "Public read loyalty_tiers" ON loyalty_tiers;
CREATE POLICY "Public read loyalty_tiers" ON loyalty_tiers FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users manage own cart_sessions" ON cart_sessions;
CREATE POLICY "Users manage own cart_sessions" ON cart_sessions FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Admins manage notification_logs" ON notification_logs;
CREATE POLICY "Admins manage notification_logs" ON notification_logs FOR ALL USING (TRUE);

-- Enable Realtime for cart sessions
ALTER PUBLICATION supabase_realtime ADD TABLE cart_sessions;
