# Pizza Expert Prayagraj — Platform Gap Analysis & Implementation Roadmap

**Document type:** Product & Engineering Roadmap
**Companion to:** `pizza_expert_prd.md`
**Purpose:** Identify what the current platform already covers, what's missing to make restaurant operations easier and customer experience better, and provide a detailed, phased implementation plan.

---

## 1. What We Already Have (Baseline from PRD)

This is the current scope, confirmed and built (or specced) in the PRD.

### 1.1 Frontend
- Next.js 16.3 App Router, React 19.2, Tailwind CSS v4
- Zustand for global state (cart, notifications)
- Radix UI primitives, React Hook Form + Zod validation
- Framer Motion animations, Sonner toasts, Lucide icons
- Recharts for admin visualizations

### 1.2 Backend / Data
- Supabase (PostgreSQL, Auth, Realtime via `postgres_changes`)
- Core schema: Profiles, Categories, Products, Product Options, Orders, Order Items, Payments, Deliveries, Coupons, Reviews, Blog/Gallery
- RLS-based RBAC (`super_admin`, `manager`, `staff`, `viewer`, `customer`)

### 1.3 Customer-Facing Features
- Home/discovery: hero banners, category highlights, social proof (Google reviews, Instagram feed)
- SEO: sitemaps, JSON-LD structured data, FAQ, policy pages
- Menu: veg filter, sort by popularity/price, granular product customization (size, crust, toppings) with dynamic pricing
- Cart & checkout: persistent client-side cart, coupon engine, Google Places address autocomplete, saved addresses
- Payments: Razorpay, Cashfree, Cash on Delivery
- Order tracking: live timeline (Confirmed → Preparing → Out for Delivery → Delivered)

### 1.4 Admin / Staff Features
- Live order feed with realtime push, desktop notifications, audio chimes
- Kitchen Display System (KDS) — tablet-optimized, station views, timers
- Delivery dispatch board, driver status tracking
- Catalog CMS — product CRUD, option/choice builder
- Coupon engine (percentage/flat discounts)
- Customer database (order history, LTV, loyalty points — flat, not tiered)
- Uniform light-theme admin design system

### 1.5 Integrations
- Supabase (BaaS), Razorpay/Cashfree, Google Maps/Places, WhatsApp via `wa.me` links (not API)

### 1.6 Security
- RLS policies, environment-variable key management, data purge tooling for pre-launch cleanup

**Summary:** The platform is a solid, modern **direct-ordering + kitchen-ops** system. It is *not yet* a full restaurant-management system — it's missing the financial, inventory, staffing, multi-channel, and retention layers that determine whether the owner actually saves time and money versus running Zomato/Swiggy plus a notebook.

---

## 2. What's Missing — Organized by Who It Helps

### 2.1 Owner / Business Operations (Highest ROI, Currently Absent)

| Gap | Current State | Needed |
|---|---|---|
| Financial/BI dashboard | Recharts exists but only for generic "admin dashboard analytics," no defined reports | Revenue trends, margin per item, CAC/LTV, direct-vs-aggregator comparison |
| Inventory management | Roadmapped for Phase 3 only | Ingredient-level stock, recipe mapping, auto-disable on stockout, expiry alerts |
| Staff scheduling | None | Shift planner, role assignment, attendance |
| Multi-channel order consolidation | None — only direct orders visible | Unified inbox for Zomato/Swiggy + direct, single KDS |
| GST/compliance | None | Auto invoice generation, tax ledger, exportable reports |
| Vendor/supplier management | None | Purchase orders, supplier payment tracking |
| Refund workflow | None | Approval flow, reason codes, reconciliation with payment gateway |

### 2.2 Customer Experience (Retention & Conversion)

| Gap | Current State | Needed |
|---|---|---|
| Personalization | None | Quick reorder, "frequently bought together" |
| Proactive communication | Only status timeline | SMS/email at each stage, delay alerts, post-delivery feedback ask |
| Retention automations | Coupon engine exists but manual | Abandoned cart recovery, win-back offers, birthday discounts |
| Loyalty depth | Flat point integer | Tiered system (Silver/Gold/VIP) with perks |
| Trust signals | Reviews + Instagram | Order counters, UGC photo uploads, video testimonials |
| Mobile-first checkout | Standard web checkout | Saved cards/UPI autopay, PWA install, push notifications |
| Dine-in / QR ordering | Not covered — delivery/takeaway only | Table QR ordering, reservations |
| Subscriptions | None | "Every Friday" recurring orders |

