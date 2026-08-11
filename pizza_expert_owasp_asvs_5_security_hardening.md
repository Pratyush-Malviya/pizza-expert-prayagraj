# Pizza Expert Prayagraj — OWASP ASVS 5.0.0 Security Audit & Hardening Plan

**Application:** Pizza Expert Prayagraj  
**Repository:** `Pratyush-Malviya/pizza-expert-prayagraj`  
**Live application:** `https://pizza-kappa-nine.vercel.app`  
**Primary stack:** Next.js 16.3 / React 19 / Supabase PostgreSQL / Supabase Auth / Realtime / Storage / Razorpay / Cashfree  
**Audit basis:** OWASP ASVS 5.0.0, OWASP Cheat Sheet Series, OWASP NodeGoat patterns, application PRD, and the public GitHub repository  
**Audit date:** 2026-08-11  
**Status:** Source review completed; remediation specification prepared

> **Important scope note:** This document is a source/configuration security review and an implementation blueprint. The repository is publicly readable, but I do not have write/commit/deployment access in this session. Therefore this document does **not** falsely claim that fixes have already been applied or that a post-fix verification has passed. The "second review" section is the exact verification gate to run after applying the changes.

---

## 1. Executive Security Assessment

The application has several good security foundations:

- Supabase Auth is used rather than a custom password system.
- `@supabase/ssr` is used for server-side authentication.
- PostgreSQL RLS is enabled on many core tables.
- Payment idempotency was partially considered through a unique `gateway_payment_id`.
- Refund processing has a server-side super-admin check.
- Zod/React Hook Form are present in the dependency set.
- The PRD explicitly requires RLS, audit logging, secure server-only secrets, and OWASP-oriented security testing.
- The repository has separate browser/server Supabase clients.

However, the current source contains **critical authorization weaknesses that must be fixed before treating the application as production-secure**.

### Highest-risk findings

| ID | Severity | Area | Finding |
|---|---|---|---|
| SEC-001 | **CRITICAL** | Authentication / Admin | `admin_session=true` or `simple_admin=true` cookie bypasses Supabase authentication entirely |
| SEC-002 | **CRITICAL** | Authorization | Admin role resolution defaults to `super_admin` when profile lookup/metadata does not provide a role |
| SEC-003 | **CRITICAL** | Database RLS | Several later migrations create policies with `USING (TRUE)`, effectively allowing unrestricted access |
| SEC-004 | **CRITICAL** | Orders | Customer order INSERT policy uses `WITH CHECK (TRUE)` and permits arbitrary order ownership/data |
| SEC-005 | **CRITICAL** | Order items | Order-item INSERT policy uses `WITH CHECK (TRUE)` |
| SEC-006 | **CRITICAL** | Driver / delivery | Delivery authorization is not represented by a sufficiently restrictive RLS model in the reviewed migrations |
| SEC-007 | **HIGH** | Realtime | Sensitive operational rows are published through Supabase Realtime without a demonstrated per-role channel policy |
| SEC-008 | **HIGH** | Payment | Payment/order totals are represented as client-submittable data; server-side authoritative pricing must be enforced |
| SEC-009 | **HIGH** | Coupon abuse | Coupon validation trusts client-supplied `subtotal` and has no visible rate limit |
| SEC-010 | **HIGH** | Cart | `/api/cart/sync` updates a caller-supplied `sessionId` without an ownership predicate |
| SEC-011 | **HIGH** | Error handling | Several API routes return raw exception/database messages to clients |
| SEC-012 | **HIGH** | Sensitive data | Driver KYC URLs, customer addresses, phones and audit/IP data require stricter field-level exposure controls |
| SEC-013 | **HIGH** | File upload | KYC/proof/review uploads need explicit type, size, content, ownership and storage-bucket controls |
| SEC-014 | **HIGH** | Browser security | `next.config.ts` contains no visible CSP/security-header configuration |
| SEC-015 | **HIGH** | Rate limiting | No application-wide rate-limit control is visible for authentication, coupon, cart, payment, OTP, upload or refund operations |
| SEC-016 | **HIGH** | Business logic | Order status changes need server-side transition enforcement, not only UI/middleware restrictions |
| SEC-017 | **MEDIUM** | Audit | Audit-log insertion and storage need stronger anti-tampering and sensitive-data controls |
| SEC-018 | **MEDIUM** | Settings | Public SELECT access to the generic `settings` table can expose future secrets/configuration accidentally |
| SEC-019 | **MEDIUM** | Coupons | Public/authenticated coupon reads can expose targeting/usage metadata |
| SEC-020 | **MEDIUM** | Secrets | Secret names are correctly separated in the PRD, but a production source/bundle/CI secret scan is still required |
| SEC-021 | **MEDIUM** | Dependency security | Package versions use broad `^` ranges for most dependencies; continuous dependency/security scanning is missing |
| SEC-022 | **MEDIUM** | CSRF | State-changing cookie-authenticated endpoints need explicit CSRF/origin protection |
| SEC-023 | **MEDIUM** | Open redirects | Login redirects accept a `redirect` query parameter and should be constrained to local paths |
| SEC-024 | **MEDIUM** | Logging/privacy | IP addresses, addresses, phones and action traces need retention, access and redaction rules |
| SEC-025 | **MEDIUM** | Public repository | The repository is public; all historical commits must be scanned for accidentally committed secrets |

---

# 2. Architecture Reviewed

The PRD describes a Next.js App Router frontend deployed on Vercel with Supabase Auth, PostgreSQL, Realtime, Storage and Edge Functions, plus Razorpay/Cashfree, Google Maps, Twilio and Resend integrations.

The PRD states that customer/admin/driver workflows share the same application and that Realtime is used for order updates. It also explicitly defines Super Admin, Manager, Staff, Viewer, Customer and Driver roles.

The repository confirms:

