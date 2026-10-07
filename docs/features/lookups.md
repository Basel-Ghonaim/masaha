# Lookups

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** The `lookups` capability: the bilingual lists of governorates, areas and amenities, the admin's screen that keeps them, and the public catalogue. Its endpoints are owned by the [API contract](../api/api-contract.md#lookups-public); its entities by the [data model](../architecture/data-model.md#lookups).
> **Scope:** the API module `lookups` (L0); `@masaha/shared/lookups`; the web feature `features/lookups`, for the admin.

## What it does

- Holds the place list, governorate then area, which covers the Gaza Strip, and the amenities a space may offer, each in Arabic and English, in an order the admin sets, with an active flag. Nothing is deleted: a row is hidden and restored.
- Lets the admin add, rename, hide, restore and order the governorates, the areas and the amenities, on the dashboard's lookups page.
- Answers the public catalogue: what a form or a filter may offer, active rows only.
- Offers the one field that chooses a governorate or one of its areas, which the admin's spaces list sets in its filters.
- Answers the modules above it: the names of a set of areas, whether an area may take a space, the ids of a governorate's areas, and which amenities are active.

## Who uses it

- **The admin**, on the dashboard's lookups page, and through the place field of the spaces list ([space-links](space-links.md)).
- **Anyone,** through the public catalogue. No page of the site reads it yet.
- **Other modules:** `spaces` checks a space's area and names it; `space-links` names the areas of the spaces it lists and resolves a governorate filter to its areas.

## Responsibility boundary

