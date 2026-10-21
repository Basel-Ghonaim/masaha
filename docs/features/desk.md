# Desk

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-21 · **Owner:** Basel Ghoneim
> **Authority:** The `desk` capability: the front desk's orchestrations, each across the desk's modules in one transaction. Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its rules by [conventions › the front desk](../backend/conventions.md#the-front-desk-desk) and [§13](../backend/conventions.md#13-idempotency-and-concurrency). The API is built; no web screen yet.
> **Scope:** the API module `desk` (L5); `@masaha/shared/desk`. No web feature yet.

## What it does

- Checks a visitor in, with what the check-in warns of: the space full, or outside its hours.
- Answers a retried check-in the visit its idempotency key already made.
- Leaves the stays it does not close to the auto check-out, which [`visits`](visits.md) and `subscriptions` run as timed jobs.
- Checks a visit out: the charge at the quote's time, the payment taken, the rest left unpaid to a customer found or created by phone, and a price typed by hand where the visit has no rate, or an unpriced close; a retry answers the first result.
- Receives a payment for a closed visit after its check-out, once per idempotency key; the rest left unpaid by the check-out's rule.
- Leaves an uncollected visit's debt to a customer by phone, with no payment («تسجيل دينًا»).
- Writes off, as the owner, what a closed, priced visit still owes, with a reason, and undoes it.
- Archives a customer, as the owner, unless they are present.

## Who uses it

- **The space's owner and reception,** through the API. The admin never reaches it: the desk is private from the admin ([ADR 0002](../architecture/decisions/0002-authorization-model.md)). No web screen yet; the shared desk device is not settled (who signs out an idle reception account, and switching staff on one device): the desk's screen item.

## Responsibility boundary

- **Owns** the orchestration: the transaction, its order, the space's lock and `can()` on the links read under it, and the retry's lookup before any write.
- **Leaves** the visit, its rates, its charge and its audit to [`visits`](visits.md); the payment and the ledger to [`payments`](payments.md); the customer found or created by phone, and the archive's column, to [`customers`](customers.md); the warnings to [`occupancy`](occupancy.md); the lock to [`spaces`](spaces.md); the settings to [`space-settings`](space-settings.md); who may act, and who may type a price, to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization)).
- Each write asks `can()` at the route, before the body is read: `attendance.record` (the staff's) for the check-in and the check-out, and `payments.record` (the staff's) for the payment, each then reading its `Idempotency-Key`, and for «تسجيل دينًا», which needs none; `visits.writeOff` (the owner's) for the write-off and its undo; `customers.archive` (the owner's) for a customer's archive. The service asks `can()` again under the space's lock.

## Behaviour and flows

**The check-in.** In one transaction, in this order: the space's lock; `can()` on the links as they are under it; the warnings as of now; the visit this key already made, for a retry; else the visit, with its rates (through `visits`). Answered 201 every time, the warnings in `meta` only when there are some.

**The check-out.** In one transaction, in this order: the space's lock and `can()`; the settings; the visit's row (`FOR UPDATE`), not the space's → 404; the payment this key recorded. A visit already closed answers as it is, with that payment for a retry, and records nothing; closed by another key, a request with a payment is refused (`VISIT_ALREADY_CLOSED`). Else the time it is priced at (the quote's, at most five minutes old and never before the check-in; absent, now), but never past the stay's due time, which then closes it; the charge from `visits`; with no rate, the typed price of whoever may type one (`can()`'s `prices.typeByHand`), who must, or none for whoever may not: an unpriced close, which the owner prices later through [`visits`](visits.md). Any part left unpaid follows the one unpaid-part rule (below). Then the visit is closed, and the payment recorded, which the ledger checks; its refusal undoes the whole check-out. The rows are taken in one order: the space's, the visit's, the customer, the payment.

**The unpaid-part rule** (one helper, for the check-out and the payment). A visit with a customer keeps it and needs no phone; a phone that is not its customer's is refused (`VISIT_HAS_CUSTOMER`). A visit with none needs a phone, whose customer is found among those not archived, or created with the name given, else the visit's.

**The payment after the check-out.** In one transaction, in this order: the space's lock and `can()` (`payments.record`); the visit's row (`FOR UPDATE`), not the space's → 404; the payment this key recorded, for a retry, answered with the visit and the sums as they are now; a key that paid another item → 409; an open visit → 409. Then the payment is inserted, which the ledger checks (written off, unpriced, above the balance); then what the visit was paid and still owes; if anything remains, the unpaid-part rule, and the visit's customer set when it changes. The rows are taken in this order: the space's, the visit's, the payment, the customer.