- `app/`
- `app/api/`
- `app/admin/`
- `app/account/`
- `app/driver/`
- `lib/supabase/`
- `supabase/migrations/`
- `middleware.ts`
- `next.config.ts`
- `package.json`

The PRD's architecture and role model are documented in sections 3, 5, 6, 8 and 10. In particular, the PRD states that RLS is intended to restrict customers to their own orders and payments and that server-only keys must never be exposed.

**Assessment:** the intended security architecture is materially stronger than some of the actual database and middleware controls currently present in the repository.

---

# 3. Critical Findings and Required Fixes

## SEC-001 — CRITICAL — Admin authentication bypass cookies

### Evidence

`lib/supabase/middleware.ts` contains:

```ts
const adminSession = request.cookies.get('admin_session')?.value === 'true'
const simpleAdmin = request.cookies.get('simple_admin')?.value === 'true'

if (adminSession || simpleAdmin) {
  return supabaseResponse
}
```

This occurs before the `!user` rejection.

### Impact

An attacker who can cause either cookie to exist can bypass the middleware's admin authentication gate.

Even if the cookie is not currently set by a production UI, the presence of a boolean trust cookie is an unacceptable authentication boundary.

### ASVS mapping

- V2 Authentication
- V3 Web Frontend Security
- V4 Access Control
- V7 Error Handling and Logging

### Fix

**Delete both bypass mechanisms completely.**

Admin access must require:

1. Valid Supabase session.
2. Active profile.
3. Server-side role lookup.
4. Explicit role authorization for the requested operation.

Do not replace them with another client-controlled cookie.

### Required regression tests

- No session + `/admin` => 302/401.
- `admin_session=true` + no session => 302/401.
- `simple_admin=true` + no session => 302/401.
- Customer session + `/admin` => 403/redirect.
- Staff session + `/admin/settings` => 403.
- Viewer session + `/admin/customers` => 403.

---

## SEC-002 — CRITICAL — Fail-open role resolution

### Evidence

Current middleware logic effectively falls back to:

```ts
role = profile?.role || user.user_metadata?.role || 'super_admin'
```

### Impact

If the profile query fails, returns no role, or user metadata is malformed, the application can treat the user as `super_admin`.

This is a classic fail-open authorization design.

### Fix

Use a fail-closed helper:

```ts
const { data: profile, error } = await supabase
  .from('profiles')
  .select('role,is_active')
  .eq('id', user.id)
  .single()

if (error || !profile || !profile.is_active) {
  return forbidden()
}

const role = profile.role

if (!ALLOWED_ROLES.includes(role)) {
  return forbidden()
}
```

Never use `user_metadata.role` as an authorization source.

Never use an email address as an authorization override.

---

## SEC-003 — CRITICAL — RLS policies using `USING (TRUE)`

### Evidence

`006_phases_3_4_5_combined.sql` contains policies such as:

```sql
CREATE POLICY "Admins manage tax_invoices"
ON tax_invoices FOR ALL USING (TRUE);

CREATE POLICY "Admins manage suppliers"
ON suppliers FOR ALL USING (TRUE);

CREATE POLICY "Admins manage purchase_orders"
ON purchase_orders FOR ALL USING (TRUE);

CREATE POLICY "Admins manage staff_shifts"
ON staff_shifts FOR ALL USING (TRUE);

CREATE POLICY "Users manage own subscriptions"
ON subscriptions FOR ALL USING (TRUE);
```

### Impact

`USING (TRUE)` is not an admin check.

Depending on the caller and operation, these policies can expose or mutate data to any role that can reach the table.

The subscription policy is especially dangerous because the table contains a `user_id`.

### Fix

Create centralized role helpers and explicit owner policies.

Example:

```sql
CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = ANY(required_roles)
  );
$$;
```

Then:

```sql
CREATE POLICY "Managers manage suppliers"
ON suppliers
FOR ALL
USING (public.has_role(ARRAY['super_admin','manager']))
WITH CHECK (public.has_role(ARRAY['super_admin','manager']));
```

For subscriptions:

