# Visits

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `visits` capability: a visitor's stay at a space, checked in by name, and its rates. Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its entity and its money rules by the [data model](../architecture/data-model.md#front-desk-and-money). The API is built; no web screen yet.
> **Scope:** the API module `visits` (L3); `@masaha/shared/visits`. No web feature yet.

## What it does

- Checks a visitor in by name, at the rates of the visit's audience and shift as the space's prices are then.
- Finds the visit a check-in's idempotency key already made, so a retry never makes a second one.
- Answers the open visits of a space, and how many, for *present* ([occupancy](occupancy.md)).

## Who uses it

- **The front desk** ([desk](desk.md)), which orchestrates the check-in, for the space's owner and reception.
- **`occupancy`**, which reads the open visits for *present*. No web screen reads it yet.

## Responsibility boundary

- **Owns** the `visits` table; the visit's rates rule (`visitCharge.ts`, pure); the visit's audit entries.
- **Reads** the space's prices from [`spaces`](spaces.md) and whether student prices are on from [`space-settings`](space-settings.md), in the check-in's transaction.
- **Leaves** the transaction, the space's lock and `can()` to [`desk`](desk.md); the warnings to [`occupancy`](occupancy.md).

## How it composes the platform

- It has no router of its own yet: the check-in's route is the desk's ([conventions › the front desk](../backend/conventions.md#the-front-desk-desk)).
- Each change is audited by the audit writer, in the caller's transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**The rates.** From the space's standard prices (no custom label), for the hour and the day apart: in the visit's shift, the audience's price, else the general one; a shift with no price of that period falls back to the prices with no shift, the same way; a visit with no shift takes only the prices with no shift. A student visit is refused where the space turns student prices off. The rates are copied onto the visit; a later price change never touches it.

**The check-in.** In the desk's transaction: the rates, then the visit, open, with the clock's time, then its audit entry. A shift the foreign key cannot find in the space, another space's included, is refused on `shiftId`, and the transaction writes nothing.

## Decisions

### API decisions

- **A shift without a price of a period falls back to the space's price of that period with no shift, as a student price falls back to the general one.** *Why:* a space that prices only some periods by shift still charges the others (the owner's answer, §13 Q4 of the desk's plan). 2026-10-20, #95.
- **Only the standard prices count for a visit, never one with a custom label.** *Why:* a label names something other than a stay (a hall, an event), which the desk does not check in. 2026-10-20, #95.
- **The rates are read from the space's prices in the check-in's transaction, and copied.** *Why:* the charge at check-out uses the rates the visitor was told at the door ([data model](../architecture/data-model.md#front-desk-and-money)). 2026-10-20, #95.
- **Audited `visit.checkedIn`, with the name, the audience, the shift and the rates copied.** 2026-10-20, #95.

## Code map

- **API:** `apps/api/src/modules/visits/`, entry `index.ts`: the service, the repository, the mapper and the rates rule (`visitCharge.ts`).
- **Shared:** `packages/shared/src/visits/`: the check-in's request (`checkInVisitSchema`); the responses (`DeskVisit`, `VisitCharge`, `Rates`).

## History

### API history

- #94 — the open visits and their counts, which `occupancy` reads for *present*.
- #95 — the check-in by name, its rates and its idempotency key's lookup.
