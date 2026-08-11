-- ============================================================
--  007_user_management_foundation.sql
--  User Management Module Schema & Foundation
-- ============================================================

-- ─── 1. EXTEND PROFILES TABLE ────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_status TEXT CHECK (invite_status IN ('pending','accepted','expired')),
  ADD COLUMN IF NOT EXISTS failed_login_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"email_orders": true, "email_marketing": false, "sms_orders": true, "sms_marketing": false}'::jsonb;

-- Update role constraint to include 'driver'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','manager','staff','viewer','customer','driver'));

-- ─── 2. STAFF DETAILS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_details (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  department    TEXT,
  employee_code TEXT UNIQUE,
  hire_date     DATE,
  shift_pattern TEXT,
  hourly_rate   NUMERIC(10,2) DEFAULT 0.00,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. DRIVER DETAILS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_details (
  id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type        TEXT CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'ebike', 'other')) DEFAULT 'bike',
  vehicle_number      TEXT,
  license_number      TEXT,
  license_doc_url     TEXT,
  id_proof_url        TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  rejection_reason    TEXT,
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. AUDIT LOG TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  target_table  TEXT,
  target_id     TEXT,
  before        JSONB,
  after         JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. USER SESSIONS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- ─── 6. AUDIT LOG FUNCTION ────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit_event(
  p_actor_id UUID,
  p_action TEXT,
  p_target_table TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (actor_id, action, target_table, target_id, before, after, ip_address)
  VALUES (p_actor_id, p_action, p_target_table, p_target_id, p_before, p_after, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 7. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────
ALTER TABLE staff_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin/manager roles full access, staff read access
DROP POLICY IF EXISTS "Admins and managers manage staff details" ON staff_details;
CREATE POLICY "Admins and managers manage staff details" ON staff_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Staff view own details" ON staff_details;
CREATE POLICY "Staff view own details" ON staff_details
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins and managers manage driver details" ON driver_details;
CREATE POLICY "Admins and managers manage driver details" ON driver_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Drivers view own details" ON driver_details;
CREATE POLICY "Drivers view own details" ON driver_details
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins view audit log" ON audit_log;
CREATE POLICY "Admins view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users view own sessions" ON user_sessions;
CREATE POLICY "Users view own sessions" ON user_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all sessions" ON user_sessions;
CREATE POLICY "Admins manage all sessions" ON user_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'manager')
    )
  );
