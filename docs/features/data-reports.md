# Data reports

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-25 · **Owner:** Basel Ghoneim
> **Authority:** The `data-reports` capability: a signed-in user tells Masaha that one field group of a listed space's page is wrong. Its endpoints are owned by the [API contract](../api/api-contract.md#data-reports); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `data-reports` (L3); `@masaha/shared/data-reports`.

## What it does

- Lets a signed-in user report a listed space's field group — prices, hours, contact, location, amenities, or «أخرى» with a message — at most 10 reports an hour.
- Answers a repeat while the user's report of that space and field is open with that report, writing nothing.

## Who uses it

- **A signed-in user,** through the API, `POST /spaces/:slug/reports`. The space page's report button is not built.

## Responsibility boundary

- **Owns** the `data_reports` table, a report's rules (one open per user, space and field; a decision's fields together) and the report limit.
- **Leaves** whether a space is publicly listed to [`spaces`](spaces.md) (`publicSpace.findShown`) and [`lookups`](lookups.md) (`isActiveArea`), as the space's page asks them; a space's names to `spaces` (`namesWithDeleted`); the user's lock to [`users`](users.md) (`lockAccount`).

## How it composes the platform

- Its site router sits at the API's root (`/spaces/:slug/reports`), beside the directory's public routes; the route asks `requireAuth`, then counts the request by the user (`DATA_REPORT`, [security › Rate limits](../backend/security.md#rate-limits-fixed-window)), then checks the body by the shared schema ([shared-package.md](../architecture/shared-package.md)).
- A report is dated by the one clock ([conventions §11](../backend/conventions.md#11-time)).

## Behaviour and flows

**Report.** The space as its page finds it — shown (not hidden, not deleted) and in an active area — else `not_found`; its names. Then, in one transaction: the user's row locked (`users.lockAccount`, the session lock), so one user's reports are serialised; the user's open report of that space and field, answered as it is, 200, writing nothing; else the new report, open, 201. Two identical reports at once: the second waits on the lock and finds the first; the partial unique index is the backstop. A report is not audited (the audit lists decisions, [conventions §6](../backend/conventions.md#6-audit)).

## Decisions

### API decisions

- **A repeated report answers the open one, 200, and counts toward the hourly limit** (decision 9). *Why:* a user who taps twice, or retries, must not file two reports the owner reads twice; the limit is counted at the route before the body is read, as every limit of its kind ([conventions §2](../backend/conventions.md#2-layers)). 2026-10-25, #120.
- **The database holds one open report per user, space and field, and a decision's fields together** (S6): a partial unique index and `CHECK`s on the decision's time, decider and side, a dismissal's reply and «أخرى»'s message. *Why:* the race's backstop, and rules that hold for any writer, not only the input schema. 2026-10-25, #120.
- **"Publicly listed" is asked of `spaces` and `lookups` as the space's page asks it** (S12). *Why:* the rule already lives in two queries; a third copy would drift. 2026-10-25, #120.

## Code map

- `apps/api/src/modules/data-reports/` — the module: its service, its repository, its site router and its limit.
- `packages/shared/src/data-reports/` — the requests and answers.

## Open findings

None.

## History

### API history

- 2026-10-25, #120 — a signed-in user's report of a listed space, 10 an hour, a repeat answering the open one.
