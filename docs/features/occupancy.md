# Occupancy

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `occupancy` capability: a space's state now: its capacity, private to its staff and set by its owner, who is present, and the live status. Its endpoints are owned by the API contract ([Capacity](../api/api-contract.md#capacity-managed), [Occupancy](../api/api-contract.md#occupancy-managed)); its entity by the [data model](../architecture/data-model.md#spaces), and the live-status rule by its [derived values](../architecture/data-model.md#derived-values-computed-not-stored). The API is built; on the web, the settings page's attendance card reads and sets the capacity.
> **Scope:** the API module `occupancy` (L4); `@masaha/shared/occupancy`; the web feature `features/occupancy`, its capacity's hooks only (not dashboard-only: the directory will read the live status).

## What it does

- Keeps a space's capacity: the most people it seats, or none.
- Answers the space's owner its capacity.
- Lets the owner set it, change it or clear it.
- Answers the space's staff its state now, whole: who is present (the open visits plus the open subscription check-ins), each visit with its charge so far, how many, the capacity, the override in force and the live status.
- Lets the staff override the live status for 30 minutes, an hour, two hours or until closing, never past today's closing, and clear it early.

## Who uses it

- **The space's owner,** through the API: reads and sets the capacity, reads the state now, and sets and clears the override; on the dashboard, sets the capacity in the settings page's attendance card ([space-settings › Behaviour and flows](space-settings.md#behaviour-and-flows)).
- **The space's reception,** through the API: reads the state now, the capacity in it, but not the capacity's own route; sets and clears the override.
- **The directory,** for the public: each listed space's live status, and which are available now, set-based ([directory](directory.md)); never a count or a capacity.
- **The front desk** ([desk](desk.md)): a check-in's warnings, in its transaction: full when *present* reaches the capacity, outside the hours. The admin never reaches any of it: a space's capacity and its counts are private from the public and the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)). No web screen reads the state now yet; the owner's settings page reads and sets the capacity.

## Responsibility boundary