**«تسجيل دينًا».** In one transaction, in this order: the space's lock and `can()` (`payments.record`); the visit's row (`FOR UPDATE`), not the space's → 404, still open → 409; written off → `VISIT_WRITTEN_OFF`; nothing owed → `VISIT_ALREADY_PAID` (an unpriced visit has a debt to leave); then the unpaid-part rule; the visit's own customer again → the visit as it is; else its customer is set, audited `visit.leftToCustomer`.

**The archive of a customer.** The owner's, in one transaction, in this order: the space's lock and `can()` (`customers.archive`); the customer, the space's (else 404); one already archived answered as it is; one present — an open check-in ([`subscriptions`](subscriptions.md)) or an open visit — refused `MEMBER_ALREADY_CHECKED_IN`; then archived through `customers`. A customer who owes is archived: the debt stays theirs, and the web asks first (DK-014).

**The write-off and its undo.** The owner's, each in one transaction, in this order: the space's lock and `can()` (`visits.writeOff`); the visit's row (`FOR UPDATE`), not the space's → 404, still open → 409 with no code. The write-off: a visit already written off is answered as it is; no charge → `VISIT_NOT_PRICED`; then what it was paid and still owes, read from [`payments`](payments.md) under the visit's lock; nothing owed → `VISIT_ALREADY_PAID`; else `visits` writes it off with the amount, now, by the caller, with the reason. The undo: a visit not written off is answered as it is; else `visits` clears it, audited with what it was.

## Decisions

### API decisions