```sql
CREATE POLICY "Users manage own subscriptions"
ON subscriptions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## SEC-004 — CRITICAL — Arbitrary order insertion

### Evidence

The initial migration defines:

```sql
CREATE POLICY "Users can insert orders"
ON orders FOR INSERT WITH CHECK (TRUE);
```

The `orders` table contains:

- `user_id`
- `subtotal`
- `tax`
- `delivery_fee`
- `discount`
- `total`
- `coupon_id`
- `address_json`
- `status`

### Impact

A caller can potentially submit an order with:

- another user's `user_id`
- arbitrary totals
- arbitrary discount
- arbitrary status
- arbitrary coupon reference
- arbitrary address JSON

This is both an authorization and business-logic vulnerability.

### Fix

Do not allow direct client inserts into the authoritative `orders` table.

Preferred architecture:

**Browser → authenticated API/server action → validated order command → database transaction**

The server must:

1. Identify the authenticated user.
2. Ignore any client-provided `user_id`.
3. Re-read product prices from the database.
4. Validate product availability.
5. Validate option IDs against the selected product.
6. Calculate subtotal.
7. Calculate tax.
8. Validate coupon atomically.
9. Calculate delivery fee.
10. Calculate final total.
11. Create the order.
12. Create order items.
13. Create payment intent.
14. Return only safe response fields.

If guest checkout is required, use a server-issued guest checkout token/session rather than allowing arbitrary ownership.

---

## SEC-005 — CRITICAL — Arbitrary order-item insertion

### Evidence

```sql
CREATE POLICY "Service can insert order items"
ON order_items FOR INSERT WITH CHECK (TRUE);
```

### Impact

A caller may be able to attach items to an order they do not own or create arbitrary prices/quantities.

### Fix

Remove direct browser INSERT.

Order items should only be created inside a trusted transaction that has already established ownership of the parent order.

At minimum:

```sql
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
      AND o.user_id = auth.uid()
  )
)
```

For a stronger model, only a server-side function with controlled `SECURITY DEFINER` privileges should insert order items.

---

## SEC-006 — CRITICAL — Driver ownership and delivery mutation

### Risk

The PRD states that drivers can accept and complete deliveries, and the driver UI is client-side. The driver role exists in the database, but the reviewed RLS foundation does not establish a complete delivery ownership model.

A driver must never be able to update:

```text
delivery.driver_id
delivery.order_id
delivery.otp_verified
delivery.status
delivery.proof_photo_url
delivery.cod_collected_amount
```

for an arbitrary delivery.

### Required design

A delivery mutation must satisfy:

```text
authenticated user
AND profile.role = driver
AND profile.is_active = true
AND driver is verified
AND delivery.driver_id = auth.uid()
AND order is in a legal state transition
```

Example:

```sql
CREATE POLICY "Driver updates assigned delivery"
ON deliveries
FOR UPDATE
USING (
  driver_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'driver'
      AND is_active = true
  )
)
WITH CHECK (
  driver_id = auth.uid()
);
```

For status changes, prefer a database function that enforces the state machine.

---

# 4. Order Ownership Model

The order lifecycle must be server-authoritative.

## Required invariants

### Customer

A customer may:

- create an order for themselves
- view their own order
- view their own order items
- view their own payment status
- cancel only when the order state allows cancellation
- request a refund according to business rules

A customer may not:

- change `user_id`
- change price
- change tax
- change discount
- mark paid
- mark delivered
- assign a driver
- change another customer's order

### Driver

A driver may:

- see assigned delivery
- accept only an assigned/eligible delivery
- update permitted delivery progress
- submit delivery proof
- verify OTP
- update own availability

A driver may not:

- view unrelated customer addresses
- enumerate all orders
- reassign themselves to another delivery
- mark arbitrary orders delivered
- change order price/payment status
- read KYC documents belonging to other drivers

### Staff

Staff permissions must be action-specific rather than "admin-like".

Example:

| Operation | Super Admin | Manager | Staff | Viewer | Driver | Customer |
|---|---:|---:|---:|---:|---:|---:|
| View operational orders | Yes | Yes | Yes | Read-only | Assigned only | Own only |
| Change order state | Yes | Yes | Kitchen states only | No | Delivery states only | No |
| Refund | Yes | Optional | No | No | No | Request only |
| Manage roles | Yes | No | No | No | No | No |
| Manage settings | Yes | No | No | No | No | No |
| Manage drivers | Yes | Yes | No | No | Own status only | No |
| View KYC | Yes | Yes | No | No | Own only | No |
| View customer audit trace | Yes | Yes | No | No | No | Own activity only |

---

# 5. Payment Security

## Current positive controls

Migration `008_payment_safety.sql` adds a unique index over `gateway_payment_id`, which is a useful duplicate-webhook defense.

## Required payment architecture

Never trust:

- frontend `total`
- frontend `discount`
- frontend `tax`
- frontend `unit_price`
- frontend `payment_status`
- frontend `gateway_payment_id`
- frontend `order.status`

### Correct flow

```text
Client cart
   ↓
Server validates product IDs/options/quantities
   ↓
Server calculates authoritative amount
   ↓
Server creates pending order
   ↓
Server creates Razorpay/Cashfree order
   ↓
Gateway payment
   ↓
Signed webhook
   ↓
Verify webhook signature
   ↓
Verify gateway order/payment IDs
   ↓
Verify gateway amount == DB expected amount
   ↓
Atomic DB state transition
   ↓
confirmed
```

## Webhook requirements

For every payment webhook:

1. Verify cryptographic signature.
2. Parse event schema.
3. Reject unknown event versions/types safely.
4. Look up the payment/order by gateway identifiers.
5. Compare amount and currency.
6. Enforce allowed state transition.
7. Use idempotency.
8. Record webhook event ID.
9. Never trust a client success callback as proof of payment.

---

# 6. Refund Security

`/api/refunds/process` already performs a server-side super-admin profile check and checks for existing refund requests. That is good.

However, strengthen it.

## Required checks

Before refund:

```text
super_admin
AND active account
AND order exists
AND order is owned by the restaurant
AND payment is actually paid
AND gateway/payment ID exists
AND refund amount > 0
AND refund amount <= refundable balance
AND no existing processed/processing refund
AND idempotency key is unique
```

Do not trust the submitted `amount`.

Calculate the refundable amount server-side.

### Never do

```ts
amount: Number(amount)
```

without comparing it against the paid/refundable amount.

---

# 7. Coupon Security

## Current issue

`/api/coupons/validate` accepts:

```ts
const { code, subtotal } = await req.json()
```

and calculates the discount from the supplied subtotal.

### Risk

A malicious client can send:

```json
{
  "code": "SAVE50",
  "subtotal": 100000
}
```

or a negative/invalid/non-finite number.

### Fix

The endpoint should accept only:

```json
{
  "code": "SAVE50",
  "cart": [...]
}
```

or, preferably, an opaque server-side cart/order reference.

The server must calculate subtotal from database prices.

Also validate:

- max usage
- per-user usage
- expiration
- minimum order
- percentage maximum
- fixed discount <= subtotal
- targeted user
- product/category restrictions
- one-time use
- concurrent redemption

Use an atomic redemption function to prevent race conditions.

---

# 8. Cart Synchronization Security

## Current issue

`/api/cart/sync` accepts a caller-supplied `sessionId` and executes:

```ts
.from('cart_sessions')
.update(...)
.eq('id', sessionId)
```

There is no explicit ownership predicate in the API code.

### Required fix

For authenticated users:

```ts
.eq('id', sessionId)
.eq('user_id', user.id)
```

For guest sessions, use a random high-entropy server-issued token rather than exposing an enumerable database identifier as the sole authorization mechanism.

Also:

- validate maximum item count
- validate maximum quantity
- validate JSON structure
- reject oversized payloads
- cap request body size
- rate-limit the endpoint

---

# 9. Input Validation

Zod is installed, but library presence is not proof of enforcement.

Create schemas for every security-sensitive API route.

Example:

```ts
const Quantity = z.number().int().min(1).max(20);