### 2.3 Kitchen / Delivery Operations

| Gap | Current State | Needed |
|---|---|---|
| Inventory-aware KDS | KDS shows items regardless of stock | Tie into inventory to prevent over-promising |
| Driver app | Dispatch board only (admin-side) | Dedicated driver PWA: accept trips, navigate, capture OTP/photo POD |
| Kitchen load balancing | None | Order-throttling / "kitchen busy" auto-toggle when order volume exceeds staff capacity |

---

## 3. Implementation Plan

Each phase below includes: **objective, features, technical approach, data model changes, effort estimate, and dependencies.** Phases are ordered by ROI-to-effort ratio, not strictly by "nice to have."

---

### Phase 1 — Financial Visibility & Inventory Foundation
**Timeline: 3–4 weeks | Priority: Critical (pre- or immediately post-launch)**

**Goal:** Give the owner the two things that most directly protect revenue — visibility into money and control over stock — before scaling order volume.

#### 1A. Financial / BI Dashboard
- **Features:**
  - Revenue graphs: daily / weekly / monthly (Recharts, already in stack)
  - Top 10 products by revenue and quantity
  - Order source breakdown (direct vs. future aggregator feed)
  - Average order value (AOV), discount cost tracking (coupon spend vs. revenue lift)
- **Technical approach:**
  - New Supabase views/materialized views: `daily_revenue_summary`, `product_performance_summary`
  - Scheduled Supabase Edge Function (cron) to refresh materialized views nightly
  - `/admin/analytics` route using existing Recharts setup
- **Data model changes:** No new core tables; add `cost_price` column to `PRODUCTS` (needed for margin calc in 1B)
- **Effort:** ~5–7 dev days

#### 1B. Inventory & Recipe Engine (pulled forward from PRD Phase 3)
- **Features:**
  - `INGREDIENTS` table (name, unit, current_stock, reorder_threshold, expiry_date)
  - `RECIPE_ITEMS` table mapping `PRODUCTS` → `INGREDIENTS` with quantity-per-unit
  - Auto-decrement stock on order confirmation
  - Auto-disable product (`is_available = false`) when any required ingredient falls below quantity needed for one unit
  - Low-stock and expiry alerts (in-app + email to manager)
- **Technical approach:**
  - Supabase database trigger on `ORDER_ITEMS` insert → decrement `INGREDIENTS.current_stock` via `RECIPE_ITEMS` join
  - Supabase Edge Function (cron, daily) checks expiry dates and thresholds, pushes to notification store
  - Admin UI: `/admin/inventory` with stock table, manual restock entry, low-stock banner
- **Data model changes:**
  ```
  INGREDIENTS (id, name, unit, current_stock, reorder_threshold, expiry_date, supplier_id FK)
  RECIPE_ITEMS (id, product_id FK, ingredient_id FK, quantity_required)
  ```
- **Effort:** ~7–9 dev days
- **Dependency:** Should ship before/alongside Phase 2's abandoned-cart logic, since disabled items affect cart validity

**Phase 1 total: ~2.5–3 weeks with 1 full-stack dev, or ~1.5 weeks with 2.**

---

### Phase 2 — Customer Retention & Communication
**Timeline: 3–4 weeks | Priority: High**

**Goal:** Turn one-time orders into repeat customers — the core reason to leave aggregator platforms.

#### 2A. Transactional & Retention Messaging
- **Features:**
  - Order confirmation, delay alert, and "out for delivery" SMS/email
  - Post-delivery feedback request (star rating + optional comment)
  - Abandoned cart recovery: cart idle 30 min → email/SMS with 5% recovery coupon
  - Win-back campaign: no order in 30 days → automated discount
  - Birthday offer: automated on `PROFILES.date_of_birth` (new field)
- **Technical approach:**
  - Integrate Twilio (SMS) and Resend or SendGrid (email)
  - Supabase Edge Functions triggered by:
    - DB webhook on `ORDERS.status` change → transactional messages
    - Cron job scanning `CARTS` (needs persistence — see below) for 30-min idle carts
    - Cron job scanning `PROFILES`/`ORDERS` for win-back and birthday triggers
  - New `CART_SESSIONS` table to persist carts server-side for abandoned-cart detection (current cart is client-only via Zustand)
