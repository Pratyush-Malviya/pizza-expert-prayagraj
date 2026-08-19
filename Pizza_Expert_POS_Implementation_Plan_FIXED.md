# Pizza Expert Prayagraj  -  POS Implementation Plan

**Document:** POS & Restaurant Operations Expansion Plan  
**Baseline:** Pizza Expert Prayagraj PRD v2.4  
**Date:** August 2026  
**Product context:** Existing production D2C food-tech platform + Kitchen Display System + delivery/fleet + financial controls  
**Recommended scope:** Restaurant/QSR POS first; design the domain so retail/pharmacy/laundry capabilities can be added later without creating separate order/inventory systems.

---

## 1. Executive Recommendation

Do **not** build POS as a separate billing product.

Build it as a **Restaurant POS + Back-Office Operations layer on top of the existing Pizza Expert order, payment, KDS, delivery, loyalty, inventory and financial foundation**.

The core design principle should be:

> **Every order  -  online, POS counter, dine-in QR, takeaway, delivery or future third-party channel  -  enters one canonical order engine and then follows the appropriate kitchen, payment, fulfillment and accounting workflow.**

This is important because the current PRD already has many of the hardest restaurant-platform components: e-commerce, product customization, dine-in QR ordering, Razorpay verification, COD, KDS, delivery dispatch, driver GPS, cash settlement and loyalty. Rebuilding these inside a separate POS would duplicate data and create reconciliation problems.

The POS should therefore add the **front-of-house and store-control layer** that is currently missing: fast counter order entry, table/floor operations, billing, split/partial payments, cashier sessions, receipt/KOT controls, customer lookup, discounts, inventory consumption, purchasing, supplier workflows, recipe/food costing, stock controls and POS-specific reporting.

This direction matches the current restaurant POS market. Toast combines POS, payments, KDS, inventory, customer/loyalty, online ordering and reporting in one platform; Petpooja emphasizes KOT, split/merge bills, inventory auto-deduction, recipe management, purchasing, table management and restaurant-specific controls. [Web research references are listed in Section 20.]

---

# 2. Current Product Baseline  -  What Already Exists

The following is treated as **already implemented according to PRD v2.4**, not as an independent code audit.

## 2.1 Customer & Ordering

| Existing capability | PRD evidence | POS implication |
|---|---|---|
| D2C online storefront | E-commerce storefront and smart cart | Reuse same catalog/order engine |
| Product categories/menu | Classics, Gourmet, Sourdough, Sides & Beverages | Reuse for POS menu grid |
| Product customization | Crust, size, toppings, chef notes | Reuse modifier/customizer model |
| Dine-in QR ordering | `/dine-in/[tableId]` | POS table workflow should share the same table/order model |
| Coupons/discount support | Instant coupon application | Extend with cashier/manager discount permissions |
| Loyalty | Points and tiered loyalty | Connect POS billing to the same loyalty ledger |
| Online/COD checkout | Razorpay + COD | POS needs additional payment modes and settlement controls |

The PRD explicitly documents the dynamic product customizer, dine-in QR ordering, abandoned-cart recovery and loyalty programme. [PRD v2.4, page 4]

## 2.2 Kitchen & Fulfillment

Already present:

- Real-time KDS
- Preparation timers
- Kitchen stages
- Rider assignment
- Auto-dispatch
- Manual dispatch override
- Driver partner app
- GPS telemetry
- Customer live tracking
- Delivery OTP
- COD collection and cash-in-hand ledger

The PRD defines the KDS as a real-time kanban workflow and connects kitchen tickets with rider/fulfillment state. [PRD v2.4, page 4]

The fleet app already provides a five-step delivery workflow and synchronizes order, rider, GPS and COD state. [PRD v2.4, page 6]

## 2.3 Payments & Financial Integrity

Already present:

- Razorpay payment processing
- Server-side payment signature verification
- COD
- High-value COD verification
- Driver cash-in-hand ledger
- Store-manager COD settlement
- Payment records
- Order totals/tax/discount fields

The PRD documents Razorpay HMAC verification before kitchen queuing and existing COD controls. [PRD v2.4, page 4]

The existing payment and order data models include `orders`, `payments`, `order_items` and product price/stock fields. [PRD v2.4, page 8]

## 2.4 Current Data Foundation

Current documented core tables include:

- `orders`
- `order_items`
- `products`
- `deliveries`
- `drivers`
- `payments`
- `order_status_history`

The current `products` table already contains a basic `stock_quantity`, but this is **not sufficient for restaurant-grade ingredient inventory**. fileciteturn0file0L235-L262

## 2.5 Current Roles

Already documented:

- Online Customer
- Kitchen Chef / Line Cook
- Delivery Partner / Rider
- Store Manager & Super Admin

The PRD's RBAC section establishes the current role model. fileciteturn0file0L84-L101

---

# 3. What Is Missing for a True Restaurant POS

The current system is already strong on **customer ordering -> kitchen -> delivery -> payment/reconciliation**, but it is not yet a complete **in-store restaurant POS/back-office platform**.

The major gaps are:

1. Dedicated POS cashier/order-entry interface
2. Table/floor/area management
3. Dine-in POS orders linked to tables
4. Takeaway/counter order workflow
5. POS delivery/pickup order entry
6. Fast item search/menu grid
7. Modifier/combination workflow optimized for touch/POS
8. KOT creation, reprint, void and station routing
9. Bill generation and receipt lifecycle
10. Split payments
11. Mixed tender payments
12. Partial payments/deposits
13. Cashier sessions/shifts
14. Cash drawer opening/closing/reconciliation
15. POS cash/UPI/card/manual-payment controls
16. Refund/void/cancel workflows with permissions
17. Customer lookup/walk-in customer profiles
18. Loyalty earning/redemption from POS
19. Recipe/BOM management
20. Ingredient-level stock deduction
21. Units of measure and conversions
22. Purchase orders and supplier management
23. Goods received/stock inward
24. Stock adjustment and stock transfer
25. Wastage/spoilage tracking
26. Low-stock/reorder alerts
27. Food-cost and recipe-cost reporting
28. POS sales and cashier reports
29. Day-end/Z-report style closing
30. Employee attendance/shift layer
31. Hardware/printing integration layer
32. Offline-safe POS mode
33. Multi-terminal concurrency
34. Multi-outlet foundations
35. Audit log for sensitive actions

