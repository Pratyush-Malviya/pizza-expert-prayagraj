-- ============================================================
--  Phase 1: Financial Analytics & Inventory Migration
-- ============================================================

-- ─── 1. PRODUCTS TABLE ENHANCEMENTS ─────────────────────────
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0.00;

-- ─── 2. INGREDIENTS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'kg', -- 'kg', 'g', 'l', 'ml', 'pcs', 'slices'
  current_stock     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  reorder_threshold NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
  cost_per_unit     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expiry_date       DATE,
  supplier_id       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. RECIPE ITEMS TABLE (Product -> Ingredients mapping) ──
CREATE TABLE IF NOT EXISTS recipe_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id     UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_required NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, ingredient_id)
);

-- ─── 4. AUTOMATIC INVENTORY DECREMENT TRIGGER ─────────────────
CREATE OR REPLACE FUNCTION process_order_inventory_decrement()
RETURNS TRIGGER AS $$
DECLARE
  recipe RECORD;
  new_stock NUMERIC;
BEGIN
  -- Loop through all recipe ingredients for the ordered product
  FOR recipe IN 
    SELECT ingredient_id, quantity_required 
    FROM recipe_items 
    WHERE product_id = NEW.product_id
  LOOP
    -- Decrement stock
    UPDATE ingredients
    SET current_stock = GREATEST(0, current_stock - (recipe.quantity_required * NEW.quantity)),
        updated_at = NOW()
    WHERE id = recipe.ingredient_id
    RETURNING current_stock INTO new_stock;

    -- Auto-disable product if stock falls below 1 unit requirement
    IF new_stock < recipe.quantity_required THEN
      UPDATE products
      SET is_available = FALSE
      WHERE id = NEW.product_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_inventory_decrement ON order_items;
CREATE TRIGGER trigger_order_inventory_decrement
AFTER INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION process_order_inventory_decrement();

-- ─── 5. FINANCIAL ANALYTICS VIEWS ─────────────────────────────
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT 
  DATE(o.created_at) AS date,
  COUNT(o.id) AS total_orders,
  SUM(o.total) AS gross_revenue,
  SUM(o.subtotal) AS net_subtotal,
  SUM(o.discount) AS total_discounts,
  SUM(o.tax) AS total_tax,
  AVG(o.total) AS average_order_value
FROM orders o
WHERE o.status != 'cancelled'
GROUP BY DATE(o.created_at)
ORDER BY DATE(o.created_at) DESC;

CREATE OR REPLACE VIEW product_performance_summary AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.price AS selling_price,
  p.cost_price,
  COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
  COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue,
  COALESCE(SUM(oi.quantity * (oi.unit_price - p.cost_price)), 0) AS total_estimated_profit
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
GROUP BY p.id, p.name, p.price, p.cost_price
ORDER BY total_revenue DESC;

-- ─── 6. RLS POLICIES ──────────────────────────────────────────
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ingredients" ON ingredients FOR ALL USING (TRUE);
CREATE POLICY "Admins manage recipe_items" ON recipe_items FOR ALL USING (TRUE);

-- Enable Realtime for inventory tracking
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
