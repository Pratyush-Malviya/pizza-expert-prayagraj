-- Phase 1 - Multi-Store Management (Menu Templates)

-- 1. Create menu_templates table
CREATE TABLE IF NOT EXISTS menu_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Instead of re-creating products under templates, we can just link a product to a template if needed,
-- or use templates to bulk apply products to stores. 
-- For a robust shared menu architecture, we could move 'products' to be template-level instead of store-level,
-- but since 'store_id' was added to products in the previous migration, we'll keep products store-specific by default
-- and allow template linkage.
ALTER TABLE products ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES menu_templates(id) ON DELETE SET NULL;

-- 2. Create store_menu_overrides table
-- This allows specific stores to override price, availability, or status of a template product.
CREATE TABLE IF NOT EXISTS store_menu_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_override NUMERIC(10, 2), -- if null, use base price
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, product_id)
);

-- Enable RLS
ALTER TABLE menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_menu_overrides ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Owners can manage menu templates" ON menu_templates
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage store overrides" ON store_menu_overrides
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stores
            WHERE stores.id = store_menu_overrides.store_id
            AND stores.owner_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view overrides for their store" ON store_menu_overrides
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_staff 
            WHERE store_staff.store_id = store_menu_overrides.store_id 
            AND store_staff.user_id = auth.uid()
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_menu_templates_updated_at
BEFORE UPDATE ON menu_templates
FOR EACH ROW
EXECUTE FUNCTION update_stores_updated_at();

CREATE TRIGGER update_store_menu_overrides_updated_at
BEFORE UPDATE ON store_menu_overrides
FOR EACH ROW
EXECUTE FUNCTION update_stores_updated_at();
