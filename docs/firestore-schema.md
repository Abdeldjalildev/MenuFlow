# MenuFlow Canonical Firestore Schema

## Status

Approved target schema for Phase 1. This document does not authorize a data
migration, Firestore rule deployment, or application caller cutover.

## Canonical tenant namespace

```text
restaurants/{restaurantId}
  settings/theme
  settings/operational
  settings/loyalty
  menuItems/{menuItemId}
  categories/{categoryId}
  qrConfig/default
  staff/{staffId}
  customers/{customerId}
  orders/{orderId}
  inventory/{inventoryItemId}
  recipes/{recipeId}
  reviews/{reviewId}
  complaints/{complaintId}
  expenses/{expenseId}
  suppliers/{supplierId}
  stockTakes/{stockTakeId}
  wasteLogs/{entryId}
```

Restaurant-scoped paths are the source of tenant identity. Documents may retain
`restaurantId` during transition for compatibility and collection-group queries,
but rules must not trust a client-supplied field over the path.

## Canonical roles

```text
SuperAdmin | Admin | Cashier | Kitchen | Delivery
```

Roles and tenant membership must come from a trusted identity mechanism. Browser
storage and URL query parameters may inform navigation but are not authorization
evidence.

## Current-to-canonical path map

| Current path | Canonical path | Cutover status |
| --- | --- | --- |
| `restaurants/{id}` | `restaurants/{id}` | Retain |
| `restaurants/{id}/settings/theme` | `restaurants/{id}/settings/theme` | Retain |
| `restaurants/{id}/menuItems/{id}` | `restaurants/{id}/menuItems/{id}` | Retain; make authoritative |
| `settings/{id}` | `restaurants/{id}/settings/operational` | Migration required |
| `settings/{id}_loyalty` | `restaurants/{id}/settings/loyalty` | Migration required |
| `restaurant_qr_config/{id}` | `restaurants/{id}/qrConfig/default` | Migration required |
| `menu/{id}` | `restaurants/{id}/menuItems/{id}` | Migration required |
| `categories/{id}` | `restaurants/{id}/categories/{id}` | Migration required |
| `staff/{id}` | `restaurants/{id}/staff/{id}` | Migration required |
| `customers/{id}` | `restaurants/{id}/customers/{id}` | Migration required |
| `orders/{id}` | `restaurants/{id}/orders/{id}` | Migration required |
| `inventory/{id}` | `restaurants/{id}/inventory/{id}` | Migration required |
| `recipes/{id}` | `restaurants/{id}/recipes/{id}` | Migration required |
| `reviews/{id}` | `restaurants/{id}/reviews/{id}` | Migration required |
| `complaints/{id}` | `restaurants/{id}/complaints/{id}` | Migration required |
| `expenses/{id}` | `restaurants/{id}/expenses/{id}` | Migration required |
| `suppliers/{id}` | `restaurants/{id}/suppliers/{id}` | Migration required |
| `stock_take/{id}` | `restaurants/{id}/stockTakes/{id}` | Migration required |
| `waste_log/{id}` | `restaurants/{id}/wasteLogs/{id}` | Migration required |
| `wasteLog/{id}` | none | Verify historical data; do not delete |

## Reversible migration strategy

1. Inventory existing production documents and identify documents missing tenant
   fields or containing legacy role values.
2. Add canonical-path readers/writers behind a deliberate compatibility boundary;
   do not change all callers at once.
3. Copy legacy data to its canonical tenant path with stable document IDs, an
   explicit migration marker, and an audit log outside customer-writable paths.
4. Verify record counts, required fields, and tenant ownership for every copied
   collection before enabling reads from the canonical path.
5. Cut over one bounded feature at a time, starting with menu, theme, operational
   settings, loyalty settings, and QR configuration.
6. Keep legacy data read-only and recoverable until production verification and an
   explicit retention/deletion decision. Never silently delete legacy data.

## Authorization requirements for the future ruleset

- Public users may read menu items, categories, and theme only if the product
  intentionally treats them as public.
- Public order creation must use the approved customer model and include strict
  shape validation and abuse protection; arbitrary tenant selection is not enough.
- Customer reads must be limited to the customer identity and orders explicitly
  owned by that identity.
- Staff access must be constrained by both authenticated tenant membership and
  role-specific permissions.
- SuperAdmin access must be derived from trusted claims or an equivalent trusted
  backend mechanism.
- Rules must validate document shapes and state transitions; UI state, local
  storage, and URL parameters are never authorization inputs.

## Current blockers before rule enforcement

- No trusted custom-claim provisioning mechanism is present in this repository.
- The public customer identity/anti-abuse model has not yet been selected.
- Existing production data and its legacy-path coverage have not been inventoried.
- Firebase Emulator tooling is not currently declared in project dependencies.
