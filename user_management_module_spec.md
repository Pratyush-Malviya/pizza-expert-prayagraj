# 👤 User Management Module — Feature Specification
**Companion to:** Pizza Expert Prayagraj PRD v2.0
**Author:** Pratyush Malviya | **Status:** 🟡 Proposed Addition

---

## 1. Why This Needs Its Own Module

The PRD already defines `PROFILES`, a 6-role permission matrix (§6), and a basic Customer Account page (§7.5). But looking closely, **"Staff" and "Customers" both appear as admin nav items (§8.1) with no feature spec written for either** — unlike Products, Coupons, and GST which each got a full subsection. This is the gap: user management is *referenced* but never *designed*. Given that Manager/Staff/Driver accounts directly control money, orders, and customer data, this deserves the same rigor as the Catalog CMS or Coupon Engine.

---

## 2. Gap Analysis — What's Already There vs. Missing

| Area | In PRD today | Missing |
|---|---|---|
| Auth | Google OAuth + email/password (Supabase Auth) | Phone/OTP login, email verification enforcement, password reset flow spec |
| Roles | 6 roles, flat feature-level matrix (§6) | Granular per-resource permissions, custom roles, permission editing UI |
| Staff | Mentioned in nav + roadmap ("Staff roster ✅ live") | No creation/invite flow, no deactivation flow, no admin page spec |
| Customers | Nav item exists | No admin-side CRM view, segmentation, notes, or blocking |
| Driver | Role exists, Driver PWA in Phase 4C | No onboarding/KYC, no vehicle/document fields |
| Security | RLS table (§10.1), JWT flow (§10.3) | 2FA, session/device management, login attempt limits, audit log |
| Account lifecycle | Profile fields listed (§5.1) | Deactivation, soft delete, GDPR export/delete, guest-to-account merge |
| Admin oversight | — | No audit trail of who changed what (critical since Manager/Staff can edit orders & coupons) |

---

## 3. Proposed Data Model Additions

Extends the existing `PROFILES` entity (§5.1) — no breaking changes, additive only.

```
PROFILES (existing, extend)
  + is_active            boolean        -- soft deactivate instead of delete
  + email_verified_at    timestamp
  + phone_verified_at    timestamp
  + last_login_at        timestamp
  + invited_by           uuid FK -> PROFILES.id
  + invite_status        enum (pending, accepted, expired)  -- for staff
  + failed_login_count   int
  + locked_until         timestamp

STAFF_DETAILS (new)
  id                 uuid PK, FK -> PROFILES.id
  employee_code      string
  department         string        -- kitchen, delivery, front-desk, management
  hire_date          date
  shift_pattern      jsonb
  hourly_rate        decimal       -- optional, if payroll ever needed

DRIVER_DETAILS (new)
  id                 uuid PK, FK -> PROFILES.id
  vehicle_type       enum (bike, scooter, cycle)
  vehicle_number     string
  license_number     string
  license_doc_url    string
  id_proof_url       string
  verification_status enum (pending, verified, rejected)
  is_online          boolean       -- currently accepting deliveries

CUSTOMER_ADDRESSES (new — currently addresses live inline in orders.address_json only)
  id                 uuid PK
  user_id            uuid FK -> PROFILES.id
  label              string        -- Home, Work, Other
  full_address        text
  lat / lng          decimal
  is_default         boolean

AUDIT_LOG (new)
  id                 uuid PK
  actor_id           uuid FK -> PROFILES.id
  action             string        -- e.g. "order.status_changed", "coupon.created"
  target_table       string
  target_id          uuid
  before             jsonb
  after              jsonb
  ip_address         string
  created_at         timestamp

USER_SESSIONS (new)
  id                 uuid PK
  user_id            uuid FK -> PROFILES.id
  device_info        string
  ip_address         string
  created_at         timestamp
  revoked_at         timestamp
```

Note: `CUSTOMER_ADDRESSES` as a proper table (rather than JSON-only on orders) is what actually enables the "Saved Addresses" feature already promised in §7.5 — right now the schema only stores address per-order.

---

## 4. Granular Permission Model (Upgrade from §6)

