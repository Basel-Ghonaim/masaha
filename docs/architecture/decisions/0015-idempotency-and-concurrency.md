# ADR 0015 — Idempotency and concurrency at the front desk

> **Status:** Accepted · **Date:** 2026-10-01

## Context
The front desk works on a weak, intermittent connection. A request can reach the server, and its answer can be lost on the way back. The desk then retries, and a retried check-in or payment must never be recorded twice.

Several staff members may also act on the same item at once, for example two payments for one subscription. The money must stay right ([ADR 0010](0010-manual-payment-ledger.md)).

The database already enforces the payment ledger's rules with constraints and triggers. What remained open was whether the services repeat those rules, how a violation reaches the user, and which isolation level and locks the application relies on.

## Decision
**Idempotency**

1. **Every create the front desk performs carries an idempotency key.** The client generates it once per user action, and sends it again on every retry of that action. The server stores it with the record, unique within the space. Today payments, visits and check-ins carry it.
2. **Every update or delete is idempotent by design.** A repeated check-out returns the closed record, and a repeated void returns the voided payment. There is no generic store of responses.
3. **A retry returns the first result**, with the same status and body, never a conflict.
4. **Subscriptions and customers do not carry the key yet.** A retried new subscription without a payment would create two. The slice that builds subscriptions and customers adds it.

**Concurrency**

5. **Isolation stays at PostgreSQL's default, read committed.** The guarantee comes from the database's constraints and row locks, not from a stricter isolation level.
6. **Rows are always locked in one fixed order:** oldest first, then by id. Spreading one amount over several items therefore cannot deadlock.

**The ledger's rules**

7. **The database owns the three payment rules its triggers enforce:**
   - append-only;
   - voided once;
   - never above the amount due.

   The last one locks the item's row, so concurrent payments are already counted one after the other. **Services do not repeat these rules.** Each rule has one owner.
8. **A violated rule becomes a domain error.** One translation table maps a database constraint's name to a domain error code, the way a unique violation already becomes "not unique". The text comes from the copy catalogues, as for every error.
9. **API integration tests reach each trigger** and check the code the endpoint returns.

The operative rules are owned by the [backend conventions §13](../../backend/conventions.md#13-idempotency-and-concurrency); the wire format by the [API contract](../../api/api-contract.md#1-conventions).

## Alternatives
- **A generic store of responses, keyed by the idempotency key.** Rejected: every endpoint would pass through it. The records the desk creates already carry the key, so the record itself is the proof that the action happened.
- **Answering a retry with a conflict.** Rejected: the desk could not tell a success it never heard about from a real conflict.
- **Serializable isolation.** Rejected: every transaction would need a retry loop for serialization failures. Constraints and row locks already guarantee what the ledger needs.
- **Services checking the ledger's rules before the database.** Rejected:
  - two owners of one rule drift apart;
  - a check before the write races with a concurrent payment, so only the database's check holds.

## Consequences
- The desk can retry any action safely, and each user action is recorded at most once.
- A new rule enforced by the database needs a line in the translation table and a test that reaches it.
- Subscriptions and customers stay unprotected against retries until their slice adds the key.
- Code that locks several rows follows the one order, or it risks deadlocks.
