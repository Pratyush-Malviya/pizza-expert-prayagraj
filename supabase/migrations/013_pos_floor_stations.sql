-- ============================================================
--  013_pos_floor_stations.sql
--  Phase 2: Table & Floor Management, Kitchen Stations & Routing
-- ============================================================

-- ─── 1. KITCHEN STATIONS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kitchen_stations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE, -- 'OVEN', 'PREP', 'BEV', 'EXPEDITE'
  description TEXT,
  color       TEXT DEFAULT '#B91C1C',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Default Stations
INSERT INTO kitchen_stations (name, code, description, color) VALUES
  ('Wood-Fired Oven', 'OVEN', 'Pizza baking & hot stone oven', '#EA580C'),
  ('Prep & Assembly', 'PREP', 'Dough rolling, toppings, sides & pasta', '#2563EB'),
  ('Beverage & Bar',  'BEV',  'Mocktails, soft drinks, shakes', '#0D9488'),
  ('Packing & Expedite', 'EXPEDITE', 'Quality check, slicing & delivery dispatch', '#7C3AED')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. KITCHEN ROUTING RULES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS kitchen_routing_rules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  station_id    UUID NOT NULL REFERENCES kitchen_stations(id) ON DELETE CASCADE,
  priority      INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_cat ON kitchen_routing_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_routing_prod ON kitchen_routing_rules(product_id);

-- ─── 3. TABLE TRANSFERS & MERGES AUDIT ──────────────────────────

CREATE TABLE IF NOT EXISTS table_transfers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_table_id   UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  to_table_id     UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  session_id      UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  transferred_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_merges (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_table_id    UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  secondary_table_id  UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id          UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  merged_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  merged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unmerged_at         TIMESTAMPTZ
);

-- ─── 4. SEED SAMPLE DINE-IN TABLES ACROSS AREAS ────────────────

DO $$
DECLARE
  main_hall_id UUID;
  outdoor_id UUID;
  family_id UUID;
BEGIN
  SELECT id INTO main_hall_id FROM areas WHERE name = 'Main Hall' LIMIT 1;
  SELECT id INTO outdoor_id FROM areas WHERE name = 'Outdoor' LIMIT 1;
  SELECT id INTO family_id FROM areas WHERE name = 'Family Area' LIMIT 1;

  IF main_hall_id IS NOT NULL THEN
    INSERT INTO tables (table_number, capacity, area_id, status, is_active) VALUES
      ('T-01', 2, main_hall_id, 'available', true),
      ('T-02', 2, main_hall_id, 'available', true),
      ('T-03', 4, main_hall_id, 'available', true),
      ('T-04', 4, main_hall_id, 'available', true),
      ('T-05', 6, main_hall_id, 'available', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF outdoor_id IS NOT NULL THEN
    INSERT INTO tables (table_number, capacity, area_id, status, is_active) VALUES
      ('OD-01', 4, outdoor_id, 'available', true),
      ('OD-02', 4, outdoor_id, 'available', true),
      ('OD-03', 6, outdoor_id, 'available', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF family_id IS NOT NULL THEN
    INSERT INTO tables (table_number, capacity, area_id, status, is_active) VALUES
      ('FAM-01', 8, family_id, 'available', true),
      ('FAM-02', 8, family_id, 'available', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ─── 5. RLS POLICIES ───────────────────────────────────────────

ALTER TABLE kitchen_stations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_transfers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_merges          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read kitchen_stations" ON kitchen_stations FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage kitchen_stations" ON kitchen_stations FOR ALL USING (is_admin());

CREATE POLICY "Public read kitchen_routing_rules" ON kitchen_routing_rules FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage kitchen_routing_rules" ON kitchen_routing_rules FOR ALL USING (is_admin());

CREATE POLICY "Admins manage table_transfers" ON table_transfers FOR ALL USING (is_admin());
CREATE POLICY "Admins manage table_merges" ON table_merges FOR ALL USING (is_admin());

-- Realtime for kitchen stations & floor updates
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_stations;
ALTER PUBLICATION supabase_realtime ADD TABLE tables;
ALTER PUBLICATION supabase_realtime ADD TABLE areas;
