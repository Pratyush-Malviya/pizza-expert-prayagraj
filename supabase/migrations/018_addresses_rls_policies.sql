-- ==============================================================================
-- 018_addresses_rls_policies.sql
-- Row Level Security (RLS) Policies for Addresses Table
-- ==============================================================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Drop legacy or conflicting policies
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;
DROP POLICY IF EXISTS "Service role has full access to addresses" ON addresses;
DROP POLICY IF EXISTS "Enable all access for users on their own addresses" ON addresses;

-- Allow authenticated users to view their own saved addresses
CREATE POLICY "Users can view own addresses"
ON addresses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own addresses
CREATE POLICY "Users can insert own addresses"
ON addresses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own addresses
CREATE POLICY "Users can update own addresses"
ON addresses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own addresses
CREATE POLICY "Users can delete own addresses"
ON addresses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role full access for backend API actions and webhooks
CREATE POLICY "Service role has full access to addresses"
ON addresses FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
