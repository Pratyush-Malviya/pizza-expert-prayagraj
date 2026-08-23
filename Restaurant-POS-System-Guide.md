# Restaurant POS System — Complete Guide
### Dine-In, Takeaway & Delivery Workflows, Features, and UI Design

---

## 1. What a POS Actually Does

A restaurant POS (Point of Sale) is the system that takes an order from "customer wants food" to "kitchen makes it, customer pays, business records it." It sits at the intersection of four functions:

1. **Order capture** — what was ordered, by whom, for where
2. **Kitchen communication** — telling the kitchen what to make and when
3. **Billing & payment** — calculating the correct amount and collecting it
4. **Data/reporting** — recording everything for sales, tax, and inventory purposes

Everything below breaks these four functions down by order type, then lists every feature a modern POS needs, then covers UI.

---

## 2. Order Type Workflows

The single most important design decision in a POS is treating **order type as a first-class concept** that changes the entire flow — not just a label on an order.

### 2.1 Dine-In Flow

```
Table Selection → Open Ticket → Order Entry → KOT Fired → 
Course/Hold Management → Running Bill → Bill Request → 
Payment → Table Closed/Freed
```

**Step-by-step:**

1. **Table selection** — Staff taps a table on the floor plan. This opens (or resumes) a "ticket" bound to that table.
2. **Order entry** — Items are added to the ticket. Multiple rounds are common: starters first, mains later, dessert after.
3. **Modifiers** — Each item can carry modifiers (spice level, no onion, extra cheese) and these must print clearly on the KOT.
4. **Course/hold management** — Kitchen shouldn't fire the main course the moment it's ordered if starters haven't gone out yet. A "hold and fire" mechanism lets staff release courses in sequence.
5. **Seat/guest tracking (optional, higher-end)** — Items tagged to specific seats for accurate splitting later.
6. **Running bill visibility** — Staff or customer can see the live total at any point, not just at the end.
7. **Bill request → settlement** — Bill printed/shown, split logic applied if needed (by item, by seat, or equally), payment collected across one or more modes.
8. **Table release** — Table status flips back to "free" only after settlement, triggering housekeeping/next-seating logic.

**Key characteristic:** the ticket has a *lifecycle* — it opens, stays open (sometimes for hours), accumulates multiple order rounds, and only closes at payment. This is fundamentally different from takeaway.

### 2.2 Takeaway Flow

```
Order Creation (no table) → Payment (usually upfront) → 
KOT Fired Immediately → Prep Timer → Ready Notification → 
Customer Pickup → Order Closed
```

**Step-by-step:**