---

# 4. POS Product Architecture

## 4.1 Canonical Order Model

The central architectural change should be to add an explicit order source/channel and fulfillment type.

### Recommended fields

```text
order_source
- online
- pos
- dine_in_qr
- delivery
- third_party
- phone

order_type
- dine_in
- takeaway
- pickup
- delivery

fulfillment_status
- new
- confirmed
- preparing
- ready
- handed_over
- out_for_delivery
- completed
- cancelled

payment_status
- unpaid
- partially_paid
- paid
- refunded
- partially_refunded
- failed

service_context
- table_id
- area_id
- guest_count
- waiter_id
- cashier_id
- terminal_id
```

The existing order workflow should remain authoritative; POS should create and modify orders through the same service/actions wherever possible.

## 4.2 Why This Architecture Matters

It prevents:

- POS-only orders being invisible in KDS
- duplicated customers
- duplicate inventory deductions
- inconsistent loyalty balances
- inconsistent sales reporting
- delivery orders being counted twice
- cash/UPI/card reconciliation differences between channels

It also makes future integrations much easier.

---

# 5. Recommended POS Modules

## Module A  -  POS Billing & Order Entry

### Priority: P0  -  Must Have

Create a dedicated fast POS route:

```text
/admin/pos
```

### Recommended layout

**Left/main area**
- Menu categories
- Item tiles
- Item search
- Popular items
- Modifier quick selection
- Combo selection
- Availability indicator

**Right/order panel**
- Current order
- Quantity controls
- Modifiers
- Notes
- Discount
- Tax
- Customer
- Table/order type
- Payment
- Send to kitchen

### Required functions

- Create new order
- Add item
- Search item
- Select modifiers
- Change quantity
- Remove item
- Add notes
- Apply item discount
- Apply order discount
- Hold order
- Resume held order
- Send/fire KOT
- Save order
- Print KOT
- Print bill
- Reprint bill
- Cancel/void with permission
- Re-open eligible order
- Customer lookup
- Loyalty redemption
- Payment
- Complete order

### UX goal

Counter staff should be able to create a normal pizza order in **as few interactions as possible**.

Restaurant POS vendors explicitly optimize for fast order entry, modifier handling, split checks and rapid payment because these actions happen repeatedly during peak periods. Toast's current POS documentation describes menu grouping, item-level options, modifiers, service context, split functionality and rapid payment closure; Petpooja markets a three-click billing workflow and KOT generation. 

---

# 6. Order Types

## Priority: P0

Add four first-class POS order modes:

### Dine-In

- Table selection
- Guest count
- Server/waiter
- Running order
- Add items later
- Send partial KOT
- Close bill
- Move order to another table

### Takeaway

- Customer optional
- Pickup time
- Packaging/service charge if configured
- KOT
- Payment
- Ready status

### Delivery

- Customer address/phone
- Delivery fee
- Existing delivery engine
- Existing rider assignment
- Existing GPS tracking
- Existing COD logic

### Counter Pickup

- Customer name/phone
- Pickup token
- KOT
- Ready notification
- Payment

This gives the store one operational interface while retaining the existing delivery engine.

---

# 7. Table, Area & Floor Management

## Priority: P0

The current PRD has dine-in QR ordering, but it does not document a full table/floor management system.

Add:

### Areas

Example:

```text
Main Hall
Outdoor
Family Area
Counter
```

### Tables

Each table should have:

- Table number
- Area
- Capacity
- Status
- QR code
- Active order
- Current guest count
- Assigned waiter
- Merge/split state

### Table statuses

```text
available
occupied
reserved
billing
cleaning
blocked
```

### Required actions

- Open table
- Start order
- Add items
- Send KOT
- Add more items
- Move table
- Merge tables
- Split table/order
- Transfer table
- Close table
- Print bill

Petpooja specifically supports table/area configuration and table order workflows, while Square supports floor-plan/table management and coursing. 

---

# 8. KOT & Kitchen Workflow Expansion

## Priority: P0

You already have a KDS. Therefore, do **not** build another kitchen system.

Extend the existing KDS to accept POS orders.

### Add order-source indicators

```text
ONLINE
POS
DINE-IN QR
TAKEAWAY
DELIVERY
```

### KOT features to add

- KOT number
- Table number
- Order type
- Customer name
- Guest count
- Item modifiers
- Chef notes
- Printer/station assignment
- Reprint KOT
- Cancel KOT
- Recall KOT
- Hold/fire
- Item-level ready state
- Kitchen station routing

### Kitchen stations

Example:

```text
Pizza Oven
Prep
Cold Kitchen
Beverage
Dessert
Packing
```

A restaurant POS should route relevant items to the correct preparation area instead of producing one undifferentiated kitchen ticket. Petpooja describes station-wise KOT printing, while Toast's KDS supports clear labels/modifiers, multiple dining options and kitchen-performance reporting. citeturn213035search6turn213035search7

---

# 9. Billing & Payment Engine

## Priority: P0

The existing Razorpay/COD payment layer is a strong starting point, but POS needs a local in-store tender system.

### Payment modes

Implement:

