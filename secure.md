# Pizza Expert POS — Security Remediation Plan

**Source:** security_audit_report.md (Aug 19, 2026)
**Goal:** Close the Server Action auth gap without breaking existing flows. Ship in phases, test each phase before moving on.

---

## The Core Problem (in one line)

Server Actions use `createAdminClient()` (Service Role Key = bypasses RLS) **and** never check who's calling them. So RLS — which is genuinely solid — never gets a chance to run. Anyone who can trigger a Server Action (rogue employee, curious customer with devtools, anyone who finds the endpoint) can act as admin.

Fix has two independent parts. Do both:
1. **Authenticate** every Server Action (know who's calling).
2. **Authorize** — either let RLS do the enforcing (switch to `createClient()`) or manually check role before every DB write (if you must keep the admin client).

---

## Phase 1 — Stop the Bleeding (do this first, today)

### 1.1 Build one shared auth helper, use it everywhere
Don't hand-roll the `getUser()` + role check in every action — one bug in one file reintroduces the hole. Centralize it:

```typescript
// lib/auth/requireUser.ts
import { createClient } from '@/lib/supabase/server';

export async function requireUser(allowedRoles?: string[]) {
  const authClient = createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');

  if (allowedRoles) {
    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw new Error('Forbidden');
    }
  }
  return user;
}
```

Every Server Action's first line becomes:
```typescript
const user = await requireUser(['cashier', 'manager']);
```

### 1.2 Audit and list every Server Action using `createAdminClient()`
```bash
grep -rn "createAdminClient" --include="*.ts" .
```
Make a checklist (file, function name, what it does, who should be allowed to call it). This list is your Phase 2/3 backlog — don't skip it, it's how you know when you're actually done.

### 1.3 Fix the worst one first: `closeCashierShift`
This is the one named in the audit (variance tampering = direct cash theft vector). Patch this today, independent of the rest of the sweep:
- Require auth (`requireUser`)
- Server re-derives `cashier_id` from the session — **never** trust a `cashier_id` field in the payload
- Re-fetch the shift's actual system-calculated variance server-side; don't trust a client-submitted variance number for anything beyond display

---

## Phase 2 — Systematic Sweep (this week)

For every action on your Phase 1.2 checklist, apply one of two patterns:

### Pattern A — Prefer this: switch to `createClient()`, let RLS enforce
Use when the action's logic maps cleanly onto an existing RLS policy (e.g., "cashier manages own held_orders").
```typescript
export async function updateHeldOrder(orderId, data) {
  const user = await requireUser();
  const supabase = createClient(); // authenticated, NOT admin
  const { error } = await supabase.from('held_orders').update(data).eq('id', orderId);
  // RLS blocks this automatically if it's not this cashier's order
  if (error) throw error;
}
```
This is strictly better than manual checks — the DB enforces it even if you forget a check somewhere in app code later.

### Pattern B — When you genuinely need the admin client
Some actions legitimately need to write across RLS boundaries (e.g., a manager closing out and reconciling *all* cashiers' shifts, or system-level intelligence/reporting aggregation). For these:
```typescript
export async function reconcileAllShifts(payload) {
  const user = await requireUser(['manager', 'admin']); // explicit role gate
  const admin = createAdminClient();
  // now safe: we've manually verified authorization before touching admin client
}
```
Rule: **never call `createAdminClient()` without a `requireUser([...])` check immediately above it in the same function.** Make this a linting/code-review rule, not just a convention.

### Priority order for the sweep
1. `posOrders.ts` — money-moving, do first
2. `cashierSessions.ts` — cash handling, do first
3. `taxEngine.ts` — financial correctness
4. `intelligence.ts` — data exposure (less urgent than money, still do this week)
5. Inventory/kitchen actions — lowest financial risk, do last

---

## Phase 3 — Defense in Depth (before real production launch)

- **Input validation on every Server Action** — use Zod schemas for payload shape, don't just check auth. A logged-in cashier submitting malformed data is still a risk.
- **Rate limiting** on sensitive actions (shift close, order creation) to blunt scripted abuse even from an authenticated-but-malicious insider.
- **Audit logging** — log `user_id + action + payload + timestamp` for every write through the admin client. You already have immutable ledgers (per the audit's Strength #3) — extend that pattern to an `admin_action_log` table.
- **Re-verify server-side, always** — any number that affects money (variance, totals, discounts) should be recalculated server-side from source data, never trusted from the client payload even after auth checks pass.
- **Remove client-side-only gating language from your own mental model** — "hide the button" is UX, not security. Confirm every sensitive UI action has a server-side check behind it, not just a hidden component.

---

## Phase 4 — Verify You Actually Fixed It

Don't just trust the refactor — test it like the attacker would:
1. Log in as a cashier. Use browser devtools / Postman to call `closeCashierShift` with another cashier's ID or a manager-only action. Expect a 403/Unauthorized.
2. Log out entirely. Call any Server Action directly. Expect Unauthorized.
3. Try to pass a fabricated `variance` or `cashier_id` in the payload for actions you fixed. Expect it to be ignored/overridden by server-derived values.
4. Re-run `grep -rn "createAdminClient"` — every remaining hit should have a `requireUser` call directly above it. If not, it's not done.

---

## Suggested Order of Work

| Priority | Task | Est. effort |
|---|---|---|
| P0 | `requireUser` helper + fix `closeCashierShift` | 1–2 hrs |
| P0 | Sweep `posOrders.ts`, `cashierSessions.ts` | Half day |
| P1 | Sweep `taxEngine.ts`, `intelligence.ts` | Half day |
| P1 | Sweep remaining actions (inventory/kitchen) | Half day |
| P2 | Zod validation pass across all actions | 1 day |
| P2 | Audit logging table + wiring | Half day |
| P2 | Manual pen-test per Phase 4 checklist | 2–3 hrs |

This closes the gap the audit flagged without touching your RLS layer or ledger design, which the audit already confirmed are solid.
