# MenuFlow Canonical Firestore Schema

## Status

Phase 1 Gate 3 target-security foundation is complete in the isolated Firestore Emulator test environment.

This document defines the approved target schema and the test-only authorization model. It does **not** authorize a production rule deployment, production data migration, application caller cutover, or Phase 2 authentication implementation.

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

Restaurant-scoped paths are the source of tenant identity. Documents retain `restaurantId` during the transition, but the target rules require the document field to agree with the path and do not treat browser storage or URL parameters as authorization evidence.

## Canonical roles

```text
SuperAdmin | Admin | Cashier | Kitchen | Delivery
```

The Gate 3 tests model role and tenant membership as trusted Firebase Authentication custom claims. The repository does not yet contain a trusted claim-provisioning backend; that is intentionally deferred to Phase 2.

## Public customer model for the target tests

The intended customer model is anonymous Firebase Authentication. App Check is part of the future abuse-protection design but is **not** implemented or tested as production infrastructure in Phase 1.

Public customer permissions in the isolated target rules are deliberately narrow:

- read theme, menu items, and categories;
- create an order only for the requester's anonymous UID and the restaurant path being written;
- create a review only for an order owned by that UID in the same restaurant;
- create a complaint only in the same restaurant, with an optional order that must belong to that UID;
- no private customer/staff/inventory/financial reads;
- no customer order updates or deletes.

## Gate 3 test environment

The isolated rules suite uses:

- `@firebase/rules-unit-testing@5.0.2`
- `firebase-tools@15.28.2`
- Node test runner
- Firestore Emulator on `127.0.0.1:8080`
- demo project ID: `demo-menuflow-rules-test`
- rules fixture: `tests/intended.firestore.rules`

Firebase Emulator configuration explicitly loads the intended test rules. Production `firestore.rules` is not modified and is not the rules source for Gate 3.

Run the complete suite with:

```bash
npm run test:rules
```

The standard `npm test` command delegates to the same isolated rules suite.

## Security guarantees covered by Gate 3

The suite proves the target model for:

- unauthenticated and anonymous public storefront reads;
- public menu/category/theme access;
- customer tenant and UID binding for order creation;
- denial of cross-tenant and cross-customer order creation;
- denial of customer order mutation/deletion and privileged field tampering;
- constrained review creation and order ownership;
- constrained complaint creation using the canonical complaint shape;
- private-data isolation for staff, customers, inventory, expenses, suppliers, operational settings, and loyalty settings;
- staff tenant isolation for reads and writes;
- role-specific Cashier, Kitchen, Delivery, and Admin access;
- self-role escalation denial;
- self-tenant reassignment denial;
- denial of Admin-created `Admin`/`SuperAdmin` staff roles;
- SuperAdmin cross-tenant administration;
- required-field, type, unknown-field, and tenant-identity validation on critical documents;
- immutable staff UID and tenant identity fields;
- trusted-claim-based role evaluation in the rules fixture.

## Current-to-canonical path map

| Current path | Canonical path | Cutover status |
| --- | --- | --- |
| `restaurants/{id}` | `restaurants/{id}` | Retain |
| `restaurants/{id}/settings/theme` | `restaurants/{id}/settings/theme` | Retain; public storefront document |
| `restaurants/{id}/menuItems/{id}` | `restaurants/{id}/menuItems/{id}` | Retain; target authority |
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

1. Inventory existing production documents and identify documents missing tenant fields or containing legacy role values.
2. Add canonical-path readers/writers behind a deliberate compatibility boundary; do not change all callers at once.
3. Copy legacy data to its canonical tenant path with stable document IDs, an explicit migration marker, and an audit log outside customer-writable paths.
4. Verify record counts, required fields, and tenant ownership for every copied collection before enabling reads from the canonical path.
5. Cut over one bounded feature at a time, starting with menu, theme, operational settings, loyalty settings, and QR configuration.
6. Keep legacy data read-only and recoverable until production verification and an explicit retention/deletion decision. Never silently delete legacy data.

## Deferred decisions and limitations

- Trusted custom-claim provisioning remains a Phase 2 task.
- Production App Check remains a Phase 2/security-hardening task.
- Existing production data has not been migrated or inventoried.
- Existing application callers still use legacy top-level collections in several domains by design; Gate 3 does not migrate them.
- The isolated rules are an approved target security contract, not a production deployment.
- Business-specific permissions that were not explicitly approved are intentionally kept minimal rather than guessed.

## Phase 1 completion rule

Phase 1 is complete only after the Gate 3 suite passes locally together with lint/build and the final diff confirms that production `firestore.rules`, application callers, production data, authentication implementation, and CI workflow were not changed by this phase.