```text
Cash
UPI
Card
Razorpay
Mixed Payment
Credit/House Account (optional, permission-controlled)
Gift/Store Credit (future)
```

### Must-have capabilities

- Full payment
- Split by amount
- Split by item
- Equal split
- Multiple tenders
- Partial payment
- Change calculation
- Refund
- Partial refund
- Payment retry
- Payment failure handling
- Payment reconciliation
- Receipt generation

Toast and other restaurant POS systems explicitly support split checks/payments and rapid payment closure. 

## UPI recommendation

Use a **dynamic QR payment flow** rather than manually asking staff to verify a static UPI transfer.

The system should generate a unique payment reference for each bill, display amount/order reference and reconcile the successful transaction back to the POS order.

NPCI documents QR-based merchant UPI integration and transaction-reference information for reconciliation. Current NPCI guidance also covers dynamic QR and updated merchant QR presentation requirements. 

---

# 10. Cashier Session & Cash Drawer

## Priority: P0

This is one of the biggest missing controls.

### Opening shift

Cashier enters:

```text
Opening cash
Terminal
Employee
Shift start
```

### During shift

Track:

- Cash sales
- Cash refunds
- Cash paid-outs
- Cash drawer opens
- No-sale opens
- Discounts
- Voids
- Cancelled orders

### Closing shift

System calculates:

```text
Expected cash
- Opening float
+ Cash sales
- Cash refunds
- Paid-outs
= Expected drawer
```

Cashier enters:

```text
Actual cash
```

System shows:

```text
Over / Short
```

Require manager approval for material discrepancies.

Restaurant POS reporting commonly includes cash-drawer activity, voids, removed items, refunds and end-of-day controls. 

---

# 11. Receipt & Printing Layer

## Priority: P0

Build a hardware abstraction so the application does not depend directly on one printer model.

### Printer types

```text
Receipt Printer
KOT Printer
Kitchen Station Printer
Label Printer
Barcode/QR Printer (future)
```

### Receipt outputs

- Full receipt
- Duplicate receipt
- KOT
- Customer e-bill
- Payment receipt
- Refund receipt
- Day-end summary

### Hardware adapter

Create:

```text
PrintingService
  ├── BrowserPrintAdapter
  ├── ESC_POSAdapter
  └── FutureCloudPrintAdapter
```

This lets the POS work with browser printing initially and adds direct thermal-printer support without rewriting POS flows.

---

# 12. Tax & Discount Engine

## Priority: P0

Do not hard-code tax percentages in the UI.

Create configurable tax rules:

```text
tax_groups
tax_components
tax_rates
tax_inclusive
tax_exclusive
effective_from
effective_to
```

### Discount rules

Support:

- Percentage discount
- Flat discount
- Item discount
- Bill discount
- Coupon
- Loyalty redemption
- Manager-only discount
- Maximum discount limit

### India GST consideration

CBIC's published rate table lists restaurant service other than specified-premises service at 5% GST (2.5% CGST + 2.5% SGST) subject to the stated input-tax-credit condition; special cases such as specified hotel premises and outdoor catering differ. The application should therefore support configurable tax rules instead of embedding a single permanent 5% rule. 

The product should also store the restaurant's tax-registration/business configuration separately from individual invoices.

---

# 13. Customer Management

## Priority: P1

You already have loyalty, but POS needs a proper customer record.

### Customer profile

```text
customer_id
name
phone
email
birthday (optional)
addresses
order_count
lifetime_value
loyalty_balance
last_order_at
preferred_items
notes
```

### POS actions

- Find by phone
- Create walk-in customer
- Attach order to customer
- Earn points
- Redeem points
- View order history
- Send digital receipt
- Add marketing consent if required

Toast and Petpooja both connect POS, customer profiles and loyalty/marketing workflows. 

---

# 14. Menu & Modifier Management

## Priority: P0

The current product catalog is a foundation, but POS needs operational menu configuration.

### Add

- POS category ordering
- Quick-sale items
- Modifier groups
- Required modifiers
- Optional modifiers
- Nested modifiers
- Modifier pricing
- Combo/bundle items
- Item availability by outlet
- Item availability by time
- Item 86/out-of-stock toggle
- Kitchen station
- Preparation time
- Tax group
- Recipe
- Cost price

Toast's current POS documentation supports item groups, item-level options, modifiers, special requests and dining context; Toast and Petpooja also emphasize real-time menu/inventory synchronization. citeturn213035search12turn213035search0turn213035search9

---

# 15. Restaurant Inventory  -  Major Required Upgrade

## Priority: P0

The existing `products.stock_quantity` is suitable for a simple sellable-item counter, but restaurant operations need **raw-material inventory**.

Example:

```text
Pizza Margherita
  200g Flour
  100g Mozzarella
  120g Sauce
  10g Olive Oil
  1 Pizza Box
```

Selling one pizza should consume the relevant ingredients automatically.

## Required inventory hierarchy

```text
Ingredient
v
Recipe / BOM
v
Menu Item
v
Order Item
v
Consumption
```

### Add

- Raw materials
- Packaging materials
- Units of measure
- Unit conversions
- Opening stock
- Purchases
- Stock inward
- Stock adjustment
- Wastage
- Spoilage
- Stock transfer
- Stock count
- Reorder levels
- Low-stock alerts
- Supplier pricing
- Average cost
- Last purchase price

Petpooja's restaurant inventory model specifically supports raw-material management, low-stock alerts, recipe-based auto deduction, supplier purchasing and central-kitchen/outlet flows. 

---

# 16. Recipe & Food Costing

## Priority: P0

This is one of the most valuable owner-facing features.

For every menu item calculate:

```text
Selling Price
- Ingredient Cost
- Packaging Cost
= Gross Contribution
```

