# Packages

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-18 · **Owner:** Basel Ghoneim
> **Authority:** The `packages` capability: a space's packages, the subscription templates its owner keeps, private to its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#packages-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no web screen yet.
> **Scope:** the API module `packages` (L2); `@masaha/shared/packages`. No web feature yet.

## What it does

- Keeps a space's packages: a name, a validity in days, optional limits (total days, days a week, hours a day, total hours), a billing (a whole price, or a rate per hour or per day) with its price, an audience, an optional shift of the space, and whether the package is still offered.
- Answers the space's staff every package, retired ones included, in order, whole.

## Who uses it

- **The space's owner,** through the API: reads.
- **The space's reception,** through the API: reads them, for the front desk, which will choose from them when it makes a subscription.
- No web screen reads it yet. The public never does: its packages are the space's published prices ([glossary](../project/glossary.md)).

## Responsibility boundary

- **Owns** the `packages` table and the order of a space's packages.
- **Leaves** the space, its lock and its shifts to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the subscriptions made from a package, which copy its terms, to `subscriptions` (not built).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Its list is one of the contract's exceptions to pagination ([api-contract §4](../api/api-contract.md#4-pagination)).

## Behaviour and flows

**The list.** One query reads the space's packages, by place, then by name, retired ones included, each saying whether it is offered.

## Decisions

### API decisions

- **A package is private to the space's staff: no public route reads it** (D7). *Why:* the public's packages are the space's published prices; the module has no public router. 2026-10-18, #87.
- **The list answers every package, retired ones included, whole** (D5). *Why:* the owner's list shows the retired ones and the desk's picker offers the active ones; a space keeps tens at most, typed by hand. 2026-10-18, #87.
- **The order is a package's place, then its name; no route reorders them** (D4). *Why:* the design orders nothing by hand; the name orders the rows written outside the API. 2026-10-18, #87.
- **The read is one query, with no lock.** *Why:* one statement is never half of a change; the boundary has admitted the caller. 2026-10-18, #87.

## Code map

- **API:** `apps/api/src/modules/packages/`, entry `index.ts`: the service, the repository, the mapper and the manage router.
- **Shared:** `packages/shared/src/packages/`: the requests, with the billings and the limits' bounds, and the response.

## Open findings

- None.

## History

### API history

- #87 — a space's packages, on the API: listed whole to its staff.