const UUID = z.string().uuid();

const OrderItemInput = z.object({
  productId: UUID,
  quantity: Quantity,
  optionIds: z.array(UUID).max(20),
});

const CreateOrderInput = z.object({
  items: z.array(OrderItemInput).min(1).max(50),
  addressId: UUID.optional(),
  deliveryAddress: z.object({
    line1: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/),
  }).optional(),
  couponCode: z.string().trim().max(50).optional(),
});
```

Reject:

- NaN
- Infinity
- negative quantities
- zero quantities
- excessive quantities
- unknown option IDs
- arbitrary JSON objects
- oversized strings
- unexpected properties on sensitive commands

Use `.strict()` where mass assignment is a concern.

---

# 10. Authorization Must Exist at Three Layers

Do not rely on middleware alone.

## Layer 1 — UI

Hide controls from unauthorized users.

**Purpose:** usability.

Not security.

## Layer 2 — Server/API

Every sensitive route must perform authorization.

**Purpose:** security boundary.

## Layer 3 — Database/RLS

Every exposed Supabase table must have correct policies.

**Purpose:** defense in depth.

A request should remain unauthorized even if:

- the user calls the API directly;
- JavaScript is disabled;
- the browser UI is modified;
- a forged request is sent;
- a malicious Supabase client is used with the public anon/publishable key.

---

# 11. Realtime Security

The PRD uses `postgres_changes` for orders and operational updates.

This requires explicit review.

Do not broadcast:

- customer phone numbers
- customer addresses
- OTPs
- payment identifiers
- KYC URLs
- internal notes
- audit records
- staff compensation data

to every connected client.

### Recommended model

Use role-specific channels/events:

```text
customer:{userId}:orders
driver:{driverId}:deliveries
staff:kitchen
admin:operations
```

Only publish fields required by that audience.

Prefer event payloads such as:

```json
{
  "orderId": "...",
  "status": "preparing"
}
```

instead of full database rows.

---

# 12. OTP Security

The PRD currently describes an OTP displayed on the tracking page and verified by the driver.

### Risk

If the customer's tracking page exposes the OTP to anyone who obtains the order tracking URL/session, the OTP loses its purpose.

### Fix

The delivery OTP must:

- be generated server-side using cryptographically secure randomness;
- be stored hashed if possible;
- never be returned to drivers before the correct workflow;
- have a short lifetime;
- have a limited attempt count;
- be rate-limited;
- be invalidated after successful verification;
- be tied to the exact delivery;
- be excluded from Realtime payloads and logs.

If the customer must see it, require the authenticated customer's own order access.

---

# 13. GPS / Location Tracking

The PRD mentions delivery tracking and the repository contains a `driver_locations` concept.

### Required controls

A driver's current location is sensitive personal/operational data.

Rules:

- Driver may write only their own location.
- Driver may not read other drivers' locations unless operationally necessary.
- Customer may read only the assigned driver's approximate location for their active order.
- Location should not be exposed after delivery unless required.
- Store the minimum precision required.
- Apply retention limits.
- Do not place raw GPS coordinates in analytics logs.
- Do not send GPS history to the browser unless needed.
- Do not include GPS in generic Realtime payloads.

Use:

```text
driver_id = auth.uid()
```

as the ownership boundary.

---

# 14. File Upload Security

The application includes:

- product image upload
- avatar upload
- review/UGC image upload
- driver KYC documents
- proof-of-delivery photos

These must not share the same public storage policy.

## Recommended buckets

```text
product-public
avatars-private
reviews-public-or-moderated
driver-kyc-private
delivery-proof-private
```

## Upload rules

For every upload:

1. Require authentication where applicable.
2. Authorize the target object owner.
3. Restrict MIME types.
4. Restrict extension.
5. Enforce maximum byte size.
6. Generate server-side filenames.
7. Do not trust the original filename.
8. Do not permit path traversal.
9. Store private documents in private buckets.
10. Serve private documents with short-lived signed URLs.
11. Strip unnecessary metadata where feasible.
12. Consider malware scanning for KYC/document uploads.
13. Never render arbitrary uploaded HTML/SVG as active content.

Example safe image policy:

```text
image/jpeg
image/png
image/webp
max 5 MB
```

KYC documents should have a separate, stricter policy.

---

# 15. Security Headers / CSP

`next.config.ts` currently configures image remote patterns but does not visibly define a comprehensive security-header policy.

Add security headers at the application boundary.

Minimum target:

```text
Strict-Transport-Security
Content-Security-Policy
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy
X-Frame-Options: DENY
```

Use CSP carefully because Razorpay/Cashfree, Google Maps and analytics require specific origins.

Do not deploy a blindly copied CSP.

Start with:

```text
Content-Security-Policy-Report-Only
```

collect violations, then enforce.

### CSP design requirements

Explicitly control:

- `default-src`
- `script-src`
- `style-src`
- `img-src`
- `font-src`
- `connect-src`
- `frame-src`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- `frame-ancestors 'none'`

Avoid:

```text
script-src 'unsafe-inline' 'unsafe-eval' *
```

---

# 16. CORS

The application is primarily same-origin, so do not introduce permissive CORS unnecessarily.

For any API requiring cross-origin access:

- allow only the production origin;
- allow explicit methods;
- allow explicit headers;
- never use `Access-Control-Allow-Origin: *` with credentials;
- handle preflight;
- reject unexpected origins.

Preferred:

```text
https://pizza-kappa-nine.vercel.app
```

plus an explicitly configured production custom domain if one is added.

---

# 17. CSRF

Supabase SSR uses cookies for authentication. Therefore state-changing same-origin routes must be protected against cross-site requests.

For sensitive POST/PUT/PATCH/DELETE endpoints:

- verify `Origin` where available;
- reject unexpected `Origin`;
- use SameSite cookies appropriately;
- use CSRF tokens for particularly sensitive operations;
- do not accept state-changing GET requests.

Highest priority:

```text
refund
role changes
user deletion
order state mutation
driver assignment
OTP verification
payment operations
coupon redemption
settings changes
```

---

# 18. Open Redirect Protection

Login redirects use a `redirect` query parameter.

Never redirect directly to arbitrary URLs supplied by the user.

Allowed:

```text
/account
/admin
/admin/orders
```

Not allowed:

```text
https://attacker.example
//attacker.example
javascript:...
```

Use a helper:

```ts
function safeLocalRedirect(value: string | null, fallback = '/') {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}
```

---

# 19. Error Handling

Several routes currently return:

```ts
error: err.message
```

or:

```ts
error: error.message
```

### Risk

This can expose:

- SQL/database details
- schema names
- internal provider errors
- implementation details
- third-party API responses

### Fix

Return stable public errors:

```json
{
  "error": "Unable to process the request",
  "requestId": "..."
}
```

Log detailed information server-side.

Never return:

- stack traces
- SQL errors
- environment variable names
- payment provider credentials
- internal object dumps

---

# 20. Logging and Audit

The application already has audit-log structures, which is positive.

However, audit logging must be treated as a security system.

## Log

- authentication success/failure
- account lockout
- role changes
- user activation/deactivation
- refund creation
- refund completion/failure
- order status changes
- driver assignment
- OTP failures
- KYC approval/rejection
- settings changes
- suspicious rate-limit events
- payment webhook failures

## Do not log

- passwords
- access tokens
- refresh tokens
- service-role keys
- Razorpay secrets
- full payment credentials
- full OTP values
- unnecessary customer addresses
- unnecessary GPS coordinates

IP addresses should have documented retention and access rules.

---

# 21. Audit-Log Tamper Resistance

The database contains both `audit_logs` and a later `audit_log` table.

Avoid maintaining two competing audit systems.

Choose one canonical audit table.

Prefer:

```text
audit_events
```

with:

- actor_id
- action
- target_type
- target_id
- request_id
- source_ip_hash or controlled IP field
- user_agent_hash
- before_state
- after_state
- created_at

Only trusted server/database functions should insert security events.

Users should never be able to update or delete audit records.

---

# 22. Generic Settings Table

The initial migration currently allows:

```sql
CREATE POLICY "Public can read settings"
ON settings FOR SELECT USING (TRUE);
```

### Risk

A generic key/value table becomes a secret leak when a future developer stores:

```text
payment settings
internal flags
provider configuration
private API identifiers
admin-only configuration
```

### Fix

Split settings:

```text
public_settings
admin_settings
secret_settings
```

or create explicit row-level policies by key classification.

Never put secrets in PostgreSQL `settings` if they can live in Vercel/Supabase secrets.

---

# 23. Coupon Data Exposure

The migration allows authenticated users to read coupons.

Avoid exposing:

- `target_user_id`
- `used_count`
- internal usage limits
- campaign metadata
- administrative fields

Create a safe public validation function instead.

Example return:

```json
{
  "valid": true,
  "discount": 100,
  "discountType": "fixed"
}
```

Do not return the complete coupon row.

---

# 24. Database Function Hardening

Any `SECURITY DEFINER` function must:

```sql
SECURITY DEFINER
SET search_path = public
```

and must:

- qualify table names;
- validate `auth.uid()`;
- enforce authorization internally;
- avoid accepting arbitrary table names;
- avoid dynamic SQL unless absolutely necessary;
- expose only required operations.

This is especially important for:

- role helpers
- audit functions
- payment functions
- coupon redemption
- order creation
- inventory decrement
- delivery state changes

---

# 25. Order State Machine

The PRD defines a state machine:

```text
pending
  → confirmed
  → preparing
  → ready
  → out_for_delivery
  → delivered
