# Security Specification — Le défi des Mudras (`/duels/{duelId}`)

## 1. Data Invariants
1. **Strict Ownership**: Every document in `/duels/{duelId}` must have `ownerId == request.auth.uid` on creation, and `ownerId` is immutable thereafter.
2. **Verified Identity**: All create, update, and delete operations require an authenticated user with `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: `duelId` must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters on `get`, `create`, `update`, and `delete`.
4. **Closed Schema (Anti-Shadow-Fields)**: Incoming documents must have exact required keys (`hasAll` + `hasOnly`) with strict type and size bounds.
5. **Total Array Guarding**: `familyALevelResults` and `familyBLevelResults` must be lists of exact length `6` whose elements belong strictly to `['pending', 'passed', 'failed']`.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
7. **Scoped List Queries**: `allow list` strictly requires `isSignedIn() && existing().ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /duels/duel-1` with `auth = null`.
2. **Cross-Tenant Read**: `GET /duels/duel-1` owned by `uid-A` requested by `uid-B`.
3. **Unscoped List**: `LIST /duels` without `where('ownerId', '==', uid)`.
4. **Identity Spoofing on Create**: `CREATE /duels/duel-2` with `ownerId: "victim-uid"` by `attacker-uid`.
5. **Unverified Email Write**: `CREATE /duels/duel-3` with `email_verified: false`.
6. **Shadow Field Injection**: `CREATE /duels/duel-4` including unexpected key `isAdmin: true`.
7. **ID Poisoning**: `CREATE /duels/invalid$id!with/junk` or 200-char ID.
8. **Oversized String DoW**: `CREATE /duels/duel-5` with `familyAName` length > 40.
9. **Array Poisoning (Length)**: `CREATE /duels/duel-6` with `familyALevelResults` length 7.
10. **Array Poisoning (Value)**: `CREATE /duels/duel-7` with `familyALevelResults: ['passed','passed','passed','passed','passed','HACKED']`.
11. **Timestamp Forgery**: `CREATE /duels/duel-8` with client-forged `createdAt` != `request.time`.
12. **Immutable Field Mutation**: `UPDATE /duels/duel-1` attempting to mutate `ownerId` or `createdAt` or `duelNumber`.