- **Data model changes:**
  ```
  CART_SESSIONS (id, user_id FK nullable, items jsonb, last_updated, recovered boolean)
  PROFILES.date_of_birth (new column)
  NOTIFICATIONS_LOG (id, user_id FK, channel, template, sent_at, status)
  ```
- **Effort:** ~8–10 dev days

#### 2B. Loyalty Tier Upgrade
- **Features:** Convert flat `loyalty_points` into Silver/Gold/VIP tiers with perks (free delivery, early access to offers)
- **Technical approach:**
  - `LOYALTY_TIERS` table with thresholds and perks
  - Trigger recalculates tier on order completion
  - Display tier badge in customer account UI
- **Data model changes:**
  ```
  LOYALTY_TIERS (id, name, min_points, perks jsonb)
  PROFILES.tier_id FK
  ```
- **Effort:** ~3–4 dev days

#### 2C. Personalization & Trust
- **Features:** Quick-reorder button (last order replay), "frequently bought together" suggestions, order-count trust badge on homepage, UGC photo upload on reviews
- **Technical approach:**
  - Quick reorder: query last `ORDERS` + `ORDER_ITEMS` for user, prefill cart
  - Frequently bought together: simple co-occurrence query on `ORDER_ITEMS` (no ML needed initially)
  - Homepage counter: aggregate `COUNT(orders)` cached via materialized view from Phase 1A
  - UGC: extend `REVIEWS` table with `image_url`, use Supabase Storage
- **Data model changes:** `REVIEWS.image_url` (new column)
- **Effort:** ~5 dev days

**Phase 2 total: ~3.5 weeks with 1 dev, ~2 weeks with 2.**

---

### Phase 3 — Multi-Channel Operations & Compliance
**Timeline: 4–5 weeks | Priority: High (if owner still uses Zomato/Swiggy)**

**Goal:** Eliminate the "switching between 3 apps" problem and make the platform audit-ready.

#### 3A. Multi-Channel Order Consolidation
- **Features:** Unified order inbox pulling in Zomato/Swiggy orders alongside direct orders; single KDS regardless of source
- **Technical approach:**
  - Zomato and Swiggy both offer partner APIs/webhooks for order push (requires partner API access — owner must apply for API credentials through their aggregator dashboards)
  - New `ORDER_SOURCE` enum on `ORDERS` (`direct`, `zomato`, `swiggy`)
  - Webhook receiver Edge Functions normalize aggregator payloads into the existing `ORDERS`/`ORDER_ITEMS` schema
  - KDS and admin order feed already realtime — just needs source-agnostic ingestion
- **Data model changes:**
  ```
  ORDERS.source ENUM('direct','zomato','swiggy')
  ORDERS.external_order_id (nullable, for aggregator reference)
  ```
- **Effort:** ~10–12 dev days (variable — depends on aggregator API approval timelines, which are outside engineering control)
- **Risk/Dependency:** This phase depends on business-side approval from Zomato/Swiggy partner programs, not just engineering. Flag this early with the owner.

#### 3B. GST & Compliance
- **Features:** Auto-generated GST-compliant invoices per order, tax ledger export, printable receipts for delivery staff
- **Technical approach:**
  - PDF generation via a serverless function (e.g., using a PDF library) triggered on order completion
  - `TAX_INVOICES` table storing invoice number sequence (GST requires sequential, non-skipping numbering), GSTIN, tax breakdown
  - Admin export: CSV/PDF for a date range, ready for accountant handoff
- **Data model changes:**
  ```
  TAX_INVOICES (id, order_id FK, invoice_number, gstin, cgst, sgst, igst, generated_at)
  ```
- **Effort:** ~6–8 dev days
- **Note:** Recommend involving a local accountant to verify GST invoice format requirements before finalizing the template.

#### 3C. Vendor/Supplier Management (supports Phase 1B inventory)
- **Features:** Supplier directory, purchase orders, payment status tracking
- **Technical approach:** Standard CRUD module, links to `INGREDIENTS.supplier_id` from Phase 1B
- **Data model changes:**
  ```
  SUPPLIERS (id, name, contact, payment_terms)
  PURCHASE_ORDERS (id, supplier_id FK, status, total, ordered_at, received_at)
  ```
- **Effort:** ~5 dev days

**Phase 3 total: ~4–4.5 weeks with 1 dev (excluding aggregator approval wait time).**

---