```

with cancellation/refund branches.

This must be enforced server-side.

### Illegal examples

```text
pending → delivered
pending → refunded
delivered → preparing
customer → confirmed
driver → preparing
viewer → delivered
```

### Required database function

Create:

```sql
transition_order_status(
  p_order_id uuid,
  p_new_status text
)
```

The function should:

1. Identify caller.
2. Identify role.
3. Lock the order row.
4. Read current status.
5. Verify legal transition.
6. Verify role permission.
7. Update status.
8. Write audit event.
9. Commit atomically.

This prevents TOCTOU/race-condition attacks.

---

# 26. Inventory Race Conditions

The PRD says stock is decremented through a database trigger.

The final implementation must prevent:

```text
stock = 1
request A buys 1
request B buys 1
```

from producing negative stock or selling unavailable inventory.

Use a transaction/row lock or atomic update:

```sql
UPDATE ingredients
SET current_stock = current_stock - :required
WHERE id = :ingredient_id
  AND current_stock >= :required;
```

Then verify affected row count.

---

# 27. Rate Limiting

Implement rate limiting by both:

- IP
- authenticated user

Use different policies.

| Endpoint | Suggested limit |
|---|---|
| Login | 5/min/IP + progressive backoff |
| Signup | 5/hour/IP |
| Coupon validation | 20/min/user/IP |
| Cart sync | 60/min/user |
| Order creation | 10/min/user |
| Payment creation | 5/min/user |
| OTP verification | 5 attempts/10 min/delivery |
| Upload | 10/min/user |
| Refund | 5/min/admin |
| Admin mutations | 60/min/user |
| Webhooks | provider-specific + signature validation |

Use a distributed limiter suitable for Vercel/serverless execution rather than in-memory process state.

---

# 28. Dependency and Supply-Chain Security

Current `package.json` uses broad semver ranges such as:

```json
"next": "16.3.0",
"@supabase/supabase-js": "^2.112.2",
"zod": "^3.25.76"
```

The exact lockfile helps reproducibility, but continuous vulnerability scanning is still required.

Add CI:

```text
npm ci
npm audit --audit-level=high
npm run lint
npm run build
```

Also add:

- Dependabot/Renovate
- secret scanning
- lockfile review
- SCA
- SAST
- build artifact secret scanning

Do not automatically upgrade security-sensitive packages without testing.

---

# 29. Public Repository Secret Audit

Because the repository is public, scan:

```text
entire git history
source
.env files
logs
documentation
fixtures
tests
build artifacts
GitHub Actions
Vercel configuration
```

Use a secret scanner such as:

```text
gitleaks
trufflehog
GitHub secret scanning
```

If a real secret was ever committed:

1. Revoke it.
2. Rotate it.
3. Remove it from active configuration.
4. Remove it from history where appropriate.
5. Re-scan the entire repository.

A secret that has been rotated is still considered historically exposed.

---

# 30. Environment Variable Rules

### Browser-safe

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY / publishable key
NEXT_PUBLIC_RAZORPAY_KEY_ID
NEXT_PUBLIC_APP_URL
```

