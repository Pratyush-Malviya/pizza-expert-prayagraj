-- ============================================================
--  Pizza Platform Extension Migration (Blueprint Specs)
-- ============================================================

-- ─── 1. ORDER STATUS HISTORY ─────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status        TEXT NOT NULL,
  changed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. DRIVERS & DELIVERIES ──────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  vehicle_type  TEXT NOT NULL DEFAULT 'Bike',
  vehicle_number TEXT,
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  is_busy       BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat   NUMERIC(10, 7),
  current_lng   NUMERIC(10, 7),
  last_location_update TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES drivers(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'unassigned'
                  CHECK (status IN ('unassigned', 'assigned', 'accepted', 'picked_up', 'arrived', 'delivered', 'failed')),
  pickup_time   TIMESTAMPTZ,
  delivered_time TIMESTAMPTZ,
  otp_code      TEXT,
  proof_photo   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  delivery_id   UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  latitude      NUMERIC(10, 7) NOT NULL,
  longitude     NUMERIC(10, 7) NOT NULL,
  heading       NUMERIC(5, 2),
  speed         NUMERIC(5, 2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. TOPPINGS & MODIFIERS (ADVANCED CUSTOMIZER) ───────────
CREATE TABLE IF NOT EXISTS modifier_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL, -- e.g. "Veg Toppings", "Extra Cheese", "Crust Choice"
  min_selection INTEGER NOT NULL DEFAULT 0,
  max_selection INTEGER NOT NULL DEFAULT 10,
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifiers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id          UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name              TEXT NOT NULL, -- e.g. "Onion", "Paneer", "Cheese Burst"
  price             NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_available      BOOLEAN NOT NULL DEFAULT TRUE,
  is_veg            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link Products to Modifier Groups
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, modifier_group_id)
);

-- ─── RLS POLICIES ─────────────────────────────────────────────
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups      ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read modifier_groups" ON modifier_groups FOR SELECT USING (TRUE);
CREATE POLICY "Public read modifiers" ON modifiers FOR SELECT USING (TRUE);
CREATE POLICY "Public read product_modifier_groups" ON product_modifier_groups FOR SELECT USING (TRUE);

CREATE POLICY "Users read own order history" ON order_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Admins manage status history" ON order_status_history FOR ALL USING (is_admin());

CREATE POLICY "Admins manage drivers" ON drivers FOR ALL USING (is_admin());
CREATE POLICY "Drivers view own profile" ON drivers FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins manage deliveries" ON deliveries FOR ALL USING (is_admin());
CREATE POLICY "Drivers view assigned deliveries" ON deliveries FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Customers view delivery status" ON deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.user_id = auth.uid())
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
