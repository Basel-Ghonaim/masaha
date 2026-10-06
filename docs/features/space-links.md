# Space Links

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The `space-links` capability: a user's links to spaces and their role at each ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)), as the session, the caller's own list, the space switcher, the admin's spaces list and the links loader use them. Its endpoints are owned by the [API contract](../api/api-contract.md#managed-spaces); the `SpaceManager` entity and "verified" by the [data model](../architecture/data-model.md#spaces).
> **Scope:** the API module `space-links` (L2); `@masaha/shared/space-links`; the web feature `features/space-links`, dashboard-only.

## What it does

- Gives the session a user's active links, with the role at each, oldest first.
- Lists the spaces the caller works at, with their names, area and role there.
- Shows the space switcher in a space's dashboard.
- Composes the admin's spaces list: its filters, its owners and its verified state.
- Loads a space's links for the routes on one space, so `can()` knows the caller's role there and whether the space is verified.

Staff (reception accounts) and linking owners are not built.

## Who uses it

- **Every signed-in user with links,** through the switcher and the session's links, which the dashboard's guards and landing read.
- **The admin,** through the spaces list and the admin's routes on one space.
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
- **The web** reads through the transport and TanStack Query under the user's own key scope ([architecture §7](../frontend/architecture.md#7-server-state)); the dashboard-only rule keeps it out of the site's download ([architecture §3](../frontend/architecture.md#3-capabilities-features)).

## Behaviour and flows

**The session's links** are the user's active links, oldest first, without those to a soft-deleted space. **The caller's spaces** are the same links with each space's slug, names and area, a hidden space included.

**The switcher** sits in the space's sidebar header. It shows the space in the URL, its name and area. For anyone with more than one active link, whatever their role at each, it opens their spaces, and choosing one follows the link the page gives it. A URL whose space is none of theirs offers their spaces. While the spaces load it shows a skeleton; a failure offers to try again, and a failed refetch keeps the list already loaded. The space's shell also reads the list for the space's slug, which its public page link needs.

**The admin's list** is composed as above, one page at a time; its rows are the [contract](../api/api-contract.md#spaces-the-admin)'s.

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
- **The links loader runs without its refusal on the admin's space routes,** and gives no links for a deleted space. *Why:* `can()` reads whether a space is verified there too. 2026-10-06, #44.

## Code map

- **API:** `apps/api/src/modules/space-links/`, entry `index.ts`: the links, the caller's spaces and the loader in the module's root service, with its `me` router; `admin-spaces/` for the admin's list and its router.
- **Shared:** `packages/shared/src/space-links/`: the caller's spaces, the admin's list query and its rows.
- **Web:** `apps/web/src/features/space-links/`, entry `index.ts`: `SpaceSwitcher`, and `useMySpacesQuery` for the shell's public link. Mounted by `pages/dashboard/shell/`.

## Open findings

- [25](../architecture/findings.md#25-the-signed-in-claims-are-read-by-a-helper-written-twice): its controller keeps its own copy of the signed-in helper.

## History

- #25 — the session's active links.
- #34 — the shared package split by capability.
- #36 — the caller's spaces.
- #39 — the space switcher.
- #44 — the admin's spaces list, the links loader on the admin's routes, and links to deleted spaces.
