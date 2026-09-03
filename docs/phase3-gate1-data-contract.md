# Phase 3 — Gate 1: Canonical Order & Inventory Data Model

## Status

**VERIFIED — repository runtime contract and regression coverage complete.**

Phase 2 production verification remains **PENDING / externally blocked** by Google Cloud billing activation. This does not change the Phase 3 repository implementation. Phase 2 must not be described as production-verified until the real production workflow succeeds.

## Canonical tenant boundary

All restaurant-owned operational data must live below the restaurant document:

```text
restaurants/{restaurantId}/
  orders/{orderId}
  inventory/{inventoryId}
  recipes/{recipeId}
  categories/{categoryId}
  menuItems/{menuItemId}
  customers/{customerId}
  reviews/{reviewId}
  complaints/{complaintId}
  staff/{staffId}
  settings/{settingId}
```

Top-level collections with the same business meaning are legacy and must not be used by the application runtime:

```text
/orders
/inventory
/recipes
/categories
/menu
/reviews
/complaints
/staff
/customers
```

The Firestore rules deny the legacy top-level operational collections. The application runtime therefore uses tenant-scoped paths as the supported contract.

## Entity contracts

### Inventory

Required identity/ownership:
- Firestore document ID is the inventory item ID.
- `restaurantId` identifies the owning restaurant.

Compatibility fields retained during migration:
- `itemName` / `name`
- `currentQuantity` / `quantity`
- `unit`
- `minRequired` (with legacy `minQuantity` / `minOrderQuantity` tolerated by the UI)
- `createdAt`, `updatedAt`

### Recipe

A recipe belongs to one restaurant and references inventory by stable inventory document ID:

```text
restaurants/{restaurantId}/recipes/{recipeId}
recipeIngredients: [{ inventoryItemId, quantity }]
```

A recipe may reference its published `menuItems/{menuItemId}` document through `menuItemId`.

### Category

Categories are restaurant-owned:

```text
restaurants/{restaurantId}/categories/{categoryId}
```

### Menu item

The customer-facing canonical menu entity is:

```text
restaurants/{restaurantId}/menuItems/{menuItemId}
```

It carries localized customer-facing content, price, image, category, availability, and the optional `recipeId` reference.

## Repository verification completed

- `Inventory.tsx` reads and writes only `restaurants/{restaurantId}/inventory`.
- `Recipes.tsx` reads recipes, inventory, and categories only from tenant-scoped collections.
- Recipe create/update/delete operations use `restaurants/{restaurantId}/recipes`.
- Recipe publication, update, hide/show, and delete operations use `restaurants/{restaurantId}/menuItems`.
- Recipe ingredients use stable `inventoryItemId` document IDs.
- A dedicated Gate 1 regression test now guards the canonical paths and rejects legacy top-level runtime references.
- The Gate 1 regression is part of the repository's full `npm test` suite.

## Production data boundary

Existing legacy production documents are **not** destructively migrated by this gate. This is intentional: code-level canonicalization and production data migration are separate concerns.

A controlled migration/backfill remains a production-operational task if legacy documents exist in the real Firebase project. It requires backup, review of actual data, execution against the production project, and post-migration verification. No such migration is claimed here.

## Gate 1 conclusion

Gate 1 is **closed for repository implementation and automated regression scope**. The remaining production-data migration is explicitly outside the repository gate and must not be treated as evidence that the code contract is incomplete.

## Non-goals for Gate 1

- Order state-machine enforcement (Gate 2).
- Inventory deduction implementation (Gate 3).
- Concurrency-safe order numbering (Gate 4).
- Broad UI redesign.
- Destructive production data migration.
