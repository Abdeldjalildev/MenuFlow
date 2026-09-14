# Phase 8 — Gate 8.1: Canonical Domain & Actor Model

**Status:** CLOSED (types + canonical vocabulary established; no authorization behavior changed)

**Scope:** Establish one unambiguous domain/actor model. Distinguish Identity, Role, Membership, Permission, and Restaurant. This gate defines the canonical vocabulary that later gates build upon. It does NOT implement multi-admin authorization (8.2), public identity resolution (8.3), order authority (8.4), or security closure (8.5).

---

## 1. Canonical Actor Model

```
Platform Owner / SuperAdmin     (platform-wide authority; no restaurantId)
└── Admin                       (restaurant administrator; 1:many restaurant memberships)
      └── Restaurant            (business entity; tenant boundary)
            └── Staff           (operational actors; 1:1 restaurant membership)
                  ├── Kitchen
                  ├── Cashier
                  ├── Delivery
                  └── Waiter    (canonical role established here; UI/workflow deferred to Phase 10)

Customer                        (anonymous authenticated identity; interacts via orders, reviews, complaints)
```

## 2. Concept Boundaries

| Concept | Definition | Representation in MenuFlow |
|---|---|---|
| **IDENTITY** | Who the actor is. Established by Firebase Auth (UID, email/phone, anonymous flag). | `FirebaseAuthIdentity` in `src/types/firestore.ts` |
| **ROLE** | What capability set the actor holds. Established by trusted custom claims. | `StaffRole` union of `PLATFORM_ROLES` + `ADMIN_ROLES` + `OPERATIONAL_ROLES` |
| **MEMBERSHIP** | The relationship between an actor and a restaurant. For staff it is 1:1; for Admin it is 1:many (future). Currently carried in the `restaurantId` custom claim. | `RestaurantMembership` interface (defined; runtime enforcement deferred to Gate 8.2) |
| **PERMISSION** | The concrete operations an actor may perform. Derived from role + membership. Not yet a first-class runtime object; enforced by Firestore rules and callable authorization helpers. | Implicit in `firestore.rules` + `functions/index.js` |
| **RESTAURANT** | The business entity and tenant boundary. | `restaurants/{restaurantId}/...` paths |

## 3. Role Tiers (canonical)

| Tier | Constant | Roles |
|---|---|---|
| Platform | `PLATFORM_ROLES` | `SuperAdmin` |
| Administrative | `ADMIN_ROLES` | `Admin` |
| Operational | `OPERATIONAL_ROLES` | `Kitchen`, `Cashier`, `Delivery`, `Waiter` |

`STAFF_ROLES` = union of all three tiers (single source of truth).
`TENANT_SCOPED_ROLES` = roles that require a `restaurantId` claim (`Admin`, `Cashier`, `Kitchen`, `Delivery`, `Waiter`).
`PROVISIONABLE_BY_ADMIN` = roles a tenant Admin may provision (`Cashier`, `Kitchen`, `Delivery`, `Waiter`).

## 4. Distinctions Established

- **Platform Owner vs Admin:** SuperAdmin is platform-scoped (no `restaurantId`); Admin is restaurant-scoped (requires membership).
- **Admin vs Restaurant:** Admin is an actor; Restaurant is a business entity. An Admin may (in the future) manage multiple Restaurants. They are never the same concept.
- **Restaurant vs Staff:** Restaurant is the tenant boundary; Staff are actors scoped inside it.
- **Staff role vs Staff identity:** A staff member's identity is their Firebase UID; their role is a separate claim that can change without changing identity.
- **Customer identity:** Customers are anonymous Firebase Auth identities; they are never assigned a staff role. They may hold optional loyalty memberships (`RestaurantLoyaltyMembership`).

## 5. What Was Implemented (Gate 8.1 scope only)

- `src/types/firestore.ts`: canonical role constants, tiered role types, actor interfaces, membership interfaces, `MenuFlowActor` union, and explicit Identity/Role/Membership/Permission/Restaurant comments.
- `functions/index.js`: added `Waiter` to `ALLOWED_ROLES` and `TENANT_STAFF_ROLES` so the server recognizes the canonical role and allows Admins to provision it.
- `src/context/OrderProvider.tsx`: replaced the hard-coded staff role array with the canonical `STAFF_ROLES` constant (removes a duplicated role definition; preserves behavior for existing roles, adds Waiter-consistency).
- `tests/auth-claims-provisioning.test.mjs`: updated the provisioning contract expected value to include `Waiter`.
- `tests/phase8-gate1-domain-model.test.mjs`: new tests asserting the canonical model.

## 6. Explicitly Deferred

| Capability | Gate / Phase |
|---|---|
| Multi-Admin: Admin ↔ multiple restaurants membership enforcement, restaurant switching, admin isolation | **Gate 8.2** |
| Tenant & Public Identity: authoritative restaurant identity for QR/table/URL/localStorage; disabled/deleted/unknown restaurant behavior | **Gate 8.3** |
| Order Authority Contract: canonical creator/source/pricing/total authority | **Gate 8.4** |
| Security contract closure: cross-tenant/fake-role/overwrite tests | **Gate 8.5** |
| Waiter UI, routes, ordering workflow, kitchen integration, E2E | **Phase 10** |
| Analytics BI layer + aggregation definitions | **Phase 12** |
| Commercial multi-tenant ownership/billing | **Phase 13** |
| Payment gateway | **Explicitly OUT OF SCOPE** |

## 7. Preserved Security Boundaries

Firestore rules were not modified. Claims architecture was not redesigned. No database migration was performed. Existing authorization behavior for `Kitchen`, `Cashier`, `Delivery`, `Admin`, and `SuperAdmin` is unchanged. `Waiter` is recognized as a canonical provisionable role but has no runtime UI/workflow until Phase 10.