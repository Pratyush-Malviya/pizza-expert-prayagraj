-- ============================================================
-- Migration: 022_fix_profiles_stores_taxes.sql
-- Fixes:
--  1. profiles table sync & missing record backfill for auth.users
--  2. stores & store_staff tables creation and public RLS
--  3. tax_groups & tax_rates tables creation and default GST seed
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. PROFILES SYNC & FOREIGN KEY SAFETY ──────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure profiles table exists with valid constraints
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  invite_status TEXT DEFAULT 'accepted',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure profiles role check is updated
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'manager', 'staff', 'cashier', 'waiter', 'kitchen', 'driver', 'viewer', 'customer', 'inventory_manager', 'kitchen_manager', 'accountant', 'admin'));

-- Ensure trigger handles user creation safely without foreign key conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role TEXT;
  full_name TEXT;
BEGIN
  IF NEW.email = 'malviya.pratyush26@gmail.com' OR NEW.raw_user_meta_data->>'role' = 'super_admin' THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  END IF;

  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'User'
  );

  INSERT INTO public.profiles (id, name, phone, role, is_active, loyalty_points)
  VALUES (
    NEW.id,
    full_name,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL),
    assigned_role,
    TRUE,
    50
  )
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
    role = CASE WHEN EXCLUDED.role = 'super_admin' THEN 'super_admin' ELSE public.profiles.role END,
    is_active = TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any missing profiles for existing auth.users
INSERT INTO public.profiles (id, name, phone, role, is_active, loyalty_points)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'User'),
  u.phone,
  CASE WHEN u.email = 'malviya.pratyush26@gmail.com' THEN 'super_admin' ELSE COALESCE(u.raw_user_meta_data->>'role', 'customer') END,
  TRUE,
  50
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. STORES & MULTI-STORE BASE ────────────────────────────

CREATE TABLE IF NOT EXISTS public.stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  geo_coordinates JSONB,
  timezone        TEXT DEFAULT 'Asia/Kolkata',
  active          BOOLEAN DEFAULT TRUE,
  owner_id        UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.store_staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('manager', 'staff', 'kitchen', 'cashier', 'driver', 'inventory_manager', 'kitchen_manager', 'accountant')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- Seed default primary store
INSERT INTO public.stores (name, address, geo_coordinates, timezone, active)
SELECT 
  'Pizza Expert - Allapur',
  'Allapur, Prayagraj, Uttar Pradesh 211006',
  '{"lat": 25.4484, "lng": 81.8687}'::jsonb,
  'Asia/Kolkata',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.stores LIMIT 1);

-- Enable RLS for stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
CREATE POLICY "Public can view active stores" ON public.stores
  FOR SELECT USING (active = TRUE);

DROP POLICY IF EXISTS "Admins manage stores" ON public.stores;
CREATE POLICY "Admins manage stores" ON public.stores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'manager', 'admin'))
  );

DROP POLICY IF EXISTS "Staff view store assignments" ON public.store_staff;
CREATE POLICY "Staff view store assignments" ON public.store_staff
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage store staff" ON public.store_staff;
CREATE POLICY "Admins manage store staff" ON public.store_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'manager', 'admin'))
  );

-- ─── 3. TAX GROUPS & TAX RATES (Tax Engine) ─────────────────

CREATE TABLE IF NOT EXISTS public.tax_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tax_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tax_group_id    UUID NOT NULL REFERENCES public.tax_groups(id) ON DELETE CASCADE,
  component_name  TEXT NOT NULL,
  rate            NUMERIC(5,2) NOT NULL,
  is_inclusive    BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE
);

-- Seed GST 5% default tax group
INSERT INTO public.tax_groups (name, description, is_default, is_active)
VALUES ('GST 5%', 'CBIC Restaurant Service GST Rate (2.5% CGST + 2.5% SGST)', TRUE, TRUE)
ON CONFLICT (name) DO UPDATE SET is_active = TRUE, is_default = TRUE;

-- Seed Tax Components for GST 5%
WITH g AS (
  SELECT id FROM public.tax_groups WHERE name = 'GST 5%' LIMIT 1
)
INSERT INTO public.tax_rates (tax_group_id, component_name, rate, is_inclusive, effective_from)
SELECT g.id, 'CGST', 2.5, FALSE, '2024-01-01' FROM g
WHERE NOT EXISTS (
  SELECT 1 FROM public.tax_rates tr WHERE tr.tax_group_id = g.id AND tr.component_name = 'CGST'
);

WITH g AS (
  SELECT id FROM public.tax_groups WHERE name = 'GST 5%' LIMIT 1
)
INSERT INTO public.tax_rates (tax_group_id, component_name, rate, is_inclusive, effective_from)
SELECT g.id, 'SGST', 2.5, FALSE, '2024-01-01' FROM g
WHERE NOT EXISTS (
  SELECT 1 FROM public.tax_rates tr WHERE tr.tax_group_id = g.id AND tr.component_name = 'SGST'
);

-- Enable RLS for tax tables
ALTER TABLE public.tax_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tax_groups" ON public.tax_groups;
CREATE POLICY "Public read tax_groups" ON public.tax_groups
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage tax_groups" ON public.tax_groups;
CREATE POLICY "Admins manage tax_groups" ON public.tax_groups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'manager', 'admin'))
  );

DROP POLICY IF EXISTS "Public read tax_rates" ON public.tax_rates;
CREATE POLICY "Public read tax_rates" ON public.tax_rates
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage tax_rates" ON public.tax_rates;
CREATE POLICY "Admins manage tax_rates" ON public.tax_rates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'manager', 'admin'))
  );