The current matrix is feature-level (✅/❌ per page). Recommend evolving to **resource + action** granularity, still role-based but expressed as a permissions table so a future "custom role" doesn't require a schema change:

| Resource | Action | Super Admin | Manager | Staff | Viewer | Driver |
|---|---|:---:|:---:|:---:|:---:|:---:|
| orders | view | ✅ | ✅ | ✅ | ✅ | own-assigned |
| orders | edit status | ✅ | ✅ | ✅ | ❌ | own-assigned (delivery only) |
| orders | cancel/refund | ✅ | ✅ | ❌ | ❌ | ❌ |
| staff | create/invite | ✅ | ❌ | ❌ | ❌ | ❌ |
| staff | edit role | ✅ | ❌ | ❌ | ❌ | ❌ |
| staff | deactivate | ✅ | ❌ | ❌ | ❌ | ❌ |
| customers | view profile | ✅ | ✅ | ❌ | ✅ | ❌ |
| customers | block/unblock | ✅ | ❌ | ❌ | ❌ | ❌ |
| coupons | create/edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| audit log | view | ✅ | ❌ | ❌ | ❌ | ❌ |

This keeps §6 intact but adds the action-level detail needed before you actually build `/admin/staff`.

---

## 5. Feature List by User Type

### 5.1 Customer Self-Service Account — `/account`
Extends §7.5:
- Email + phone verification (OTP via Twilio, already in tech stack)
- Change password / linked-account management (link Google to email account)
- Saved addresses as first-class records (map pin + label), not just order-time JSON
- Notification preferences (SMS/email opt-in/out per category — order updates vs marketing)
- Order history with **filters** (date range, status) and reorder — already partly covered
- "Download my data" and "Delete my account" (GDPR-style, low effort, good trust signal)
- Referral code (if you want to bolt on viral growth later)

### 5.2 Admin — Staff Management — `/admin/staff` (new subsection, parallel to §8.5–8.7)
- Staff list: name, role, department, status (active/invited/inactive), last login
- **Invite flow:** admin enters email + role → magic-link invite → staff sets password on first login
- Edit role/permissions inline
- Deactivate (soft) — instantly revokes session, doesn't delete order history attribution
- Activity view per staff member (orders handled, coupons created) — pulls from `AUDIT_LOG`
- Shift assignment (ties into the already-planned Phase 4A "Staff Scheduling")

### 5.3 Admin — Customer Management / CRM — `/admin/customers` (new subsection)
- Customer list: name, phone, total orders, total spend, loyalty tier, last order date
- Search/filter by tier, order count, inactivity ("no order in 30 days" — feeds Phase 2A win-back)
- Individual customer detail: order history, saved addresses, loyalty point ledger, notes field for staff
- Block/unblock a customer (abuse, chargebacks, fake orders)
- Manual loyalty point adjustment (goodwill gesture use case — common in F&B)
- Export segment to CSV (for ad targeting, WhatsApp broadcast, etc.)

### 5.4 Driver Onboarding & Profile
- Document upload: license, ID proof, vehicle registration
- Verification status workflow (pending → admin review → verified/rejected)
- Online/offline toggle (already implied by Delivery Dispatch Board in §8.1, but needs the profile fields to back it)
- This should probably move up from Phase 4C into whichever phase actually ships driver accounts, since dispatch can't meaningfully assign drivers without it

### 5.5 Account Security (all roles)
- 2FA for Super Admin / Manager at minimum (they can issue refunds and edit staff)
- Failed-login lockout (5 attempts → 15 min lock, using `failed_login_count`/`locked_until`)
- Active session list + "log out other devices" (uses `USER_SESSIONS`)
- Login notification email on new device (cheap, high trust value)

---

## 6. Key Workflows

**Staff Invite Flow**
```
Admin fills invite form (email, role) 
  → Supabase Auth generates magic link 
  → Email sent via Resend 
  → Staff clicks link, sets password 
  → invite_status: accepted, is_active: true
  → AUDIT_LOG entry: "staff.invited" by admin
```

**Account Deactivation**
```
Admin clicks Deactivate 
  → is_active = false, all active sessions revoked 
  → Staff can no longer log in, but historical order/coupon records keep their attribution (FK intact, not deleted)
```

