-- Migration 010: Nice-to-Have Features (Waitlists & Targeted Coupons)

-- 1. Product Waitlist Table for out-of-stock items
CREATE TABLE IF NOT EXISTS product_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup when a product becomes available again
CREATE INDEX IF NOT EXISTS idx_product_waitlist_product_id ON product_waitlist(product_id);

-- Enable RLS
ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (customers submitting waitlist)
CREATE POLICY "Allow public insert to product_waitlist" ON product_waitlist
  FOR INSERT WITH CHECK (true);

-- Allow admins to read/update
CREATE POLICY "Allow admin full access to product_waitlist" ON product_waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 2. Add target_user_id column to coupons table if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='coupons' AND column_name='target_user_id'
    ) THEN
        ALTER TABLE coupons ADD COLUMN target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
