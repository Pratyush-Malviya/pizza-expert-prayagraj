-- ==============================================================================
-- 019_order_delivery_reviews.sql
-- Enhanced Order Delivery Reviews, Ratings, and Feedback
-- ==============================================================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS delivery_rating INTEGER;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);

-- Ensure public/authenticated customers can submit reviews upon order delivery
DROP POLICY IF EXISTS "Public insert reviews" ON reviews;
CREATE POLICY "Public insert reviews"
ON reviews FOR INSERT
TO public
WITH CHECK (true);
