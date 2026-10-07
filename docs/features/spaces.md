# Spaces

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** The `spaces` capability: a space's profile, its freshness, and its life on the platform (created, hidden, deleted, restored), as the admin keeps it. Its endpoints are owned by the [API contract](../api/api-contract.md#spaces-the-admin); its entities and derived values by the [data model](../architecture/data-model.md#spaces). Only the admin's side is built, on the API.
> **Scope:** the API module `spaces` (L1); `@masaha/shared/spaces`. No web feature yet.

## What it does

- Lets the admin create a space from its profile, its basics and its location; read it; edit the profile, as far as [security](../backend/security.md#authorization) allows; hide and show it again; delete it softly and restore it.
- Dates each of the space's fact groups when it is saved or confirmed unchanged, and computes from those dates which groups are stale, which are missing, and when the space was last updated.
- Answers the modules above it: the summaries of a set of spaces, and a page of the admin's spaces list over the ids it is given.

The other facts it will own (hours, shifts, prices, contacts, photos, amenities) and the owner's side are not built.

## Who uses it

- **The admin,** through the API. No screen calls it yet.
- **`space-links`,** which names the spaces of a user's links from the summaries, and composes the admin's spaces list on the listing page.

## Responsibility boundary

- **Owns** the `spaces` table and its profile, the slug, the hide flag, the soft delete, the fact groups' dates and the staleness rule.
- **Leaves** whether a space is verified to `space-links`, whose links are on the request ([conventions › Space access](../backend/conventions.md#space-access)); `spaces` never imports `space-links`.
- **Leaves** a space's settings to `space-settings`, the defaults and thresholds to `platform-settings`, and the areas to [`lookups`](lookups.md).
- **Leaves** who may edit a profile to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- The admin's router sits inside `/admin`, behind the one guard there; the routes on one space first load its links without refusing anyone ([conventions › Space access](../backend/conventions.md#space-access)).
- **A new space's settings:** in the creation's transaction, `spaces` reads the new-space defaults from `platform-settings` and writes the space's settings row through `space-settings`, both below it ([conventions › New-space defaults](../backend/conventions.md#new-space-defaults), [data model › Checked by the service](../architecture/data-model.md#checked-by-the-service)).
- Every change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#spaces-the-admin) gives.
- Staleness reads the platform's thresholds and the one clock ([conventions §11](../backend/conventions.md#11-time)).
- The list's filters are resolved to ids by the module above before `spaces` pages ([conventions §5](../backend/conventions.md#5-pagination)).

## Behaviour and flows

**Create.** The area must be active, in an active governorate. In one transaction: the slug is chosen, the space is written unverified and shown, its profile dated now and its other fact groups missing, its settings copied from the defaults, and its audit entry written. When the defaults cannot be read, nothing is written. Two creations that chose the same slug at once: the later one tries again with the slugs as they are then, three attempts in all, then answers 409.

**Read and edit.** The space is read with whether it is verified, from its links, so an edit screen can show it editable or read-only; what an edit writes and audits is the [contract](../api/api-contract.md#spaces-the-admin)'s.

**Hide, delete, restore.** Each changes the space under its row lock, verified or not; what each answers and leaves behind is the [contract](../api/api-contract.md#spaces-the-admin)'s, and a deleted space's links count for nothing ([space-links](space-links.md#decisions)).

**Freshness.** A group is missing until it is first saved, and stale once its date is older than its threshold, prices by their own ([data model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)). The admin's "stale only" filter keeps both.

**Confirm.** A group confirmed unchanged has its date renewed and nothing else, under the space's lock, with its audit entry, on the same path and by the same `can()` rule as a save; a missing group has nothing to confirm (409).

## Decisions

- **The English name is required, the Arabic optional.** *Why:* most spaces are known by an English name. 2026-10-06, #44.
- **The slug comes from the English name,** with the smallest free suffix, deleted spaces counted, and never changes. *Why:* a slug is a public URL, never reused. 2026-10-06, #44.
- **The location is required, inside the Gaza Strip's box with a margin.** *Why:* spaces at the edges must pass. 2026-10-06, #44.
- **Hide, unhide, delete and restore apply to any space,** are audited and safe to repeat; a restore keeps `isHidden`. 2026-10-06, #44.
- **Stale is computed on the server, per fact group,** from the platform's thresholds. *Why:* one rule for the list's filter and each row. 2026-10-06, #44.
- **One profile service serves the admin and, later, the owner;** `can()` decides who may edit, by the rule [security › Authorization](../backend/security.md#authorization) owns. 2026-10-06, #44.
- **A new space is unverified,** with its settings copied from the defaults in the same transaction. 2026-10-06, #44.
- **The landmark is an optional pair of languages.** *Why:* the owner's answer. 2026-10-06, #44.
- **Descriptions keep their line breaks.** *Why:* the create form needs paragraphs. 2026-10-06, #44.
- **"Last update" is the latest of the groups' dates.** 2026-10-06, #44.
- **A group that can be empty is missing until its first save, never fresh while empty** (F2). *Why:* a new space was shown as up to date with no hours, prices, amenities or contacts ([finding 36](../architecture/findings.md#36-a-new-spaces-empty-fact-groups-count-as-fresh)). Spaces that had rows kept their dates. 2026-10-07, #PR.
- **"Stale only" keeps the missing groups too,** and each row says which are missing. *Why:* both need the admin's attention. 2026-10-07, #PR.
- **Every group can be confirmed, the profile included,** each on its own path (D1). *Why:* the edit screen confirms each section, the profile's two among them. 2026-10-07, #PR.
- **Confirming a missing group is refused (409);** saving it empty records "none" (D2). *Why:* "still correct" says nothing of a group never entered. 2026-10-07, #PR.
- **Every group changes through one save path:** the lock, `can()`, the change, the group's date and its audit entry, in one transaction. *Why:* the owner's endpoints (step 5) reuse it (S9). 2026-10-07, #PR.

## Code map

- **API:** `apps/api/src/modules/spaces/`, entry `index.ts`: `space/` (create, read, hide, delete, restore), `profile/` (the edit), `facts/` (the one save path of a group), `confirm/` (a group confirmed unchanged), `listing/` (the page the admin's list reads); the pure rules beside them (the slug, staleness and missing groups, the profile's fields); the summaries in the module's root service; the admin router.
- **Shared:** `packages/shared/src/spaces/`: the requests, the responses, the fact groups and the Gaza Strip's box.

## Open findings

None.

## History

- #36 — the summaries of a user's spaces.
- #44 — the admin's spaces API: create, read, edit, hide, delete and restore, and the listing page.
- #PR — the facts API: a group missing until saved, and each group confirmed.