- **A desk write takes the space's lock first, and decides `can()` on the links read under it.** *Why:* a reception link ended meanwhile must refuse ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)); the lock also serialises the space's desk creates. 2026-10-20, #95.
- **A retry is found by its key first, under the space's lock; the unique key is only the backstop.** *Why:* inside a transaction PostgreSQL aborts on the unique violation, so the first record could not be read after it; under the lock the read is race-free ([conventions §13](../backend/conventions.md#idempotency)). 2026-10-20, #95.
- **The warnings never refuse; a retry answers them as of now, the visit counted present.** *Why:* the desk decides; the warnings describe now, not the visit, so storing them would add a column for advice — ADR 0015's "same body", weakened for them only (the owner's answer, §13 Q8 of the desk's plan). 2026-10-20, #95.
- **The key is read from the `Idempotency-Key` header by a route middleware, before the body.** *Why:* a request without one is a client's bug, refused before anything is read. 2026-10-20, #95.
- **The check-out is priced at the desk's quote, at most five minutes old and not in the future.** *Why:* with per-minute rounding the charge moves every minute; a visitor who paid what the screen said must not owe a few agorot more when the request lands, and five minutes cannot back-date a stay (the owner's bound). 2026-10-20, #95.
- **A customer who is present is not archived (`MEMBER_ALREADY_CHECKED_IN`); one who owes is.** *Why:* an archived customer present at the desk could not be checked out from its list; a debt stays owed whoever is on file (the plan's S11; the owner's settled rule). The archive is the desk's because it asks who is present, across `subscriptions` and `visits`. 2026-10-21, #102.
- **A stay checked out after its due time is closed at that due time, its `checkedOutAt`, and charged up to it; the audit keeps the request's own time.** *Why:* every stay is due by 23:59 of its check-in's day, so a stay never crosses into the next day on any path, the job's or the desk's; the record's times then agree with its charge and with what the auto check-out would have recorded, while `requestedAt` says when the desk closed it ([finding 116](../architecture/findings/116-a-desk-check-out-of-an-overdue-stay-is-charged-up-to-now.md)). 2026-10-21, #102.
- **A visit with no rate, checked out by whoever may not type a price, closes unpriced; whoever may type must.** *Why:* never free, never blocked at the door; the owner prices it later (the owner's answer to Q4, built here rather than after an interim refusal, alternative A1). 2026-10-20, #95.
- **A part left unpaid needs a phone, whose customer is found among those not archived, or created with the name given, else the visit's.** *Why:* a debt always has someone to collect from (data model › Unpaid visit); a found customer keeps the name they have. 2026-10-20, #95.
- **A visit that has a customer keeps it, at the check-out and at a later payment; a phone that is not its customer's is refused (`VISIT_HAS_CUSTOMER`).** *Why:* one rule for an unpaid part, in one helper; another phone would move a customer's debt to someone else ([finding 100](../architecture/findings/100-an-unpaid-check-out-moves-a-visits-customer-to-the-phones.md)). The phone is compared with the visit's customer's own. 2026-10-20, #100.
- **The payment after the check-out is its own route in `desk`, `POST …/payments`, its body naming the visit.** *Why:* the unpaid-part rule lives here, beside the check-out; the body mirrors the ledger's one item, so step 8 adds `subscriptionId` without breaking a client. 2026-10-20, #100.
- **The payment is inserted before the customer is attached.** *Why:* the ledger's refusals (written off, unpriced, above the balance) answer their code before a phone is asked for, and no service repeats them; a 422 on the phone after the insert rolls it back. 2026-10-20, #100.
- **«تسجيل دينًا» is its own `PUT …/visits/:visitId/customer`, not the payment route with no amount.** *Why:* a `POST …/payments` that records no payment would answer "created" for nothing and spend a key; setting a visit's customer is idempotent by design (the same phone finds the same customer under the space's lock), so it needs no key. 2026-10-20, #100.
- **A retried payment answers the first payment, with the visit and the two sums as of now.** *Why:* the desk shows what remains on a weak connection; the sums describe now, as a check-in's warnings do (the owner's answer, Q6 of the plan). 2026-10-20, #100.
- **A check-out of a visit already closed answers it as it is and records nothing; a key that paid another visit is a `conflict`.** *Why:* updates are idempotent by design ([conventions §13](../backend/conventions.md#idempotency)); a reused key is a client's bug. 2026-10-20, #95.
- **A check-out that carries a payment, of a visit another key already closed, is refused (`VISIT_ALREADY_CLOSED`).** *Why:* two desks, or a slow connection, could otherwise each take the cash and only one be recorded; a 200 with `payment: null` reads as success while the money is in no ledger (the owner's decision on #95's review). 2026-10-20, #97.
- **A check-out time before the visit's check-in is refused (`out_of_range`).** *Why:* the database refuses a visit closed before it opened, which would answer 500. 2026-10-20, #97.
- **The write-off is a sub-resource: `POST` writes it off, `DELETE` undoes it; a second of either answers the visit as it is.** *Why:* a repeated write is idempotent by design, as a repeated check-out is, so it needs no key ([conventions §13](../backend/conventions.md#idempotency)); the first reason is kept. 2026-10-20, #100. A delayed retry of one can land after the other and flip the state back; accepted for v1, provided the desk's screen never retries these two routes automatically ([finding 115](../architecture/findings/115-a-write-off-and-its-undo-carry-no-key.md)). 2026-10-21, #102.
- **The balance is read under the visit's lock, and nothing owed is refused (`VISIT_ALREADY_PAID`).** *Why:* two desks can collect the last part while the owner writes the visit off; the one that waits decides on what was committed. 2026-10-20, #100.
- **An unpriced visit is refused with the payment's own code, `VISIT_NOT_PRICED`.** *Why:* one rule — a visit with no price is priced first — so one code (the owner's answer, Q2 of the plan). 2026-10-20, #100.

## Code map

- **API:** `apps/api/src/modules/desk/`, entry `index.ts`: the service, the controller and the manage router. The key's middleware is the platform's (`shared/http`).
- **Shared:** `packages/shared/src/desk/`: the check-out's, the payment's and «تسجيل دينًا»'s requests (`checkOutVisitSchema`, `receivePaymentSchema`, `leaveToCustomerSchema`); the warnings (`DESK_WARNINGS`), the check-out's answer (`VisitCheckOut`) and the payment's (`ReceivedPayment`). The write-off's request (`writeOffVisitSchema`) is `visits`'. The idempotency key's header and schema are in `core`.

## History

### API history

- #95 — the check-in of a visitor by name, idempotent, with its warnings; the check-out with its charge and payment.
- #97 — a payment on a visit another key closed refused; a check-out time before the check-in refused.
- #100 — the owner's write-off of a visit's unpaid rest, and its undo; a visit's payment after its check-out; a visit's customer kept at an unpaid check-out (finding 100); «تسجيل دينًا».
- #102 — a stay checked out after its due time closed and charged at it (finding 116); a customer archived by the owner, unless present.
