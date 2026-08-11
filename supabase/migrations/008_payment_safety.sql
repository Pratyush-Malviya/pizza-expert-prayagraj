-- ============================================================
--  008_payment_safety.sql
--  Sprint 1: Payment Safety & COD Fraud Gate
-- ============================================================

-- ─── 1. IDEMPOTENCY: Unique constraint on gateway_payment_id ──
-- Prevents duplicate Razorpay webhooks from double-confirming orders
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;

-- Create unique index (won't fail if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'payments'
    AND indexname = 'payments_gateway_payment_id_unique'
  ) THEN
    CREATE UNIQUE INDEX payments_gateway_payment_id_unique
      ON payments (gateway_payment_id)
      WHERE gateway_payment_id IS NOT NULL;
  END IF;
END$$;

-- ─── 2. COD PENDING STATE: Add to orders status check ──────────
-- Extend the status enum/check to allow 'cod_pending'
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'cod_pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded'
  ));

-- ─── 3. REFUND REQUESTS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_gateway     TEXT NOT NULL DEFAULT 'razorpay',
  gateway_refund_id   TEXT,
  gateway_payment_id  TEXT,
  amount              NUMERIC(10, 2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  reason              TEXT,
  initiated_by        UUID REFERENCES profiles(id),
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One refund request per order (prevent duplicate refunds)
CREATE UNIQUE INDEX IF NOT EXISTS refund_requests_order_unique
  ON refund_requests (order_id)
  WHERE status IN ('pending', 'processing', 'processed');

-- Enable RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage refund_requests"
  ON refund_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'manager')
    )
  );

-- ─── 4. COD CASH RECONCILIATION FIELD ──────────────────────────
-- Track whether driver collected & remitted COD cash
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS cod_collected_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS cod_remitted_at TIMESTAMPTZ;
