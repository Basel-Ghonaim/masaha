# Subscriptions

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-22 · **Owner:** Basel Ghoneim
> **Authority:** The `subscriptions` capability: a customer's subscriptions and their check-ins. Its entity and its derived values by the [data model](../architecture/data-model.md#derived-values-computed-not-stored); its endpoints by the API contract ([Subscriptions (managed)](../api/api-contract.md#subscriptions-managed)). The API is built (the corrections and the end its own routes; the subscribe and the statement the desk's); no web screen yet.
> **Scope:** the API module `subscriptions` (L3); `@masaha/shared/subscriptions`. No web feature yet.

## What it does

- Answers a space's subscriptions — of one customer, or by id — each with its status, its progress and its amount due, as of a time.
- Writes a subscription the desk makes, from a package's terms or typed ones, with its idempotency key, audited ([desk](desk.md)).
- Corrects a subscription: its limits, dates and name, by the staff; its price and billing, by the owner, with a reason; each audited.
- Writes a subscriber's check-in the desk makes, audited, and answers what a check-in on a subscription warns of: not started, expired, this week's days or today's hours used up ([desk](desk.md)).
- Ends a subscription early, by the staff: its end today (its start if it has not started), audited; no money changes.
- Answers each customer's current subscription, and the customers list's status, kind and package filters as ids ([desk](desk.md)).
- Answers the space's open check-ins and their counts, for *present* ([occupancy](occupancy.md)).
- Lists the space's check-ins for the staff: the open ones, whole, or a range of Gaza dates, paged, each with its customer and its subscription's state.
- Closes the check-ins due by the auto check-out, as a timed job.

## Who uses it

- **The front desk** ([desk](desk.md)), which subscribes a customer and checks a subscriber in through it.
- **[`occupancy`](occupancy.md),** which counts the check-ins present.
- **The timed jobs** (`shared/jobs`), which run its auto check-out.

## Responsibility boundary

