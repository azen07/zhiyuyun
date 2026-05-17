# Security Specification for AquaIntelligence

## Data Invariants
1. A sensor reading or equipment state cannot exist without a valid parent Pond document.
2. Only the owner of a pond can read or write its sensor data and equipment status.
3. System-generated alerts are immutable after creation (handled status can be updated).
4. Historical data is written daily and should be immutable once signed off.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identity Spoofing**: Attempt to create a pond with someone else's `ownerId`.
2. **Path Injection**: Attempting to use `../` or long junk strings in pond IDs.
3. **Ghost Fields**: Adding `isAdmin: true` to a pond document.
4. **Range Poisoning**: Setting water temperature to `9999` or DO to `-1`.
5. **Orphaned Writes**: Writing sensor data to a pond ID that doesn't exist.
6. **State Shortcut**: Turning equipment "on" without a timestamp.
7. **Role Escalation**: Attempting to update the `ownerId` of an existing pond.
8. **PII Leak**: Attempting to list all users' ponds without being signed in.
9. **Denial of Wallet**: Sending a massive 1MB string in the `name` field.
10. **Terminal State Break**: Attempting to delete critical history records.
11. **Verification Bypass**: Attempting to write data from a user with an unverified email.
12. **Sync Vulnerability**: Updating equipment status without updating `lastActionAt`.

## Test Runner (Logic Check)
The `firestore.rules` will be designed to block all the above.
