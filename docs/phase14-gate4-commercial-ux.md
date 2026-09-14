# Phase 14 Gate 14.4 — Commercial UX, Limits & Operational Self-Service

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

## Implemented

- Protected Admin/SuperAdmin commercial route at `/merchant/commercial`.
- Server-derived plan and subscription status through `getCommercialState`.
- Server-derived entitlement display.
- Upgrade/downgrade request entry points that create pending requests rather than granting access.
- Tenant-scoped request authorization through the Admin membership boundary.
- No client-side plan mutation or entitlement grant.
- No sensitive provider/payment details exposed in the merchant UI.

## Limits and authority

The current gate intentionally exposes entitlement state, not speculative usage counters. Usage limits must be introduced only when the underlying authoritative counters and plan policies are defined.

## Localization

The existing merchant shell remains responsible for application language/RTL behavior. Gate 14.4 does not introduce a second localization system.

## Verification

`npm run test:phase14:gate4`

Runtime evidence must verify tenant isolation, role restrictions, server-derived state and non-authoritative plan-change requests.