Example:

```text
Pizza Selling Price        ₹399
Ingredient Cost            ₹135
Packaging Cost              ₹15
--------------------------------
Gross Contribution         ₹249
Food Cost %                37.6%
```

The actual values should come from inventory purchase costs, not manually typed static values.

### Owner benefit

The owner can immediately see:

- Which items make money
- Which items have high ingredient cost
- Which ingredients are increasing in price
- Which items should be repriced
- Which recipes are generating high wastage

Toast also groups inventory, food costing, reporting and analytics as restaurant back-office capabilities. 

---

# 17. Purchasing & Supplier Management

## Priority: P1

Add:

### Supplier

- Supplier profile
- Contact
- GSTIN
- Payment terms
- Items supplied
- Last price
- Outstanding balance

### Purchase

```text
Draft PO
-> Sent
-> Partially Received
-> Received
-> Cancelled
```

### Goods Receipt

Capture:

- Supplier
- Invoice number
- Invoice date
- Items
- Quantity
- Accepted quantity
- Rejected quantity
- Purchase rate
- Tax
- Total
- Expiry/batch where applicable

For a pizza restaurant, expiry/batch is not as central as in pharmacy, but it can still be useful for selected ingredients or packaged goods.

---

# 18. Wastage & Stock Adjustment

## Priority: P1

Implement a controlled wastage workflow:

```text
Reason:
- Spoilage
- Expired
- Burnt
- Damaged
- Wrong preparation
- Complimentary
- Staff meal
- Other
```

Require:

- Item
- Quantity
- Estimated cost
- Reason
- Employee
- Timestamp
- Optional manager approval

### Owner benefit

Wastage becomes measurable instead of disappearing from inventory.

---

# 19. Sales & Management Reports

## Priority: P0

The reports should be generated from the same canonical transaction ledger.

### Sales

- Gross sales
- Net sales
- Discounts
- Tax
- Refunds
- Orders
- Average order value
- Sales by hour
- Sales by day
- Sales by channel
- Sales by order type

### Product

- Top items
- Bottom items
- Product mix
- Modifier popularity
- Combo performance
- Item profitability

### Kitchen

- Average prep time
- Ticket time
- Orders per hour
- Station bottleneck
- Delayed orders
- Cancellation rate

### Cashier

- Sales by cashier
- Discounts by cashier
- Voids
- Refunds
- Cash variance
- Payment method totals

### Inventory

- Current stock
- Stock valuation
- Low stock
- Purchase value
- Consumption
- Wastage
- Variance

### Customer

- New customers
- Returning customers
- Frequency
- Lifetime value
- Loyalty earned/redeemed

### Owner dashboard

The highest-value dashboard should answer:

```text
How much did we sell?
How much cash should we have?
What payment methods were used?
What did we spend?
What inventory did we consume?
What did we waste?
Which products made the most money?
What is the food-cost percentage?
How is each channel performing?
```

Toast's current reporting catalogue includes sales, menu/product mix, payment, cash-loss, accounting, kitchen operations and marketing/reporting dimensions, which is a useful benchmark for the reporting hierarchy. 

---

# 20. Employee / Staff Controls

## Priority: P1

The existing RBAC is a foundation but needs POS-specific permissions.

### Roles

```text
Super Admin
Owner
Store Manager
Cashier
Waiter
Kitchen Manager
Chef
Delivery Manager
Delivery Partner
Inventory Manager
Accountant
```

### Sensitive permissions

Require permission/approval for:

- Discount above threshold
- Cancel after KOT
- Void bill
- Refund
- Reopen closed bill
- Change price
- Manual stock adjustment
- Stock write-off
- Cash drawer adjustment
- Back-date transaction

### Audit log

Every sensitive action should record:

```text
actor
action
entity
before
after
timestamp
reason
terminal
ip/device (where appropriate)
```

---

# 21. Offline POS

## Priority: P0/P1 depending on store connectivity

A restaurant POS must degrade gracefully when internet connectivity is poor.

Your existing platform is cloud/realtime oriented, so the POS should have a local queue rather than requiring every cashier click to have a successful round-trip.

### Offline-safe actions

- Browse cached menu
- Create order
- Add modifiers
- Generate temporary order ID
- Print KOT
- Print receipt
- Record cash payment
- Queue transaction

### Synchronization

```text
LOCAL TRANSACTION
-> OUTBOX
-> NETWORK AVAILABLE
-> SERVER SYNC
-> CONFLICT CHECK
-> ACK
-> MARK SYNCED
```

### Important

Do not allow offline UPI/card confirmation unless the payment provider explicitly supports a safe offline authorization mode. Offline POS can record the intended tender, but electronic-payment settlement must remain externally verified.

Restaurant POS vendors explicitly market offline continuity because kitchen and payment operations cannot stop simply because connectivity fails. 

---

# 22. Hardware Strategy

## Phase 1  -  Software-first

Support:

- Desktop/laptop
- Touchscreen
- Keyboard shortcuts
- Browser printing
- USB/Bluetooth barcode scanner where the OS exposes keyboard input
- Standard network printer integration

## Phase 2  -  Restaurant hardware

Add:

- 58/80mm thermal receipt printer
- KOT printer
- Cash drawer
- Customer display
- Android POS terminal
- QR payment display
- Kitchen display screen
- Optional kitchen bump screen

Do not couple database/business logic to hardware drivers.

---

# 23. Database Expansion

The existing schema should be extended rather than replaced.

## POS / Ordering

```text
orders
order_items
order_status_history
order_payments
order_discounts
order_taxes
order_notes
held_orders
```

## Tables

```text
areas
restaurant_tables
table_sessions
table_transfers
table_merges
reservations        # P2
```

## POS Operations

