-- ============================================================
--  Pizza Expert Prayagraj – Seed Data
--  Run AFTER 001_initial_schema.sql
-- ============================================================

-- ─── CATEGORIES ─────────────────────────────────────────────
INSERT INTO categories (name, slug, sort_order, is_active) VALUES
  ('Pizzas',     'pizzas',     1, TRUE),
  ('Burgers',    'burgers',    2, TRUE),
  ('Pasta',      'pasta',      3, TRUE),
  ('Sandwiches', 'sandwiches', 4, TRUE),
  ('Sides',      'sides',      5, TRUE),
  ('Beverages',  'beverages',  6, TRUE),
  ('Combos',     'combos',     7, TRUE),
  ('Desserts',   'desserts',   8, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ─── PRODUCTS ───────────────────────────────────────────────
-- (Replace with real prices/descriptions before launch)

-- Pizzas
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Margherita Pizza', 'margherita-pizza',
  'Classic margherita with rich tomato sauce, fresh mozzarella, and aromatic basil leaves on our signature crust.',
  249, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='pizzas'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Paneer Tikka Pizza', 'paneer-tikka-pizza',
  'Marinated paneer, capsicum, onion, and spicy tikka sauce on a cheesy base — a pure vegetarian delight.',
  349, TRUE, TRUE,
  (SELECT id FROM categories WHERE slug='pizzas'), 2;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Chicken Supreme Pizza', 'chicken-supreme-pizza',
  'Loaded with tender chicken, mushrooms, olives, capsicum, and our house pizza sauce.',
  399, FALSE, FALSE,
  (SELECT id FROM categories WHERE slug='pizzas'), 3;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Farm House Pizza', 'farm-house-pizza',
  'Fresh vegetables including capsicum, onion, tomato, and golden corn on a cheesy tomato base.',
  299, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='pizzas'), 4;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Peri Peri Chicken Pizza', 'peri-peri-chicken-pizza',
  'Spicy peri peri marinated chicken with our signature sauce, jalapeños, and extra cheese.',
  429, FALSE, TRUE,
  (SELECT id FROM categories WHERE slug='pizzas'), 5;

-- Burgers
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Veg Crispy Burger', 'veg-crispy-burger',
  'Crispy breaded veggie patty with lettuce, tomato, cheese, and our special burger sauce.',
  149, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='burgers'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Chicken Zinger Burger', 'chicken-zinger-burger',
  'Juicy fried chicken fillet with coleslaw, pickles, and spicy mayo in a toasted bun.',
  199, FALSE, TRUE,
  (SELECT id FROM categories WHERE slug='burgers'), 2;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Double Chicken Patty Burger', 'double-chicken-patty-burger',
  'Two juicy chicken patties, double cheese, lettuce, and our smoky BBQ sauce.',
  259, FALSE, FALSE,
  (SELECT id FROM categories WHERE slug='burgers'), 3;

-- Pasta
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Penne Arrabiata', 'penne-arrabiata',
  'Classic Italian-style penne in a spicy tomato sauce with garlic, chili, and fresh herbs.',
  199, TRUE, TRUE,
  (SELECT id FROM categories WHERE slug='pasta'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Chicken Alfredo Pasta', 'chicken-alfredo-pasta',
  'Creamy white sauce pasta with grilled chicken strips, mushrooms, and Parmesan cheese.',
  249, FALSE, FALSE,
  (SELECT id FROM categories WHERE slug='pasta'), 2;

-- Sides
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Garlic Bread', 'garlic-bread',
  'Toasted bread with garlic butter and herbs. The perfect pizza companion.',
  99, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='sides'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'French Fries', 'french-fries',
  'Crispy golden fries seasoned with our signature spice blend.',
  99, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='sides'), 2;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Peri Peri Fries', 'peri-peri-fries',
  'Crispy fries tossed in our spicy peri peri seasoning. Addictively good!',
  119, TRUE, TRUE,
  (SELECT id FROM categories WHERE slug='sides'), 3;

-- Beverages
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Coca-Cola (330ml)', 'coca-cola-330ml',
  'Ice-cold Coca-Cola, the perfect pairing for your pizza.',
  60, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='beverages'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Mango Lassi', 'mango-lassi',
  'Creamy, chilled mango lassi made with fresh yogurt and real mangoes.',
  89, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='beverages'), 2;

-- Combos
INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Family Feast Combo', 'family-feast-combo',
  '2 Large Pizzas + Garlic Bread + 4 Coca-Colas. Perfect for family gatherings!',
  899, TRUE, FALSE,
  (SELECT id FROM categories WHERE slug='combos'), 1;

INSERT INTO products (name, slug, description, price, is_veg, is_spicy, category_id, sort_order)
SELECT 
  'Burger Meal Combo', 'burger-meal-combo',
  '1 Chicken Zinger Burger + Peri Peri Fries + Coca-Cola. A complete meal!',
  329, FALSE, TRUE,
  (SELECT id FROM categories WHERE slug='combos'), 2;

-- ─── PRODUCT OPTIONS (Size & Crust for Pizzas) ──────────────
INSERT INTO product_options (product_id, name, choices)
SELECT id, 'Size', '[
  {"label": "Regular (8\")", "price_delta": 0},
  {"label": "Medium (10\")", "price_delta": 80},
  {"label": "Large (12\")", "price_delta": 150}
]'::jsonb
FROM products WHERE category_id = (SELECT id FROM categories WHERE slug='pizzas');

INSERT INTO product_options (product_id, name, choices)
SELECT id, 'Crust', '[
  {"label": "Thin Crust", "price_delta": 0},
  {"label": "Cheese Burst", "price_delta": 60},
  {"label": "Stuffed Crust", "price_delta": 50}
]'::jsonb
FROM products WHERE category_id = (SELECT id FROM categories WHERE slug='pizzas');

-- ─── COUPONS ────────────────────────────────────────────────
INSERT INTO coupons (code, type, value, min_order, max_usage, active) VALUES
  ('WELCOME20', 'percentage', 20, 299, 1, TRUE),
  ('FLAT50',    'fixed',      50, 399, NULL, TRUE),
  ('PIZZA10',   'percentage', 10, 199, NULL, TRUE)
ON CONFLICT (code) DO NOTHING;

-- ─── SETTINGS ───────────────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('business_name',    '"Pizza Expert Prayagraj"'),
  ('tagline',          '"Love at First Slice"'),
  ('phone',            '"+91-9999999999"'),
  ('whatsapp',         '"919999999999"'),
  ('email',            '"info@pizzaexpert.in"'),
  ('address',          '"Allapur, Prayagraj, Uttar Pradesh 211006"'),
  ('hours',            '{"mon_fri": "11:00 AM – 11:00 PM", "sat_sun": "10:00 AM – 11:30 PM"}'),
  ('delivery_fee',     '30'),
  ('free_delivery_above', '499'),
  ('tax_rate',         '5'),
  ('google_rating',    '4.9'),
  ('google_review_count', '500')
ON CONFLICT (key) DO NOTHING;
