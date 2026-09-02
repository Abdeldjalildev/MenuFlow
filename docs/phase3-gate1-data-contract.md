# Phase 3 — Gate 1: Canonical Order & Inventory Data Model

## Status

Gate 1 is being implemented incrementally on `automation/ci-pipeline`.

Phase 2 production verification remains **PENDING / externally blocked** by Google Cloud billing activation. This does not change the Phase 3 code branch or its data-model work. Phase 2 must not be described as production-verified until the real production workflow succeeds.

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

The Firestore rules already deny the legacy top-level operational collections. Phase 3 Gate 1 therefore treats tenant-scoped paths as the only supported runtime contract.

## Entity contracts

### Inventory

Required identity/ownership:
- Firestore document ID is the inventory item ID.
- `restaurantId` identifies the owning restaurant.

Current compatibility fields retained during the migration:
- `itemName` / `name`
- `currentQuantity` / `quantity`
- `unit`
- `minRequired` (with legacy `minQuantity` / `minOrderQuantity` tolerated by the UI)
- `createdAt`, `updatedAt`

Gate 1 does not perform destructive data migration of existing production documents. Runtime writes are moved to the canonical tenant path first.

### Recipe

A recipe belongs to one restaurant and references inventory by stable inventory document ID:

```text
restaurants/{restaurantId}/recipes/{recipeId}
recipeIngredients: [{ inventoryItemId, quantity }]
```

A recipe may reference a published `menuItems/{menuItemId}` document through `menuItemId`.

### Category

Categories are restaurant-owned:

```text
restaurants/{restaurantId}/categories/{categoryId}
```

The category ID stored in a recipe/menu item is the category document ID (or one of the existing built-in category keys).

### Menu item

The customer-facing canonical menu entity is:

```text
restaurants/{restaurantId}/menuItems/{menuItemId}
```

It carries the customer-facing localized name/description, price, image, category, availability, and optional `recipeId` reference.

## Relationship map

```text
Restaurant
 ├── InventoryItem
 │     └── referenced by Recipe.recipeIngredients[].inventoryItemId
 ├── Category
 │     └── referenced by Recipe.category / MenuItem.category
 ├── Recipe
 │     └── optionally published as MenuItem via Recipe.menuItemId
 └── MenuItem
       └── optionally references Recipe via recipeId
```

## Explicit Gate 1 follow-up items

1. Inventory UI runtime path: **DONE** — reads/writes now target `restaurants/{restaurantId}/inventory`.
2. Recipe UI runtime path: **INCOMPLETE** — the current `Recipes.tsx` still contains legacy top-level recipe/inventory/category/menu references and requires a complete path migration.
3. Menu publication path: **INCOMPLETE** — publication must use `restaurants/{restaurantId}/menuItems`, not a top-level `menu` collection.
4. Existing production legacy documents: **DEFERRED** — no destructive migration is performed in Gate 1; a controlled migration/backfill must be designed and executed before relying on old documents.
5. Order document contract: **BASELINE DEFINED** — current order fields remain the compatibility contract; lifecycle mutability and inventory side effects are intentionally deferred to Gates 2–4.

## Non-goals for Gate 1

- No order state-machine enforcement.
- No inventory deduction implementation.
- No concurrency-safe order numbering implementation.
- No broad UI redesign.
- No production data deletion.

These belong to later Phase 3 gates.
