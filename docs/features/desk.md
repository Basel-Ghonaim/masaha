# Desk

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** The `desk` capability: the front desk's orchestrations, each across the desk's modules in one transaction. Its endpoints are owned by the API contract ([Front desk (managed)](../api/api-contract.md#front-desk-managed)); its rules by [conventions › the front desk](../backend/conventions.md#the-front-desk-desk) and [§13](../backend/conventions.md#13-idempotency-and-concurrency). The API is built; no web screen yet.
> **Scope:** the API module `desk` (L5); `@masaha/shared/desk`. No web feature yet.

## What it does

- Checks a visitor in, with what the check-in warns of: the space full, or outside its hours.
- Answers a retried check-in the visit its idempotency key already made.

## Who uses it

- **The space's owner and reception,** through the API. The admin never reaches it: the desk is private from the admin ([ADR 0002](../architecture/decisions/0002-authorization-model.md)). No web screen yet; the shared desk device is not settled (who signs out an idle reception account, and switching staff on one device): step 9.

## Responsibility boundary

- **Owns** the orchestration: the transaction, its order, the space's lock and `can()` on the links read under it, and the retry's lookup before any write.
- **Leaves** the visit, its rates and its audit to [`visits`](visits.md); the warnings to [`occupancy`](occupancy.md); the lock to [`spaces`](spaces.md); who may act to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization)).
- Each write asks `can()` (`attendance.record`, the staff's) at the route, then reads its `Idempotency-Key`, both before the body is read; the service asks `can()` again under the space's lock.

## Behaviour and flows

**The check-in.** In one transaction, in this order: the space's lock; `can()` on the links as they are under it; the warnings as of now; the visit this key already made, for a retry; else the visit, with its rates (through `visits`). Answered 201 every time, the warnings in `meta` only when there are some.

## Decisions

### API decisions

- **A desk write takes the space's lock first, and decides `can()` on the links read under it.** *Why:* a reception link ended meanwhile must refuse ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)); the lock also serialises the space's desk creates. 2026-10-20, #95.
- **A retry is found by its key first, under the space's lock; the unique key is only the backstop.** *Why:* inside a transaction PostgreSQL aborts on the unique violation, so the first record could not be read after it; under the lock the read is race-free ([conventions §13](../backend/conventions.md#idempotency)). 2026-10-20, #95.
- **The warnings never refuse; a retry answers them as of now, the visit counted present.** *Why:* the desk decides; the warnings describe now, not the visit, so storing them would add a column for advice — ADR 0015's "same body", weakened for them only (the owner's answer, §13 Q8 of the desk's plan). 2026-10-20, #95.
- **The key is read from the `Idempotency-Key` header by a route middleware, before the body.** *Why:* a request without one is a client's bug, refused before anything is read. 2026-10-20, #95.

## Code map

- **API:** `apps/api/src/modules/desk/`, entry `index.ts`: the service, the controller and the manage router. The key's middleware is the platform's (`shared/http`).
- **Shared:** `packages/shared/src/desk/`: the warnings (`DESK_WARNINGS`). The idempotency key's header and schema are in `core`.

## History

### API history

- #95 — the check-in of a visitor by name, idempotent, with its warnings.
