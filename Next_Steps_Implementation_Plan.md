# Pizza Ordering Platform — Next-Step Feature Implementation Plan

**Owner:** Pratyush Malviya
**Platform:** pizza-kappa-nine.vercel.app
**Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS + Realtime), Razorpay, Leaflet/OSM, Resend, TypeScript + Zod, Tailwind CSS + PWA

This plan covers the two roadmap items called out publicly: **Multi-Store Management** (in progress) and **AI-Powered Features** (planned). Each section breaks the work into phases with scope, data model changes, and suggested technical approach.

---

## Phase 1 — Multi-Store Management (In Progress)

**Goal:** One owner dashboard to run multiple store locations from a single platform, without duplicating code or data per store.

### 1.1 Data Model Changes
- Introduce a `stores` table (id, name, address, geo-coordinates, timezone, active status, owner_id).
- Add `store_id` as a foreign key across existing tables that are currently single-store: `orders`, `menu_items`, `inventory`, `riders`, `coupons`, `admin_action_log`.
- Update Supabase RLS policies so every read/write is scoped by `store_id` in addition to existing role checks — a manager for Store A should never see Store B's orders.
- Add a `store_staff` join table (user_id, store_id, role) to support staff assigned to one or more locations.

### 1.2 Shared Menu Templates
- Add a `menu_templates` table at the owner level; individual stores can either inherit a template directly or override specific items (price, availability) via a `store_menu_overrides` table.
- Build a simple "apply template to store" action in the admin panel.

### 1.3 Per-Store Inventory & Pricing
- Extend inventory tracking to be store-scoped (each store has its own stock counts, not shared).
- Pricing can differ per store (e.g., delivery zone cost differences) via the override table above.

### 1.4 Cross-Store Fleet Visibility
- Extend the existing fleet radar (Leaflet-based live map) to filter by store or show all stores at once for the owner view.
- Riders remain store-scoped for dispatch, but the owner role can see aggregate fleet status.

### 1.5 Consolidated Sales Analytics
- Build an owner-level analytics view that aggregates across `store_id` — daily/weekly/monthly revenue, top items, and COD reconciliation status per store.
- Reuse the existing audit log and reporting patterns, just add a store filter/group-by.

### 1.6 Store Switcher UI
- Add a store-switcher dropdown in the admin panel header for owners/managers with multi-store access.
- Persist the selected store in session so KDS, dispatch, and payments screens stay scoped correctly.

### Suggested Sequencing
1. Schema migration (`stores`, `store_id` FKs, RLS updates) — foundational, do first.
2. Store-scoped admin views (orders, KDS, fleet) — validates the data model end-to-end.
3. Shared menu templates + overrides.
4. Consolidated analytics (needs data from multiple live stores to be meaningful).

---

## Phase 2 — AI-Powered Features (Planned)

**Goal:** Layer intelligence on top of the existing platform — for the store owner and for the customer — without disrupting the current order lifecycle.

### 2.1 For the Store Owner

**Demand Forecasting**
- Feed historical order data (time of day, day of week, weather if available) into a forecasting model.
- Start simple: a scheduled job that computes moving averages per hour-of-week per store; iterate toward a proper time-series model later if needed.
- Surface results as a "predicted busy hours" widget on the owner dashboard.

**Smart Inventory Alerts**
- Compare current stock levels against forecasted demand to flag items likely to run out before the next restock window.
- Trigger a Resend email/notification when an item crosses a low-stock threshold adjusted for predicted demand.

**Ask-Your-Data Assistant**
- Natural-language querying over the store's own sales data.
- Suggested approach: an API endpoint that takes the owner's question, generates a scoped SQL query against Supabase (read-only, store-scoped), and passes the query results to an LLM (Claude API or Gemini API) to produce a plain-language answer.
- Keep the query generation constrained to a fixed set of safe, pre-approved query templates initially to avoid open-ended SQL generation risk.

**Dynamic Promotions**
- Use the same demand-forecasting data to identify predictably slow windows (e.g., Tuesday 3–5 PM) or slow-moving menu items.
- Suggest (not auto-apply) time-based discount ideas to the owner, who approves before anything goes live — keeps a human in the loop for pricing changes.

### 2.2 For the Customer

**AI Ordering Assistant (Chat / WhatsApp)**
- Natural-language ordering: "large veg pizza, extra cheese, in 30 mins" maps to a structured order via LLM function-calling against the existing menu/cart API.
- Leverage the WhatsApp Business API for a WhatsApp-native ordering flow, alongside an in-app chat widget for the web storefront.
- Reuse the existing checkout, payment (Razorpay), and OTP-verification flow underneath — the assistant is a new front door, not a new order pipeline.

**Personalized Picks**
- Simple first pass: recommend based on the customer's own order history (most-ordered items, common customizations).
- Later iteration: collaborative filtering across similar customers if order volume supports it.

**Instant Support Chatbot**
- Scoped chatbot answering order-status, menu, and allergen questions from existing structured data (order table, menu metadata) — not open-ended, to avoid incorrect answers about allergens specifically, which needs to be reliable.
- Escalate to a human (store contact) for anything outside the scoped question set.

**Smarter Delivery ETAs**
- Combine live GPS data (already tracked) with historical delivery-time patterns per route/time-of-day to improve on the current static ETA estimate.

### Suggested Sequencing
1. Instant Support Chatbot — lowest risk, clear scope, reuses existing structured data.
2. AI Ordering Assistant (start with web chat, then WhatsApp) — highest customer-facing value.
3. Personalized Picks — needs enough order history to be useful, so let data accumulate first.
4. Demand Forecasting + Smart Inventory Alerts — owner-side, can develop in parallel with customer-side work.
5. Ask-Your-Data Assistant — depends on demand-forecasting data pipeline being in place.
6. Dynamic Promotions — depends on demand forecasting being validated first.
7. Smarter Delivery ETAs — refinement on top of existing GPS tracking, lower priority.

---

## Cross-Cutting Considerations

- **Security:** Any new AI endpoints must go through the same RBAC and RLS enforcement already in place — an AI assistant should never bypass store-scoping or role checks.
- **Cost control:** LLM calls (Claude/Gemini/OpenAI) should be rate-limited per user and cached where possible (e.g., repeated FAQ-style questions) to keep inference costs predictable.
- **Fallback behavior:** Every AI feature needs a clear fallback to the existing manual flow (menu browsing, human support contact) if the AI path fails or times out.
- **Audit logging:** AI-assisted actions that touch orders, pricing, or inventory should log through the existing `admin_action_log` pattern for traceability.

---

## Open Questions to Resolve Before Building
- Which LLM provider (Claude API, Gemini API, or OpenAI API) will be the primary one for the ordering assistant and support chatbot?
- Should the WhatsApp ordering assistant launch before or after the in-app chat version?
- What's the minimum order-history threshold before Personalized Picks should activate for a customer?
- Does multi-store rollout need to be feature-complete before AI features go live, or can they ship in parallel on the current single-store base and be retrofitted for multi-store later?
