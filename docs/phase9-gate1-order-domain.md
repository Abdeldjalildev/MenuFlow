# Phase 9 — Gate 9.1: Order Domain Normalization

## Status

**IMPLEMENTATION COMPLETE / NOT CLOSED — verification pending**

Gate 9.1 establishes the canonical order-domain vocabulary without changing the pricing-authority boundary planned for Gate 9.2.

## Canonical contract

- Order item unit price: `price`
- Order item quantity: `quantity`
- Order total: `totalAmount`
- Order lifecycle: `pending`, `preparing`, `driver_claimed`, `ready`, `ready_for_payment`, `ready_for_delivery`, `on_the_way`, `delivered_unpaid`, `paid`, `completed`
- Legacy `TrackDone` is a boundary-only legacy value and normalizes to `completed`.

## Compatibility boundary

Legacy item aliases (`unitPrice`, `originalPrice`, `qty`, `notes`, and `id`) are accepted only by the normalization boundary and are converted into the canonical domain shape. The canonical application state does not retain `totalPrice`, `unitPrice`, or `qty` aliases.

This gate does **not** make client pricing authoritative. Server-side menu-price lookup and authoritative subtotal/discount/total calculation remain explicitly scoped to Gate 9.2.

## Implemented artifacts

- `src/services/orderDomain.ts` — canonical status/item normalization and total calculation.
- `src/context/OrderProvider.tsx` — canonicalizes loaded order snapshots and order creation inputs.
- `tests/phase9-gate1-order-domain.test.mjs` — focused static contract checks.
- `package.json` — `test:phase9:gate1` verification command.

## Verification policy

No full-project test suite is required to mark implementation complete. When the laptop is available, run Gate 9.1 in isolation first, then perform the planned phase-level and full-project verification protocol.
