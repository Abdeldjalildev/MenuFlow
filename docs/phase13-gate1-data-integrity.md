# Phase 13 Gate 13.1 — Production Data Integrity & Schema Closure

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

This gate establishes a current, evidence-based production data inventory and a non-destructive schema contract. It does not migrate or delete production data.

## Evidence baseline

Audited against the `main` repository state immediately before this gate. The canonical tenant namespace is `restaurants/{restaurantId}`. The existing Firestore rules also deny unsupported top-level operational collections by default.

## Canonical production collections

| Collection/path | Authority | Browser write | Notes |
|---|---|---:|---|
| `restaurants/{restaurantId}` | SuperAdmin/backend | No | Tenant root/config container |
| `restaurants/{restaurantId}/settings/{settingId}` | Admin | Yes, rule-bounded | `theme` is public-read; operational/loyalty are tenant-admin controlled |
| `restaurants/{restaurantId}/menuItems/{menuItemId}` | Admin | Yes | Public storefront read |
| `restaurants/{restaurantId}/categories/{categoryId}` | Admin | Yes | Public storefront read |
| `restaurants/{restaurantId}/qrConfig/{configId}` | Admin | Yes | Canonical QR configuration path |
| `restaurants/{restaurantId}/orders/{orderId}` | Backend canonical order/mutation paths | No create | Lifecycle mutations remain authoritative backend/rules contracts |
| `restaurants/{restaurantId}/notifications/{notificationId}` | Backend | No | Browser is read-only |
| `restaurants/{restaurantId}/reviews/{reviewId}` | Anonymous customer + Admin moderation | Limited | Customer writes are ownership-bound |
| `restaurants/{restaurantId}/complaints/{complaintId}` | Anonymous customer + Admin moderation | Limited | Customer writes are ownership-bound |
| `restaurants/{restaurantId}/customers/{customerId}` | Tenant staff | Yes, role-bounded | Tenant scoped |
| `restaurants/{restaurantId}/staff/{staffId}` | Tenant Admin/SuperAdmin | Yes, role-bounded | UID/tenant identity protected by rules |
| `restaurants/{restaurantId}/inventory/{inventoryId}` | Admin/Kitchen | Yes | Tenant scoped |
| `restaurants/{restaurantId}/recipes/{recipeId}` | Admin/Kitchen | Yes | Tenant scoped |
| `restaurants/{restaurantId}/expenses/{expenseId}` | Admin/SuperAdmin | Create/delete only | Analytics reads the same tenant collection |
| `restaurants/{restaurantId}/wasteLogs/{entryId}` | Intended canonical path | Pending caller cutover | Historical aliases exist; see legacy section |
| `restaurants/{restaurantId}/admins/{adminUid}` | SuperAdmin/backend membership authority | No for normal browser flows | Authoritative Admin membership |
| `restaurants/{restaurantId}/orderNumberCounters/{counterId}` | Backend | No | Internal numbering state |
| `authz_claim_audit/{entryId}` | Backend | No | Audit record; rules deny browser access |
| `admin_membership_audit/{entryId}` | Backend | No | Audit record; rules deny browser access |

## Historical / legacy paths requiring deliberate migration

The repository already documents older top-level paths. Gate 13.1 does **not** perform a destructive migration.

| Legacy path | Canonical target | Current evidence | Action in this gate |
|---|---|---|---|
| `settings/{id}` | `restaurants/{id}/settings/operational` | `QrCreations.tsx` still references it | Inventory only; cutover deferred |
| `restaurant_qr_config/{id}` | `restaurants/{id}/qrConfig/default` | `QrCreations.tsx` still references it | Inventory only; cutover deferred |
| `waste_log/{id}` | `restaurants/{id}/wasteLogs/{id}` | `WasteLog.tsx` still references top-level path | Inventory only; cutover deferred |
| `wasteLog/{id}` | `restaurants/{id}/wasteLogs/{id}` | Legacy rules alias exists | Preserve historical data; no deletion |
| Other top-level operational collections listed in `docs/firestore-schema.md` | Tenant-scoped equivalents | Historical schema documentation | Require evidence before migration |

The explicit legacy allowlist is important: it prevents this gate from pretending that the repository is already fully cut over while avoiding an unsafe blind migration.

## Schema integrity invariants

1. Operational tenant data belongs under `restaurants/{restaurantId}`.
2. When a document stores `restaurantId`, it must equal the tenant path parameter.
3. Browser storage and URL parameters are not schema/authorization authority.
4. Orders are created through the canonical backend boundary; browser Firestore order creation remains disabled.
5. Analytics consumes authoritative historical order snapshots and tenant-scoped expenses.
6. Expense records require `restaurantId`, positive `amount`, `category`, `expenseDate`, and `createdAt`; unknown fields are rejected by the current rules contract.
7. Notifications are backend-created and browser read-only.
8. Admin membership records are authoritative for Admin tenant access.
9. Internal counters and audit collections are not browser-writable.
10. Legacy data is never deleted merely because a canonical path exists.

## Migration boundary

No data migration is executed by Gate 13.1. A future migration must first provide:

- production inventory/counts;
- tenant ownership evidence;
- stable source-to-target document IDs;
- reversible copy/audit markers;
- post-copy count/schema verification;
- bounded caller cutover;
- explicit retention/deletion authorization.

## Verification required

The gate requires the dedicated static contract test and then the normal project verification flow. Passing the static contract does **not** close the gate; runtime verification remains separate.

## Scope protection

- No dependency upgrades.
- No broad refactor.
- No production database rewrite.
- No deletion of legacy data.
- No reopening of Phases 1–7.
- No implementation of Gates 13.2–13.5.
