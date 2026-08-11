# Admin panel navigation restructure

**Project:** Pizza Expert Prayagraj — Admin Portal
**Goal:** Reduce flat 18-item sidebar to a grouped, collapsible navigation with 8 top-level entries.
**Status:** Proposed — pending dev implementation

---

## Current state (before)

18 flat top-level items in the sidebar:

Dashboard, Analytics & BI, Customer CRM, Drivers (Fleet), Inventory & Stock, GST Compliance, Audit Log, Suppliers & POs, Staff Roster, Theme & Customizer, Orders, Kitchen (KDS), Deliveries, Products, Reviews, Coupons, Payments, Settings

Plus "Public Website" as a nav link (should not be a nav item — see notes).

---

## Proposed state (after)

```
Dashboard                              (standalone, no submenu)

Operations                             (collapsible group)
├── Orders
├── Kitchen (KDS)
├── Deliveries
└── Drivers (Fleet)

Catalog & Engagement                   (collapsible group)
├── Products
├── Coupons
└── Reviews

Customers                              (collapsible group)
└── Customer CRM

Supply Chain & Staff                   (collapsible group)
├── Inventory & Stock
├── Suppliers & POs
└── Staff Roster

Finance & Compliance                   (collapsible group)
├── Payments
├── GST Compliance
└── Audit Log

Analytics & BI                         (standalone — see note below)

Settings                               (collapsible group)
├── Settings (general)
└── Theme & Customizer
```

**Result:** 8 top-level nav entries instead of 18, each expandable to 1–4 submenu items.

---

## Grouping rationale

| Group | Why these belong together |
|---|---|
| Operations | Everything staff touch during live order fulfillment — the "today, right now" workflow |
| Catalog & Engagement | Customer-facing content that shapes what people see and buy |
| Customers | CRM-only for now; isolated because customer data has different access/privacy needs |
| Supply Chain & Staff | Weekly/monthly back-of-house admin — not daily-use screens |
| Finance & Compliance | Owner/accountant-facing, periodic review, sensitive data |
| Analytics & BI | Reporting layer — kept separate from Dashboard for now (see note) |
| Settings | System-level configuration, infrequent use |

---

## Open decisions for the team

1. **Reviews placement** — currently under Catalog & Engagement (treated as product content). Alternative: move under Customers (treated as customer voice/feedback). Pick one; don't split it across both.
2. **Analytics & BI vs Dashboard** — if Dashboard is a live snapshot (today's orders/revenue) and Analytics is historical/deep reporting, keep as separate top-level items. If there's heavy overlap, merge Analytics as a second tab inside Dashboard and drop to 7 top-level entries.
3. **Public Website link** — remove from the sidebar nav entirely. Move to a small "View site ↗" link in the top header bar (near profile/logout), since it's an external link, not an admin function.

---

## Implementation notes

- Each group should be a collapsible section in the sidebar (expand/collapse on click, remember state per user via localStorage or user prefs table).
- Default expanded state: **Operations** open on load (most-used group); all others collapsed.
- Preserve existing routes — this is a navigation/IA change only, not a URL restructure. E.g. `/admin/orders`, `/admin/kitchen` etc. stay as-is; only the sidebar grouping changes.
- Add group icons for quick scanning (e.g. Operations = clipboard/kitchen icon, Finance = rupee/receipt icon, Supply Chain = box/truck icon).
- Highlight the active group + active sub-item so users always know where they are, even when a group is collapsed.
- Mobile/tablet admin view: collapse all groups by default, single-column accordion.

---

## Acceptance criteria

- [ ] Sidebar shows 8 top-level entries (Dashboard, Operations, Catalog & Engagement, Customers, Supply Chain & Staff, Finance & Compliance, Analytics & BI, Settings)
- [ ] Each group expands/collapses independently and persists state across sessions
- [ ] All existing routes/URLs unchanged
- [ ] Active page is visually indicated at both group and sub-item level
- [ ] "Public Website" link moved to header bar, removed from sidebar
- [ ] Reviews placement decision made and implemented consistently
- [ ] Analytics & BI vs Dashboard merge decision made