### Server-only

```text
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_SECRET
CASHFREE_APP_SECRET
RESEND_API_KEY
TWILIO_AUTH_TOKEN
GOOGLE_CLIENT_SECRET
INSTAGRAM_ACCESS_TOKEN
```

Never import a server-secret module from:

```text
'use client'
```

and never use `NEXT_PUBLIC_` for a secret.

---

# 31. Supabase Service-Role Client

Create a dedicated server-only module:

```ts
import 'server-only'

import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

Then:

- never import it into client components;
- never return its data directly;
- never accept arbitrary table names from requests;
- use it only in trusted server operations;
- keep RLS-safe operations on the user-scoped client where possible.

---

# 32. Browser Data Exposure

Do not use:

```ts
.select('*')
```

for sensitive entities.

Use explicit projections:

```ts
.select('id,status,created_at,total')
```

For customer data:

```text
name
phone
address
IP
LTV
order history
audit trace
```

must never be returned to a user merely because the frontend can hide the fields.

---

# 33. Realtime Database Exposure

The application currently adds `orders` and `order_items` to Realtime.

Review every Realtime publication and subscription.

### Required tests

Customer A must never receive:

```text
Customer B order
Customer B address
Customer B phone
Customer B order items
```

Driver A must never receive:

```text
Driver B location
Driver B KYC
Driver B delivery
```

Staff must receive only operational fields needed for their role.

---

# 34. Frontend Security

Review all client components for:

- `dangerouslySetInnerHTML`
- raw HTML rendering
- untrusted markdown
- URL injection
- `window.location` redirects
- localStorage tokens
- sensitive data in Zustand
- sensitive data in browser caches
- secrets imported into client bundles

Never store:

```text
refresh token
service-role key
payment secret
admin authorization state
KYC document content
```

in localStorage.

---

# 35. Zustand Security

Zustand is suitable for cart/UI state.

Do not persist security-sensitive server state in it.

Safe:

```text
cart UI
selected product
theme
notification state
```

Avoid persisting:

```text
authorization role
admin permissions
payment state
OTP
customer audit data
KYC data
```

Permissions must always come from the server.

---

# 36. API Inventory Required

Before final production sign-off, enumerate every:

```text
app/api/**/route.ts
```

and classify:

```text
public
authenticated
customer
driver
staff
manager
super_admin
webhook
cron
internal
```

Every route must have:

- HTTP method restriction
- authentication requirement
- authorization rule
- schema validation
- rate limit
- CSRF/origin rule if cookie-authenticated
- safe error response
- audit event if sensitive
- idempotency if state/money mutation
- maximum body size
- timeout where relevant

---

# 37. Cron and Webhook Security

The PRD uses Edge Functions for cron/webhooks.

### Cron

Never expose a cron endpoint that can be called anonymously.

Require a server-only secret or platform-authenticated invocation.

### Webhooks

Webhook endpoints must:

- verify provider signatures;
- reject unsigned requests;
- enforce timestamp/replay protection where supported;
- record provider event IDs;
- be idempotent;
- validate event schemas;
- avoid trusting client cookies.

---

# 38. Google Maps / External API Security

Google Maps API keys should be restricted by:

- API
- application origin where applicable
- environment

Do not use a broad server credential in browser code.

Avoid returning raw Google API responses to clients if they contain internal metadata.

---

# 39. Privacy and Data Minimization

The PRD includes GDPR data export and account deactivation.

Implement:

- data inventory
- export scope
- deletion/anonymization policy
- retention periods
- backup deletion policy
- audit-log retention
- location retention
- KYC retention
- payment metadata retention

Do not treat "soft delete" as deletion if personal data remains indefinitely.

---

# 40. ASVS 5.0 Verification Matrix

This is the required final verification matrix after remediation.

| ASVS Area | Status Before Fix | Required Verification |
|---|---|---|
| V1 Encoding/Sanitization | Partial | Verify all untrusted output and URL/HTML sinks |
| V2 Validation & Business Logic | Fail | Server-authoritative order/coupon/payment logic |
| V3 Web Frontend Security | Fail/Partial | CSP, headers, cookie policy, origin controls |
| V4 Authentication | Fail | Remove admin cookie bypass; fail closed |
| V5 Cryptography | Partial | Verify secrets, OTPs, signatures, TLS |
| V6 Stored Cryptography | Partial | Verify sensitive values are not stored plaintext unnecessarily |
| V7 Error Handling/Logging | Partial | Remove raw errors; structured security logging |
| V8 Data Protection | Fail/Partial | KYC/address/location field minimization |
| V9 Communications | Partial | HTTPS, webhook verification, secure origins |
| V10 Malicious Code | Partial | Dependency and supply-chain controls |
| V11 Business Logic | Fail | State machine, coupon, inventory, refund race protection |
| V12 Files and Resources | Fail/Partial | Private buckets, type/size/ownership controls |
| V13 API/Web Services | Fail/Partial | Route inventory, authz, rate limits, object ownership |
| V14 Configuration | Fail/Partial | Headers, CORS, secrets, environment separation |

---

# 41. Implementation Order

Do **not** start by installing security libraries.

Apply changes in this order.

## Phase 0 — Freeze and backup

- Create a security branch.
- Export current Supabase schema.
- Back up production data.
- Do not change production directly.

## Phase 1 — Kill critical authorization bypasses

1. Remove `admin_session`.
2. Remove `simple_admin`.
3. Remove email-based admin override.
4. Remove `user_metadata.role` authorization.
5. Remove `|| 'super_admin'`.
6. Make role lookup fail closed.
7. Require `is_active = true`.

## Phase 2 — Repair RLS

Audit every table.

No security-sensitive table should have:

```sql
USING (TRUE)
```

unless it is intentionally public-read-only and contains no sensitive fields.

Create explicit policies for:

- profiles
- addresses
- orders
- order_items
- payments
- deliveries
- driver_details
- driver_locations
- subscriptions
- coupons
- refunds
- audit logs
- KYC
- invoices
- staff shifts
- suppliers
- purchase orders
- settings

## Phase 3 — Make money logic server-authoritative

Implement:

```text
createOrder()
calculateOrderTotal()
validateCoupon()
createPayment()
handlePaymentWebhook()
requestRefund()
transitionOrderStatus()
verifyDeliveryOtp()
```

as trusted server/database operations.

## Phase 4 — Driver isolation

Implement strict delivery ownership and location ownership.

## Phase 5 — Upload hardening

Separate storage buckets and signed URLs.

## Phase 6 — Browser boundary

Add:

- CSP
- HSTS
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- frame protection

## Phase 7 — Abuse prevention

Add distributed rate limits.

## Phase 8 — Observability

Implement structured security logs, request IDs, alerting and safe errors.

## Phase 9 — Supply chain

Add dependency scanning and secret scanning to CI.

## Phase 10 — Security tests

Add automated authorization regression tests.

---

# 42. Security Regression Test Suite

Create tests for every role.

## Authentication

```text
anonymous → admin
anonymous → account
anonymous → driver
expired session → protected route
inactive user → protected route
```

## Customer isolation

```text
Customer A → Customer B order
Customer A → Customer B address
Customer A → Customer B payment
Customer A → Customer B cart
```

Expected: `403` or zero rows.

## Driver isolation

```text
Driver A → Driver B delivery
Driver A → unassigned delivery
Driver A → another customer's order
Driver A → Driver B location
Driver A → another driver's KYC
```

Expected: denied.

## Staff authorization

```text
staff → role management
staff → refund
staff → settings
staff → KYC approval
viewer → mutation
```

Expected: denied.

## Payment

```text
fake client total
fake payment status
fake gateway payment ID
replayed webhook
wrong amount webhook
wrong order webhook
duplicate webhook
```

Expected: rejected.

## Coupon

```text
negative subtotal
huge subtotal
expired coupon
maxed coupon
targeted coupon
duplicate redemption
parallel redemption
```

Expected: rejected.

## Order state

```text
pending → delivered
delivered → preparing
cancelled → preparing
customer → confirmed
driver → delivered without OTP
```

Expected: rejected.

---

# 43. Second Security Review — Mandatory Post-Implementation Gate

After all changes are implemented, perform a fresh review from scratch.

Do **not** simply inspect the diff.

### Pass 1 — Static review

Search for:

```text
admin_session
simple_admin
user_metadata.role
super_admin
USING (TRUE)
WITH CHECK (TRUE)
.select('*')
service_role
NEXT_PUBLIC_.*SECRET
dangerouslySetInnerHTML
err.message
error.message
localStorage
document.cookie
Access-Control-Allow-Origin
unsafe-inline
unsafe-eval
```

Every result must be reviewed manually.

### Pass 2 — RLS review

For every table:

```text
anonymous SELECT
anonymous INSERT
anonymous UPDATE
anonymous DELETE

