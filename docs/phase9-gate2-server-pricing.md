# Phase 9 — Gate 9.2: Server-Authoritative Pricing

## Status

**IMPLEMENTATION COMPLETE / NOT CLOSED — VERIFICATION PENDING**

Gate 9.2 moves order pricing authority to the trusted backend boundary. The client may request menu item IDs, quantities, notes, and valid modifier IDs, but client-supplied prices, alternate price aliases, totals, and discounts are not pricing authority.

## Implemented contract

1. `restaurantId` must identify an existing restaurant.
2. Every order item must contain `menuItemId`.
3. Menu items are read from `restaurants/{restaurantId}/menuItems/{menuItemId}` inside the server transaction.
4. The server obtains the authoritative menu price and recipe/name data from Firestore.
5. `quantity` is normalized to a positive integer with an upper bound of 100.
6. Modifier IDs, when supplied, must exist in the authoritative menu item's modifier catalog; their prices come from that catalog.
7. Client `price`, `unitPrice`, `originalPrice`, `totalAmount`, `discountAmount`, and `appliedDiscountPercent` are never used as pricing authority.
8. The server computes `subtotal`, `discountAmount`, and `totalAmount`.
9. Until a restaurant-level discount policy is explicitly defined, the authoritative discount is zero. This prevents client-side discount tampering while keeping the accounting fields explicit.
10. The order and daily order-number counter are persisted atomically in one Firestore transaction.

## Compatibility boundary

The existing `functions/index.js` remains intact as the legacy implementation source. Firebase Functions now load `functions/phase9CreateOrder.js`, which imports the legacy exports and replaces only `createOrder` with the Gate 9.2 implementation. This isolates the security-critical cutover without broad rewriting of the historically sensitive Functions file.

## Explicitly deferred

- Customer/waiter unified creation workflow: Gate 9.3.
- Append/driver/status/payment mutation hardening: Gate 9.4.
- Full runtime integrity and concurrency closure: Gate 9.5.
- Payment gateway implementation: out of scope.
- Restaurant-specific discount policy: requires an explicit business rule before being made authoritative.

## Verification

A focused contract suite is available as:

```bash
npm run test:phase9:gate2
```

No claim of Gate 9.2 closure is made until the focused suite is executed locally and the later Phase 9 verification protocol is completed.
