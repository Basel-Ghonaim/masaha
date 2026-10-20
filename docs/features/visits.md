# Visits

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `visits` capability: a visitor's stay at a space, checked in by name, its rates and its charge. Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its entity and its money rules by the [data model](../architecture/data-model.md#front-desk-and-money). The API is built; no web screen yet.
> **Scope:** the API module `visits` (L3); `@masaha/shared/visits`. No web feature yet.

## What it does

- Checks a visitor in by name, at the rates of the visit's audience and shift as the space's prices are then.
- Finds the visit a check-in's idempotency key already made, so a retry never makes a second one.
- Computes a visit's charge for its stay, and closes it at the desk with its charge (computed, typed by hand, or none: unpriced) and the customer an unpaid rest is left to.
- Answers a visit with its quote while it is open: what it costs now, at a time the desk sends back to check it out.
- Answers the desk's terms: the rounding and the cap in force, whether the caller may type a price, and the rates with no shift and in each shift.
- Answers the open visits of a space, how many, and what each costs so far, for *present* ([occupancy](occupancy.md)).

## Who uses it

- **The front desk** ([desk](desk.md)), which orchestrates the check-in and the check-out, for the space's owner and reception; they read the quote and the terms through this module's own routes.
- **`occupancy`**, which reads the open visits for *present*. No web screen reads it yet.

## Responsibility boundary

- **Owns** the `visits` table; the visit's rates and charge rules (`visitCharge.ts`, pure); the visit's audit entries.
- **Reads** the space's prices and shifts from [`spaces`](spaces.md), and the settings (student prices, the rounding, the cap, reception's switch) from [`space-settings`](space-settings.md).
- **Asks** `can()`'s `prices.typeByHand` for the terms' `mayTypePrice`, from the boundary's links.
- **Leaves** the transaction, the space's lock, and the decision under it of who may type a price to [`desk`](desk.md); the warnings to [`occupancy`](occupancy.md); the payment to [`payments`](payments.md).

## How it composes the platform

- Its manage router holds the two reads, behind the boundary that admits the space's staff, which is their check; the check-in's and the check-out's routes are the desk's ([conventions › the front desk](../backend/conventions.md#the-front-desk-desk)).
- Each change is audited by the audit writer, in the caller's transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**The rates.** From the space's standard prices (no custom label), for the hour and the day apart: in the visit's shift, the audience's price, else the general one; a shift with no price of that period falls back to the prices with no shift, the same way; a visit with no shift takes only the prices with no shift. A student visit is refused where the space turns student prices off. The rates are copied onto the visit; a later price change never touches it.

**The check-in.** In the desk's transaction: the rates, then the visit, open, with the clock's time, then its audit entry. A shift the foreign key cannot find in the space, another space's included, is refused on `shiftId`, and the transaction writes nothing.

**The charge.** For the stay from the check-in to the check-out's time: its whole minutes, at least one, rounded by the space's rule in force, times the hour rate copied at check-in, capped at the day rate when the cap is on; with no hour rate, the day rate; with neither, none ([data model](../architecture/data-model.md#front-desk-and-money)).

**The check-out.** In the desk's transaction: the visit's row locked (`FOR UPDATE`) after the space's lock, read only when it is the space's; then closed, `MANUAL`, with its charge and customer, and audited with the quote's time it was priced at and the request's own time.

**The reads.** The quote: the visit, and while it is open its charge at the clock's now, with its billed minutes, read without a lock. The terms: the settings, the prices and the shifts; the rates by the same rule as a check-in's; the student rates only where student prices are on and change a rate. The charges so far: one query for the open visits' rates, one for the settings.

## Decisions

### API decisions

- **A shift without a price of a period falls back to the space's price of that period with no shift, as a student price falls back to the general one.** *Why:* a space that prices only some periods by shift still charges the others (the owner's answer, §13 Q4 of the desk's plan). 2026-10-20, #95.
- **Only the standard prices count for a visit, never one with a custom label.** *Why:* a label names something other than a stay (a hall, an event), which the desk does not check in. 2026-10-20, #95.
- **The rates are read from the space's prices in the check-in's transaction, and copied.** *Why:* the charge at check-out uses the rates the visitor was told at the door ([data model](../architecture/data-model.md#front-desk-and-money)). 2026-10-20, #95.
- **Audited `visit.checkedIn`, with the name, the audience, the shift and the rates copied.** 2026-10-20, #95.
- **The rounding's details: whole minutes, at least one unit; "more than N minutes", not "N or more"; a quarter hour rounds up to the half; agorot half up.** *Why:* the prototype's rule, made exact so every stay has one charge (the owner's answer, §13 Q3 of the desk's plan). 2026-10-20, #95.
- **The rates are the visit's, copied at check-in; the rounding and the cap are the space's at check-out.** *Why:* a change applies from then on ([data model](../architecture/data-model.md#front-desk-and-money)). 2026-10-20, #95.
- **The quote is answered with the visit, and its `at` is the time the check-out charges.** *Why:* the desk shows a price and charges exactly that price (desk › the check-out's quote time). 2026-10-20, #95.
- **The terms answer the student rates only where they change a rate, and whether this caller may type a price.** *Why:* the desk offers the student audience only where it matters (DI-41), and shows the typed-price field only to whoever may use it. 2026-10-20, #95.
- **Audited `visit.checkedOut` with both the quote's time and the request's own time.** *Why:* the check-out is priced at the quote the desk showed, up to five minutes before the request; both times say which (the owner's decision). 2026-10-20, #95.

## Code map

- **API:** `apps/api/src/modules/visits/`, entry `index.ts`: the service, the repository, the mapper, the controller and the manage router, and the rates and charge rules (`visitCharge.ts`).
- **Shared:** `packages/shared/src/visits/`: the check-in's request (`checkInVisitSchema`); the responses (`DeskVisit`, `VisitCharge`, `QuotedVisit`, `VisitTerms`, `Rates`).

## History

### API history

- #94 — the open visits and their counts, which `occupancy` reads for *present*.
- #95 — the check-in by name, its rates and its idempotency key's lookup; the charge and the check-out; the quote, the terms and the charges so far.
