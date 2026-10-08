# Space Links

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** The `space-links` capability: a user's links to spaces and their role at each ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)), as the session, the caller's own list, the space switcher, the admin's spaces list and the links loader use them. Its endpoints are owned by the [API contract](../api/api-contract.md#managed-spaces); the `SpaceManager` entity and "verified" by the [data model](../architecture/data-model.md#spaces).
> **Scope:** the API module `space-links` (L2); `@masaha/shared/space-links`; the web feature `features/space-links`, dashboard-only.

## What it does

- Gives the session a user's active links, with the role at each, oldest first.
- Lists the spaces the caller works at, with their names, area and role there.
- Shows the space switcher in a space's dashboard.
- Composes the admin's spaces list: its filters, its owners and its verified state; and shows it on the dashboard's spaces page, with its filters kept in the address.
- Loads a space's links for the routes on one space, so `can()` knows the caller's role there and whether the space is verified.

Staff (reception accounts) and linking owners are not built.

## Who uses it

- **Every signed-in user with links,** through the switcher and the session's links, which the dashboard's guards and landing read.
- **The admin,** through the spaces list, on the dashboard's spaces page, and the admin's routes on one space.
- **`auth`,** which puts the links in every `Session` it builds.

## Responsibility boundary

- **Owns** the `space_managers` table, the role at a space, and whether a space is verified (an active `OWNER` link).
- **Leaves** a space's facts, the listing's own filters and the pagination to [`spaces`](spaces.md), and a governorate's areas to [`lookups`](lookups.md); it asks each for ids or names, one query per module.
- **Leaves** the access decision to `can()` and the space middleware ([conventions › Space access](../backend/conventions.md#space-access)); no module imports `space-links` to learn its access.
- **Leaves** routing to the platform: the space guard, the landing and the last space are [frontend architecture §2](../frontend/architecture.md#landing-and-guards)'s. The switcher only navigates: the selected space is the URL's ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).

## How it composes the platform

- **The caller's spaces** use the `me` router at `/manage/spaces`, behind `requireAuth` only: the path names no space, so the space middleware does not run.
- **The links loader** is `shared/auth`'s, wired with this module's links. On the admin's space routes it runs without its refusal ([conventions › Space access](../backend/conventions.md#space-access)).
- **The admin's spaces list** is a composed read ([conventions › Composed reads](../backend/conventions.md#composed-reads)). Each filter on another module's value is resolved to ids first: the verified state from the links, here, and a governorate to its areas, by `lookups`. `spaces` then applies its own filters (hidden, stale, the area, the search) to those ids and pages ([conventions §5](../backend/conventions.md#5-pagination)). The page's owners, their names (from `users`) and its areas' names follow, one query per module.
- **The web** reads through the transport and TanStack Query, the caller's spaces under the user's own key scope and the admin's list under the admin's ([architecture §7](../frontend/architecture.md#7-server-state)); the dashboard-only rule keeps it out of the site's download ([architecture §3](../frontend/architecture.md#3-capabilities-features)).
- **The admin's list on the web** is one section that the spaces page sets, with two slots it fills from other capabilities: each row's actions, from [`spaces`](spaces.md), and the place field, from [`lookups`](lookups.md) ([architecture › What a feature exports](../frontend/architecture.md#what-a-feature-exports)). Its filters and page live in the address ([architecture › Where state lives](../frontend/architecture.md#where-state-lives)).

## Behaviour and flows

**The session's links** are the user's active links, oldest first, without those to a soft-deleted space. **The caller's spaces** are the same links with each space's slug, names and area, a hidden space included.

**The switcher** sits in the space's sidebar header. It shows the space in the URL, its name and area. For anyone with more than one active link, whatever their role at each, it opens their spaces, and choosing one follows the link the page gives it. A URL whose space is none of theirs offers their spaces. While the spaces load it shows a skeleton; a failure offers to try again, and a failed refetch keeps the list already loaded. The space's shell also reads the list for the space's slug, which its public page link needs.

**The admin's list** is composed as above, one page at a time; its rows are the [contract](../api/api-contract.md#spaces-the-admin)'s.

**The admin's list on the web.** `AdminSpacesList` shows the search and the filters, then the page's spaces: a table from 768 px (the name, the area, the state, the owners, the freshness, the last update and the row's actions), with the count the filters keep and the pages under it; on a phone, a card per space with the same facts, the search in view and the other filters in a bottom sheet behind a "Filters" button that counts them.
- **The filters:** part of a name, typed and written once typing pauses; one "Governorate / area" field; the state; and "Stale data only". Each applies at once and returns to the first page.
- **The address** keeps them, `?q=&status=&governorate=&area=&stale=true&page=`, so a reload, a link or Back shows the same list. Each is read by the contract's own rule, so a value the server would refuse falls back to its default; an area wins over a governorate; the defaults are left out. A filter replaces the address; the pages are links. A page past the last, as after deleting its last row, shows the last page. A governorate or an area the address names by a valid id that no place has leaves the place field blank and the list empty, and "Clear filters" recovers it.
- **A row** names the space in the interface's language, an English-only name marked as English in the Arabic interface; its area; its state on a badge (verified, unverified, hidden); its owners, or for none a dash read aloud as "No owner"; its freshness, the stale groups and the missing ones on a badge each, or "Up to date"; and its last update, the day and the month, with the year when it is not this one, on Gaza's calendar.
- **Its states:** placeholder rows while the first page loads; while another page or filter loads, the rows and the pages shown stay, the list marked busy, so a page chosen from the keyboard keeps the focus; a failure, with its reference and "Try again", which waits out a 429; "No spaces yet"; and, while a filter applies, "No spaces match the filters", with a button that clears them all. A failed refetch keeps the rows.
- **The focus:** when the row that held it leaves the list, as a deleted space's does, the focus moves to the list rather than being lost.

## Decisions

- **The caller's spaces are open to any signed-in user:** the active links with the role at each, oldest first. *Why:* the path names no space, so no space middleware applies. 2026-10-04, #36.
- **A hidden space is listed; a deleted one is not.** *Why:* an owner still manages a hidden space. 2026-10-04, #36.
- **Names come in both languages, with the area's;** a retired area still names its spaces. 2026-10-04, #36.
- **The list is composed from three modules, one query each.** *Why:* the module levels, and no N+1. 2026-10-04, #36.
- **A link to a deleted space counts for nothing,** in the session's links too; deleting a space writes nothing in the links. *Why:* the delete stays reversible, and a restored space has its links again. It replaced #36's open question, under which the two lists disagreed ([finding 18](../architecture/findings.md#18-whether-a-link-to-a-deleted-space-still-counts)). 2026-10-06, #44.
- **The web reads under `['me', 'spaces']`.** *Why:* the user's own data, in its key scope. 2026-10-04, #36.
- **`space-links` is dashboard-only** on the web. 2026-10-05, #39.
- **The switcher lives in this capability:** name and area, the other spaces, navigation on a choice, a skeleton, a retry. 2026-10-05, #39.
- **An English-only name shows marked `lang="en"` in the Arabic interface.** *Why:* the space name's language rule ([localisation › Content in two languages](../frontend/localisation.md#content-in-two-languages)). 2026-10-06, #44.
- **The admin's spaces list is composed here:** the verified and governorate filters resolve to ids first, then `spaces` filters and pages; each row carries its owners, its stale groups and its last update. *Why:* every page full, and the total right. 2026-10-06, #44.
- **The list's states are lowercase, like its filter.** *Why:* one vocabulary. 2026-10-06, #44.
- **The admin's list on the web is one section with two slots, filled by the page:** each row's actions and the place field. *Why:* the page mixes three capabilities, so it composes them, and no feature imports another ([architecture §3](../frontend/architecture.md#what-a-feature-exports)); the edit screen and the owner's screens can reuse the seam. 2026-10-07, #50.
- **The list's filters and page live in the address,** each read by the contract's own rule, an invalid one falling back to its default; a filter replaces the address and returns to the first page, the pages are links. *Why:* a reload, a link or Back shows the same list, and Back leaves the page rather than stepping through filters, as the lookups' tab does. 2026-10-07, #50.
- **The list's page size is the contract's 20,** and the web does not send it. 2026-10-07, #50.
- **Freshness shows what is stale on a warning badge and what is missing on a neutral one,** both when both apply, else "Up to date". *Why:* both need the admin's attention; a missing group is "not yet", as an unverified space is (#48 added "missing" after the design). 2026-10-07, #50.
- **"Last update" is the day and the month, and the year when it is not the current one,** on Gaza's calendar, formatted inside the feature. *Why:* the design's short date, without a date from last year passing for this one; a platform formatter waits for a second feature that formats dates. 2026-10-07, #50.
- **While another page or filter loads, the page shown stays, marked busy** (#50's review). *Why:* a page link chosen from the keyboard kept no place while its page loaded, and the focus fell back to the list. 2026-10-08, #50.
- **The search field keeps what was typed;** it changes only when the address reads another search. *Why:* the address's search is trimmed, so a field reset to it after a pause ate the space before the next word (#50's review). 2026-10-08, #50.
- **When the row that held the focus leaves, the focus moves to the list.** *Why:* a deleted space's row takes its menu with it, and the focus would otherwise fall to the page's start. 2026-10-07, #50.
- **The admin's list reads under `['admin', 'space-links', 'spaces', request]`,** and the admin's writes on a space refresh the admin scope whole ([spaces › Decisions](spaces.md#decisions)). *Why:* the admin's scope, and no feature names another's keys. 2026-10-07, #50.
- **The links loader runs without its refusal on the admin's space routes,** and gives no links for a deleted space. *Why:* `can()` reads whether a space is verified there too. 2026-10-06, #44.

## Code map

- **API:** `apps/api/src/modules/space-links/`, entry `index.ts`: the links, the caller's spaces and the loader in the module's root service, with its `me` router; `admin-spaces/` for the admin's list and its router.
- **Shared:** `packages/shared/src/space-links/`: the caller's spaces, the admin's list query and its rows.
- **Web:** `apps/web/src/features/space-links/`, entry `index.ts`: `SpaceSwitcher` (`components/switcher/`, `hooks/switcher/`), and `useMySpacesQuery` for the shell's public link, mounted by `pages/dashboard/shell/`; `AdminSpacesList` (`components/admin-list/`, `hooks/admin-list/`, with the pure address, row, date and page rules in `services/`), mounted by `pages/dashboard/admin/`.

## Open findings

- [25](../architecture/findings.md#25-the-signed-in-claims-are-read-by-a-helper-written-twice): its controller keeps its own copy of the signed-in helper.

## History

- #25 — the session's active links.
- #34 — the shared package split by capability.
- #36 — the caller's spaces.
- #39 — the space switcher.
- #44 — the admin's spaces list, the links loader on the admin's routes, and links to deleted spaces.
- #50 — the admin's spaces list on the web.