### Phase 4 — Staffing, Dine-In & Driver Experience
**Timeline: 4–5 weeks | Priority: Medium**

#### 4A. Staff Scheduling
- **Features:** Shift planner, "who's on duty now" view, basic attendance log
- **Technical approach:** `STAFF_SHIFTS` table, simple calendar UI in admin, no external payroll integration in this phase (flagged as future/optional)
- **Data model changes:**
  ```
  STAFF_SHIFTS (id, profile_id FK, shift_start, shift_end, role, checked_in_at, checked_out_at)
  ```
- **Effort:** ~6 dev days

#### 4B. Dine-In / QR Table Ordering
- **Features:** QR code per table → mini-menu → order placed directly to KDS with table number, no delivery step
- **Technical approach:**
  - `TABLES` table with QR-encoded table ID
  - Reuse existing menu/cart/checkout flow with `order_type = 'dine_in'` and skip delivery-fee/address logic
- **Data model changes:**
  ```
  TABLES (id, table_number, qr_code_url, is_active)
  ORDERS.order_type ENUM('delivery','pickup','dine_in')
  ORDERS.table_id FK nullable
  ```
- **Effort:** ~7 dev days

#### 4C. Dedicated Driver PWA
- **Features:** Accept/reject trip, Google Maps navigation handoff, capture OTP and photo for proof of delivery
- **Technical approach:**
  - Lightweight PWA (can reuse Next.js app with a driver-specific route group, or separate lightweight app if driver devices are low-spec)
  - Realtime subscription to assigned deliveries via existing Supabase Realtime setup
  - Camera capture via browser `MediaDevices` API, upload to Supabase Storage
- **Data model changes:** `DELIVERIES.proof_photo_url`, `DELIVERIES.otp_verified_at`
- **Effort:** ~8–10 dev days

**Phase 4 total: ~4.5 weeks with 1 dev.**

---

### Phase 5 — Subscriptions, Refunds & AI Upsell
**Timeline: 3–4 weeks | Priority: Lower (post product-market fit on above)**

- **Recurring orders:** `SUBSCRIPTIONS` table (product/cart template, frequency, next_order_date), cron Edge Function to auto-create orders
- **Refund workflow:** `REFUND_REQUESTS` table with status (`requested`, `approved`, `processed`), linked to `PAYMENTS`, reconciled via Razorpay/Cashfree refund APIs
- **AI upsell:** Start rule-based (pair pizza category → drink category) using the co-occurrence query from Phase 2C before investing in an ML model — validate lift first
- **Effort:** ~10–12 dev days combined

---

## 4. Summary Timeline

| Phase | Focus | Duration | Priority |
|---|---|---|---|
| 1 | Financial dashboard + Inventory | 2.5–3 weeks | Critical |
| 2 | Retention messaging + Loyalty + Personalization | 3.5 weeks | High |
| 3 | Multi-channel orders + GST compliance + Vendors | 4–4.5 weeks | High |
| 4 | Staffing + Dine-in + Driver PWA | 4.5 weeks | Medium |
| 5 | Subscriptions + Refunds + AI upsell | 3–4 weeks | Lower |

**Total estimated timeline (sequential, 1 developer): ~18–20 weeks (~4.5 months)**
**With 2 developers working phases in parallel where dependencies allow: ~10–12 weeks (~2.5–3 months)**

---

## 5. Open Questions for the Owner (Resolve Before Phase 1)

1. Will Zomato/Swiggy continue to be used alongside the direct platform? (Determines urgency of Phase 3A)
2. Is dine-in a real use case, or delivery/takeaway only? (Determines whether Phase 4B is needed at all)
3. Who currently handles GST filing — in-house or an accountant? (Shapes invoice template requirements in Phase 3B)
4. What's the current biggest daily pain point — running out of stock, staffing chaos, or missed orders across platforms? (Can re-prioritize Phase 1 vs. Phase 3)
5. Any existing POS/accounting software in use that needs integration (Tally, Marg, etc.)?

---

## 6. Key Principle Guiding This Roadmap

Every feature above is scoped to answer one of two questions:
- **Does this save the owner time or protect their margin?** (Phases 1, 3, 4A)
- **Does this make a customer more likely to order again directly instead of through an aggregator?** (Phases 2, 4B, 5)

Features that don't clearly serve one of these two goals were deliberately left out of this roadmap, even if commonly seen in other restaurant platforms.
