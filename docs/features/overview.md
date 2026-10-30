# Overview

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `overview` capability: the overview screens' reads, each composed from the modules that own its figures ([conventions › `overview`](../backend/conventions.md#overview)). Its endpoints are owned by the [API contract](../api/api-contract.md#overview); it owns no entity. The API is built; on the web, the owner's overview (screen 12).
> **Scope:** the API module `overview` (L5); `@masaha/shared/overview`; the web feature `features/overview`, dashboard-only.

## What it does

- Answers the owner's overview of their space in one read (screen 12): a work queue — the space's fact groups missing or stale, with their days; the open data reports, the uncollected and the unpriced visits, the closures awaiting their extension, whether the capacity is set, and how many customers owe, each a count —; who is present now, the capacity and the live status; the customers whose subscription is ending soon, and the first five; and the announcements running, with their types.
- Answers the admin's overview of the platform in one read (screen 25): the spaces verified, unverified, hidden, unverified with no owner, and stale or missing; the open data reports, by who handles them; the accounts created in the last 30 Gaza days; and «اكتمال البيانات», the first five spaces whose facts the admin keeps with a group stale or missing, and their total.
- Holds no amount anywhere: the debts and the uncollected visits are counts (the owner's O3); the admin's holds nothing of a space's operations.

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/overview`. Reception has none and is refused (the owner's OV3). On the web, «نظرة عامة» at `/dashboard/spaces/:spaceId`, the owner's landing; reception gets the 403 there (2026-10-29, #132).
- **The admin,** under `/admin/overview`. The admin's screen (25) is to come, worker A's.

## Responsibility boundary

- **Owns** no table, no rule and no repository: it writes nothing and computes nothing.
- **Reads** each figure from its owner, through its service: the groups' freshness from [`spaces`](spaces.md), the open reports from [`data-reports`](data-reports.md), the unpriced visits from [`visits`](visits.md), the subscriptions ending soon and the announcements' summary from [`subscriptions`](subscriptions.md), the running types from [`announcements`](announcements.md), the uncollected visits and the debtors from [`payments`](payments.md), the state at a glance from [`occupancy`](occupancy.md); for the admin, the spaces' counts and the spaces to complete from [`space-links`](space-links.md), the open reports by who handles them from [`data-reports`](data-reports.md), the new accounts from [`users`](users.md).
- **Leaves** who may read to `can()` (`space.overview.read`, [security › Authorization](../backend/security.md#authorization)) and the boundary of `/manage/spaces/:spaceId`; each rule to its module, so a count never drifts from its list.

## How it composes the platform

- Its manage router sits at `/overview` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; its route asks `requireCan('space.overview.read')`. Its admin router sits at `/overview` inside `/admin`, behind its one guard.
- It never imports `finance`: the figures both show come from `payments` ([conventions › Composed reads](../backend/conventions.md#composed-reads)).

## Behaviour and flows

**The owner's overview** (`ownerOverview.ts`). One instant (`at`, the one clock's) for every figure; one `Promise.all` of nine reads, each its owner's: `listing.freshnessOf`, `dataReports.openCountOf`, `payments.uncollectedTotals`, `visits.unpricedCount`, `closures.summary`, `payments.balanceTotals`, `occupancy.glance`, `subscriptions.endingSoon` (five named) and `announcements.runningTypes`. The answer is assembled field by field: of the balances only how many customers owe, an archived one kept; of the uncollected visits only how many; the capacity is set when it is not `null`. An auto-closed visit left to a customer is counted in both: an uncollected visit, and its customer among those who owe, as the desk's list and the debts keep it ([finding 193](../architecture/findings/193-a-visit-left-to-a-customer-is-both-a-debt-and-uncollected.md)). Read with no lock and no snapshot: each count equals its list read alone, to within a write between two of the reads.

**The admin's overview** (`adminOverview.ts`). One instant; one `Promise.all` of four reads: `adminSpaces.counts` (verified, unverified, hidden, stale or missing, each its list's total), `adminSpaces.staleEditable` (five named), `dataReports.openCounts` and `users.countCreatedSince` from `lastDaysSince(at, 30)` — the Gaza midnight 29 days before today, the audit's own rule. «بلا مالك» is the unverified count: a space is verified exactly when it has an active owner (OD2).

**The owner's screen** (`OwnerOverview`, screen 12). One read, never polled: read again each time the page opens, and on returning to the window once stale (OV7). In the top bar, the live status visitors see and its control, `occupancy`'s, as the desk's (P2). «يحتاج انتباهك» lists, in order, each fact group never saved («لم تُضف بعد»), each stale one with its days counted («قديمة»), the open reports, the uncollected visits, the unpriced ones, the customers who owe, the closures awaiting their extension — each a count above zero — and the capacity when it is not set; each row leads where it is acted on (the profile's section or Packages & prices' `#prices`, the reports `?status=open`, the desk `#uncollected` or `#unpriced`, Finance `?tab=debts`, the announcements, the settings `#attendance`), and nothing waiting reads «كل شيء على ما يرام». «الحاضرون الآن» shows the count over the capacity, with the meter only once a capacity is set, the subscribers and the visits counted, and what visitors see with its line. The announcements' tile counts the running ones and names their types. «اشتراكات تنتهي هذا الأسبوع» counts them, lists five — the name a link to the file, the subscription and when it ends («ينتهي اليوم», «ينتهي غدًا», «ينتهي بعد {n} يوم»), «تجديد» to the file — and «عرض الكل» leads to the customers `?status=ENDING_SOON`. Its states: three blocks while it loads; a failure, «تعذّر تحميل النظرة العامة» with «إعادة المحاولة»; offline, its own state.

## Decisions

### API decisions

- **One aggregate read per screen, every figure from its owner, none computed here** (the owner's OV7). *Why:* the users' connection is weak, and a second count of a rule (ending soon, uncollected) would drift from the list it links to; each owner gained a set-based count where it had none. 2026-10-29, #131.
- **No repository** (S20). *Why:* R7 would allow aggregate reads, but they would write the rules a second time. 2026-10-29, #131.
- **No snapshot** (S21). *Why:* a read-only transaction runs its statements one after another on one connection, so the server's time would be the sum of the reads instead of the slowest; each figure is a count standing alone. 2026-10-29, #131.
- **No amount, a count of who owes** (the owner's O3, amended 2026-10-12; OV1, OV2). *Why:* the overview is often open at the desk, in view of customers and staff; income and the debts' total live in Finance only. A test searches the answer for any amount. 2026-10-29, #131.
- **A new action, `space.overview.read`, the owner's** (S26), not `finance.read`. *Why:* the overview is not finance; a later change of who reads it touches one line. 2026-10-29, #131.
- **Stale by the thresholds the admin saves** (OV6), read at each request: a threshold saved applies at once. 2026-10-29, #131.
- **The ending-soon names kept** (the owner's OD1 (a)): the first five, soonest first, as the screen's design lists them. 2026-10-29, #131.
- **`GET /admin/overview` replaces the planned `/admin/stats`, and `can()`'s unused `platform.stats.read` is removed** (the owner's OD4). *Why:* the admin's routes are guarded once by `/admin`'s role guard, so the action guarded nothing. 2026-10-29, #131.
- **«بلا مالك» equals the unverified tile** (the owner's OD2 (a)): unverified and not hidden. *Why:* "verified" is an active owner link, so the two are one set. 2026-10-29, #131.
- **«اكتمال البيانات»'s full list is `GET /admin/spaces?status=editable&stale=true`** (the owner's OD3 (a)): the unverified spaces, hidden ones included — those the admin can act on. *Why:* the card's total must equal the list it opens. 2026-10-29, #131.
- **No «بدون صور» in «اكتمال البيانات»** (EC9): the listing's row carries no photo count, and the owner's OV4 does not ask for it. 2026-10-29, #131.
- **New users: the last 30 Gaza days, every role** (OV5), by the audit log's own rule, moved to `@masaha/shared/core` (`lastDaysSince`) since `overview` cannot import `audit`. 2026-10-29, #131.
- **Not polled** (OV7): the web reads it again on returning to the page; the route is not passive. 2026-10-29, #131.

### Web decisions

- **No amount anywhere** (O3): the answer holds none, and a component test reads the whole screen for one. 2026-10-29, #132.
- **The unpriced visits have a row** (DI2), after the uncollected, to the desk's card of them; **«لم تُحصَّل» has no «اليوم»** (DI3): the count has no day. 2026-10-29, #132.
- **«الآن: {المشتركين} و{الزيارات}» only** (DI5): no field says who left today. 2026-10-29, #132.
- **The closures awaiting their extension are one counted row** (DI6) to the announcements page. 2026-10-29, #132.
- **«تجديد» opens the customer's file** (DI26), where the renewal is; no address opens the sheet. 2026-10-29, #132.
- **Every link is the page's** (architecture §3): `OwnerOverviewLinks`. 2026-10-29, #132.

## Code map

- `apps/api/src/modules/overview/` — the module: one file per screen (`ownerOverview.ts`, `adminOverview.ts`), the service joining them, its controller and its manage and admin routers.
- `packages/shared/src/overview/` — the answers.
- `apps/web/src/features/overview/`, entry `index.ts` (`OwnerOverview`, `OwnerOverviewLinks`), read by `pages/dashboard/space/overview/OverviewPage.tsx`, which passes the links and sets `occupancy`'s `LiveStatusControl` in the top bar: the repository in `repository/`; the keys, the query and the view (`owner/`) and the failure's view (`useLoadFailure`) in `hooks/`; the work queue's rows (`attentionRows`) and an end's words (`endsText`) in `services/`; the screen and its cards (`owner/`) and the failure in `components/`. Words: the catalogue's `overview` section.

## History

### API history

- 2026-10-29, #131 — the owner's overview (`GET /manage/spaces/:spaceId/overview`) and the admin's (`GET /admin/overview`), with a set-based count added in each owning module.

### Web history

- 2026-10-29, #132 — the owner's overview (screen 12).
