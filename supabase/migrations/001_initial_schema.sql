-- ============================================================
--  Pizza Expert Prayagraj – Supabase SQL Migration
--  Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES (extends Supabase auth.users) ──────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'customer'
                  CHECK (role IN ('super_admin','manager','staff','viewer','customer')),
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 2. CATEGORIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. PRODUCTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  price        NUMERIC(10,2) NOT NULL,
  is_veg       BOOLEAN NOT NULL DEFAULT TRUE,
  is_spicy     BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nutrition    JSONB,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. PRODUCT IMAGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ─── 5. PRODUCT OPTIONS ─────────────────────────────────────
-- e.g. Size: [{label:"Regular", price_delta:0}, {label:"Large", price_delta:50}]
CREATE TABLE IF NOT EXISTS product_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,   -- "Size", "Crust", "Extras"
  choices     JSONB NOT NULL   -- [{label, price_delta}]
);

-- ─── 6. ADDRESSES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT NOT NULL DEFAULT 'Home',
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'Uttar Pradesh',
  pincode     TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 7. COUPONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('percentage','fixed')),
  value       NUMERIC(10,2) NOT NULL,
  min_order   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_usage   INTEGER,
  used_count  INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. ORDERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled','refunded')),
  subtotal      NUMERIC(10,2) NOT NULL,
  tax           NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total         NUMERIC(10,2) NOT NULL,
  coupon_id     UUID REFERENCES coupons(id) ON DELETE SET NULL,
  address_json  JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. ORDER ITEMS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       NUMERIC(10,2) NOT NULL,
  selected_options JSONB
);

-- ─── 10. PAYMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway             TEXT NOT NULL CHECK (gateway IN ('razorpay','cashfree','cod')),
  gateway_order_id    TEXT,
  gateway_payment_id  TEXT,
  amount              NUMERIC(10,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','failed','refunded')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 11. REVIEWS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ─── 12. BLOG POSTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  content      TEXT NOT NULL DEFAULT '',
  excerpt      TEXT,
  cover_image  TEXT,
  author_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 13. GALLERY ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url   TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 14. SETTINGS (key-value store) ─────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 15. AUDIT LOGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 16. CACHE TABLE (Google Reviews + Instagram) ────────────
CREATE TABLE IF NOT EXISTS external_cache (
  key         TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);

-- ============================================================
--  ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery          ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_cache   ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin','manager','staff','viewer')
  );
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- profiles
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());

-- categories & products — public read, admin write
CREATE POLICY "Public can read categories"    ON categories FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage categories"  ON categories FOR ALL USING (is_admin());
CREATE POLICY "Public can read products"      ON products FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage products"    ON products FOR ALL USING (is_admin());
CREATE POLICY "Public can read product_images" ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage product_images" ON product_images FOR ALL USING (is_admin());
CREATE POLICY "Public can read product_options" ON product_options FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage product_options" ON product_options FOR ALL USING (is_admin());

-- addresses — own rows only
CREATE POLICY "Users manage own addresses"   ON addresses FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins view all addresses"    ON addresses FOR SELECT USING (is_admin());

-- coupons
CREATE POLICY "Auth users can read coupons"  ON coupons FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage coupons"    ON coupons FOR ALL USING (is_admin());

-- orders — owner or admin
CREATE POLICY "Users view own orders"        ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert orders"      ON orders FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins manage all orders"     ON orders FOR ALL USING (is_admin());

-- order_items
CREATE POLICY "Users view own order items"   ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Service can insert order items" ON order_items FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins manage order items"    ON order_items FOR ALL USING (is_admin());

-- payments
CREATE POLICY "Users view own payments"      ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Service can manage payments"  ON payments FOR ALL USING (is_admin());

-- reviews
CREATE POLICY "Public can read approved reviews" ON reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Auth users can insert reviews"    ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage all reviews"        ON reviews FOR ALL USING (is_admin());

-- blog_posts
CREATE POLICY "Public can read published posts"  ON blog_posts FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admins manage blog posts"         ON blog_posts FOR ALL USING (is_admin());

-- gallery
CREATE POLICY "Public can read gallery"      ON gallery FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage gallery"        ON gallery FOR ALL USING (is_admin());

-- settings
CREATE POLICY "Public can read settings"     ON settings FOR SELECT USING (TRUE);
CREATE POLICY "Super admin can manage settings" ON settings FOR ALL USING (is_super_admin());

-- audit_logs & external_cache — admin only
CREATE POLICY "Admins view audit logs"       ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "Service inserts audit logs"   ON audit_logs FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Service manages cache"        ON external_cache FOR ALL USING (TRUE);

-- ============================================================
--  INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug        ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user          ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product      ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug      ON blog_posts(slug);

-- ============================================================
--  ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
