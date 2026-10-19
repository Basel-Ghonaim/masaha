# Occupancy

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-19 · **Owner:** Basel Ghoneim
> **Authority:** The `occupancy` capability: a space's state now. So far its capacity, private to its staff and set by its owner. Its endpoints are owned by the [API contract](../api/api-contract.md#capacity-managed); its entity by the [data model](../architecture/data-model.md#spaces). The API is built; no web screen yet.
> **Scope:** the API module `occupancy` (L4), its capacity only; `@masaha/shared/occupancy`. No web feature yet.

## What it does

- Keeps a space's capacity: the most people it seats, or none.
- Answers the space's owner its capacity.
- Lets the owner set it, change it or clear it.

## Who uses it

- **The space's owner,** through the API: reads and sets the capacity.
- The front desk's full warning and the live status will read it (step 7). Reception reads nothing here yet, and the admin never reaches it: a space's capacity is private from the public and the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)). No web screen reads it yet.

## Responsibility boundary

- **Owns** the `space_occupancy` table, created on its first write, and the capacity's bound. It is the module that will own who is present, the live status and its manual override ([conventions › occupancy](../backend/conventions.md#occupancy-the-spaces-state-now)); none of them is built.
- **Leaves** the space and its lock to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the stay limit and the other settings to [`space-settings`](space-settings.md).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Both capacity routes ask `can()` at the route, through `requireCan`; the write asks it again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)).
- Each change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the name the [contract](../api/api-contract.md#capacity-managed) gives.
- Its request is checked by the shared schema ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The read.** One query reads the space's row; a space without one has no capacity.

**The write.** In one transaction: the space's lock; `can()` on the links as they are under it; the current capacity. The same value writes nothing; another is written, the row created on its first write, and audited. Only the capacity is written, so the manual override is never touched.

A change applies from then on ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)).

## Decisions

### API decisions

- **The capacity has its own module and its own route, `…/capacity`, apart from the settings** (Q5). *Why:* `occupancy` owns `space_occupancy` and its first write ([conventions §9](../backend/conventions.md#occupancy-the-spaces-state-now)); the design's attendance card shows it beside the stay limit, but a screen is not a capability, so the card sends two requests ([finding 96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md)). 2026-10-19, #92.
- **`PUT`, the value set whole: a whole number from 1 to 1,000, or `null` for none** (Q2). *Why:* one value, idempotent; the ceiling catches a slip of the keyboard that would leave a space never full. 2026-10-19, #92.
- **The capacity is the owner's alone, its read included: reception is refused at the route before the body is read; anyone else without a link, the admin included, gets 404 from the boundary.** *Why:* private from the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)); the desk will read what it needs through its own routes. 2026-10-19, #92.
- **The write is decided under the space's lock, on the links read there.** *Why:* a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-19, #92.
- **The row is created on the first write, and a write sets the capacity only** (P5). *Why:* no lower module creates it; the override is the desk's. 2026-10-19, #92.
- **The same value writes and audits nothing; a change is audited `space.capacityEdited`.** 2026-10-19, #92.

## Code map

- **API:** `apps/api/src/modules/occupancy/`, entry `index.ts`: the service, the repository and the manage router.
- **Shared:** `packages/shared/src/occupancy/`: the request, with the capacity's bound, and the response.

## Open findings

- [96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md): the attendance card saves two capabilities in one save.

## History

### API history

- #92 — a space's capacity, read and set by its owner on the API; the module's first slice.