**Password Reset (Customer or Staff)**
```
User requests reset → Supabase Auth sends reset email (Resend) 
  → Link expires in 1 hour → New password set → All other sessions revoked
```

---

## 7. Where This Fits the Existing Roadmap (§16)

This slots naturally alongside **Phase 1** (before Financial BI, since audit logging strengthens trust in the financial dashboard you're about to build) and **Phase 4A** (Staff Scheduling already touches staff accounts). Suggested placement:

| Sub-feature | Suggested Phase | Rationale |
|---|---|---|
| Audit log + granular permissions | Phase 1 (alongside Financial BI) | Manager/Staff already touch money; log it before you build dashboards on top |
| Customer CRM (`/admin/customers`) | Phase 2 (with Retention) | Directly feeds win-back/segmentation work already planned |
| Staff invite/deactivate flow | Phase 1 or 2 | Low effort, high operational value, currently a gap in a "live" feature |
| Driver onboarding/KYC | Move into Phase 4C prep, or earlier if dispatch board needs real driver profiles sooner | Dispatch board (already live per §16) implies driver accounts exist — but they're not spec'd |
| 2FA, session management | Phase 3–4 | Nice-to-have hardening, not blocking early revenue goals |

Rough effort: Staff Management (~4 days), Customer CRM (~5 days), Audit Log (~3 days), Driver onboarding (~4 days), Account security hardening (~4 days). **~20 dev days total** — can mostly run in parallel with Phase 1/2 work since it touches Auth/Profiles, not Orders/Inventory logic.

---

## 8. Open Questions (add to PRD §18)

| # | Question | Impacts |
|---|---|---|
| 1 | Do you want custom/mixed roles later (e.g. "Manager who can't see finances"), or is the fixed 6-role set permanent? | Whether to build the granular permissions table now vs. later |
| 2 | Will drivers be employees or gig/on-demand? | Onboarding flow complexity, KYC depth |
| 3 | Is GDPR-style "delete my data" a real compliance need for an India-only local business, or just good practice? | Priority of §5.1's delete/export features |
| 4 | Should Super Admin be able to impersonate a customer account for support purposes? | Adds a "login as" audit-logged feature |

---

## 9. Broader PRD Recommendations (Beyond User Management)

A few things stood out while reading the full PRD that would strengthen it independent of this module:

1. **No refund/dispute workflow detail** — the order state machine (§5.2) has a `refunded` state, but Phase 5B "Refund Workflow" has no sub-spec yet the way Coupons/GST do. Given payments touch two gateways (Razorpay + Cashfree), this deserves early attention — partial refunds and gateway reconciliation get messy fast.
2. **No rate limiting / abuse prevention spec** for order placement — a local pizzeria with a 4.9★ rating is a real target for fake-order griefing or coupon abuse (e.g. scripted signups to farm the 5% abandoned-cart coupon in Phase 2A). Worth a line in §10.
3. **Notification preferences aren't modeled** — Phase 2A adds SMS/email marketing, but there's no opt-out mechanism in the schema, which is both a DND/TRAI compliance risk in India and generally good practice.
4. **Multi-location isn't considered at all** — reasonable for v2, but if you ever franchise or open a second Prayagraj branch, `PRODUCTS`, `INVENTORY`, and `ORDERS` all currently assume single-location. Worth a one-line note in Open Questions so it's a conscious decision, not an accident.
5. **No backup/disaster recovery mention** — Supabase does automated backups, but there's nothing in §15 about RPO/RTO or what happens if a bad migration corrupts order data during a live dinner rush.
6. **Guest checkout → account merge isn't addressed** — §7.1 sitemap shows "Guest Checkout or Register/Login" as a branch, but if a guest orders 3 times with the same phone number, do those orders ever get merged into an account once they register? Affects loyalty point retroactivity and CRM accuracy in §5.3 above.

---

*Draft for review — meant to be merged into `pizza_expert_prd_v2.md` as new §6a (Permissions) and §8.x (Staff/Customer admin pages) once you're happy with scope.*
