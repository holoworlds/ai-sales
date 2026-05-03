# Security Specification - Cognitive GEO Sales Hub

## Data Invariants
1. **Client Ownership**: A client record can only be accessed or modified by its `ownerId`.
2. **Sub-resource Integrity**: Interactions and Content Assets must belong to a valid Client, and access is inherited from the parent Client's ownership.
3. **Stage Transitions**: Client stages must be one of the predefined `phase_0` to `phase_7` values.
4. **Immutable Identity**: `ownerId` and `createdAt` cannot be changed after creation.
5. **System Timestamps**: `updatedAt` (and `createdAt` on create) must match `request.time`.

## The "Dirty Dozen" Payloads (Attacks)

1. **Identity Spoofing**: Attempt to create a client with an `ownerId` that doesn't match the authenticated user.
2. **Ghost Field Injection**: Adding undocumented fields (e.g., ` isAdmin: true`) to a client update.
3. **Stage Bypass**: Setting an invalid stage string (e.g., `phase_99`).
4. **Cross-Tenant Access**: Attempting to `get` or `list` clients belonging to another user.
5. **Privilege Escalation**: Attempting to change the `ownerId` of an existing client.
6. **Interaction Orphan**: Creating an interaction for a client that the user does not own.
7. **DoS (Large String)**: Sending a 1MB string into the `company` name field.
8. **ID Poisoning**: Using a 1.5KB string as a document ID.
9. **Timestamp Fraud**: Sending a client-side `updatedAt` timestamp that is in the past or future.
10. **Resource Scraping**: Authenticated user trying to `list` all clients without a `where` clause on `ownerId`.
11. **Knowledge Corruption**: Non-admin trying to update a knowledge entry with malicious content (Note: current app doesn't have explicit admin, so any signed-in user can add knowledge, but we restrict it to their own creator role if added).
12. **Content Hijacking**: authenticated user trying to read a `ContentAsset` of a client they don't own by guessing the ID.

## Test Runner (firestore.rules.test.ts)
*Note: This is a conceptual representation of the test suite.*

```typescript
import { assertFails, assertSucceeds, ... } from '@firebase/rules-unit-testing';

// Test Identity Spoofing
it('should deny creating a client with different ownerId', async () => {
  const db = getFirestore(auth('user_a'));
  await assertFails(addDoc(collection(db, 'clients'), { company: 'X', ownerId: 'user_b' }));
});

// Test Cross-Tenant Access
it('should deny reading another users client', async () => {
  const db = getFirestore(auth('user_a'));
  await assertFails(getDoc(doc(db, 'clients', 'client_of_user_b')));
});

// ... and so on for all 12 payloads
```
