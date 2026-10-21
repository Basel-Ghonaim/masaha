# Payments

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-21 · **Owner:** Basel Ghoneim
> **Authority:** The `payments` capability: the payment ledger of [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md). Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its entity and the ledger's rules by the [data model](../architecture/data-model.md#constraints-worth-stating), the rules' ownership by [conventions §13](../backend/conventions.md#the-ledgers-rules). The API is built for a visit's payment and the uncollected visits; no web screen yet.
> **Scope:** the API module `payments` (L4); `@masaha/shared/payments`. No web feature yet.

## What it does

- Records the payment of a visit, taken at its check-out or after it, once per idempotency key.
- Finds the payment a check-out's or a payment's idempotency key already recorded, so a retry never records a second one.
- Answers a space's uncollected visits: closed by the auto check-out, not fully paid and not written off, with what was paid and what is still owed.
- Answers what one visit was paid and still owes, in the desk's transaction (`balanceOfVisit`), for the write-off and the payment after the check-out.
- Answers customers' debt and credit, the ids of those who owe or are in credit, and one customer's items with their balances — each computed in the database, by one aggregate query — and the payments of visits, voided ones marked, for a customer's file.

## Who uses it

- **The front desk** ([desk](desk.md)), for the space's owner and reception, at a visit's check-out; and, through its own route, the uncollected visits, which the owner's «يحتاج انتباهك» will count. No web screen yet.

## Responsibility boundary

- **Owns** the `payments` table and its audit entries; the balance's pure rule (`balance.ts`: the due less what was paid). The ledger's rules are the database's: a payment settles one item of its own space, above zero; it is never updated or deleted, only voided once; the payments of an item never add up to more than its due; a visit is paid only once its charge is set; a written-off visit takes no payment. The service repeats none of them.
- **Reads** from [`visits`](visits.md) a page's visits as the desk sees them. Its uncollected and balance queries read the `visits` table and a subscription's due through [`subscriptions`](subscriptions.md)' function `subscription_usage`, and writes neither ([conventions §9](../backend/conventions.md#composed-reads)).
- **Leaves** the visit, its charge and its customer to [`visits`](visits.md) and `customers`; the transaction, the space's lock and `can()` to [`desk`](desk.md); the translation of the ledger's refusals to the error handler's table ([conventions §4](../backend/conventions.md#4-errors)).

## How it composes the platform

- It writes in the desk's transaction, after the visit is closed; the insert trigger locks the visit's row, which the desk already holds.
- Each payment is audited by the audit writer, in the same transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**A visit's payment.** Inserted with the check-out's idempotency key; the insert trigger checks it against the visit's charge. A payment above the charge is refused (`payments_within_due` → `PAYMENT_EXCEEDS_DUE`); one on a visit with no charge, an unpriced close, is refused too (`payments_visit_uncharged` → `VISIT_NOT_PRICED`); the whole check-out then writes nothing.

**A visit's payment after its check-out.** The same insert, in the desk's transaction, before any customer is attached; the trigger refuses, in its order, a written-off visit (`payments_visit_written_off` → `VISIT_WRITTEN_OFF`), one with no charge, and an amount above the balance.

**The balances.** One query shape over the space's items (`balancesOf`): its subscriptions, their due from `subscription_usage`, and its closed visits with a customer, not written off, their charge; each with what was paid, voided payments left out. A customer's debt is the sum of the positive balances (an unpriced visit owes nothing until priced); their credit, what was paid above the due on a usage-based subscription only. The payment filter takes the ids of those whose debt, or credit, is above zero. One customer's items are answered oldest first, a visit before a subscription made at the same instant, each balance by the one rule (`balance.ts`). The calendar's days are the caller's (`calendarOf`).

**The uncollected visits.** One query and its count over the space's visits closed by the auto check-out and not written off, each with what was paid on it, voided payments left out: the settled ones (charge − paid ≤ 0) are left out in SQL, the unpriced ones kept, the latest closed first, so every page is full and the total right; `visits` then answers the page's visits as the desk sees them, each balance by the one rule (2026-10-21, #102). An unpriced visit has no due and is never settled. Read without a lock.

## Decisions

### API decisions

- **Debt, credit and the payment filter are computed in the database, by one aggregate query of `payments`; no request reads every payment, visit or check-in into memory.** *Why:* the owner's decision 6; a usage-based subscription's due comes from its owner's function, so the query reads other modules' data without writing it (step 8's plan, S9). 2026-10-21, #102.

- **The service never checks the ledger's rules: the database refuses, and the error handler translates the constraint's name through one table.** *Why:* one owner per rule ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), conventions §13); a check in the service would be a second copy. 2026-10-20, #95.
- **An uncharged visit has its own constraint name, `payments_visit_uncharged`, so it answers its own code.** *Why:* one name for two causes would read a visit not yet priced as an amount above its due ([finding 15](../architecture/findings/15-the-payments-migration-predates-adr-0015.md)). 2026-10-20, #95.
- **A written-off visit's refusal is the trigger's fourth rule (`payments_visit_written_off`), not a check in the desk.** *Why:* the ledger's rules have one owner, so every insert path is covered; the trigger already locks the visit's row, so a write-off and a payment racing are decided there (S1 of the plan). 2026-10-20, #100.
- **The constraint is read from the database's message.** *Why:* through the driver adapter, Prisma reports a check violation with the database's code and message but no constraint field; a trigger names its constraint at the start of its message. 2026-10-20, #95.
- **Audited `payment.recorded`, with the visit, the amount and the method.** 2026-10-20, #95.
- **The uncollected visits are composed without repeating the balance: `visits` names them, the ledger decides which are settled, before the page is cut.** *Why:* the balance is the ledger's rule, in one place; filtering a page after it is fetched would leave pages short ([conventions §5](../backend/conventions.md#5-pagination)). Three queries over the space's auto-closed visits, fine at v1's scale. 2026-10-20, #97. Revised: the ledger pages them in one SQL query, the settled ones left out by the same subtraction, and `visits` answers only the page's visits. *Why:* the old read sent every settled id back as bound parameters, growing with every auto-closed visit ([finding 113](../architecture/findings/113-the-uncollected-read-grows-with-every-auto-closed-visit.md)). 2026-10-21, #102.

## Code map

- **API:** `apps/api/src/modules/payments/`, entry `index.ts`: the service, the repository, the mapper, the controller and the manage router, and the balance's rule (`balance.ts`). The translation table is the platform's (`shared/errors`), and reading a check violation is `db`'s.
- **Shared:** `packages/shared/src/payments/`: the payment's request (`paymentSchema`, `PAYMENT_METHODS`); the responses (`VisitPayment`, `UncollectedVisit`).

## History

### API history

- #95 — a visit's payment at its check-out; the ledger's translation table; finding 15 resolved.
- #97 — the uncollected visits.
- #100 — the ledger's fourth rule, a written-off visit takes no payment; `balanceOfVisit`, with `paidFor` reading in the caller's transaction; a visit's payment after its check-out, through the desk.
- #102 — customers' debt and credit, the payment filter's ids and a customer's items with their balances, in the database; the payments of visits, voided ones marked; the uncollected visits paged in one query (finding 113 resolved).