```text
pos_terminals
cashier_shifts
cash_drawers
cash_movements
cashier_sessions
```

## Menu

```text
menu_categories
menu_items
modifier_groups
modifiers
item_modifier_groups
combos
combo_items
```

## Kitchen

```text
kitchen_stations
kitchen_routing_rules
kots
kot_items
kot_events
```

## Inventory

```text
inventory_items
inventory_units
inventory_stock
inventory_movements
stock_counts
stock_adjustments
stock_transfers
wastage_records
```

## Recipes

```text
recipes
recipe_items
recipe_versions
```

## Purchasing

```text
suppliers
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
supplier_payments
```

## Customers

```text
customers
customer_addresses
customer_notes
loyalty_accounts
loyalty_transactions
```

## Employees/RBAC

```text
roles
permissions
role_permissions
user_roles
employee_shifts
attendance
audit_logs
```

## Payments

Keep the existing `payments` table but expand it through related tables rather than putting every POS-specific attribute in one row.

---

# 24. Inventory Ledger Design

Do **not** make `stock_quantity` the source of truth.

Use a movement ledger:

```text
PURCHASE
+100 kg

SALE / RECIPE CONSUMPTION
-2 kg

WASTAGE
-0.5 kg

ADJUSTMENT
+1 kg

TRANSFER OUT
-10 kg

TRANSFER IN
+10 kg
```

Then calculate or maintain:

```text
on_hand
reserved
available
```

with reconciliation jobs.

This is much safer for auditability than directly updating a single integer on a product.

---

# 25. Reporting Architecture

Use a transaction/event model that makes reports reproducible.

Minimum dimensions:

```text
date
store
terminal
cashier
channel
order_type
payment_method
product
category
customer
waiter
kitchen_station
```

Every report should be filterable by:

- Date range
- Store
- Channel
- Order type
- Payment method
- Employee
- Product/category

---

# 26. Recommended POS Screen Map

```text
/admin/pos
/admin/pos/orders
/admin/pos/held
/admin/pos/tables
/admin/pos/payments
/admin/pos/shifts
/admin/pos/receipts

/admin/kitchen
/admin/kitchen/stations

/admin/menu
/admin/menu/categories
/admin/menu/modifiers
/admin/menu/combos

/admin/inventory
/admin/inventory/items
/admin/inventory/stock
/admin/inventory/adjustments
/admin/inventory/wastage
/admin/inventory/transfers
/admin/inventory/counts

/admin/recipes
/admin/purchases
/admin/suppliers

/admin/customers
/admin/loyalty

/admin/reports
/admin/reports/sales
/admin/reports/products
/admin/reports/inventory
/admin/reports/payments
/admin/reports/kitchen
/admin/reports/cashier
/admin/reports/profitability

/admin/settings/pos
/admin/settings/taxes
/admin/settings/printers
/admin/settings/stations
/admin/settings/terminals
```

---

# 27. POS Workflow

## 27.1 Counter Sale

```text
Cashier Login
  v
Open Shift
  v
New POS Order
  v
Select Takeaway / Pickup / Delivery
  v
Add Items
  v
Select Modifiers
  v
Customer (optional)
  v
Discount / Loyalty
  v
Send KOT
  v
Payment
  v
Print / E-Bill
  v
KDS
  v
Ready
  v
Pickup / Delivery
  v
Completed
```

## 27.2 Dine-In

```text
Open Table
  v
Select Guest Count
  v
Add Items
  v
Send KOT
  v
Kitchen
  v
Add More Items
  v
Close Bill
  v
Split / Merge / Mixed Payment
  v
Payment
  v
Table Available
```

## 27.3 Delivery

```text
Create POS Order
  v
Customer + Address
  v
KOT
  v
Existing Delivery Engine
  v
Auto Dispatch
  v
Driver App
  v
GPS Tracking
  v
COD / Online Payment
  v
Existing Settlement Flow
```

---

# 28. Benefits for End Users

## Faster ordering

Cashiers can enter orders rapidly without using the consumer storefront.

## Fewer ordering mistakes

Structured modifiers, notes, table identifiers and KOT routing reduce manual mistakes.

## Better dine-in experience

Customers can be seated, have multiple rounds added to the same order and pay using split/mixed payments.

## More payment flexibility

Customers can choose cash, UPI, card or supported online payment methods.

## Faster service

POS -> KOT -> existing KDS eliminates manual transcription.

## Better receipts

Customers receive accurate itemized bills and digital receipts.

## Loyalty continuity

Customers can earn/redeem rewards regardless of whether they purchase online or at the counter.

## Better transparency

Order status becomes visible through the existing kitchen and delivery workflow.

---

# 29. Benefits for Store Owners

## 29.1 One source of truth

Online orders + POS + QR orders + takeaway + delivery use the same operational engine.

## 29.2 Better cash control

Cashier opening/closing and cash variance expose discrepancies quickly.

## 29.3 Lower inventory leakage

Recipe-based consumption links every sale to raw-material movement.

## 29.4 Lower wastage

The owner can see exactly how much stock is being lost and why.

## 29.5 Better margins

Food-costing shows contribution by menu item.

## 29.6 Better employee accountability

Every discount, void, refund and stock adjustment is tied to a user.

## 29.7 Faster decision-making

The owner can see sales, product mix, payment mix, kitchen speed and inventory performance from a single dashboard.

## 29.8 Easier expansion

Once stores, terminals and inventory are modeled correctly, adding another outlet becomes configuration rather than a new product.

---

# 30. Features From the User's Generic POS List  -  What to Implement