- **Owns** the `governorates`, `areas` and `amenities` tables, the order of each list, and the amenity icon keys ([`@masaha/shared/lookups`](../architecture/shared-package.md)).
- **Leaves** a space's own amenities to `spaces`, and "publicly listed", which reads both flags of a space's area, to the [data model](../architecture/data-model.md#derived-values-computed-not-stored).
- **Leaves** the icons themselves to the design system, which draws each by its glyph's name and does not import the keys.

## How it composes the platform

- The admin's router sits inside `/admin`, behind the one guard there ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Its changes are audited by the audit writer ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#lookups-the-admin) gives.
- Its lists are the contract's exceptions to pagination ([api-contract §4](../api/api-contract.md#4-pagination)).
- The web reads through the transport and TanStack Query under the admin's key scope ([architecture §7](../frontend/architecture.md#7-server-state)); its forms follow `shared/forms` ([architecture › Forms](../frontend/architecture.md#forms)).

## Behaviour and flows

**The admin's screen.** The lookups page sets two tabs under its title, "Governorates and areas" first, then "Amenities", with the page's hint under them; the tab shown is kept in the address (`?tab=amenities`), a missing or unknown one opening the first. Each tab holds one section; the panel left is unmounted, so its failures go with it, while a write already sent completes. `GovernoratesSection` shows every governorate, hidden ones included, as a card with its areas in order:
- a sheet adds or renames a governorate or an area;
- each row can be hidden or restored, and moved up or down its list;
- the section shows its own loading, failure (with "Try again") and empty states.

`AmenitiesSection` shows every amenity, retired ones included, in order, in one card:
- each row shows the amenity's icon, its name in the interface's language with the other as its second line, and a badge when the directory's filter leaves it out or it is retired;
- each row has two switches, "In filters" and "Active", each named after its amenity with its words beside it, its arrows, and Edit;
- a sheet adds or edits an amenity: its names, its icon, chosen from a grid of the eight, and both its flags; a new one is in the filters until switched off, and its key, which the server derives from its English name, is never shown;
- the section shows its own loading, failure (with "Try again") and empty states.

Nothing changes before the server answers. A write stays pending until the list has been fetched again, and the next action starts from the server's list. While a list's order is pending, every arrow of that list waits, so two orders never race; a card waits out a 429 with every control. A failure stands until the next action on its row or list, whatever fails elsewhere: a governorate's or an area's shows in its governorate's card; an amenity's shows in its own row, and an order of the amenities' in their card, above the list. The amenities' card waits out a 429 on any of its rows or its list until that count ends, whatever fails after it. A 409 on an order means the list changed meanwhile: the list is fetched again, and the card says so. The screen fires no toasts.

**The place field.** `GovernorateAreaSelect` offers "All areas", then each governorate followed by its areas, in order, named in the interface's language; each governorate's options are a group named after it, its areas indented. It reads the admin's lists, so hidden governorates and areas are offered too, marked "(hidden)". While they load, or once they have failed, one disabled option says so, and "All areas" stays. It takes its value and hands back the choice, a governorate's id or an area's, and sits in the Field of the list that sets it, which the page hands it to.

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
- **The web exports one section per list** that owns its query, its states and its actions. *Why:* pages compose sections, side by side or under tabs. 2026-10-06, #43, #49.
- **The admin's keys start `['admin', 'lookups', …]`.** *Why:* the admin sees hidden rows, which the public's lists leave out. 2026-10-06, #43.
- **No optimistic update:** a write is pending until the list is fetched again. *Why:* the next action starts from the server's list. 2026-10-06, #43.
- **A pending order holds every arrow of its list.** *Why:* two orders of one list would race. 2026-10-06, #43.
- **A governorate's or an area's failure stays in its card** until the next action there; a 409 on an order fetches the list again; no toasts, the amenities' included. 2026-10-06, #43, #45, #49.
- **An amenity's failure shows in its row; an order's, above the list.** *Why:* the amenities have no card per row, so a failure shown once for the list would not name its amenity, and a later failure elsewhere would hide it. 2026-10-07, #49.
- **The public catalogue** is the active governorates with their active areas, and the active amenities, in order and unpaginated. *Why:* a bounded catalogue that forms and filters offer whole. 2026-10-06, #44.
- **An amenity's icon is drawn by its key, as a glyph's name** (the design system's `GlyphIcon`), and the web's typecheck refuses a key the design system cannot draw. *Why:* the directory can draw the same icons without importing this feature, and the design system still knows nothing of amenities ([finding 10](../architecture/findings.md#10-the-seeded-amenity-icon-keys-have-no-icons-in-the-design-system-yet), resolved). 2026-10-07, #49.
- **An amenity shows its name in the interface's language first,** the other as its second line. *Why:* amenities are common words; the governorates' English-first rule was made for place names. 2026-10-07, #49.
- **An amenity's icon is chosen from a visible grid,** a radio group of the eight, each named. *Why:* one of a set, along the arrow keys; filter chips are for filters. 2026-10-07, #49.
- **A new amenity starts with no icon chosen, and its icon is required.** *Why:* a preselected icon would let the admin save the wrong one unnoticed; the choice is deliberate. 2026-10-07, #49.
- **The amenities' hooks mirror the governorates', one per operation,** with no hook factory across the lists. *Why:* two lists are too few to generalise. 2026-10-07, #49.
- **An amenity's two switches sit in its row, each pending on its own write; its arrows wait only on an order.** A governorate's or an area's arrows also wait on its switch; a new admin list copies the amenities'. *Why:* an order sends ids alone, so it cannot race a change of a flag. 2026-10-07, #49.
- **The page's two sections sit under tabs, the tab kept in the address;** choosing one replaces the address, and the first tab takes no parameter. *Why:* a link or a reload opens the same tab, and Back leaves the page rather than stepping through tabs. The governorates' section needed no change to sit under a tab. 2026-10-07, #49.
- **The place field is exported as UI** that another capability's filter sets, its value and its choice passed by the page. *Why:* the governorates and their areas are this capability's fact, shown the same way wherever a place is chosen; the list that filters on it stays its own capability's. 2026-10-07, #50.
- **The place field offers the admin's lists, hidden rows included and marked.** *Why:* a hidden governorate's or area's spaces still exist, and the admin must be able to find them; it also shares the lookups page's cache. 2026-10-07, #50.
- **The amenities' actions have their own key prefix,** `['admin', 'lookups', 'amenity', …]`. *Why:* neither list reads the other's pending or failed actions. 2026-10-07, #49.

## Code map

- **API:** `apps/api/src/modules/lookups/`, entry `index.ts`: a folder per list (`governorates/`, `areas/`, `amenities/`) and one for the public `catalogue/`; the pure rules beside them (the exact order, a lookup's change and its audit entries, the list order); the public and admin routers.
- **Shared:** `packages/shared/src/lookups/`: the requests, the responses and the icon keys.
- **Web:** `apps/web/src/features/lookups/`, entry `index.ts` (`GovernoratesSection`, `AmenitiesSection`, `GovernorateAreaSelect`), mounted by `pages/dashboard/admin/`; an amenity's icon through `components/AmenityIcon.tsx`; the place field in `components/place/` and `hooks/place/`.

## Open findings

None.

## History

- #16 — the amenities' filter flag.
- #27 — the amenity icon keys in `packages/shared`.
- #34 — the shared package split by capability.
- #36 — area names for the caller's spaces.
- #41 — the admin's lookups API.
- #43 — the admin's governorates screen.
- #44 — the public catalogue, and what `spaces` and `space-links` read.
- #45 — duplicate English names accepted.
- #49 — the admin's amenities, and the icon drawn by its key.
- #50 — the place field of the admin's spaces list.