- **Owns** the `space_occupancy` table, created on its first write, and the capacity's bound; the one definition of *present* and the one list of who is present; the pure live-status rule (`liveStatus.ts`) and the override's end (`overrideUntil.ts`) ([conventions › occupancy](../backend/conventions.md#occupancy-the-spaces-state-now)).
- **Reads** the open visits and their charges so far from [`visits`](visits.md), the open subscription check-ins from `subscriptions`, the customers' names from `customers`, the closures in force from `announcements`, and the week from [`spaces`](spaces.md); each through its service, which alone reads its table. `subscriptions`, `customers` and `announcements` hold only these reads so far, with no capability document of their own.
- **Leaves** the space and its lock to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the stay limit and the other settings to [`space-settings`](space-settings.md).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Both capacity routes ask `can()` at the route, through `requireCan`; the write asks it again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)). The state now asks nothing beyond the boundary, which admits the staff. The override's routes ask `can()` (`space.liveStatus.override`, the staff's) at the route, and again under the space's lock.
- The time is the one clock's, read on Gaza's calendar ([conventions §11](../backend/conventions.md#11-time)).
- Each change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the name the [contract](../api/api-contract.md#capacity-managed) gives.
- Its request is checked by the shared schema ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The state now.** Several statements, with no lock: the space's row, its open visits and open check-ins, their customers' names, each open visit's charge so far (from `visits`), whether a closure is in force, and its week. *Present* is the people listed. The override counts only while its end is after now and the space is verified, under no closure and open by its hours, and is answered only then: a closure announced after it hides it. The live status is the rule's, from those inputs and whether the space is verified, read from its links.

**The override.** In one transaction: the space's lock; `can()` on the links as they are under it; the week, and today's range on Gaza's clock; the closures in force. Outside that range, with no hours, under a closure in force, or on an unverified space (no active owner among those links), it is refused `SPACE_NOT_OPEN`. Otherwise it ends at `min(now + duration, today's closing)`, replaces the one in force, the row created with no capacity on its first write, and is audited with both. Clearing takes the same lock and `can()`, and writes and audits only when an override is in force. An ended override is never cleared by a job: it simply stops counting.

**The check-in's warnings.** In the desk's transaction, under the space's lock: the capacity, *present* (the open visits plus the open check-ins), and the week; `SPACE_FULL` when *present* reaches the capacity (never without one), then `OUTSIDE_OPENING_HOURS` when the space has hours and is not open by them now. They never refuse the check-in.

**The directory's read.** `liveStatusFor` decides many spaces at once: one query each for their rows, their open visits and open check-ins (counted), their closures, and the weeks the directory did not pass; `availableAmong` keeps the verified spaces `AVAILABLE` now, for the directory's filter.

**The capacity's read.** One query reads the space's row; a space without one has no capacity.

**The capacity's write.** In one transaction: the space's lock; `can()` on the links as they are under it; the current capacity. The same value writes nothing; another is written, the row created on its first write, and audited. Only the capacity is written, so the manual override is never touched.

A change applies from then on ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)).

## Decisions

### API decisions

- **The capacity has its own module and its own route, `…/capacity`, apart from the settings** (Q5). *Why:* `occupancy` owns `space_occupancy` and its first write ([conventions §9](../backend/conventions.md#occupancy-the-spaces-state-now)); the design's attendance card shows it beside the stay limit, but a screen is not a capability, so the card sends two requests ([finding 96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md)). 2026-10-19, #92.
- **`PUT`, the value set whole: a whole number from 1 to 1,000, or `null` for none** (Q2). *Why:* one value, idempotent; the ceiling catches a slip of the keyboard that would leave a space never full. 2026-10-19, #92.
- **The capacity is the owner's alone, its read included: reception is refused at the route before the body is read; anyone else without a link, the admin included, gets 404 from the boundary.** *Why:* private from the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)); the desk reads what it needs through its own routes. 2026-10-19, #92.
- **The write is decided under the space's lock, on the links read there.** *Why:* a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-19, #92.
- **The row is created on the first write, and a write sets the capacity only** (P5). *Why:* no lower module creates it; the override is the desk's. 2026-10-19, #92.
- **The same value writes and audits nothing; a change is audited `space.capacityEdited`.** 2026-10-19, #92.
- **The staff's read is one request, answered whole: the status, the capacity, the count and the people present.** *Why:* the desk's main view, on a weak connection; a count and two lists would be three requests. It is bounded by who is present (api-contract §4's exceptions). 2026-10-19, #94.
- **The read asks nothing beyond the boundary.** *Why:* the boundary admits the space's staff, who are its readers. 2026-10-19, #94.
- **The read is several statements, with no lock.** *Why:* a live read; a check-in committed between two of them makes one answer lag one stay, which the next read fixes. 2026-10-19, #94.
- **The people present: the earliest checked in first; on a tie, visits before check-ins, then by id.** *Why:* the desk sees who has stayed longest first, in a stable order. 2026-10-19, #94.
- **An override ends at the next closing at the latest: `min(now + duration, today's closing)`; its end is derived at read time, with no job.** *Why:* no override outlives its day, and nothing needs to run to end one. 2026-10-19, #94.
- **An override is refused with `SPACE_NOT_OPEN` while the space is not open by its hours, or has none.** *Why:* the rule counts an override only while the space is open; stored outside its hours it would be a silent no-op, and the refusal tells the desk why. 2026-10-19, #94.
- **An override is also refused with `SPACE_NOT_OPEN` under a closure in force or on an unverified space; the staff's read answers it only while the rule uses it.** *Why:* in both cases the rule ignores the override, so storing it would be the same silent no-op; and an override shown "in force" beside `CLOSED` would tell the desk what does not apply. 2026-10-20, #95.
- **The override is the staff's, set and cleared under the space's lock, `can()` decided on the links read there; the answer is the state now.** *Why:* a reception link ended meanwhile refuses (finding 43); the desk redraws from one answer. 2026-10-19, #94.
- **Audited `space.statusOverridden` (the one in force and the new one) and `space.statusOverrideCleared`; clearing none writes nothing.** 2026-10-19, #94.

### Web decisions

- **The capacity is saved through the settings page's attendance card, before the settings** (the owner's O2, S8). *Why:* the design draws one card and one save; the page composes it from this capability's hooks (`useCapacityQuery`, `useSetCapacity`) and `space-settings`' — a component of two capabilities lives in neither — and the capacity goes first, so a refused second part says exactly what was saved ([finding 96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md)). 2026-10-20, #99.

## Code map

- **API:** `apps/api/src/modules/occupancy/`, entry `index.ts`: the service, the repository, the manage router, the live-status rule (`liveStatus.ts`) and the override's end (`overrideUntil.ts`). The reads it composes: `modules/visits/`, `modules/subscriptions/`, `modules/customers/`, `modules/announcements/`, and `spaces.weekOf`.
- **Shared:** `packages/shared/src/occupancy/`: the request, with the capacity's bound, and the override's (`setStatusOverrideSchema`, `OVERRIDE_DURATIONS`); the responses (`SpaceOccupancyNow`, `PresentPerson`, `LiveStatus`).
- **Web:** `apps/web/src/features/occupancy/`, entry `index.ts` (`useCapacityQuery`, `useSetCapacity`), read by `pages/dashboard/space/settings/`: the repository in `repository/`, the keys and the two hooks in `hooks/`; a 404 on the capacity's route, read or save, fetches the owner's own spaces again (`shared/api`'s `useLinkEnded`).

## Open findings

None.

## History

### API history

- #92 — a space's capacity, read and set by its owner on the API; the module's first slice.
- #94 — the staff's read of the state now: who is present, the count, the capacity and the live status; the manual override, set and cleared by the staff; the live status of many spaces at once, for the directory.
- #95 — the override refused under a closure or on an unverified space, and answered only while the status uses it; a check-in's warnings, for the desk; each visit present with its charge so far.

### Web history

- #99 — the capacity's read and its save, for the owner's settings page.