| Requested capability | Recommendation | Reason |
|---|---|---|
| Cashier billing | **Implement P0** | Core POS function |
| Barcode management | **P2 / optional** | Low value for fresh-pizza core, useful later for packaged goods |
| Product/category management | **Already partly exists; expand P0** | Needed for POS |
| Stock management | **Implement P0** | Required for operations |
| Warehouse management | **P1** | Important for multi-outlet/central storage |
| Purchase/suppliers | **P1** | Direct owner benefit |
| Sales analytics | **P0** | Core management value |
| Loyalty | **Already exists; integrate P0** | Avoid duplicate loyalty systems |
| Returns/exchanges | **Replace with cancel/void/refund flow P0** | More relevant for prepared food |
| Multi-store | **P2 foundation, P1 if expansion planned** | Valuable for scaling |
| Food ordering | **Already exists; add POS source P0** | Reuse current order engine |
| KDS | **Already exists; extend P0** | Core advantage |
| Table reservations | **P2 initially** | Useful, but not as urgent as table/order management |
| Dine-in/takeaway/delivery | **Implement P0** | Essential restaurant order types |
| Menu management | **Already exists; operational expansion P0** | Needed for POS |
| Modifiers/combos | **Modifiers exist conceptually; formalize P0** | High-frequency pizza workflow |
| Waiter management | **P1** | Useful for dine-in |
| Split payments | **P0** | Major POS requirement |
| Kitchen workflow | **Already exists; extend P0** | Reuse KDS |
| Restaurant reports | **Implement P0** | Owner value |
| Pharmacy features | **Do not implement now** | Wrong vertical |
| Laundry features | **Do not implement now** | Wrong vertical |
| Generic HR/payroll | **Keep separate / P2** | Not required to launch POS |
| Generic accounting suite | **P2 integration layer** | POS needs financial reporting, not a full ERP first |
| Quotation management | **P2** | Low priority for a pizza QSR |
| Expense management | **P1** | Useful for owner margin visibility |
| Customer management | **P0** | Needed for POS + loyalty |
| Supplier management | **P1** | Needed for inventory/purchasing |
| Warehouse | **P1/P2** | Depends on multi-outlet model |
| Tax reports | **P0** | Required operationally |
| P&L | **P1** | High owner value once cost/purchase data is reliable |
| Store performance | **P1/P2 initially** | Becomes important with multiple stores |
| SaaS Super Admin | **Existing concept; extend for POS tenants** | Required for productization |
| User & Role Management | **Existing RBAC; expand P0** | POS permissions need fine-grained control |

---

# 31. Features From the Generic Application List

These are **not required to make the restaurant POS successful**.

The existing PRD is already focused on the food-tech workflow. The proposed priority should be:

```text
POS
+
KDS
+
Inventory
+
Purchasing
+
CRM/Loyalty
+
Payments
+
Reports
```

Do not let generic modules such as Chat, Email, Calendar, Notes, To Do, Projects, File Manager, Audio/Video Calls or a broad ERP accounting suite delay the POS release.

They can remain platform-level capabilities or future SaaS modules.

---

# 32. Suggested Phased Implementation

## Phase 0  -  Architecture & Data Foundation

**Goal:** Make POS additive, not destructive.

Tasks:

- Add order source/type
- Add terminal concept
- Add cashier session
- Add payment tender model
- Add tax model
- Add table/area model
- Add audit log
- Define inventory ledger
- Define recipe/BOM model
- Define kitchen station model
- Define canonical order service

### Exit criteria

- Existing online orders remain unaffected
- Existing KDS remains functional
- Existing delivery flow remains functional
- Existing payment flow remains functional
- POS can create orders through shared order services

---

# 33. Phase 1  -  MVP POS

**Priority:** P0

Build:

- POS dashboard
- Menu grid
- Search
- Modifiers
- New order
- Dine-in/takeaway/delivery/pickup
- Customer lookup
- Discount
- KOT
- KOT reprint
- Bill
- Cash payment
- UPI payment integration
- Card/payment gateway integration where supported
- Mixed payment
- Receipt
- Existing KDS integration
- Existing delivery integration
- Cashier shift
- Cash close
- Basic POS reports

### Target outcome

A store cashier can run a complete shift without using the customer storefront/admin workaround.

---

# 34. Phase 2  -  Restaurant Operations

**Priority:** P0/P1

Build:

- Floor/table management
- Table move
- Table merge
- Table split
- Waiter assignment
- Guest count
- Kitchen stations
- Station-wise KOT
- Hold/fire
- Recall/reprint
- Item availability
- Combo management
- Manager approvals
- Audit logs
- Refunds/voids
- Receipt printer integration

### Target outcome

A dine-in restaurant can operate the front of house entirely from POS.

---

# 35. Phase 3  -  Inventory & Purchasing

**Priority:** P0/P1

Build:

- Ingredient master
- Units
- Recipe/BOM
- Recipe costing
- Automatic consumption
- Purchase orders
- Supplier management
- Goods receipt
- Stock adjustments
- Stock counts
- Wastage
- Transfers
- Low-stock alerts
- Inventory valuation

### Target outcome

Every sale has a traceable relationship to ingredient consumption and stock.

---

# 36. Phase 4  -  Owner Intelligence

**Priority:** P1

Build:

- Food cost
- Product profitability
- Menu engineering
- Cash variance
- Payment reconciliation
- Sales by channel
- Sales by cashier
- Kitchen performance
- Wastage reports
- Customer repeat rate
- Loyalty analytics
- Daily/monthly P&L view

### Target outcome

The owner can use the product to manage the business, not merely produce bills.

---

# 37. Phase 5  -  Multi-Store & SaaS

**Priority:** P2

Build:

- Organization/tenant
- Stores/outlets
- Terminals per store
- Store-specific menus
- Store-specific inventory
- Central warehouse
- Stock transfers
- Central purchasing
- Multi-store reporting
- Store comparison
- Regional permissions
- Franchise/branch support

