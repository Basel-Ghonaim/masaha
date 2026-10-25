# Customers

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-25 · **Owner:** Basel Ghoneim
> **Authority:** The `customers` capability: everyone a space keeps on file. Its endpoints are owned by the API contract ([Customers (managed)](../api/api-contract.md#customers-managed)); its entity by the [data model](../architecture/data-model.md#operations). The API is built; on the web, [desk](desk.md) shows the customers.
> **Scope:** the API module `customers` (L2); `@masaha/shared/customers`. No web feature of its own: [desk](desk.md)'s screens read and write it.

## What it does

- Creates a customer of the space with a name and an optional phone, once per idempotency key.
- Edits a customer's name and phone; clearing the phone is allowed; an archived customer is not edited.
- Restores an archived customer, as the owner, unless another customer now holds their phone; archives one for the desk, which decides whether they may be ([desk](desk.md)).
- Keeps one phone to one customer of the space that is not archived.
- Answers a page of the space's customers kept to the ids the desk's filters resolved, searched by a name, a whole phone number or a phone's last digits, by name ([desk](desk.md)).
- Answers the names the desk shows, and finds or creates the customer an unpaid visit is left to, by phone ([desk](desk.md)).

## Who uses it

- **The space's owner and reception,** through the API. The admin never reaches it: customers are private from the admin ([ADR 0002](../architecture/decisions/0002-authorization-model.md)). On the web, the desk's search reads the list's search (`GET …/customers?q`, the first six) — [desk](desk.md), 2026-10-25, #119; «الزبائن» reads the list, 20 a page, searched and filtered — [desk](desk.md), 2026-10-25, #122.
- **The front desk** ([desk](desk.md)), which leaves an unpaid visit to a customer found or created by phone, in its own transaction.
- **[`occupancy`](occupancy.md),** which names the customers present.
- **[`subscriptions`](subscriptions.md),** which reads its check-ins' customers' names and phones.
- **[`payments`](payments.md),** which names a subscription's customer in the payments it answers.

## Responsibility boundary

- **Owns** the `customers` table, its idempotency key, the phone's uniqueness among those not archived, the archive's column, and the customer's audit entries.
- **Leaves** the archive's decision (who is present) to [`desk`](desk.md); the space's lock to [`spaces`](spaces.md); who may act to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization)); the create and the edit ask `can()`'s `customers.manage` (the staff's), and the restore `customers.archive` (the owner's), at the route, before the body is read, the create then reading its `Idempotency-Key` ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)).
- Each runs its own transaction, which takes the space's lock first and asks `can()` again on the links read under it.
- Each change is audited by the audit writer, in its transaction ([conventions §6](../backend/conventions.md#6-audit)).

## Behaviour and flows

**The create.** In one transaction, in this order: the space's lock; `can()` on the links read under it; the customer this key already made, answered as it is now, for a retry; a phone another customer of the space holds, not archived → `PHONE_TAKEN`; the customer, with the key; `customer.created`.

**The edit.** In one transaction: the space's lock and `can()`; the customer, found among the space's own (else `not_found`), not archived (else `CUSTOMER_ARCHIVED`); only the fields set to a new value (`customerChange`, pure), `null` clearing the phone; a new phone another customer holds → `PHONE_TAKEN`; `customer.edited` with only what changed. An edit that changes nothing writes nothing.

**The page.** One raw query and its count: archived or not; `q` by `searchTermsOf` (pure) — a whole number `normalisePhone` reads, that phone exactly; else digits only, two or more once a phone's separators are removed, the end of the phone's digits; else the name, through the directory's `masaha_search_text`; each id list a filter resolved to, one array parameter read as a set (`IN (SELECT unnest(…))`); by name, then id.

**The archive and the restore.** The archive is the desk's transaction, which asks this module to set the column now, audited `customer.archived`. The restore is this module's: the space's lock and `can()` (`customers.archive`); the customer, the space's; one not archived answered as it is; a phone another customer now holds → `PHONE_TAKEN`; the column cleared, audited `customer.restored` with when they were archived.

## Decisions

### API decisions

- **A customer's creation carries the client's idempotency key, nullable.** *Why:* the desk may resend a create on a weak connection ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), rule 4); a customer the desk creates from an unpaid visit's phone is made under that check-out's or payment's key, so it carries none of its own. 2026-10-21, #102.
- **A phone another customer holds is refused `PHONE_TAKEN` on its field, read under the space's lock before the write.** *Why:* inside a transaction the unique index's violation would abort it; the read under the lock is race-free, and the index stays the backstop. 2026-10-21, #102.
- **Only the owner archives and restores; an archived customer is not edited until restored (`CUSTOMER_ARCHIVED`), and their phone is free.** *Why:* the owner's decision ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)); an archived customer is history, kept with their records and debts, and a restore must not make two customers share a phone. 2026-10-21, #102.
- **The create, the edit and the restore are this module's own routes; the list, the file and the archive are the desk's.** *Why:* a write of one module is its own router; a read or a write that spans modules is the desk's (conventions §9). 2026-10-21, #102.

### Web decisions

- **The customers list's filters and page live in the address** (S11): `q`, `status` (`ARCHIVED` read for the owner only), `kind`, `payment` and `page` (from 2), each read by the contract's own rule, so a value the server would refuse falls back; a change replaces the address and returns to page 1. *Why:* a link, a reload or Back shows the same list, and Back leaves the page rather than stepping through filters. 2026-10-25, #122.

## Code map

- **API:** `apps/api/src/modules/customers/`, entry `index.ts`: the service, the repository, the mapper, the controller and the manage router, the edit's change (`customerChange.ts`) and the search term's rule (`customerSearch.ts`), both pure.
- **Shared:** `packages/shared/src/customers/`: the requests (`createCustomerSchema`, `updateCustomerSchema`) and the response (`Customer`).

## History

### API history

- #94 — the names of the customers present, for `occupancy`.
- #95 — a customer found or created by phone for an unpaid visit.
- #102 — a customer created, idempotent, and edited by the staff; the customers' key; a customer archived (for the desk) and restored by the owner; the list's page and its search.
- #106 — the search finds a whole phone in any form (a local, international or separated number).
- #109 — a whole phone is also found stored under the other country code (by its national digits); the contacts of a set of customers, for the check-ins' lists.
