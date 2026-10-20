# Desk

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `desk` capability: the front desk's orchestrations, each across the desk's modules in one transaction. Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its rules by [conventions › the front desk](../backend/conventions.md#the-front-desk-desk) and [§13](../backend/conventions.md#13-idempotency-and-concurrency). The API is built; no web screen yet.
> **Scope:** the API module `desk` (L5); `@masaha/shared/desk`. No web feature yet.

## What it does

- Checks a visitor in, with what the check-in warns of: the space full, or outside its hours.
- Answers a retried check-in the visit its idempotency key already made.
- Leaves the stays it does not close to the auto check-out, which [`visits`](visits.md) and `subscriptions` run as timed jobs.
- Checks a visit out: the charge at the quote's time, the payment taken, the rest left unpaid to a customer found or created by phone, and a price typed by hand where the visit has no rate, or an unpriced close; a retry answers the first result.

## Who uses it

- **The space's owner and reception,** through the API. The admin never reaches it: the desk is private from the admin ([ADR 0002](../architecture/decisions/0002-authorization-model.md)). No web screen yet; the shared desk device is not settled (who signs out an idle reception account, and switching staff on one device): step 9.

## Responsibility boundary

- **Owns** the orchestration: the transaction, its order, the space's lock and `can()` on the links read under it, and the retry's lookup before any write.
- **Leaves** the visit, its rates, its charge and its audit to [`visits`](visits.md); the payment and the ledger to [`payments`](payments.md); the customer found or created by phone to `customers`; the warnings to [`occupancy`](occupancy.md); the lock to [`spaces`](spaces.md); the settings to [`space-settings`](space-settings.md); who may act, and who may type a price, to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization)).
- Each write asks `can()` (`attendance.record`, the staff's) at the route, then reads its `Idempotency-Key`, both before the body is read; the service asks `can()` again under the space's lock.

## Behaviour and flows

**The check-in.** In one transaction, in this order: the space's lock; `can()` on the links as they are under it; the warnings as of now; the visit this key already made, for a retry; else the visit, with its rates (through `visits`). Answered 201 every time, the warnings in `meta` only when there are some.

**The check-out.** In one transaction, in this order: the space's lock and `can()`; the settings; the visit's row (`FOR UPDATE`), not the space's → 404; the payment this key recorded. A visit already closed answers as it is, with that payment for a retry, and records nothing; closed by another key, a request with a payment is refused (`VISIT_ALREADY_CLOSED`). Else the time it is priced at (the quote's, at most five minutes old and never before the check-in; absent, now); the charge from `visits`; with no rate, the typed price of whoever may type one (`can()`'s `prices.typeByHand`), who must, or none for whoever may not: an unpriced close, which the owner prices later through [`visits`](visits.md). Any part left unpaid needs a phone: the customer with it is found or created. Then the visit is closed, and the payment recorded, which the ledger checks; its refusal undoes the whole check-out. The rows are taken in one order: the space's, the visit's, the customer, the payment.

## Decisions

### API decisions

- **A desk write takes the space's lock first, and decides `can()` on the links read under it.** *Why:* a reception link ended meanwhile must refuse ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)); the lock also serialises the space's desk creates. 2026-10-20, #95.
- **A retry is found by its key first, under the space's lock; the unique key is only the backstop.** *Why:* inside a transaction PostgreSQL aborts on the unique violation, so the first record could not be read after it; under the lock the read is race-free ([conventions §13](../backend/conventions.md#idempotency)). 2026-10-20, #95.
- **The warnings never refuse; a retry answers them as of now, the visit counted present.** *Why:* the desk decides; the warnings describe now, not the visit, so storing them would add a column for advice — ADR 0015's "same body", weakened for them only (the owner's answer, §13 Q8 of the desk's plan). 2026-10-20, #95.
- **The key is read from the `Idempotency-Key` header by a route middleware, before the body.** *Why:* a request without one is a client's bug, refused before anything is read. 2026-10-20, #95.
- **The check-out is priced at the desk's quote, at most five minutes old and not in the future.** *Why:* with per-minute rounding the charge moves every minute; a visitor who paid what the screen said must not owe a few agorot more when the request lands, and five minutes cannot back-date a stay (the owner's bound). 2026-10-20, #95.
- **A visit with no rate, checked out by whoever may not type a price, closes unpriced; whoever may type must.** *Why:* never free, never blocked at the door; the owner prices it later (the owner's answer to Q4, built here rather than after an interim refusal, alternative A1). 2026-10-20, #95.
- **A part left unpaid needs a phone, whose customer is found among those not archived, or created with the name given, else the visit's.** *Why:* a debt always has someone to collect from (data model › Unpaid visit); a found customer keeps the name they have. 2026-10-20, #95.
- **A check-out of a visit already closed answers it as it is and records nothing; a key that paid another visit is a `conflict`.** *Why:* updates are idempotent by design ([conventions §13](../backend/conventions.md#idempotency)); a reused key is a client's bug. 2026-10-20, #95.
- **A check-out that carries a payment, of a visit another key already closed, is refused (`VISIT_ALREADY_CLOSED`).** *Why:* two desks, or a slow connection, could otherwise each take the cash and only one be recorded; a 200 with `payment: null` reads as success while the money is in no ledger (the owner's decision on #95's review). 2026-10-20, #97.
- **A check-out time before the visit's check-in is refused (`out_of_range`).** *Why:* the database refuses a visit closed before it opened, which would answer 500. 2026-10-20, #97.

## Code map

- **API:** `apps/api/src/modules/desk/`, entry `index.ts`: the service, the controller and the manage router. The key's middleware is the platform's (`shared/http`).
- **Shared:** `packages/shared/src/desk/`: the check-out's request (`checkOutVisitSchema`); the warnings (`DESK_WARNINGS`) and the check-out's answer (`VisitCheckOut`). The idempotency key's header and schema are in `core`.

## History

### API history

- #95 — the check-in of a visitor by name, idempotent, with its warnings; the check-out with its charge and payment.
- #97 — a payment on a visit another key closed refused; a check-out time before the check-in refused.