This is the correct stage to turn Pizza Expert's internal platform architecture into a reusable restaurant POS SaaS product.

---

# 38. Phase 6  -  Advanced Extensions

**Priority:** P2/P3

Later capabilities:

- Reservations
- Waitlists
- Self-order kiosk
- Customer-facing display
- Handheld waiter POS
- Kitchen bump screen
- Gift cards
- Memberships
- Advanced CRM
- Marketing automation
- Third-party delivery marketplace connectors
- Accounting software integrations
- Payroll integration
- Barcode/packaged retail sales
- Demand forecasting
- AI sales forecasting
- AI purchasing recommendations
- AI wastage prediction

Toast's current product ecosystem demonstrates the commercial value of connecting POS, KDS, online ordering, loyalty, customer data, inventory, labor and reporting; the implementation should add these layers only after the core transaction engine is stable. 

---

# 39. Recommended Priority Matrix

## P0  -  Launch blocker

- POS cashier
- Order types
- Menu/modifiers
- KOT
- KDS integration
- Table basics
- Billing
- Split/mixed payments
- Cashier sessions
- Cash close
- Tax engine
- Receipt
- Customer lookup
- Basic audit log
- Sales reports
- Inventory ingredient model
- Recipe/BOM
- Stock deduction
- Low-stock alerts

## P1  -  High value

- Full floor management
- Waiter management
- Purchase orders
- Suppliers
- Goods receipt
- Wastage
- Stock counts
- Stock transfers
- Food costing
- Refund workflows
- Advanced reports
- Kitchen station analytics
- Employee shifts/attendance
- Hardware printing
- Offline POS

## P2  -  Scale

- Multi-store
- Central warehouse
- Reservations
- Advanced loyalty
- Gift cards
- Kiosk
- Handheld POS
- Third-party marketplace integrations
- Full accounting integration
- Payroll

## P3  -  Optional platform expansion

- Pharmacy workflows
- Laundry workflows
- Retail-specific barcode operations
- Generic CRM/ERP modules
- Generic collaboration apps

---

# 40. Key Product Decisions

## Decision 1  -  One order engine

**Recommended:** YES.

Never create a separate POS order table as the business source of truth.

## Decision 2  -  One customer identity

**Recommended:** YES.

Online customer and POS customer should resolve to the same customer profile.

## Decision 3  -  One loyalty ledger

**Recommended:** YES.

Online and offline transactions should earn/redeem against the same account.

## Decision 4  -  One KDS

**Recommended:** YES.

POS and online orders should appear together with explicit channel markers.

## Decision 5  -  Ingredient inventory

**Recommended:** YES.

Use raw-material + recipe consumption rather than only menu-item stock.

## Decision 6  -  Offline support

**Recommended:** YES.

Build it after the online transaction contract is stable, but design for it from Phase 0.

## Decision 7  -  Generic pharmacy/laundry POS now

**Recommended:** NO.

It would introduce domain complexity before Pizza Expert has completed its core restaurant operating system.

---

# 41. High-Level Technical Implementation

## Frontend

Keep the existing:

```text
Next.js
React
Tailwind
Supabase
```

Add a touch-optimized POS application shell.

Use:

- Large hit targets
- Keyboard shortcuts
- Fast search
- Sticky order panel
- Minimal modal depth
- Instant optimistic updates
- Clear order-state indicators

The existing PRD already specifies Next.js 16.3/Turbopack and Supabase PostgreSQL + RLS. [PRD v2.4, page 3]

## Backend

Add domain services/actions:

```text
posOrders.ts
posPayments.ts
cashierSessions.ts
tables.ts
kots.ts
recipes.ts
inventory.ts
purchases.ts
suppliers.ts
stockMovements.ts
wastage.ts
reports.ts
audit.ts
```

## Realtime

Extend existing Supabase Realtime channels:

```text
pos-terminal-{id}
kitchen-kds
table-floor-{storeId}
cashier-shift-{id}
inventory-{storeId}
admin-reports-{storeId}
```

The current platform already uses Supabase Realtime/WebSockets for KDS, deliveries and driver tracking, so POS can follow the same event architecture. fileciteturn0file0L61-L66

---

# 42. Critical Business Rules

Implement these as server-side rules, not only UI validation.

### Rule 1
A completed payment cannot be silently edited.

### Rule 2
A bill cannot be deleted; it can only be cancelled/voided/refunded according to policy.

### Rule 3
Discounts above configured thresholds require manager authorization.

### Rule 4
Inventory consumption occurs from the final confirmed sale, not from an abandoned cart.

### Rule 5
A KOT cancellation after kitchen acknowledgement requires a reason.

### Rule 6
Cashier shift closing requires reconciliation.

### Rule 7
Every refund/void/stock adjustment produces an audit record.

### Rule 8
Offline-created transactions receive a temporary client ID and must be idempotent on server synchronization.

### Rule 9
The same logical payment cannot be recorded twice.

### Rule 10
A menu item can be disabled instantly when ingredient availability falls below the configured threshold.

---

# 43. Security & Reliability

Because POS becomes a financial system, enforce:

- Supabase RLS
- Role-based permissions
- Server-side authorization
- Idempotency keys
- Audit logging
- Payment webhook verification
- Immutable payment records
- Transaction boundaries
- Daily reconciliation
- Backup/restore strategy
- Device/session management
- Rate limiting on sensitive actions

The existing PRD already uses PostgreSQL + RLS for relational integrity and authorization boundaries. [PRD v2.4, page 3]

---

# 44. Testing Strategy

## POS transaction tests

Test:

- Cash sale
- UPI sale
- Card sale
- Mixed payment
- Partial payment
- Refund
- Cancellation
- Discount
- Loyalty redemption

