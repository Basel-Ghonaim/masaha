# Finance

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `finance` capability: the owner's read models of a space's money. Its endpoints are owned by the [API contract](../api/api-contract.md#finance); what income and collections count by the [data model](../architecture/data-model.md#front-desk-and-money); the ledger's aggregates by [payments](payments.md). The API is built; no screen yet.
> **Scope:** the API module `finance` (L5); `@masaha/shared/finance`.

## What it does

- Answers a month's income, the payments not voided, by the kind of item paid: the month (the current Gaza month by default, at most 23 back), the month before it, today and all time with its first day; the last 12 months and the visits' last 30 days, by Gaza day; and each staff member's collections in the month, by method.
- Answers who owes and who is in credit, by the ledger's one balance rule, the largest first, paged, with their phones, an archived customer kept and marked, and the item still owing made first; the space's totals, the uncollected visits apart, and its reminder template.
- Answers who paid in a month, each customer with what they paid then, the latest first, paged.

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/finance`. Reception is refused; it keeps its own payments of today («دفعاتي اليوم», [payments](payments.md)). The owner's Finance screen (19) is to come, on the web.

## Responsibility boundary

- **Owns** no table and writes nothing (a read model, [conventions §8](../backend/conventions.md#8-module-rules), R7). It owns its windows: the instants of a month, a day and the hours of Gaza's calendar (`windows.ts`, pure), and which window each figure reads.
- **Reads** the income, the collections, the balances' page and totals and the uncollected visits' counts from [payments](payments.md), whose aggregates hold the one "voided left out" and balance rules; the names of who recorded a payment from [users](users.md); the debtors' contacts and the payers' names from [customers](customers.md); the oldest item's name from [subscriptions](subscriptions.md) and [visits](visits.md); the reminder template from `space-settings`. Who paid in a month it reads in its own query, over the payments and the items they paid (R7).
- **Leaves** who may read to `can()` (`finance.read`, [security › Authorization](../backend/security.md#authorization)) and the boundary of `/manage/spaces/:spaceId`.

## How it composes the platform

- Its manage router sits at `/finance` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; each route asks `requireCan('finance.read')` before its query is read.
- It reads one `REPEATABLE READ` snapshot (`readSnapshot`, as the desk's composed reads) where its figures must agree ([conventions › Composed reads](../backend/conventions.md#composed-reads)).

## Behaviour and flows

**The month.** Absent, the current Gaza month at the service's clock; a month after it, or before the 23 months before it, is `validation` (422) `out_of_range` on `month`, before anything is read. A month asked changes the month, the month before and the collections; the 12 months, the 30 days and today always end with the current month and today.

**Income.** One call of `payments.incomeIn` with every window at once — the month, the month before, today, all time (both ends open), the 12 months and the 30 days, 45 in all — `firstReceivedAt` and `collectionsIn` of the month, in one snapshot; then the names of who recorded them, after it (a name is no figure). Each window runs from a Gaza midnight to the next one's, from `gazaInstant`, so a payment at 23:30 on a month's last day counts in that month and that day, and no zone is read in the database.

**Who owes.** In one snapshot: `payments.balancesPage` (the page, by `state`), `balanceTotals` and `uncollectedTotals`, and the space's settings; then, in the same snapshot, the page's customers' contacts (`archived` from `archivedAt`), its oldest subscriptions' names and its oldest visits as the desk sees them — a visit named by its visitor, else its customer. The item's day is the Gaza day it was made. Every amount comes from the ledger; `finance` adds none.

**Who paid.** One statement over the month's payments not voided, each joined to its visit or subscription by primary key for the customer (`coalesce`), grouped by customer: the sum, the latest payment, and how many customers over the same rows (`count(*) OVER ()`; past the last page counted apart); then the page's names. Read apart, as every list; an archived customer is a payer like any other.

## Decisions

### API decisions

- **Four routes, one per tab's need, the server aggregating every figure** (the owner's decision 4; Q1). *Why:* a chart's series is a read model's answer, never rows for the web to sum; each answer is bounded. One route for every tab was the alternative (A1): every tab would pay for the others. 2026-10-29, #131.
- **Income is cash collected; a fixed month and fixed windows, no free range; no export route** (the owner's decisions 2, 3, 5). 2026-10-29, #131.
- **Every window is a pair of instants computed from Gaza's calendar, passed as arrays** (S1). *Why:* one source of the zone ([finding 120](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)), and each window is an index range of `payments (space_id, received_at)`. SQL `AT TIME ZONE` buckets were the alternative. 2026-10-29, #131.
- **All time has two open ends** (`-infinity` to `infinity`), not "until now". *Why:* the month and today run to their next midnight, so all time always holds them both. 2026-10-29, #131.
- **The income reads one snapshot** (S2). *Why:* the month must equal its bar in the 12 months, and its collections its total ([finding 124](../architecture/findings/124-a-statements-sums-and-its-payments-come-from-different-snapshots.md)). 2026-10-29, #131.
- **The debts read one snapshot: the page, the totals, the uncollected counts, the names and the template** (S2). *Why:* the page's rows must add up to its totals across pages read in turn; the names ride in it, since `deskVisitsOf` takes the snapshot's transaction (EC6). 2026-10-29, #131.
- **An archived customer's debt is kept and marked** (Q2). *Why:* it is still owed, and the desk collects it; the customers list's `payment=OWES` leaves archived customers out, so its total may be smaller than `totals.owed.customers`. 2026-10-29, #131.
- **Who paid is `finance`'s own query; the voided rule is written there a second time, as a `WHERE`** (D12). *Why:* it groups the month's payments by their items' customers, which no ledger function answers; its sums are no balance. 2026-10-29, #131.
- **The aggregates are `payments`', not `finance`'s** (S3). *Why:* the voided rule keeps one home, and the owner's overview, which may not import `finance`, reads the same functions. Every aggregate in `finance`'s repository was the alternative (A2). 2026-10-29, #131.

## Code map

- `apps/api/src/modules/finance/` — the module: its service, its repository (who paid), its mapper, its windows (`windows.ts`), its controller and its manage router.
- `packages/shared/src/finance/` — the month's query and its bound, the debts' and the payers' queries, the answers.

## History

### API history

- #131 — a month's income: the month, the month before, today and all time, the 12 months, the visits' 30 days and the staff's collections; who owes and who is in credit, with the totals and the reminder template; who paid in a month.
