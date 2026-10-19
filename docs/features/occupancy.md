# Occupancy

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-19 · **Owner:** Basel Ghoneim
> **Authority:** The `occupancy` capability: a space's state now: its capacity, private to its staff and set by its owner, who is present, and the live status. Its endpoints are owned by the API contract ([Capacity](../api/api-contract.md#capacity-managed), [Occupancy](../api/api-contract.md#occupancy-managed)); its entity by the [data model](../architecture/data-model.md#spaces), and the live-status rule by its [derived values](../architecture/data-model.md#derived-values-computed-not-stored). The API is built; no web screen yet.
> **Scope:** the API module `occupancy` (L4); `@masaha/shared/occupancy`. No web feature yet.

## What it does

- Keeps a space's capacity: the most people it seats, or none.
- Answers the space's owner its capacity.
- Lets the owner set it, change it or clear it.
- Answers the space's staff its state now, whole: who is present (the open visits plus the open subscription check-ins), how many, the capacity, the override in force and the live status.

## Who uses it

- **The space's owner,** through the API: reads and sets the capacity, and reads the state now.
- **The space's reception,** through the API: reads the state now, the capacity in it, but not the capacity's own route.
- The front desk's full warning will read *present* (step 7). The admin never reaches any of it: a space's capacity and its counts are private from the public and the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)). No web screen reads it yet.

## Responsibility boundary

- **Owns** the `space_occupancy` table, created on its first write, and the capacity's bound; the one definition of *present* and the one list of who is present; the pure live-status rule (`liveStatus.ts`) ([conventions › occupancy](../backend/conventions.md#occupancy-the-spaces-state-now)).
- **Reads** the open visits from `visits`, the open subscription check-ins from `subscriptions`, the customers' names from `customers`, the closures in force from `announcements`, and the week from [`spaces`](spaces.md); each through its service, which alone reads its table. Those four modules hold only these reads so far, with no capability document of their own.
- **Leaves** the space and its lock to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the stay limit and the other settings to [`space-settings`](space-settings.md).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Both capacity routes ask `can()` at the route, through `requireCan`; the write asks it again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)). The state now asks nothing beyond the boundary, which admits the staff.
- The time is the one clock's, read on Gaza's calendar ([conventions §11](../backend/conventions.md#11-time)).
- Each change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the name the [contract](../api/api-contract.md#capacity-managed) gives.
- Its request is checked by the shared schema ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The state now.** Several statements, with no lock: the space's row, its open visits and open check-ins, their customers' names, whether a closure is in force, and its week. *Present* is the people listed. The override counts only while its end is after now, and is answered only then. The live status is the rule's, from those inputs and whether the space is verified, read from its links.

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

## Code map

- **API:** `apps/api/src/modules/occupancy/`, entry `index.ts`: the service, the repository, the manage router, and the live-status rule (`liveStatus.ts`). The reads it composes: `modules/visits/`, `modules/subscriptions/`, `modules/customers/`, `modules/announcements/`, and `spaces.weekOf`.
- **Shared:** `packages/shared/src/occupancy/`: the request, with the capacity's bound, and the responses (`SpaceOccupancyNow`, `PresentPerson`, `LiveStatus`).

## Open findings

- [96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md): the attendance card saves two capabilities in one save.

## History

### API history

- #92 — a space's capacity, read and set by its owner on the API; the module's first slice.
- #94 — the staff's read of the state now: who is present, the count, the capacity and the live status.