## Restaurant tests

Test:

- Table open
- Add item
- Partial KOT
- Additional KOT
- Table move
- Table merge
- Table split
- Bill close

## Inventory tests

Test:

- Sale consumes recipe
- Purchase increases stock
- Wastage reduces stock
- Stock adjustment
- Stock count variance
- Concurrent sale/inventory updates

## Reliability tests

Test:

- Internet disconnect
- POS reconnect
- Duplicate sync
- Duplicate payment callback
- Printer failure
- KDS disconnected
- Browser refresh
- Multiple terminals editing same order

---

# 45. Success Metrics After Launch

Measure:

### Speed

- Average order-entry time
- Average bill-close time
- KOT fire time
- Average payment time

### Reliability

- POS crash rate
- Failed transaction rate
- Offline sync failures
- Payment reconciliation failures

### Operations

- Average preparation time
- Order error rate
- Discount rate
- Void/refund rate
- Cash variance

### Inventory

- Food cost %
- Wastage %
- Stock variance
- Stock-out frequency
- Purchase price variance

### Business

- Average order value
- Repeat customer rate
- Sales by channel
- Gross contribution by menu item
- Store-level profitability

---

# 46. Final Product Scope

The final product should evolve into:

```text
                    PIZZA EXPERT PLATFORM
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       CUSTOMER           POS              ADMIN
       CHANNELS          CHANNEL             │
          │                 │                 │
 Online Store        Counter Billing       Reports
 Dine-in QR          Dine-in Tables        Inventory
 Future 3P           Takeaway              Purchasing
                     Delivery              Suppliers
                     Pickup                Finance
                                          CRM
                                          Loyalty
                            │
                            ▼
                      CANONICAL ORDER
                          ENGINE
                            │
             ┌──────────────┼──────────────┐
             │              │              │
            KDS          PAYMENTS       INVENTORY
             │              │              │
          Kitchen       Reconciliation   Recipes
             │              │             Stock
             ▼              ▼             Wastage
          FULFILLMENT    CASH CONTROL     Purchasing
             │
      ┌──────┴──────┐
      │             │
 Delivery       Pickup/Dine-In
 Driver App        Completion
 GPS/OTP
```

---

# 47. Bottom Line

The most valuable POS expansion is **not a generic ERP feature dump**.

For Pizza Expert, the strongest product is an integrated **Restaurant Operating System**:

```text
POS
+
Tables
+
KOT/KDS
+
Payments
+
Cashier Control
+
Inventory
+
Recipes
+
Purchasing
+
CRM/Loyalty
+
Delivery
+
Analytics
```

You already have the difficult customer-to-kitchen-to-delivery backbone. The highest ROI now comes from adding the **store's physical operating layer** and then connecting every transaction to **inventory, cash, employee actions and profitability**.

That turns the product from a D2C pizza ordering application into a complete restaurant management platform.

---

# 48. Research Sources

The following external sources were used as product/market benchmarks during preparation:

1. Toast  -  Restaurant POS platform, POS, KDS, payments, loyalty, online ordering, inventory and restaurant operations:  
   https://pos.toasttab.com/  
   https://pos.toasttab.com/restaurant-pos

2. Toast  -  POS ordering and modifier workflow documentation:  
   https://support.toasttab.com/en/article/New-POS-Experience-Ordering-Screens

3. Toast  -  Payment/split-check workflow:  
   https://support.toasttab.com/en/article/New-POS-Managing-Payments

4. Toast  -  Analytics/reporting categories:  
   https://support.toasttab.com/en/article/Getting-Started-with-Analytics-and-Reports

5. Toast  -  Kitchen Display System:  
   https://pos.toasttab.com/hardware/kitchen-display-system

6. Petpooja  -  Restaurant POS platform:  
   https://www.petpooja.com/poss

7. Petpooja  -  Restaurant inventory, recipe, purchasing and stock management:  
   https://www.petpooja.com/poss/restaurant-inventory-management-software

8. Petpooja  -  Billing, KOT, table/area management, restaurant reports, CRM and menu management:  
   https://www.petpooja.com/poss/restaurant-billing-software

9. Petpooja  -  QSR/multi-terminal POS:  
   https://www.petpooja.com/poss/quick-service-restaurant-software

10. Square for Restaurants  -  Table management and restaurant operations benchmark:  
    https://squareup.com/gb/en/point-of-sale/restaurants/features/table-management-system

11. CBIC  -  GST goods/services rates including restaurant services:  
    https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html

12. CBIC  -  GST rate-change publication on restaurant services:  
    https://cbic-gst.gov.in/pdf/press-release/GST-RATE-CHANGES.pdf

13. NPCI  -  UPI merchant FAQ and QR payment modes:  
    https://www.npci.org.in/what-we-do/upi/faqs

14. NPCI  -  UPI circulars and current ecosystem guidance:  
    https://www.npci.org.in/circulars/upi

---

## Implementation Order Summary

```text
PHASE 0
Canonical order + POS data model + permissions + ledger design
        v
PHASE 1
POS billing + payments + KOT + KDS integration + cashier shift
        v
PHASE 2
Tables + waiter + floor + station routing + printer + refunds
        v
PHASE 3
Ingredients + recipes + purchases + suppliers + stock + wastage
        v
PHASE 4
Profitability + food cost + owner analytics + advanced reports
        v
PHASE 5
Multi-store + central warehouse + SaaS tenancy
        v
PHASE 6
Kiosk + handheld + reservations + marketplace integrations + AI
```

**Recommended immediate engineering milestone:** implement **Phase 0 + Phase 1 together**, because the POS should not become a parallel order/payment system. Once the canonical transaction model is correct, the later inventory, reporting and multi-store layers become much easier and safer to build.
