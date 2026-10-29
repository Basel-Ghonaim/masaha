# Overview

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `overview` capability: the overview screens' reads, each composed from the modules that own its figures ([conventions › `overview`](../backend/conventions.md#overview)). Its endpoints are owned by the [API contract](../api/api-contract.md#overview); it owns no entity. The API is built; no screen yet.
> **Scope:** the API module `overview` (L5); `@masaha/shared/overview`.

## What it does

- Answers the owner's overview of their space in one read (screen 12): a work queue — the space's fact groups missing or stale, with their days; the open data reports, the uncollected and the unpriced visits, the closures awaiting their extension, whether the capacity is set, and how many customers owe, each a count —; who is present now, the capacity and the live status; the customers whose subscription is ending soon, and the first five; and the announcements running, with their types.
- Holds no amount anywhere: the debts and the uncollected visits are counts (the owner's O3).

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/overview`. Reception has none and is refused (the owner's OV3). The owner's screen (12) is to come, worker A's.

## Responsibility boundary

- **Owns** no table, no rule and no repository: it writes nothing and computes nothing.
- **Reads** each figure from its owner, through its service: the groups' freshness from [`spaces`](spaces.md), the open reports from [`data-reports`](data-reports.md), the unpriced visits from [`visits`](visits.md), the subscriptions ending soon and the announcements' summary from [`subscriptions`](subscriptions.md), the running types from [`announcements`](announcements.md), the uncollected visits and the debtors from [`payments`](payments.md), the state at a glance from [`occupancy`](occupancy.md).
- **Leaves** who may read to `can()` (`space.overview.read`, [security › Authorization](../backend/security.md#authorization)) and the boundary of `/manage/spaces/:spaceId`; each rule to its module, so a count never drifts from its list.

## How it composes the platform

- Its manage router sits at `/overview` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; its route asks `requireCan('space.overview.read')`.
- It never imports `finance`: the figures both show come from `payments` ([conventions › Composed reads](../backend/conventions.md#composed-reads)).

## Behaviour and flows

**The owner's overview** (`ownerOverview.ts`). One instant (`at`, the one clock's) for every figure; one `Promise.all` of nine reads, each its owner's: `listing.freshnessOf`, `dataReports.openCountOf`, `payments.uncollectedTotals`, `visits.unpricedCount`, `closures.summary`, `payments.balanceTotals`, `occupancy.glance`, `subscriptions.endingSoon` (five named) and `announcements.runningTypes`. The answer is assembled field by field: of the balances only how many customers owe, an archived one kept; of the uncollected visits only how many; the capacity is set when it is not `null`. An auto-closed visit left to a customer is counted in both: an uncollected visit, and its customer among those who owe, as the desk's list and the debts keep it ([finding 193](../architecture/findings/193-a-visit-left-to-a-customer-is-both-a-debt-and-uncollected.md)). Read with no lock and no snapshot: each count equals its list read alone, to within a write between two of the reads.

## Decisions

### API decisions

- **One aggregate read per screen, every figure from its owner, none computed here** (the owner's OV7). *Why:* the users' connection is weak, and a second count of a rule (ending soon, uncollected) would drift from the list it links to; each owner gained a set-based count where it had none. 2026-10-29, #131.
- **No repository** (S20). *Why:* R7 would allow aggregate reads, but they would write the rules a second time. 2026-10-29, #131.
- **No snapshot** (S21). *Why:* a read-only transaction runs its statements one after another on one connection, so the server's time would be the sum of the reads instead of the slowest; each figure is a count standing alone. 2026-10-29, #131.
- **No amount, a count of who owes** (the owner's O3, amended 2026-10-12; OV1, OV2). *Why:* the overview is often open at the desk, in view of customers and staff; income and the debts' total live in Finance only. A test searches the answer for any amount. 2026-10-29, #131.
- **A new action, `space.overview.read`, the owner's** (S26), not `finance.read`. *Why:* the overview is not finance; a later change of who reads it touches one line. 2026-10-29, #131.
- **Stale by the thresholds the admin saves** (OV6), read at each request: a threshold saved applies at once. 2026-10-29, #131.
- **The ending-soon names kept** (the owner's OD1 (a)): the first five, soonest first, as the screen's design lists them. 2026-10-29, #131.
- **Not polled** (OV7): the web reads it again on returning to the page; the route is not passive. 2026-10-29, #131.

## Code map

- `apps/api/src/modules/overview/` — the module: one file per screen (`ownerOverview.ts`), the service joining them, its controller and its manage router.
- `packages/shared/src/overview/` — the answers.

## History

### API history

- 2026-10-29, #131 — the owner's overview (`GET /manage/spaces/:spaceId/overview`), with a set-based count added in each owning module.
