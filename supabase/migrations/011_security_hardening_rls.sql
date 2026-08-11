-- 011_security_hardening_rls.sql

-- 1. Redefine helper functions securely with SET search_path = public and is_active check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin','manager','staff','viewer')
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_active = true
    AND role = 'super_admin'
  );
$$;

-- Create has_role helper
CREATE OR REPLACE FUNCTION has_role(allowed_roles text[])
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_active = true
    AND role = ANY(allowed_roles)
  );
$$;


-- 2. Drop insecure policies
DROP POLICY IF EXISTS "Public can read settings" ON settings;
DROP POLICY IF EXISTS "Super admin can manage settings" ON settings;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Service can insert order items" ON order_items;
DROP POLICY IF EXISTS "Service manages cache" ON external_cache;
DROP POLICY IF EXISTS "Auth users can read coupons" ON coupons;
DROP POLICY IF EXISTS "Public read coupons" ON coupons;

-- Drop all the dangerous USING (TRUE) policies from later migrations
DROP POLICY IF EXISTS "Admins manage tax_invoices" ON tax_invoices;
DROP POLICY IF EXISTS "Admins manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins manage purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admins manage staff_shifts" ON staff_shifts;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users manage own cart_sessions" ON cart_sessions;
DROP POLICY IF EXISTS "Admins manage notification_logs" ON notification_logs;
DROP POLICY IF EXISTS "Admins manage ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins manage recipe_items" ON recipe_items;


-- 3. Recreate policies securely

-- Settings
CREATE POLICY "Admins view settings" ON settings FOR SELECT USING (is_admin());
CREATE POLICY "Super admin manage settings" ON settings FOR ALL USING (is_super_admin());

-- External cache
CREATE POLICY "Super admin manages cache" ON external_cache FOR ALL USING (is_super_admin());

-- Coupons
CREATE POLICY "Admins view coupons" ON coupons FOR SELECT USING (is_admin());

-- Admin-managed tables
CREATE POLICY "Admins manage tax_invoices" ON tax_invoices FOR ALL USING (is_admin());
CREATE POLICY "Admins manage suppliers" ON suppliers FOR ALL USING (is_admin());
CREATE POLICY "Admins manage purchase_orders" ON purchase_orders FOR ALL USING (is_admin());
CREATE POLICY "Admins manage staff_shifts" ON staff_shifts FOR ALL USING (is_admin());
CREATE POLICY "Admins manage notification_logs" ON notification_logs FOR ALL USING (is_admin());
CREATE POLICY "Admins manage ingredients" ON ingredients FOR ALL USING (is_admin());
CREATE POLICY "Admins manage recipe_items" ON recipe_items FOR ALL USING (is_admin());

-- User-managed tables (must verify ownership!)
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own cart_sessions" ON cart_sessions FOR ALL USING (user_id = auth.uid());

-- Driver location ownership
CREATE POLICY "Drivers manage own locations" ON driver_locations FOR ALL USING (driver_id = auth.uid());
CREATE POLICY "Admins view all driver locations" ON driver_locations FOR SELECT USING (is_admin());


-- 4. Create coupon validation function (server-authoritative)
CREATE OR REPLACE FUNCTION validate_coupon(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_coupon FROM coupons WHERE code = UPPER(p_code) AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "error": "Invalid coupon code"}'::jsonb;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN '{"valid": false, "error": "Coupon has expired"}'::jsonb;
  END IF;
  
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
    RETURN '{"valid": false, "error": "Coupon usage limit reached"}'::jsonb;
  END IF;

  -- Do not return sensitive fields
  v_result := jsonb_build_object(
    'valid', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'min_order_amount', v_coupon.min_order_amount,
    'max_discount', v_coupon.max_discount
  );

  RETURN v_result;
END;
$$;

-- 5. Auto-assign super_admin role for primary owner email on signup or migration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  IF NEW.email = 'malviya.pratyush26@gmail.com' OR NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  END IF;

  INSERT INTO profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    assigned_role,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    role = CASE WHEN EXCLUDED.role = 'super_admin' THEN 'super_admin' ELSE profiles.role END,
    is_active = TRUE;
  RETURN NEW;
END;
$$;

-- Retroactively set super_admin for primary owner if account exists
UPDATE profiles
SET role = 'super_admin', is_active = TRUE
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'malviya.pratyush26@gmail.com'
);

