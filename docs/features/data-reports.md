# Data reports

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-25 · **Owner:** Basel Ghoneim
> **Authority:** The `data-reports` capability: a signed-in user tells Masaha that one field group of a listed space's page is wrong. Its endpoints are owned by the [API contract](../api/api-contract.md#data-reports); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `data-reports` (L3); `@masaha/shared/data-reports`.

## What it does

- Lets a signed-in user report a listed space's field group — prices, hours, contact, location, amenities, or «أخرى» with a message — at most 10 reports an hour.
- Answers a repeat while the user's report of that space and field is open with that report, writing nothing.
- Pages the user's own reports, newest first, open or decided, each with its decision and who replied, and whether its space is still listed.
- Pages a space's reports for its owner, by status and field, never showing who reported; lets the owner resolve one, with a reply or none, or dismiss it with a reply. A decided report is final; the same decision again answers it as it is.
- Pages every report for the admin, by status, field and space, with who reported and who decided and whether the space is verified; lets the admin decide an unverified space's.

## Who uses it

- **A signed-in user,** through the API: `POST /spaces/:slug/reports`, and their own, `GET /me/reports`. The space page's report button and the account's reports are not built.
- **The space's owner,** under `/manage/spaces/:spaceId/data-reports`: the list and the decision. Reception is refused. The owner's screen is not built.
- **The admin,** under `/admin/data-reports`: every report, and the decision of an unverified space's. The admin's screen is not built.

## Responsibility boundary

