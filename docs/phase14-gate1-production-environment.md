# Phase 14 Gate 14.1 — Production Environment & Deployment Contract

## Status

**IMPLEMENTED — VERIFICATION PENDING — NOT CLOSED**

Gate 14.1 establishes the repository-level production contract. It does not deploy production and does not claim a successful production smoke test.

## Environment boundary

| Concern | Contract |
|---|---|
| Frontend build | `npm run build` (`tsc -b && vite build`) |
| Firebase Functions source | `functions/` |
| Functions runtime | Node 20 |
| Functions region | `us-central1` |
| Firestore rules | `firestore.rules` |
| Local Auth emulator | 9099 |
| Local Firestore emulator | 8080 |
| Local Functions emulator | 5001 |

The emulator ports are development-only. They are not production endpoints.

## Secrets boundary

Secrets and production credentials must be supplied by the deployment/operator environment or Firebase Secret Manager as appropriate. They must not be committed to the repository, embedded in client code, or copied into documentation.

The repository must not contain service-account private keys, production tokens, or raw provider credentials.

## Deployment prerequisites

Before an operator-authorized production deployment:

1. select the intended Firebase project explicitly;
2. verify the Functions runtime and region against the repository contract;
3. verify Firestore rules are the intended `firestore.rules` version;
4. provide required production secrets through the deployment environment;
5. run the reproducible frontend build;
6. run the authorized automated test suite;
7. deploy only after the preceding evidence is available.

## Production smoke-test contract

After deployment, an operator must verify at minimum:

- authentication succeeds for an intended production test identity;
- a tenant-scoped Admin can access only its own restaurant;
- canonical order creation reaches the server-authoritative callable;
- order lifecycle mutation remains server-authoritative;
- analytics callable returns bounded tenant-scoped data;
- unauthorized/cross-tenant access is rejected.

No smoke test is marked successful by static analysis alone.

## Rollback contract

Rollback means redeploying a previously verified Git commit. A rollback must not be implemented as a destructive database reset.

If a schema/data change is ever introduced, it must have a reversible migration path before production deployment.

## Explicit boundary

**No production deployment is executed by Gate 14.1.** Production execution requires explicit operator authorization and real project credentials. This gate establishes the contract and the evidence required for that execution.