1. **Order creation** — No table binding. Order is tied to a token number, order number, or customer phone number instead.
2. **Payment timing** — Typically collected upfront (unlike dine-in's pay-at-end), since there's no ongoing table relationship to hold the tab against.
3. **Immediate KOT fire** — No course-holding logic needed; the kitchen starts immediately since it's one shot, no multi-round ordering.
4. **Prep time estimate** — Shown to the customer at order time ("Ready in 15 min") — this is a UX expectation-setter, not optional.
5. **Status tracking** — Order moves through states: Placed → In Kitchen → Ready → Picked Up. A visible status board (or SMS/app ping) reduces "is my order ready" interruptions.
6. **Packaging step** — Distinct from dine-in; someone needs to be prompted to box/bag the order before handoff.
7. **Order closed** — On pickup confirmation.

### 2.3 Delivery Flow (Extension of Takeaway)

Adds on top of takeaway:

- **Address/geo capture** and delivery zone validation
- **Delivery partner assignment** (in-house rider or third-party like Zomato/Swiggy logistics if you're not using their full marketplace)
- **Dispatch status**: Ready → Out for Delivery → Delivered
- **Delivery charge calculation**, often distance or zone-based
- **Aggregator integration** if orders also come from Zomato/Swiggy — these need to land in the *same* KOT/kitchen queue as your direct orders, or kitchen staff end up juggling multiple screens/tablets, which is one of the most common real-world failure points.

### 2.4 Why the Order-Type Toggle Matters So Much

Everything downstream — whether payment is asked for now or later, whether a table state needs updating, whether course-holding logic applies, whether a delivery address field appears — branches off this one choice. Get this toggle right at the top of the order screen and the rest of the system architecture falls into place naturally.

---

## 3. Complete Feature List

### 3.1 Menu Management
- Categories and sub-categories (Starters, Mains, Beverages, etc.)
- Item variants (size, crust type, spice level)
- Modifiers/add-ons (extra cheese, no onion) — with individual pricing where applicable
- Combos/meal deals with automatic pricing logic
- **86'd items** — instant out-of-stock marking that hides/greys out an item across all order channels at once
- Time-based menus (breakfast menu vs dinner menu, auto-switching by time of day)
- Multi-language item names (relevant if you serve tourists/international clientele)

### 3.2 Order Management
- Order type toggle: Dine-in / Takeaway / Delivery / Online (as covered above)
- Order editing after creation (add/remove items before KOT fires, or with a manager override after)
- Order merging/splitting (two tables combined for a large party; one table split into separate bills)
- Order history and reprint (customer wants a duplicate receipt)
- Void/cancellation with mandatory reason capture (critical for fraud/loss tracking)

### 3.3 Kitchen Order Ticket (KOT) System
- Auto-routing to correct printer/screen (kitchen vs bar vs dessert station)
- KOT numbering that ties back to table/order for traceability
- Hold-and-fire for course sequencing
- KDS (Kitchen Display System) as a paperless alternative to printed KOTs — shows tickets on a screen, staff mark items "cooking" → "ready," which also feeds order-status data back to the front of house
- Modifier/allergy flags printed in bold or highlighted (a common real-world failure point when they're buried in small text)

### 3.4 Table Management (Dine-In Specific)
- Visual floor plan, drag-and-drop table layout matching your actual restaurant
- Table status color-coding (free / occupied / billed / reserved)
- Table capacity and merge/split support
- Reservation integration (optional) — tables auto-marked reserved for a time block
- Server assignment per table (which waiter owns which tables, for accountability and tip pooling)

### 3.5 Billing & Payments
- Multiple payment modes on a single bill (part cash, part card, part UPI)
- Split billing: equal split, by item, by seat
- Discounts: item-level, bill-level, percentage or flat, with manager-approval thresholds for large discounts
- Tax handling: GST slabs (5%/18% as applicable in India for restaurants), tax-inclusive vs exclusive pricing display
- Service charge handling (optional line, clearly disclosed per current norms)
- Tipping capture (cash tips logged for tax/payout purposes, digital tips via payment gateway)
- Receipt generation: print and/or digital (SMS/WhatsApp/email receipt)

### 3.6 Inventory Management
- Stock deduction tied to recipes (selling one pizza deducts dough, cheese, sauce per recipe quantities)
- Low-stock alerts
- Wastage logging
- Purchase order generation when stock crosses reorder threshold
- Vendor/supplier records

### 3.7 Staff & Role-Based Access
- Roles: Waiter, Cashier, Kitchen staff, Manager, Owner — each with different permission scopes
- Waiter: order entry only, no discount/void rights
- Cashier: billing and payment collection
- Manager: discounts, voids, reports, menu edits
- Owner: full access including financial reports and settings
- Shift/clock-in tracking tied to staff accounts (useful for labor cost reporting)
- Audit log of who did what (which staff member applied a discount, voided an order, etc.) — essential for loss prevention

### 3.8 Reporting & Analytics
- **Z-report** (end-of-day close): total sales, tax collected, payment mode breakdown, discounts given
- Item-wise sales report (best/worst sellers)
- Peak-hour analysis (staffing decisions)
- Table turnover rate
- Void/discount report (loss prevention)
- Staff performance (sales per waiter)
- Comparative reports (day-over-day, week-over-week)

### 3.9 Offline Mode
- Critical in the Indian context — internet drops shouldn't stop order-taking
- Local queue of orders that syncs once connectivity returns
- Local printing continues to work even when cloud sync is down

### 3.10 Integrations
- Payment gateways (Razorpay, PhonePe, UPI direct)
- Food aggregators (Zomato, Swiggy) — order injection into the same kitchen queue
- Accounting software (Tally, Zoho Books) for GST filing
- SMS/WhatsApp Business API for order notifications and receipts
- Loyalty/CRM systems for repeat-customer tracking

### 3.11 Multi-Store / Multi-Outlet (relevant to your current build)
- Centralized menu management pushed to multiple outlets, with per-outlet price/availability overrides
- Consolidated reporting across outlets alongside per-outlet drill-down
- Per-outlet inventory and staff, single owner-level dashboard

---

## 4. Best UI/UX Patterns

### 4.1 General Principles
- **Touch-first, not mouse-first.** Staff use tablets under time pressure — every control needs to be thumb-friendly, large, and forgiving of imprecise taps.
- **Minimal typing.** Everything should be selectable via tap; search/keyboard input is a fallback, not the primary path.
- **Speed over density.** A cluttered screen that shows everything is slower under rush than a clean screen with drill-down.
- **State should be visually obvious at a glance** — a busy waiter should never have to read text to know if a table is free or occupied; color alone should tell them.

### 4.2 Screen-by-Screen Breakdown

**Order Type / Home Screen**
- Order-type toggle front and center (Dine-in / Takeaway / Delivery)
- For dine-in, this leads to the table map; for takeaway/delivery, straight to order entry

**Table Map (Dine-In)**
- Floor-plan layout matching the physical restaurant, not a generic grid
- Color coding: green = free, red = occupied, yellow = billed/awaiting payment, blue = reserved
- Tap a table → opens that table's ticket
- This single screen is the highest-leverage UI decision in a dine-in POS — a good table map alone can cut order-taking friction significantly

**Order Entry Screen**
- Category tabs on the left (large, thumb-reachable)
- Item grid on the right, big tappable tiles with item name + price
- Persistent cart/ticket panel showing running total live, updating with every tap
- Modifiers as button groups, not dropdowns — dropdowns are slower and error-prone under time pressure
- Quantity stepper (+/-) rather than typed numbers

**KOT / Kitchen Display**
- Large, high-contrast text (kitchen environments are often steamy, hot, poor lighting)
- Clear item + modifier + table/order number
- Color or bold flags for allergies/special instructions
- Simple state buttons: "Start" → "Ready" per ticket

**Billing Screen**
- Itemized bill with running total, tax breakup shown separately (never buried)
- Split options as clear buttons (Equal Split / By Item / By Seat), not a settings menu
- Payment mode selection as large icon buttons (Cash / Card / UPI), supporting multiple modes per bill
- One-tap print/send-receipt

**Reports Dashboard**
- Daily snapshot front and center (today's sales, order count, average ticket size)
- Drill-down available but not forced — owner should see the headline number in under 2 seconds of opening the app

### 4.3 Reference POS UIs Worth Studying
- **Petpooja** and **Posist** — built specifically for the Indian market, GST/tax handling and aggregator integrations are native
- **Toast** (US) — widely regarded as a strong UX benchmark for order entry speed
- **Square** — cleanest, most minimal UI overall; good reference for billing screen simplicity

---

## 5. Notes for Your Build (Next.js / Supabase Stack)

Given the platform you already have running for Pizza Expert, a few things map cleanly:

- **Order-type as an enum field** on the orders table (`dine_in` / `takeaway` / `delivery`) driving conditional UI rendering downstream — this should be the first field set when an order is created, since it determines which other fields are required.
- **Table state** can live as a simple status enum on a `tables` table (`free` / `occupied` / `billed` / `reserved`), with Supabase real-time subscriptions pushing table-status changes to all connected devices instantly — this is exactly the kind of live-sync use case Supabase real-time is good at.
- **KOT routing** can be modeled as a `station` field on menu items (kitchen/bar/dessert), determining which printer or KDS view an item's ticket routes to.
- **Offline queue** is the trickiest part to bolt on later — worth deciding early whether to use a local-first approach (e.g., IndexedDB queue that syncs to Supabase on reconnect) rather than retrofitting it.
- For your **multi-store feature** already in progress, a shared `menu_items` table with an `outlet_overrides` table for price/availability per outlet keeps menu management centralized while allowing per-store flexibility.

---

*Document prepared for restaurant POS planning — covers dine-in, takeaway, and delivery workflows, full feature set, and UI/UX design guidance.*
