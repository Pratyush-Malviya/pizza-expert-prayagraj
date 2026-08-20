-- Phase 1 - Multi-Store Management (Base)

-- 1. Create stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    geo_coordinates JSONB, -- { "lat": number, "lng": number }
    timezone TEXT DEFAULT 'Asia/Kolkata',
    active BOOLEAN DEFAULT true,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create store_staff join table
CREATE TABLE IF NOT EXISTS store_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manager', 'staff', 'kitchen', 'cashier', 'driver')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, store_id)
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_staff ENABLE ROW LEVEL SECURITY;

-- 3. Add store_id to existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- 4. Update RLS policies (Basic examples for scoping by store_id)
CREATE POLICY "Owners can manage their stores" ON stores
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Staff can view their assigned stores" ON stores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_staff 
            WHERE store_staff.store_id = stores.id 
            AND store_staff.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage store staff" ON store_staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM stores
            WHERE stores.id = store_staff.store_id
            AND stores.owner_id = auth.uid()
        )
    );

-- Trigger to update updated_at on stores
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at_trigger
BEFORE UPDATE ON stores
FOR EACH ROW
EXECUTE FUNCTION update_stores_updated_at();
