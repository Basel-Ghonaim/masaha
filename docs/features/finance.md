# Finance

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `finance` capability: the owner's read models of a space's money and occupancy. Its endpoints are owned by the [API contract](../api/api-contract.md#finance); what income, collections and the occupancy statistics count by the [data model](../architecture/data-model.md#front-desk-and-money); the ledger's aggregates by [payments](payments.md). The API is built; no screen yet.
> **Scope:** the API module `finance` (L5); `@masaha/shared/finance`.

## What it does

- Answers a month's income, the payments not voided, by the kind of item paid: the month (the current Gaza month by default, at most 23 back), the month before, today and all time; the last 12 months and the visits' last 30 days; each staff member's collections in the month, by method.
- Answers who owes and who is in credit, the largest first, paged, with their phones, an archived customer kept and marked, the item still owing made first; the space's totals and the uncollected visits, the desk's list — an auto-closed visit left to a customer is in both, so the two are never added ([finding 193](../architecture/findings/193-a-visit-left-to-a-customer-is-both-a-debt-and-uncollected.md)) — and its reminder template.
- Answers who paid in a month, each customer with what they paid then, the latest first, paged.
- Answers the occupancy statistics from closed stays: visits and members per day over the 14 days ending today; the average present per Gaza weekday and hour over the 28 days before today; a month's average stay, peak hour and average daily attendance.

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/finance`. Reception is refused; it keeps its own payments of today («دفعاتي اليوم», [payments](payments.md)). The owner's Finance screen (19) is to come, on the web.

## Responsibility boundary

- **Owns** no table and writes nothing (a read model, [conventions §8](../backend/conventions.md#8-module-rules), R7). It owns its windows — the instants of Gaza's months, days and hours (`windows.ts`, pure) — and the occupancy grid's arithmetic (`occupancyGrid.ts`, pure).
- **Reads** the income, the collections, the balances and the uncollected counts from [payments](payments.md), whose aggregates hold the voided and balance rules; the names of who recorded a payment from [users](users.md); the debtors' contacts and the payers' names from [customers](customers.md); the oldest item's name from [subscriptions](subscriptions.md) and [visits](visits.md); the reminder template from `space-settings`. In its own queries (R7, [conventions §9](../backend/conventions.md#9-placements)): who paid in a month, over the payments and their items, and the stays, over `visits` and `check_ins`.
- **Leaves** who may read to `can()` (`finance.read`, [security › Authorization](../backend/security.md#authorization)) and the boundary of `/manage/spaces/:spaceId`.

## How it composes the platform

- Its manage router sits at `/finance` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; each route asks `requireCan('finance.read')` before its query is read.
- Where its figures must agree, it reads one `REPEATABLE READ` snapshot (`readSnapshot`, [conventions › Composed reads](../backend/conventions.md#composed-reads)).

## Behaviour and flows

**The month.** Absent, the current Gaza month at the service's clock; one after it, or before the 23 months before it, is `validation` (422) `out_of_range` on `month`, before anything is read. The month asked moves the month's figures only: the 12 months, the 30, 14 and 28 days and today always end with now.

**Income.** In one snapshot: one `payments.incomeIn` over 46 windows at once (the month, the month before, today, all time with both ends open, the 12 months, the 30 days), `firstReceivedAt`, and the month's `collectionsIn`; the names after it (a name is no figure). Each window runs from a Gaza midnight to the next (`gazaInstant`), so a payment at 23:30 on a month's last day counts in that month and that day.

**Who owes.** In one snapshot: `payments.balancesPage` (by `state`), `balanceTotals`, `uncollectedTotals` and the space's settings; then the page's contacts (`archived`), its oldest subscriptions' names and its oldest visits as the desk sees them (a visitor's name, else the customer's). The item's day is the Gaza day it was made. Every amount is the ledger's.

**Who paid.** One statement over the month's payments not voided, each joined to its visit or subscription by primary key for its customer, grouped by customer: the sum, the latest payment and the count over the same rows (`count(*) OVER ()`; past the last page counted apart); then the page's names. Read apart, as every list.

**Occupancy.** A `WITH` of the space's closed visits and check-ins checked in within the range, bounded on their `space_id, checked_in_at` indexes (a stay never crosses its check-in's day). Per day, one statement: the visits, and the members each once (`count(DISTINCT customer_id)`). Per hour slot — every hour of each Gaza day by Gaza's weekday and hour (`hourSlots`; a daylight-saving day has 23 or 25) — one statement: the stays overlapping it. The grid sums the 28 days' slots per weekday and hour and divides by 4, one decimal, half up; takes the month's peak hour, ties the earliest; and averages the month's attendance over the days with any. The average stay is the database's, in whole minutes. Five statements in parallel, no snapshot.

## Decisions

### API decisions

- **Four routes, one per tab's need, the server aggregating every figure** (the owner's decision 4; Q1). *Why:* a chart's series is a read model's answer, never rows for the web to sum; each answer is bounded. One route for every tab (A1) would make every tab pay for the others. 2026-10-29, #131.
- **Income is cash collected; a fixed month and fixed windows, no free range; no export route** (the owner's decisions 2, 3, 5). 2026-10-29, #131.
- **Every window is a pair of instants from Gaza's calendar, passed as arrays** (S1). *Why:* one source of the zone ([finding 120](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)); each window an index range. SQL `AT TIME ZONE` buckets were the alternative. 2026-10-29, #131.
- **All time has two open ends, not "until now".** *Why:* the month and today run to their next midnight, so all time always holds both. 2026-10-29, #131.
- **The income and the debts each read one snapshot** (S2). *Why:* the month must equal its bar, and a page's rows add up to its totals across pages ([finding 124](../architecture/findings/124-a-statements-sums-and-its-payments-come-from-different-snapshots.md)); the debts' names ride in it, as `deskVisitsOf` takes its transaction. 2026-10-29, #131.
- **An archived customer's debt is kept and marked** (Q2). *Why:* it is still owed, and the desk collects it. The customers list's `payment=OWES` leaves archived customers out, so its total may be below `totals.owed.customers`. 2026-10-29, #131.
- **The aggregates are `payments`', not `finance`'s** (S3). *Why:* the voided and balance rules keep one home, and the owner's overview, which may not import `finance`, reads them too (A2 was the alternative). Who paid is the one exception, `finance`'s own query with its own "not voided" `WHERE`: it groups payments by their items' customers, which no ledger function answers, and sums no balance (D12). 2026-10-29, #131.
- **Occupancy from closed stays; the 28 days leave today out and divide by 4** (the owner's decision 7, Q3). *Why:* an open stay has no length yet; without today each weekday counts exactly four times. No snapshot: no figure must equal another. 2026-10-29, #131.

## Code map

- `apps/api/src/modules/finance/` — the module: its service, its repository (who paid, the stays), its mapper, its windows (`windows.ts`), the occupancy grid (`occupancyGrid.ts`), its controller and its manage router.
- `packages/shared/src/finance/` — the queries (the month and its bound, the debts', the payers') and the answers.

## History

### API history

- #131 — a month's income and the staff's collections; who owes and who is in credit, with the totals and the reminder template; who paid in a month; the occupancy statistics.
