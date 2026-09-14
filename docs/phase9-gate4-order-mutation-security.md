# Phase 9 — Gate 9.4: Order Mutation Security

## Implementation status

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

## Security boundary

Sensitive order mutations are executed by authenticated Firebase callable functions and validated against the authoritative restaurant path, trusted actor role, and current order state.

Implemented mutation operations:

- `driver_claim` — Delivery actor claims an unclaimed order; driver identity is derived from auth.
- `driver_assign` — Admin/SuperAdmin assigns a verified Delivery user from the same restaurant.
- `item_append` — Admin/SuperAdmin append items; the complete resulting order is repriced from authoritative menu data.
- `payment_flag` — Cashier/Admin/SuperAdmin confirms payment; only positive server-recorded confirmation is accepted and only from payment-ready states.
- `note_add` — authorized operational staff add a bounded staff note with server identity/timestamp.

The existing `transitionOrder` callable remains the backend authority for lifecycle transitions and inventory effects. It validates role, tenant, current status, allowed transition, and Admin membership where applicable.

## Invariants

- No client-supplied `driverId` is trusted during driver claim.
- Driver assignment requires an existing Firebase user with `Delivery` role and matching restaurant claim.
- Cross-tenant mutation attempts are rejected.
- Admin mutations require explicit restaurant membership.
- Append recalculates subtotal/discount/total from menu catalog prices.
- Paid/completed orders cannot be appended.
- Payment confirmation cannot be used to mark an arbitrary state paid.
- All mutations use a Firestore transaction where order state is read and changed together.

## Scope boundary

This gate does not add a payment gateway and does not implement the Phase 10 waiter UI. Runtime verification remains pending for the laptop/emulator verification session.