- **Owns** the `subscriptions` and `check_ins` tables, the database function `subscription_usage`, and the pure status and current-subscription rules.
- **Reads** a stay's auto check-out time and the space's week from [`spaces`](spaces.md), the settings from [`space-settings`](space-settings.md), and the customers' names and phones for the check-ins' lists from [`customers`](customers.md).
- **Leaves** the money paid on a subscription to [`payments`](payments.md), which reads a subscription's due through this module's function.

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff: the check-ins' lists (the boundary its check, #86); the corrections and the end (`requireCan('subscriptions.manage')`; the price `requireCan('subscriptions.correctPrice')`, the owner's). Its reads and the subscribe are composed by the desk ([conventions §9](../backend/conventions.md#9-placements)).
- Its attendance is counted in the database, by `subscription_usage`; the status is a pure rule on those counts ([conventions §8](../backend/conventions.md#pure-rules)).

## Behaviour and flows

**`subscription_usage(space, customer, today, weekStart)`.** One row per subscription of the space (of one customer, when given): the days used (any check-in on a Gaza date, open or closed, once each), the days this week (from the Saturday given to today), the minutes used and today's (closed stays only, whole minutes each), and the amount due — the fixed price; days × the day rate; minutes × the hour rate ÷ 60, rounded half up. Today and the Saturday are the caller's, from the shared calendar (`gazaClockOf`, `weekStartOf`); the function never reads the clock.

**A check-in's minutes.** `checkInsOf` answers each closed check-in's whole minutes in SQL, by the same expression as the function's, so a statement's check-ins add up to its progress; nothing counts minutes in TypeScript (#109).

**The create.** `create` writes the subscription the desk composed, in the desk's transaction: its terms and dates, its key, the package it copies or who typed its price and why; a shift that is not the space's is refused by its foreign key, which it answers as `refused`. Audited `subscription.created` with its terms, `packageId`, `renewalOfId` and the reason. `findByKey` answers a retry's subscription.

**The corrections.** Each in its transaction: the space's lock, `can()` on the links read under it, the subscription's row (`FOR UPDATE`, 404 when not the space's), ended → `SUBSCRIPTION_ENDED`. The staff's: only the fields set to a new value (`subscriptionChange.ts`, pure), `null` clearing a limit or the end, an end before the start → `out_of_range`, audited `subscription.corrected`. The owner's: billing and price together, recorded as the owner's typed price with the reason, audited `subscription.priceCorrected`; a fixed price below what was paid is refused by the trigger `subscriptions_guard_price` (`PRICE_BELOW_PAID`). A correction that changes nothing writes nothing.

**The end.** In its transaction, the same opening as a correction; one already ended is answered as it is; else its end becomes today — its start if it has not started, never later than it was — with who and when, audited `subscription.ended`. The status rule then answers `EXPIRED`.

**A check-in's limits** (`limits.ts`, pure). `subscriptionWarnings(state, { checkedInToday })`, in this order: `UPCOMING` → `SUBSCRIPTION_NOT_STARTED`; `EXPIRED` → `SUBSCRIPTION_EXPIRED`; days per week and the days this week at it, with today not counted yet → `DAYS_PER_WEEK_USED`; hours per day and today's minutes at it → `HOURS_PER_DAY_USED`. `limitWarnings` reads the state through the function and, in one query, whether another check-in is on today (dated in SQL, as the function dates them); for a retry it leaves the check-in itself out (`progressWithout`). `checkIn` writes the check-in, audited `checkIn.checkedIn`; `findCheckInByKey` answers a retry's. `lockCheckInIn` locks a check-in's row (the space's only) and `checkOut` closes it, `MANUAL`, audited `checkIn.checkedOut`.

**The check-ins' lists.** `open=true`: the open rows, the earliest first, whole. A range: one raw query pages the check-ins whose Gaza date (dated in SQL, as the function dates them) is in it, the latest first, then by id, with a count. `deskCheckIns` answers each with its customer (`customers.contactsOf`) and its subscription's state, two queries for the lot; the desk's check-in and check-out answer through it too.

**The renewal's start** (`renewal.ts`, pure): `proposedStart(renewed, today)` — the day after the renewed one's end while it is not expired and its end is not before today, else today. `lockIn` locks a subscription's row and answers the one that renewed it, if any.

**The states.** `statesOf` reads the space's subscriptions joined to the function in one query, the ids one array parameter, the latest started first, then by id; each is answered with its terms, its progress, its due and its status.

**The status** (`subscriptionStatus.ts`, pure), in this order: ended early → `EXPIRED`; a start after today → `UPCOMING`; its end passed, or a total used up → `EXPIRED`; at most seven days to its end — a subscription of at most seven days by its dates on its last day only — or at most 20 % of a total left → `ENDING_SOON`; else `ACTIVE`.

**The current subscription** (`currentSubscription.ts`, pure): of a customer's subscriptions, the first by status (running, then upcoming, then expired), then the latest start (none last), then the highest id. `currentOf` answers it for a page's customers in one query; `customerIdsBy` reads the space's subscriptions once (a compact row each: the status is a pure rule) and answers the customers whose current one has the status, kind and package asked, or, for `NONE`, those with any subscription, to leave out.

## Decisions

### API decisions

- **A subscription's attendance and amount due are counted by one database function, `subscription_usage`; the status stays pure TypeScript on its counts.** *Why:* a usage-based debt is attendance × rate, and the owner's decision 6 puts debts in the database, so the attendance must be countable there; one function serves every read, so no second copy of the due exists (step 8's plan, S1). Its branches are proven in the API lane. 2026-10-21, #102.
- **A day is used by any check-in on its Gaza date; minutes count closed stays only, whole minutes each; a per-hour due is minutes × rate ÷ 60, half up.** *Why:* an open stay has no length yet; the owner's attendance rules (Q4). 2026-10-21, #102.
- **An `UPCOMING` status; an ended subscription is `EXPIRED` at once.** *Why:* a renewal starting later is not running yet, and the desk preselects the one running; ending a subscription changes its status the day it is ended (S4, S5). 2026-10-21, #102.
- **A subscription carries the client's idempotency key, required, unique within the space.** *Why:* every subscription is a desk create, and a retried one must not make two ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), rule 4); the seed's rows were given keys of their own. 2026-10-22, #106.
- **A typed price's reason is stored beside who typed it, and the database keeps them together, never blank.** *Why:* every hand-typed price carries a reason (data model › Hand-typed prices); a `CHECK` is the one place both writers meet. 2026-10-22, #106.
- **The price and billing are corrected on a route of their own, the owner's; the limits, dates and name on another, the staff's.** *Why:* a route the owner alone may call is refused before its body is read (security › Authorization), as the visit's charge; the owner chose the name correctable by the staff (Q8, A3). 2026-10-22, #106.
- **A fixed price never falls below what was paid on it: a database trigger.** *Why:* changing the price is the other way round the payments' ceiling; the ledger's rules are the database's (S2). 2026-10-22, #106.
- **The limits warn at their bound, and the days per week only for a new day: a second check-in on a day already counted uses none.** *Why:* K5's count; the limits never block (data model › Subscription limits). 2026-10-22, #109.
- **A retry's limit warnings leave the check-in itself out.** *Why:* the warnings describe the request; counted with it, a retry would warn of the day it used itself (S7). 2026-10-22, #109.
- **A subscription of at most seven days by its dates is ending soon on its last day only.** *Why:* "shorter than a week" made exact (Q5). 2026-10-21, #102.
- **The status and kind filters read the space's subscriptions into memory, one compact row each.** *Why:* the status is a pure TypeScript rule; the read grows with the subscriptions, not with payments or check-ins (S10; alternative A1, the status in SQL, not taken). 2026-10-21, #102.
- **The calendar's days are passed in, never computed in SQL; dates are read from `@db.Date` at UTC.** *Why:* one clock and one calendar ([conventions §11](../backend/conventions.md#11-time)); PostgreSQL's zone data still dates the check-ins ([finding 120](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)). 2026-10-21, #102.

## Code map

- **API:** `apps/api/src/modules/subscriptions/`, entry `index.ts`: the service (the create and the auto check-out included), the repository, the mapper, and the pure rules (`subscriptionStatus.ts`, `currentSubscription.ts`, `renewal.ts`, `subscriptionChange.ts`, `limits.ts`), the controller and the manage router (the corrections). The function is the migration `subscription_usage`'s.
- **Shared:** `packages/shared/src/subscriptions/`: `SUBSCRIPTION_STATUSES`, the check-in's request (`checkInSubscriberSchema`) and answer (`DeskCheckIn`), the corrections' requests (`correctSubscriptionSchema`, `correctPriceSchema`) and the responses (`DeskSubscription`, with its renewed one and its typed price, `SubscriptionProgress`, `SubscriptionState`).

## Open findings

- [120. Gaza dates are read by two zone databases](../architecture/findings/120-gaza-dates-are-read-by-two-zone-databases.md)

## History

### API history

- #94 — the open check-ins and their counts, which `occupancy` reads for *present*.
- #97 — the auto check-out of check-ins.
- #102 — the attendance and amount due in the database (`subscription_usage`), the status, progress and current-subscription rules, and the states read; each customer's current subscription and the list's filters as ids.
- #106 — a subscription's key, typed price's reason and renewed one; the create, audited; the row's lock; the renewal's proposed start; the corrections, the price the owner's; the end.
- #109 — a check-in's minutes in SQL; a subscriber's check-in and check-out, audited, and the limits' warnings (`limits.ts`); the check-ins' lists.
