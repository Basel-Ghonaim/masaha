# Subscriptions

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-21 · **Owner:** Basel Ghoneim
> **Authority:** The `subscriptions` capability: a customer's subscriptions and their check-ins. Its entity and its derived values by the [data model](../architecture/data-model.md#derived-values-computed-not-stored); its endpoints, once it has its own, by the API contract. The API's reads are built; no route of its own and no web screen yet.
> **Scope:** the API module `subscriptions` (L3); `@masaha/shared/subscriptions`. No web feature yet.

## What it does

- Answers a space's subscriptions — of one customer, or by id — each with its status, its progress and its amount due, as of a time.
- Answers the space's open check-ins and their counts, for *present* ([occupancy](occupancy.md)).
- Closes the check-ins due by the auto check-out, as a timed job.

## Who uses it

- **The front desk** ([desk](desk.md)), which reads who is present before it archives a customer.
- **[`occupancy`](occupancy.md),** which counts the check-ins present.
- **The timed jobs** (`shared/jobs`), which run its auto check-out.

## Responsibility boundary

- **Owns** the `subscriptions` and `check_ins` tables, the database function `subscription_usage`, and the pure status and current-subscription rules.
- **Reads** a stay's auto check-out time and the space's week from [`spaces`](spaces.md), and the settings from [`space-settings`](space-settings.md).
- **Leaves** the money paid on a subscription to [`payments`](payments.md), which reads a subscription's due through this module's function.

## How it composes the platform

- It has no route of its own yet: its reads are composed by the desk ([conventions §9](../backend/conventions.md#9-placements)).
- Its attendance is counted in the database, by `subscription_usage`; the status is a pure rule on those counts ([conventions §8](../backend/conventions.md#pure-rules)).

## Behaviour and flows

**`subscription_usage(space, customer, today, weekStart)`.** One row per subscription of the space (of one customer, when given): the days used (any check-in on a Gaza date, open or closed, once each), the days this week (from the Saturday given to today), the minutes used and today's (closed stays only, whole minutes each), and the amount due — the fixed price; days × the day rate; minutes × the hour rate ÷ 60, rounded half up. Today and the Saturday are the caller's, from the shared calendar (`gazaClockOf`, `weekStartOf`); the function never reads the clock.

**The states.** `statesOf` reads the space's subscriptions joined to the function in one query, the ids one array parameter, the latest started first, then by id; each is answered with its terms, its progress, its due and its status.

**The status** (`subscriptionStatus.ts`, pure), in this order: ended early → `EXPIRED`; a start after today → `UPCOMING`; its end passed, or a total used up → `EXPIRED`; at most seven days to its end — a subscription of at most seven days by its dates on its last day only — or at most 20 % of a total left → `ENDING_SOON`; else `ACTIVE`.

**The current subscription** (`currentSubscription.ts`, pure): of a customer's subscriptions, the first by status (running, then upcoming, then expired), then the latest start (none last), then the highest id.

## Decisions

### API decisions

- **A subscription's attendance and amount due are counted by one database function, `subscription_usage`; the status stays pure TypeScript on its counts.** *Why:* a usage-based debt is attendance × rate, and the owner's decision 6 puts debts in the database, so the attendance must be countable there; one function serves every read, so no second copy of the due exists (step 8's plan, S1). Its branches are proven in the API lane. 2026-10-21, #102.
- **A day is used by any check-in on its Gaza date; minutes count closed stays only, whole minutes each; a per-hour due is minutes × rate ÷ 60, half up.** *Why:* an open stay has no length yet; the owner's attendance rules (Q4). 2026-10-21, #102.
- **An `UPCOMING` status; an ended subscription is `EXPIRED` at once.** *Why:* a renewal starting later is not running yet, and the desk preselects the one running; ending a subscription changes its status the day it is ended (S4, S5). 2026-10-21, #102.
- **A subscription of at most seven days by its dates is ending soon on its last day only.** *Why:* "shorter than a week" made exact (Q5). 2026-10-21, #102.
- **The calendar's days are passed in, never computed in SQL; dates are read from `@db.Date` at UTC.** *Why:* one clock and one calendar ([conventions §11](../backend/conventions.md#11-time)); PostgreSQL's zone data still dates the check-ins ([finding 120](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)). 2026-10-21, #102.

## Code map

- **API:** `apps/api/src/modules/subscriptions/`, entry `index.ts`: the service (the auto check-out included), the repository, the mapper, and the pure rules (`subscriptionStatus.ts`, `currentSubscription.ts`). The function is the migration `subscription_usage`'s.
- **Shared:** `packages/shared/src/subscriptions/`: `SUBSCRIPTION_STATUSES` and the responses (`DeskSubscription`, `SubscriptionProgress`, `SubscriptionState`).

## Open findings

- [120. Gaza dates are read by two zone databases](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)

## History

### API history

- #94 — the open check-ins and their counts, which `occupancy` reads for *present*.
- #97 — the auto check-out of check-ins.
- #102 — the attendance and amount due in the database (`subscription_usage`), the status, progress and current-subscription rules, and the states read.