customer own
customer other
driver own
driver other
staff
manager
super_admin
```

### Pass 3 — API review

Every route must have an explicit authorization decision.

### Pass 4 — Business-logic review

Test:

```text
price tampering
coupon abuse
payment replay
refund replay
OTP brute force
order-state bypass
driver reassignment
inventory race
```

### Pass 5 — Browser review

Check:

```text
CSP
CORS
cookies
headers
source maps
client bundle
localStorage
Realtime subscriptions
```

### Pass 6 — Dependency review

Run:

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run build
```

Then run the selected SCA/SAST/secret-scanning tools.

### Pass 7 — Production verification

Verify:

- Vercel environment variables
- Supabase Auth redirect URLs
- OAuth redirect URLs
- Supabase RLS in production
- Storage policies
- Razorpay live/test separation
- Cashfree credentials
- webhook endpoints
- cron authentication
- logging/alerts
- HTTPS/HSTS

---

# 44. Final Security Acceptance Criteria

The application is **not ready for security sign-off** until all of these are true:

- [ ] No authentication bypass cookie exists.
- [ ] No hardcoded admin email grants authorization.
- [ ] No authorization fallback defaults to `super_admin`.
- [ ] No sensitive RLS policy uses `USING (TRUE)`.
- [ ] No order ownership can be selected by the browser.
- [ ] No client-supplied total is authoritative.
- [ ] No order item can be inserted outside an authorized order transaction.
- [ ] Driver actions are restricted to assigned deliveries.
- [ ] Driver GPS is owner-scoped.
- [ ] KYC files are private.
- [ ] Proof-of-delivery files are private.
- [ ] OTP is rate-limited and scoped.
- [ ] Payment webhooks verify signatures.
- [ ] Payment amount is server-verified.
- [ ] Payment webhooks are idempotent.
- [ ] Refund amount is server-calculated.
- [ ] Coupon redemption is atomic.
- [ ] Coupon validation is rate-limited.
- [ ] Cart session updates verify ownership.
- [ ] All sensitive API routes validate input with strict schemas.
- [ ] Raw server errors are not returned to clients.
- [ ] CSP is enforced.
- [ ] HSTS is enabled in production.
- [ ] CORS is explicit.
- [ ] CSRF/origin protection exists for sensitive cookie-authenticated mutations.
- [ ] Public settings cannot expose secrets.
- [ ] Realtime payloads are audience-scoped.
- [ ] Audit logs cannot be modified by ordinary users.
- [ ] Security events are monitored.
- [ ] Git history is secret-scanned.
- [ ] Dependencies are continuously scanned.
- [ ] Authorization regression tests pass.
- [ ] Production RLS tests pass.
- [ ] Post-remediation review finds no unresolved Critical/High issues.