- **Owns** the `data_reports` table, a report's rules (one open per user, space and field; a decision's fields together; a decided report final) and the report limit.
- **Leaves** who may read and decide to `can()` (`space.dataReports.read`, `dataReports.resolve`, [security › Authorization](../backend/security.md#authorization)), on the links [`space-links`](space-links.md) loads; the space's lock to `spaces`.
- **Leaves** whether a space is publicly listed to [`spaces`](spaces.md) (`publicSpace.findShown`) and [`lookups`](lookups.md) (`isActiveArea`), as the space's page asks them; a space's names to `spaces` (`namesWithDeleted`), whether a space is verified to `space-links` (`verifiedSpaceIds`, `linksAt` under the lock), the people's names to `users` (`namesFor`), and which spaces are listed to its public listing (`publicListing.upTo`, with the areas [`lookups`](lookups.md) lists); the user's lock to [`users`](users.md) (`lockAccount`).

## How it composes the platform

- Its me router sits at the API's root (`/spaces/:slug/reports`, `/me/reports`), beside the directory's public routes; the route asks `requireAuth`, then counts the request by the user (`DATA_REPORT`, [security › Rate limits](../backend/security.md#rate-limits-fixed-window)), then checks the body by the shared schema ([shared-package.md](../architecture/shared-package.md)).
- Its manage router sits at `/data-reports` below `/manage/spaces/:spaceId`, behind the one boundary ([conventions › Routers](../backend/conventions.md#routers)); each route asks `can()` first through `requireCan`, and the decision again under the space's lock ([conventions › Space access](../backend/conventions.md#space-access)).
- Its admin router sits at `/data-reports` inside `/admin`, behind `requireRole('ADMIN')`; its decision asks `can()` on the links `space-links` reads under the space's lock.
- A decision is audited in its own transaction ([conventions §6](../backend/conventions.md#6-audit)).
- A report and a decision are dated by the one clock ([conventions §11](../backend/conventions.md#11-time)).

## Behaviour and flows

**Report.** The space as its page finds it — shown (not hidden, not deleted) and in an active area — else `not_found`; its names. Then, in one transaction: the user's row locked (`users.lockAccount`, the session lock), so one user's reports are serialised; the user's open report of that space and field, answered as it is, 200, writing nothing; else the new report, open, 201. Two identical reports at once: the second waits on the lock and finds the first; the partial unique index is the backstop. A report is not audited (the audit lists decisions, [conventions §6](../backend/conventions.md#6-audit)).

**The user's reports.** A page of the user's rows, newest first, then id, filtered open or decided, and its count; then, for the page's spaces, their names, soft-deleted ones included, and which of them the public listing lists now — one query each. `repliedBy` is read from who decided, as stored with the decision (`OWNER` → `SPACE`, `ADMIN` → `MASAHA`).

**The owner's list.** A page of the space's rows, newest first, by status and field, and its count. The repository's select names no reporter column, so no mapper can show one.

**The admin's list.** A page of every report whose space is not deleted, newest first, by status, field and space, with who reported and who decided; then the spaces' names, the verified spaces' ids and the people's names, one query each.

**Decide.** The report's space, read without a lock, must be the path's (else `not_found`). Then, in one transaction: the space's lock; `can('dataReports.resolve')` on the links read under it, so a link ended meanwhile decides; the report's row, locked (`FOR UPDATE`); `decisionOf` (pure): an open report is decided; one decided with the same status, reply and decider is answered as it is, writing nothing; any other decision is `REPORT_ALREADY_DECIDED`. The decision writes its status, who, when, the reply and the side (`OWNER`) together, audited. The admin's decision is the same, with any space's report, the links read through `space-links` under the lock (so the admin decides an unverified space's only, and an owner linked meanwhile makes it `forbidden`), and the side `ADMIN`. The owner and the admin at once: the second waits on the space's lock and finds the report decided. Lock order: the space's row, then the report's; a report's create takes the user's row only, so no two orders cross.

## Decisions

### API decisions

- **A repeated report answers the open one, 200, and counts toward the hourly limit** (decision 9). *Why:* a user who taps twice, or retries, must not file two reports the owner reads twice; the limit is counted at the route before the body is read, as every limit of its kind ([conventions §2](../backend/conventions.md#2-layers)). 2026-10-25, #120.
- **The database holds one open report per user, space and field, and a decision's fields together** (S6): a partial unique index and `CHECK`s on the decision's time, decider and side, a dismissal's reply and «أخرى»'s message. *Why:* the race's backstop, and rules that hold for any writer, not only the input schema. 2026-10-25, #120.
- **`repliedBy` is stored with the decision** (`resolved_as`, S7). *Why:* the label follows who answered; derived from the space's verification or the decider's role now, it would change after the fact. 2026-10-25, #120.
- **A space that left the directory stays in the user's list, `listed: false`, with its name** (C7). *Why:* the reply is still the user's to read; the screen shows the name as text, with no link. 2026-10-25, #120.
- **Dismissing needs a reply; resolving takes one or none** (decision 10). *Why:* a reporter told "not changed" deserves the reason; a fixed field speaks for itself. The schema's refinement and a `CHECK` hold it. 2026-10-25, #120.
- **A decided report is final: `REPORT_ALREADY_DECIDED`** (decision 11); **the same decision again answers it as it is** (S8). *Why:* a reporter must not see the reply change; updates are idempotent by design, so a retry after a lost answer is no refusal ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). 2026-10-25, #120.
- **The owner never sees who reported; the admin does** (O12). *Why:* a reporter must not fear the space; the admin, who answers for the platform, sees them.
- **The admin decides an unverified space's reports only, read under the space's lock** (`can()` with "verified", [conventions § `data-reports`](../backend/conventions.md#data-reports)). *Why:* once an owner joins, the space answers for itself; an owner linked while the admin's decision waits must win. 2026-10-25, #120. The repository's select leaves the reporter out, so no mapper can leak them. 2026-10-25, #120.
- **"Publicly listed" is asked of `spaces` and `lookups` as the space's page asks it** (S12). *Why:* the rule already lives in two queries; a third copy would drift. 2026-10-25, #120.

## Code map

- `apps/api/src/modules/data-reports/` — the module: its service, its repository, its me, manage and admin routers, its limit and the decision's rule (`decision.ts`).
- `packages/shared/src/data-reports/` — the requests and answers.

## Open findings

None.

## History

### API history

- 2026-10-25, #120 — a signed-in user's report of a listed space, 10 an hour, a repeat answering the open one; the user's own reports with the replies; the owner's and the admin's lists and decisions.
