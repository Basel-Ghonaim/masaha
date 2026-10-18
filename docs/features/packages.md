# Packages

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-18 · **Owner:** Basel Ghoneim
> **Authority:** The `packages` capability: a space's packages, the subscription templates its owner keeps, private to its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#packages-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no web screen yet.
> **Scope:** the API module `packages` (L2); `@masaha/shared/packages`. No web feature yet.

## What it does

- Keeps a space's packages: a name, a validity in days, optional limits (total days, days a week, hours a day, total hours), a billing (a whole price, or a rate per hour or per day) with its price, an audience, an optional shift of the space, and whether the package is still offered.
- Answers the space's staff every package, retired ones included, in order, whole.
- Lets the owner add a package, placed last.
- Lets the owner edit any of a package's terms, and retire it; a package is never deleted.

## Who uses it

- **The space's owner,** through the API: reads, adds and edits.
- **The space's reception,** through the API: reads them, for the front desk, which will choose from them when it makes a subscription.
- No web screen reads it yet. The public never does: its packages are the space's published prices ([glossary](../project/glossary.md)).

## Responsibility boundary

- **Owns** the `packages` table, the order of a space's packages, and the rule of what an edit changes.
- **Leaves** the space, its lock and its shifts to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the subscriptions made from a package, which copy its terms, to `subscriptions` (not built).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Its list is one of the contract's exceptions to pagination ([api-contract §4](../api/api-contract.md#4-pagination)).
- Its writes ask `can()` at the route, through `requireCan`, then again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)).
- Each change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#packages-managed) gives.
- Its requests are checked by the shared schemas ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The list.** One query reads the space's packages, by place, then by name, retired ones included, each saying whether it is offered.

**Add.** In one transaction: the space's lock; `can()` on the links as they are under it; the package written after the last, active; its audit entry. A name another package of the space holds, retired or not, is refused by the database's key; so is a shift that is not one of the space's. Each refusal names its field.

**Edit.** The same lock and `can()`, then the package, found among the space's own; only the fields the edit sets to a new value are written and audited, `null` clearing a limit or the shift. An edit that changes nothing writes nothing. Retiring is the same edit, `isActive: false`; a retired package stays listed, and `true` offers it again.

A retired package keeps its shift: the shift's own save refuses to remove a shift anything names ([finding 81](../architecture/findings/81-a-retired-package-that-keeps-its-shift-stops-the-owner-from-removing-that-shift.md)), so clearing it on the retired package — `PATCH { shiftId: null }` — is the way out.

## Decisions

### API decisions

- **A package is private to the space's staff: no public route reads it** (D7). *Why:* the public's packages are the space's published prices; the module has no public router. 2026-10-18, #87.
- **The list answers every package, retired ones included, whole** (D5). *Why:* the owner's list shows the retired ones and the desk's picker offers the active ones; a space keeps tens at most, typed by hand. 2026-10-18, #87.
- **The order is a package's place, then its name; no route reorders them** (D4). *Why:* the design orders nothing by hand; the name orders the rows written outside the API. 2026-10-18, #87.
- **The read is one query, with no lock.** *Why:* one statement is never half of a change; the boundary has admitted the caller. 2026-10-18, #87.
- **A new package is active, placed after the last** (D4). *Why:* as a new lookup row; the design's switch sits on the row, not in the sheet. 2026-10-18, #87.
- **The writes are the owner's: refused at the route before the body is read, then decided again under the space's lock, on the links read there** (D1). *Why:* reception reads packages for the desk but never changes them ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)); a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-18, #87.
- **A package's price is above zero,** in whole agorot up to the prices' bound (the owner's DI-10). *Why:* as a space's prices: a free offer is an announcement. The database still takes zero until the desk's migration ([finding 80](../architecture/findings/80-the-database-still-takes-a-package-with-a-price-of-zero.md)). 2026-10-18, #87.
- **A name is the package's own within its space, retired ones included,** refused on its field by the database's key, in the write's own transaction (the owner's O8). *Why:* the desk tells packages apart by name; no check before the write can race it. 2026-10-18, #87.
- **One name, 1–60 characters, in whatever language the owner types** (the model). *Why:* the owner's label for their own staff, as long as a price's label. 2026-10-18, #87.
- **The shift is one of the space's own, as the database's key holds it** (D6). *Why:* the key through `(shiftId, spaceId)` refuses another space's shift; `packages` reads no shift, as `spaces` reads no package ([spaces › Decisions](spaces.md#api-decisions)). 2026-10-18, #87.
- **The limits combine freely, each only bounded** ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)). *Why:* they only warn at check-in. 2026-10-18, #87.
- **Each create is audited, `package.created`, with its terms** (D8). 2026-10-18, #87.
- **No idempotency key on a create.** *Why:* a package is the owner's setup, not a desk create ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)); a create retried after a lost answer meets its own name, and the list shows it. 2026-10-18, #87.
- **A package is retired, never deleted:** `isActive: false`, and offered again with `true` (D1, the model). *Why:* the subscriptions made from it name it. 2026-10-18, #87.
- **An edit writes and audits only what it changes, `package.edited`, the flag included; one that changes nothing writes nothing** (D8). *Why:* as the space profile's edit; one entry per edit, since a package's flag has no public effect. 2026-10-18, #87.
- **Editing or retiring a package changes no subscription** (D9). *Why:* a subscription copies its terms when it is made ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)). 2026-10-18, #87.

## Code map

- **API:** `apps/api/src/modules/packages/`, entry `index.ts`: the service, the repository, the mapper, the manage router, and beside them the pure rule of a package's terms and of what an edit changes (`packageTerms.ts`).
- **Shared:** `packages/shared/src/packages/`: the requests, with the billings and the limits' bounds, and the response.

## Open findings

- [80](../architecture/findings/80-the-database-still-takes-a-package-with-a-price-of-zero.md): the database still takes a package of price zero.

## History

### API history

- #87 — a space's packages, on the API: listed whole to its staff, added and edited by its owner, retired rather than deleted.