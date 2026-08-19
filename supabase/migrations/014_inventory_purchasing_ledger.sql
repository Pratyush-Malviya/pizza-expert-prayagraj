-- ============================================================
--  014_inventory_purchasing_ledger.sql
--  Phase 3: Inventory Movement Ledger, Recipe BOM, Wastage & Purchasing (GRN)
-- ============================================================

-- ─── 1. UNITS OF MEASURE (UOM) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_units (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,         -- e.g. "Kilogram", "Gram", "Litre", "Piece"
  code              TEXT NOT NULL UNIQUE,  -- e.g. "kg", "g", "l", "ml", "pcs", "box"
  base_unit         TEXT NOT NULL,         -- e.g. "g", "ml", "pcs"
  conversion_factor NUMERIC(12,4) NOT NULL DEFAULT 1.0000, -- multiplier to convert to base unit
  category          TEXT NOT NULL DEFAULT 'weight' CHECK (category IN ('weight', 'volume', 'count', 'packaging')),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard UOMs
INSERT INTO inventory_units (name, code, base_unit, conversion_factor, category) VALUES
  ('Kilogram',   'kg',    'g',   1000.0, 'weight'),
  ('Gram',       'g',     'g',   1.0,    'weight'),
  ('Litre',      'l',     'ml',  1000.0, 'volume'),
  ('Millilitre', 'ml',    'ml',  1.0,    'volume'),
  ('Piece',      'pcs',   'pcs', 1.0,    'count'),
  ('Packet',     'pkt',   'pcs', 1.0,    'count'),
  ('Can',        'can',   'pcs', 1.0,    'count'),
  ('Box',        'box',   'pcs', 1.0,    'packaging')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. INVENTORY MOVEMENTS LEDGER (Immutable) ─────────────────

CREATE TABLE IF NOT EXISTS inventory_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL CHECK (movement_type IN (
    'sale', 'purchase_receipt', 'wastage', 'adjustment_in', 'adjustment_out',
    'transfer_in', 'transfer_out', 'opening_stock', 'return_to_supplier'
  )),
  quantity        NUMERIC(12,4) NOT NULL, -- negative for deductions, positive for additions
  unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_after   NUMERIC(12,4) NOT NULL,
  reference_type  TEXT, -- 'order', 'goods_receipt', 'wastage', 'stock_adjustment', 'initial'
  reference_id    UUID, -- foreign ID to orders, goods_receipts, etc.
  note            TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_ingredient ON inventory_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_mov_type ON inventory_movements(movement_type);

-- ─── 3. WASTAGE RECORDS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wastage_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity      NUMERIC(12,4) NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'kg',
  unit_cost     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cost_impact   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reason        TEXT NOT NULL CHECK (reason IN (
    'expired', 'burnt_damaged', 'spill_prep_loss', 'quality_rejection', 'customer_complaint', 'other'
  )),
  notes         TEXT,
  recorded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wastage_ing ON wastage_records(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_wastage_date ON wastage_records(recorded_at);

-- ─── 4. STOCK ADJUSTMENTS & PHYSICAL COUNTS ────────────────────

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  previous_stock  NUMERIC(12,4) NOT NULL,
  counted_stock   NUMERIC(12,4) NOT NULL,
  variance        NUMERIC(12,4) NOT NULL, -- counted - previous
  cost_variance   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  adjusted_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  adjusted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_counts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'in_progress', 'completed')),
  counted_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_count_id  UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  system_stock    NUMERIC(12,4) NOT NULL,
  physical_stock  NUMERIC(12,4) NOT NULL,
  variance        NUMERIC(12,4) NOT NULL,
  unit_cost       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  notes           TEXT
);

-- ─── 5. EXTEND SUPPLIERS ───────────────────────────────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 15',
  ADD COLUMN IF NOT EXISTS balance_payable NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS items_supplied JSONB DEFAULT '[]'::jsonb;

-- ─── 6. PURCHASE ORDER ITEMS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  ingredient_id       UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_ordered    NUMERIC(12,4) NOT NULL,
  quantity_received   NUMERIC(12,4) NOT NULL DEFAULT 0.00,
  unit_price          NUMERIC(10,2) NOT NULL,
  tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  line_total          NUMERIC(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);

-- ─── 7. GOODS RECEIPTS (GRN) & INTAKE ──────────────────────────

CREATE TABLE IF NOT EXISTS goods_receipts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number          TEXT NOT NULL UNIQUE,
  purchase_order_id   UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number      TEXT,
  invoice_date        DATE,
  total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  received_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goods_receipt_id    UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  ingredient_id       UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_received   NUMERIC(12,4) NOT NULL,
  quantity_accepted   NUMERIC(12,4) NOT NULL,
  quantity_rejected   NUMERIC(12,4) NOT NULL DEFAULT 0.00,
  rejection_reason    TEXT,
  unit_price          NUMERIC(10,2) NOT NULL,
  expiry_date         DATE,
  batch_number        TEXT
);

CREATE INDEX IF NOT EXISTS idx_grn_supplier ON goods_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON goods_receipt_items(goods_receipt_id);

-- ─── 8. RLS POLICIES ───────────────────────────────────────────

ALTER TABLE inventory_units       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE wastage_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read inventory_units" ON inventory_units FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage inventory_units" ON inventory_units FOR ALL USING (is_admin());

CREATE POLICY "Admins manage inventory_movements" ON inventory_movements FOR ALL USING (is_admin());
CREATE POLICY "Staff read inventory_movements" ON inventory_movements FOR SELECT USING (is_admin());

CREATE POLICY "Admins manage wastage_records" ON wastage_records FOR ALL USING (is_admin());
CREATE POLICY "Admins manage stock_adjustments" ON stock_adjustments FOR ALL USING (is_admin());
CREATE POLICY "Admins manage stock_counts" ON stock_counts FOR ALL USING (is_admin());
CREATE POLICY "Admins manage stock_count_items" ON stock_count_items FOR ALL USING (is_admin());

CREATE POLICY "Admins manage purchase_order_items" ON purchase_order_items FOR ALL USING (is_admin());
CREATE POLICY "Admins manage goods_receipts" ON goods_receipts FOR ALL USING (is_admin());
CREATE POLICY "Admins manage goods_receipt_items" ON goods_receipt_items FOR ALL USING (is_admin());

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE wastage_records;
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