---

# 45. Remaining Risks After Remediation

Even after the above controls are implemented, the following remain outside what source review alone can guarantee:

1. Compromise of the Supabase/Vercel account.
2. Compromise of a super-admin identity.
3. Compromise of a payment-provider account.
4. Malicious insider with legitimate administrative access.
5. Vulnerabilities in third-party SaaS providers.
6. Browser/device malware on staff or drivers' phones.
7. Supply-chain compromise after deployment.
8. Incorrect production environment configuration.
9. Data exposure through third-party analytics/advertising systems.
10. Operational mistakes that bypass the intended workflow.
11. Unknown vulnerabilities in Next.js, Supabase, browser runtimes or dependencies.
12. Physical access to kitchen/admin/driver devices.
13. Real-world social engineering of staff.
14. Business-logic flaws introduced by future features.

A periodic penetration test is still recommended for a production application handling payments, addresses, driver location and identity/KYC documents.

---

# 46. Source-Derived Observations

The PRD states that the system is a production Next.js/Supabase application, defines the six-role permission model, specifies RLS ownership rules, describes payment and delivery workflows, and identifies server-only secrets. Those requirements are the intended security baseline.

The public repository currently confirms:

- Next.js 16.3, React 19, Supabase SSR/client libraries and Razorpay are dependencies.
- `middleware.ts` delegates protected-route handling to `lib/supabase/middleware.ts`.
- The middleware currently contains the admin cookie bypass and fail-open role fallback described above.
- The initial migration enables RLS but includes permissive `TRUE` policies for order and order-item insertion.
- Later migrations add additional `TRUE` policies.
- The driver page performs a client-side driver role check, which is useful for UX but cannot replace server/database authorization.
- The payment-safety migration adds gateway payment idempotency and refund-request protections, but payment amount authority still needs to be verified at the transaction boundary.

---

# 47. References

### OWASP ASVS 5.0

OWASP Application Security Verification Standard, Version 5.0.

Official repository:

`https://github.com/OWASP/ASVS`

### OWASP Cheat Sheet Series

`https://github.com/OWASP/CheatSheetSeries`

Relevant topics include:

- Access Control
- Authentication
- Authorization
- Authorization Regression Testing
- Content Security Policy
- CSRF Prevention
- File Upload
- Logging
- Session Management
- Third-Party Payment Gateway Integration
- Transaction Authorization
- WebSocket Security
- Vulnerable Dependency Management
- Web Service Security

### OWASP NodeGoat

`https://github.com/OWASP/NodeGoat`

Use NodeGoat primarily as an educational reference for common Node.js application weaknesses and exploitation/mitigation patterns.

### Application source

`https://github.com/Pratyush-Malviya/pizza-expert-prayagraj`

### Application PRD

`pizza_expert_prd.md`

---

# 48. Recommended Deliverables for the Actual Remediation Commit

The implementation should produce at least:

```text
middleware.ts                         ← fail-closed auth
lib/auth/authorize.ts                 ← centralized authorization
lib/security/rate-limit.ts            ← distributed limiter
lib/security/request-validation.ts    ← shared validation
lib/security/origin.ts                ← CSRF/origin checks
lib/security/errors.ts                ← safe errors
lib/security/audit.ts                 ← structured security audit
lib/supabase/admin.ts                 ← server-only admin client

app/api/orders/create/route.ts        ← authoritative order creation
app/api/payments/create/route.ts      ← authoritative payment creation
app/api/webhooks/...                  ← signature/idempotency verification
app/api/coupons/validate/route.ts     ← server-calculated validation
app/api/refunds/process/route.ts      ← server-calculated refund amount
app/api/deliveries/...                ← driver ownership enforcement
app/api/uploads/...                   ← controlled upload workflow

supabase/migrations/
  <new_security_hardening>.sql        ← RLS + constraints + functions

tests/security/
  auth.spec.ts
  rls.spec.ts
  authorization.spec.ts
  payment.spec.ts
  coupon.spec.ts
  driver.spec.ts
  upload.spec.ts
  realtime.spec.ts

SECURITY_AUDIT.md                     ← final post-fix report
```

---

## Bottom Line

**Do not merely install security packages.**

The most important work is architectural:

1. **Remove the admin bypasses.**
2. **Make authorization fail closed.**
3. **Repair the RLS policies, especially every `TRUE` policy.**
4. **Make order/payment/coupon/refund calculations server-authoritative.**
5. **Enforce driver-to-delivery ownership in the database.**
6. **Lock down Realtime and private files.**
7. **Add CSP, origin/CSRF protection and distributed rate limits.**
8. **Add authorization regression tests.**
9. **Run a second review after remediation.**
10. **Do not mark the app ASVS-aligned until the Critical/High findings are demonstrably closed.**
