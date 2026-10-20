# Payments

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `payments` capability: the payment ledger of [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md). Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its entity and the ledger's rules by the [data model](../architecture/data-model.md#constraints-worth-stating), the rules' ownership by [conventions §13](../backend/conventions.md#the-ledgers-rules). The API is built for a visit's payment; no web screen yet.
> **Scope:** the API module `payments` (L4); `@masaha/shared/payments`. No web feature yet.

## What it does

- Records the payment of a visit, taken at its check-out, once per idempotency key.
- Finds the payment a check-out's idempotency key already recorded, so a retry never records a second one.

## Who uses it

- **The front desk** ([desk](desk.md)), for the space's owner and reception, at a visit's check-out. No route of its own yet; no web screen.

## Responsibility boundary

- **Owns** the `payments` table and its audit entries. The ledger's rules are the database's: a payment settles one item of its own space, above zero; it is never updated or deleted, only voided once; the payments of an item never add up to more than its due; a visit is paid only once its charge is set. The service repeats none of them.
- **Leaves** the visit, its charge and its customer to [`visits`](visits.md) and `customers`; the transaction, the space's lock and `can()` to [`desk`](desk.md); the translation of the ledger's refusals to the error handler's table ([conventions §4](../backend/conventions.md#4-errors)).

## How it composes the platform

- It writes in the desk's transaction, after the visit is closed; the insert trigger locks the visit's row, which the desk already holds.
- Each payment is audited by the audit writer, in the same transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**A visit's payment.** Inserted with the check-out's idempotency key; the insert trigger checks it against the visit's charge. A payment above the charge is refused (`payments_within_due` → `PAYMENT_EXCEEDS_DUE`); one on a visit with no charge, an unpriced close, is refused too (`payments_visit_uncharged` → `VISIT_NOT_PRICED`); the whole check-out then writes nothing.

## Decisions

### API decisions

- **The service never checks the ledger's rules: the database refuses, and the error handler translates the constraint's name through one table.** *Why:* one owner per rule ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), conventions §13); a check in the service would be a second copy. 2026-10-20, #95.
- **An uncharged visit has its own constraint name, `payments_visit_uncharged`, so it answers its own code.** *Why:* one name for two causes would read a visit not yet priced as an amount above its due ([finding 15](../architecture/findings/15-the-payments-migration-predates-adr-0015.md)). 2026-10-20, #95.
- **The constraint is read from the database's message.** *Why:* through the driver adapter, Prisma reports a check violation with the database's code and message but no constraint field; a trigger names its constraint at the start of its message. 2026-10-20, #95.
- **Audited `payment.recorded`, with the visit, the amount and the method.** 2026-10-20, #95.

## Code map

- **API:** `apps/api/src/modules/payments/`, entry `index.ts`: the service, the repository and the mapper. The translation table is the platform's (`shared/errors`), and reading a check violation is `db`'s.
- **Shared:** `packages/shared/src/payments/`: the payment's request (`paymentSchema`, `PAYMENT_METHODS`); the response (`VisitPayment`).

## History

### API history

- #95 — a visit's payment at its check-out; the ledger's translation table; finding 15 resolved.
