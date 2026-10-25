# Payments

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-24 · **Owner:** Basel Ghoneim
> **Authority:** The `payments` capability: the payment ledger of [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md). Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its entity and the ledger's rules by the [data model](../architecture/data-model.md#constraints-worth-stating), the rules' ownership by [conventions §13](../backend/conventions.md#the-ledgers-rules). The API is built for a visit's payment, a subscription's, the owner's void, the payments list and the uncollected visits; no web screen yet.
> **Scope:** the API module `payments` (L4); `@masaha/shared/payments`. No web feature yet.

## What it does

- Records the payment of a visit, taken at its check-out or after it, or of a subscription, once per idempotency key.
- Finds the payment a check-out's or a payment's idempotency key already recorded, so a retry never records a second one.
- Answers a space's uncollected visits: closed by the auto check-out, or a priced visit closed by hand with no customer that owes again after a void, not fully paid and not written off, with what was paid and what is still owed.
- Answers what one visit was paid and still owes, in the desk's transaction (`balanceOfVisit`), for the write-off and the payment after the check-out.
- Answers the payments list: the owner's, by a range of Gaza days, who recorded them, method, kind and void; reception's own of today; the latest received first, paged, with the totals of the whole filter.
- Voids a payment, in the desk's transaction: its row locked (`lockIn`), its void's columns only, audited; and answers payments named by their item, its customer and who recorded and voided them (`rowsOf`).
- Answers customers' debt and credit, the ids of those who owe or are in credit, and one customer's items with their balances — each computed in the database, by one aggregate query — and the payments of visits, voided ones marked, for a customer's file.

## Who uses it

- **The space's owner**, whose ledger reads every payment, and **reception**, whose «دفعاتي اليوم» reads its own of today, through its own route. No web screen yet.
- **The front desk** ([desk](desk.md)), for the space's owner and reception, at a visit's check-out, and for the owner's void of a payment; and, through its own route, the uncollected visits, which the owner's «يحتاج انتباهك» will count. On the web, the desk's screen lists the uncollected visits and records a payment on one ([desk](desk.md), 2026-10-25, #117); «استلام دفعة» records a payment on one of a customer's items, a visit or a subscription (2026-10-25, #119).

## Responsibility boundary

- **Owns** the `payments` table and its audit entries; the balance's pure rule (`balance.ts`: the due less what was paid). The ledger's rules are the database's: a payment settles one item of its own space, above zero; it is never updated or deleted, only voided once; the payments of an item never add up to more than its due; a visit is paid only once its charge is set; a written-off visit takes no payment, and its payments are not voided until the write-off is undone. The service repeats none of them.
- **Reads** from [`visits`](visits.md) a page's visits as the desk sees them; for the payments it answers named (`rowsOf`), their visits from it too, the names of who recorded and voided them from [`users`](users.md), a subscription's name and customer from [`subscriptions`](subscriptions.md), and that customer's name from [`customers`](customers.md). Its uncollected and balance queries read the `visits` table and a subscription's due through [`subscriptions`](subscriptions.md)' function `subscription_usage`, and writes neither ([conventions §9](../backend/conventions.md#composed-reads)).
- **Leaves** the visit, its charge and its customer to [`visits`](visits.md) and `customers`; the transaction, the space's lock and `can()` to [`desk`](desk.md); the translation of the ledger's refusals to the error handler's table ([conventions §4](../backend/conventions.md#4-errors)).

## How it composes the platform

- It writes in the desk's transaction, after the visit is closed; the insert trigger locks the visit's row, which the desk already holds.
- Each payment is audited by the audit writer, in the same transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**A visit's payment.** Inserted with the check-out's idempotency key; the insert trigger checks it against the visit's charge. A payment above the charge is refused (`payments_within_due` → `PAYMENT_EXCEEDS_DUE`); one on a visit with no charge, an unpriced close, is refused too (`payments_visit_uncharged` → `VISIT_NOT_PRICED`); the whole check-out then writes nothing.

**A visit's payment after its check-out.** The same insert, in the desk's transaction, before any customer is attached; the trigger refuses, in its order, a written-off visit (`payments_visit_written_off` → `VISIT_WRITTEN_OFF`), one with no charge, and an amount above the balance.

**A payment's void.** In the desk's transaction, after the space's lock and `can()`: the payment's row locked (`FOR UPDATE`), the space's; one voided already is answered as it is. The void sets `voidedAt`, `voidedById` and `voidReason` and nothing else, which the change trigger holds, refusing a written-off visit's (`payments_visit_written_off` → `VISIT_WRITTEN_OFF`); audited `payment.voided` with its item, amount, method and reason. Nothing else is rewritten: every balance, debt, credit and a fixed price's floor leave voided payments out on read. The row is answered named (`rowsOf`): the visits, the subscriptions and their customers, and the people, each one set query, in parallel.

**The payments list.** `can()` decides first, before any query: the owner reads the query's range and filters; anyone else of the staff, their own payments of today. The query is validated first (422); a valid `from`, `to` or `recordedById` from reception is then `forbidden` (403), never ignored. The window is the range's Gaza days, from its first midnight to the midnight after its last (`paymentsWindow`, pure; today without one); a payment counts on the day it was received. The page (the latest received first, then by id), its count and the totals run in parallel, on the payments' `space_id, received_at` index; the totals leave the void filter out and sum the payments not voided by method, the voided ones apart. The page's rows are named by `rowsOf`. Read without a lock.

**The balances.** One query shape over the space's items (`balancesOf`): its subscriptions, their due from `subscription_usage`, and its closed visits with a customer, not written off, their charge; each with what was paid, voided payments left out. A customer's debt is the sum of the positive balances (an unpriced visit owes nothing until priced); their credit, what was paid above the due on a usage-based subscription only. The payment filter takes the ids of those whose debt, or credit, is above zero. One customer's items are answered oldest first, a visit before a subscription made at the same instant, each balance by the one rule (`balance.ts`). The calendar's days are the caller's (`calendarOf`).

**The uncollected visits.** One query and its count over the space's visits closed by the auto check-out, or closed by hand, priced, with no customer, and not written off, each with what was paid on it, voided payments left out: the settled ones (charge − paid ≤ 0) are left out in SQL, the unpriced ones kept, the latest closed first, so every page is full and the total right; `visits` then answers the page's visits as the desk sees them, each balance by the one rule (2026-10-21, #102). An unpriced visit has no due and is never settled. Read without a lock.

## Decisions

### API decisions

- **The totals ride in the list's `meta`, with its pagination** (S3). *Why:* the ledger's footer and «دفعاتي اليوم»'s cards need them with the rows, in one request on the desk's weak connection; `meta` carries what an endpoint adds. A summary route was the alternative. 2026-10-24, #114.
- **The list filters by kind and by void too, `INCLUDE` by default; the totals never count a voided payment as received** (S4). *Why:* the prototype's «النوع» and «إظهار الملغاة»; «دفعاتي اليوم» lists voided ones marked. 2026-10-24, #114.
- **A range is both ends or neither, at most 92 days with both counted, today by default** (S5). *Why:* a quarter covers the ledger's periods; longer ones are finance's (step 11). 2026-10-24, #114.
- **One route, narrowed by `can()`; reception's valid range or `recordedById` is refused, not ignored** (S6); the query is validated first, so an invalid one is `validation` (422) for everyone. *Why:* an ignored filter would answer a page that looks like what was asked and is not; a refusal shows the screen's bug at once. A route of reception's own was the alternative. 2026-10-24, #114.
- **Debt, credit and the payment filter are computed in the database, by one aggregate query of `payments`; no request reads every payment, visit or check-in into memory.** *Why:* the owner's decision 6; a usage-based subscription's due comes from its owner's function, so the query reads other modules' data without writing it (step 8's plan, S9). 2026-10-21, #102.

- **The service never checks the ledger's rules: the database refuses, and the error handler translates the constraint's name through one table.** *Why:* one owner per rule ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), conventions §13); a check in the service would be a second copy. 2026-10-20, #95.
- **An uncharged visit has its own constraint name, `payments_visit_uncharged`, so it answers its own code.** *Why:* one name for two causes would read a visit not yet priced as an amount above its due ([finding 15](../architecture/findings/15-the-payments-migration-predates-adr-0015.md)). 2026-10-20, #95.
- **A written-off visit's refusal is the trigger's fourth rule (`payments_visit_written_off`), not a check in the desk.** *Why:* the ledger's rules have one owner, so every insert path is covered; the trigger already locks the visit's row, so a write-off and a payment racing are decided there (S1 of the plan). 2026-10-20, #100.
- **A written-off visit's payment is not voided until the write-off is undone: the trigger's fourth rule, both ways, under the same name.** *Why:* the write-off records what it forgave; a void after it would raise what the visit owes while it stays written off, so the owner would forgive money nobody decided to forgive. The owner undoes the write-off, voids, and writes off the true rest. One owner per ledger rule, every path covered (S2 of the plan; alternatives: the desk checks it, or the void is allowed). 2026-10-24, #114.
- **The void is a `desk` orchestration; the payment's row is this module's.** *Why:* the transaction, the space's lock and `can()` are the desk's, as a payment's record is; this module locks, voids and names the row. 2026-10-24, #114.
- **The void locks the payment's row (`FOR UPDATE`) after the space's.** *Why:* every desk writer is serialised by the space's lock, but two voids decide in turn on the row itself, whatever path a future writer takes (S7 of the plan). 2026-10-24, #114.
- **The constraint is read from the database's message.** *Why:* through the driver adapter, Prisma reports a check violation with the database's code and message but no constraint field; a trigger names its constraint at the start of its message. 2026-10-20, #95.
- **Audited `payment.recorded`, with the visit, the amount and the method.** 2026-10-20, #95. Revised: with its item, the visit or the subscription. 2026-10-22, #106.
- **A subscribe's amount is allocated by a pure rule here (`allocation.ts`): the debts oldest first, each at most its balance, the rest to the new subscription, at most 50 items.** *Why:* the balance is this module's rule; the desk reads the items and records the parts, the ledger checks each (K3; ADR 0010). 2026-10-22, #106.
- **Past the 49th debt, the rest of an amount is the new subscription's.** An amount larger than the 49 oldest balances becomes credit on a usage-based new subscription while debts 50 and on stay owed, and is refused `PAYMENT_EXCEEDS_DUE` on a fixed one. *Why:* the cap bounds one request's payments, which a retry finds in one query of derived keys; fifty unpaid items on one customer is far beyond a coworking space's desk, and the desk can pay the rest item by item. 2026-10-22, #109.
- **One `record` for both items, the item named as `{ visitId }` or `{ subscriptionId }`.** *Why:* the ledger is one table and one trigger; the desk decides which item a request pays, the ledger only records and checks it. 2026-10-22, #106.
- **The uncollected visits are paged by the ledger in one SQL query, the settled ones left out by the balance's own subtraction before the page is cut; `visits` answers only the page's visits.** *Why:* the balance is the ledger's rule, in one place; filtering a page after it is fetched would leave pages short ([conventions §5](../backend/conventions.md#5-pagination)). First built as three queries over the space's auto-closed visits, `visits` naming them and the ledger deciding which were settled, 2026-10-20, #97. Revised: the ledger pages them in one SQL query, the settled ones left out by the same subtraction, and `visits` answers only the page's visits. *Why:* the old read sent every settled id back as bound parameters, growing with every auto-closed visit ([finding 113](../architecture/findings/113-the-uncollected-read-grows-with-every-auto-closed-visit.md)). 2026-10-21, #102. Revised: they include a priced visit closed by hand with no customer, which only a void leaves owing, in the same query. *Why:* such a visit owes and would show in no list, no debt and no count; the uncollected list offers what it needs («تسجيل دينًا», a payment, the write-off). An unpriced one closed by hand stays the unpriced visits' (S1 of the plan, with the owner's correction). 2026-10-24, #114.

## Code map

- **API:** `apps/api/src/modules/payments/`, entry `index.ts`: the service, the repository, the mapper, the controller and the manage router, the balance's rule (`balance.ts`) and the list's window (`paymentsWindow.ts`). The translation table is the platform's (`shared/errors`), and reading a check violation is `db`'s.
- **Shared:** `packages/shared/src/payments/`: the payment's request (`paymentSchema`, `PAYMENT_METHODS`), the void's (`voidPaymentSchema`) and the list's query (`paymentsQuerySchema`); the responses (`VisitPayment`, `UncollectedVisit`, `PaymentRow`, `PaymentItem`, `PaymentTotals`, `PaymentsMeta`).

## History

### API history

- #95 — a visit's payment at its check-out; the ledger's translation table; finding 15 resolved.
- #97 — the uncollected visits.
- #100 — the ledger's fourth rule, a written-off visit takes no payment; `balanceOfVisit`, with `paidFor` reading in the caller's transaction; a visit's payment after its check-out, through the desk.
- #102 — customers' debt and credit, the payment filter's ids and a customer's items with their balances, in the database; the payments of visits, voided ones marked; the uncollected visits paged in one query (finding 113 resolved).
- #106 — a payment on a subscription, through the desk's payment route; `record` for both items; the allocation of a subscribe's amount, oldest debt first, and the payments of derived keys found in one query.
- #114 — the owner's void of a payment, a written-off visit's once the write-off is undone (the ledger's fourth rule both ways); a visit closed by hand with no customer that owes after a void, uncollected; the payments list with its totals, reception's own of today.
