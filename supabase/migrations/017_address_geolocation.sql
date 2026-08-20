-- ============================================================
--  017 — Address Geolocation & Enhanced Fields
--  Adds GPS coordinates, address type, landmark, and phone
--  to the addresses table.
-- ============================================================

-- Add new columns to addresses table (safe: IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='addresses' AND column_name='latitude'
  ) THEN
    ALTER TABLE addresses
      ADD COLUMN latitude  NUMERIC(10,7),
      ADD COLUMN longitude NUMERIC(10,7),
      ADD COLUMN address_type TEXT NOT NULL DEFAULT 'home'
        CHECK (address_type IN ('home','work','partner','hotel','other')),
      ADD COLUMN phone       TEXT,
      ADD COLUMN landmark    TEXT,
      ADD COLUMN is_gps_captured BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Index for geolocation-based queries (future)
CREATE INDEX IF NOT EXISTS idx_addresses_user_default
  ON addresses(user_id, is_default);

-- Comment documentation
COMMENT ON COLUMN addresses.address_type     IS 'Address category: home, work, partner, hotel, other';
COMMENT ON COLUMN addresses.latitude         IS 'GPS latitude captured from browser geolocation';
COMMENT ON COLUMN addresses.longitude        IS 'GPS longitude captured from browser geolocation';
COMMENT ON COLUMN addresses.landmark         IS 'Optional nearby landmark for delivery rider';
COMMENT ON COLUMN addresses.phone            IS 'Optional per-address contact phone override';
COMMENT ON COLUMN addresses.is_gps_captured  IS 'TRUE when address was auto-filled via GPS + reverse geocode';
