# Lookups

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The `lookups` capability: the bilingual lists of governorates, areas and amenities, the admin's screen that keeps them, and the public catalogue. Its endpoints are owned by the [API contract](../api/api-contract.md#lookups-public); its entities by the [data model](../architecture/data-model.md#lookups).
> **Scope:** the API module `lookups` (L0); `@masaha/shared/lookups`; the web feature `features/lookups`, for the admin.

## What it does

- Holds the place list, governorate then area, which covers the Gaza Strip, and the amenities a space may offer, each in Arabic and English, in an order the admin sets, with an active flag. Nothing is deleted: a row is hidden and restored.
- Lets the admin add, rename, hide, restore and order the governorates, the areas and the amenities, through the API. The web screen keeps the governorates and their areas.
- Answers the public catalogue: what a form or a filter may offer, active rows only.
- Answers the modules above it: the names of a set of areas, whether an area may take a space, and the ids of a governorate's areas.

## Who uses it

- **The admin**, on the dashboard's lookups page, and through the API for the amenities.
- **Anyone,** through the public catalogue. No page of the site reads it yet.
- **Other modules:** `spaces` checks a space's area and names it; `space-links` names the areas of the spaces it lists and resolves a governorate filter to its areas.

## Responsibility boundary

- **Owns** the `governorates`, `areas` and `amenities` tables, the order of each list, and the amenity icon keys ([`@masaha/shared/lookups`](../architecture/shared-package.md)).
- **Leaves** a space's own amenities to `spaces`, and "publicly listed", which reads both flags of a space's area, to the [data model](../architecture/data-model.md#derived-values-computed-not-stored).
- **Leaves** the icons themselves to the design system, which does not import the keys.

## How it composes the platform

- The admin's router sits inside `/admin`, behind the one guard there ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Its changes are audited by the audit writer ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#lookups-the-admin) gives.
- Its lists are the contract's exceptions to pagination ([api-contract §4](../api/api-contract.md#4-pagination)).
- The web reads through the transport and TanStack Query under the admin's key scope ([architecture §7](../frontend/architecture.md#7-server-state)); its forms follow `shared/forms` ([architecture › Forms](../frontend/architecture.md#forms)).

## Behaviour and flows

**The admin's screen.** The lookups page sets `GovernoratesSection` under its title. The section shows every governorate, hidden ones included, as a card with its areas in order:
- a sheet adds or renames a governorate or an area;
- each row can be hidden or restored, and moved up or down its list;
- the section shows its own loading, failure (with "Try again") and empty states.

Nothing changes before the server answers. A write stays pending until the list has been fetched again, and the next action starts from the server's list. While a list's order is pending, every arrow of that list waits, so two orders never race; a card waits out a 429 with every control. A row's failure shows in its card until the next action on that row or list. A 409 on an order means the list changed meanwhile: the list is fetched again, and the card says so. The screen fires no toasts.

**The public catalogue** answers what a form or a filter may offer, active rows only ([the contract](../api/api-contract.md#lookups-public)).

## Decisions

- **The amenity icon keys live in `packages/shared`,** and the design system does not import them. *Why:* the key is a contract between the client and the server. 2026-10-02, #27.
- **The admin's guard is mounted once, on `/admin`;** the lookups services call no `can()`. *Why:* a new admin router cannot forget the guard. 2026-10-06, #41.
- **The lists are not paginated.** *Why:* they are bounded catalogues of tens of rows, shown whole and grouped. 2026-10-06, #41.
- **An order is the whole list of its scope,** applied in one transaction, exact or 409, and safe to repeat. *Why:* a missing, extra or repeated id means the list changed since it was read. 2026-10-06, #41.
- **Hiding and restoring are `isActive` in the same edit;** hiding a governorate leaves its areas' own flags alone. 2026-10-06, #41.
- **No new domain codes:** a duplicate is 409 with `not_unique` on the field. *Why:* the existing codes suffice. 2026-10-06, #41.
- **Duplicate English names are allowed.** *Why:* the lists are small and seen whole, so a repeat is seen where it is made ([finding 30](../architecture/findings.md#30-a-lookups-english-name-is-not-unique), accepted). 2026-10-06, #45.
- **An amenity's key derives from its English name when it is added,** and never changes. 2026-10-06, #41.
- **A new row is placed last.** 2026-10-06, #41.
- **Internet and stable power are not filters** (`isFilterable` off). *Why:* nearly every space has them, so they tell no space apart. 2026-09-30, #16.
- **The web exports one section** that owns its query, its states and its actions. *Why:* pages compose sections, side by side or under tabs. 2026-10-06, #43.
- **The admin's keys start `['admin', 'lookups', …]`.** *Why:* the admin sees hidden rows, which the public's lists leave out. 2026-10-06, #43.
- **No optimistic update:** a write is pending until the list is fetched again. *Why:* the next action starts from the server's list. 2026-10-06, #43.
- **A pending order holds every arrow of its list.** *Why:* two orders of one list would race. 2026-10-06, #43.
- **A row's failure stays in its card** until the next action there; a 409 on an order fetches the list again; no toasts. 2026-10-06, #43, #45.
- **The public catalogue** is the active governorates with their active areas, and the active amenities, in order and unpaginated. *Why:* a bounded catalogue that forms and filters offer whole. 2026-10-06, #44.

## Code map

- **API:** `apps/api/src/modules/lookups/`, entry `index.ts`: a folder per list (`governorates/`, `areas/`, `amenities/`) and one for the public `catalogue/`; the pure rules beside them (the exact order, a lookup's change and its audit entries, the list order); the public and admin routers.
- **Shared:** `packages/shared/src/lookups/`: the requests, the responses and the icon keys.
- **Web:** `apps/web/src/features/lookups/`, entry `index.ts` (`GovernoratesSection`), mounted by `pages/dashboard/admin/`.

## Open findings

- [10](../architecture/findings.md#10-the-seeded-amenity-icon-keys-have-no-icons-in-the-design-system-yet): the map from an icon key to its icon is not built.

## History

- #16 — the amenities' filter flag.
- #27 — the amenity icon keys in `packages/shared`.
- #34 — the shared package split by capability.
- #36 — area names for the caller's spaces.
- #41 — the admin's lookups API.
- #43 — the admin's governorates screen.
- #44 — the public catalogue, and what `spaces` and `space-links` read.
- #45 — duplicate English names accepted.
