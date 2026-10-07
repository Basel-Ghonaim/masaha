# Spaces

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** The `spaces` capability: a space's profile and its facts (hours and shifts, prices, amenities, contacts), their freshness, and its life on the platform (created, hidden, deleted, restored), as the admin keeps it. Its endpoints are owned by the [API contract](../api/api-contract.md#spaces-the-admin); its entities and derived values by the [data model](../architecture/data-model.md#spaces). Only the admin's side is built, on the API.
> **Scope:** the API module `spaces` (L1); `@masaha/shared/spaces`. No web feature yet.

## What it does

- Lets the admin create a space from its profile, its basics and its location; read it; edit the profile and its facts, one group at a time (the hours with the shifts, the prices, the amenities, the contacts), and confirm each group unchanged, as far as [security](../backend/security.md#authorization) allows; hide and show it again; delete it softly and restore it.
- Dates each of the space's fact groups when it is saved or confirmed unchanged, and computes from those dates which groups are stale, which are missing, and when the space was last updated.
- Answers the modules above it: the summaries of a set of spaces, and a page of the admin's spaces list over the ids it is given.

The photos and the owner's side are not built.

## Who uses it

- **The admin,** through the API. No screen calls it yet.
- **`space-links`,** which names the spaces of a user's links from the summaries, and composes the admin's spaces list on the listing page.

## Responsibility boundary

- **Owns** the `spaces` table and its profile, the slug, the hide flag, the soft delete, the fact groups' dates and the staleness rule; the hours and the shifts, the prices, the space's amenity links and its contacts.
- **Leaves** whether a space is verified to `space-links`, whose links are on the request ([conventions › Space access](../backend/conventions.md#space-access)); `spaces` never imports `space-links`.
- **Leaves** a space's settings to `space-settings`, the defaults and thresholds to `platform-settings`, and the areas and the amenities, and whether an amenity is active, to [`lookups`](lookups.md).
- **Leaves** who may edit a profile or a fact to `can()` ([security › Authorization](../backend/security.md#authorization)).

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

**Save a group.** Each group is saved whole, alone, through one save path: under the space's lock, `can()` decides from the links whether the actor may, then the group is replaced, dated now and audited, in one transaction. A save that changes nothing writes nothing, unless the group is missing.

**Hours.** The week and the shifts are saved together. The week is written first, then the shifts change: one named by its id is updated in place, one without an id is created, one left out is removed. A removed shift that a price (or a package, a subscription or a visit) still uses is refused by the database's key, and the transaction takes the week back. Shifts whose Arabic names move between them are first given a passing name no saved shift can hold.

**Prices.** The prices are replaced whole, in their order: nothing refers to a price, so they are written anew. A price may name a shift only of its own space, as the shifts stand once the space's lock is taken, so a shift removed by an hours save meanwhile is refused.

**Amenities.** The set is made exact: the links left out are removed and the new ones added, a kept link untouched. An amenity added must be active, as `lookups` answers in the same transaction; one already linked stays, retired or not.

**Contacts.** Each contact arrives validated and in its type's one stored form, from the shared rules both apps run, and the list is replaced whole, in its order.

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
- **A group that can be empty is missing until its first save, never fresh while empty** (F2). *Why:* a new space was shown as up to date with no hours, prices, amenities or contacts ([finding 36](../architecture/findings.md#36-a-new-spaces-empty-fact-groups-count-as-fresh)). Spaces that had rows kept their dates. 2026-10-07, #48.
- **"Stale only" keeps the missing groups too,** and each row says which are missing. *Why:* both need the admin's attention. 2026-10-07, #48.
- **Every group can be confirmed, the profile included,** each on its own path (D1). *Why:* the edit screen confirms each section, the profile's two among them. 2026-10-07, #48.
- **Confirming a missing group is refused (409);** saving it empty records "none" (D2). *Why:* "still correct" says nothing of a group never entered. 2026-10-07, #48.
- **One `PUT` per group replaces it whole, and each group has its own confirm** (F1). *Why:* each section of the edit screen saves alone; one `PATCH` for every fact, the plan's draft, would date groups the admin never touched. 2026-10-07, #48.
- **The shifts are saved with the hours, and their freshness is the hours'** (F3). *Why:* the design places them there; the data model's "prices (with shifts)" was corrected. 2026-10-07, #48.
- **A day is closed or one range within it, 0–1,440 minutes; 0–1,440 is open around the clock** (F4). *Why:* a range past midnight would complicate live status and the auto check-out (step 7). 2026-10-07, #48.
- **A saved shift keeps its id; one still in use cannot be removed (409)** (F5). *Why:* packages, subscriptions and visits reference shifts; the database's keys refuse the delete, so `spaces` reads none of their tables. 2026-10-07, #48.
- **A shift lies inside the range of at least one open day** (D4). *Why:* requiring every open day would refuse an evening shift on a short Thursday. 2026-10-07, #48.
- **A repeated row is refused with 422, `not_unique` on its own field,** by the shared rules (the owner's answer A1). *Why:* a whole group under the lock can only repeat a row within itself, and the browser marks it before sending. 2026-10-07, #48.
- **A save that changes nothing writes nothing, unless the group is missing** (D3). *Why:* as the profile's edit; only a confirm renews a date unchanged. 2026-10-07, #48.
- **Contacts are validated per type and stored in one form** (F6), the forms the [data model](../architecture/data-model.md#conventions) gives. *Why:* one number or address has one form, so a repeat is found and a link always opens. 2026-10-07, #48.
- **A network link keeps its path only, but a Facebook profile keeps its numeric `id`** ([data model](../architecture/data-model.md#conventions)). *Why:* a query is mostly tracking, but a profile with no username has no other address (the owner's refinement). 2026-10-07, #48.
- **The phone rule is the platform's, in `core`** (D6). *Why:* every phone number in the database has one form; the customers will use it. 2026-10-07, #48.
- **Only an active amenity can be added; a retired one already linked stays until it is removed** (F7). *Why:* a retired amenity keeps its links (data-model). 2026-10-07, #48.
- **Each group's lists and amounts are capped** (D8), at the sizes the [contract](../api/api-contract.md#spaces-the-admin)'s request bodies give. *Why:* bounded forms, and a guard against a slip of the keyboard. 2026-10-07, #48.
- **A new space has no hours until they are saved;** the Saturday–Thursday template is the form's starting point, not data (D9). *Why:* a stored template would date hours nobody entered. 2026-10-07, #48.
- **Every group changes through one save path, the profile's edit included:** the lock, `can()`, the change, the group's date and its audit entry, in one transaction. *Why:* the owner's endpoints (step 5) reuse it (S9). 2026-10-07, #48.

## Code map

- **API:** `apps/api/src/modules/spaces/`, entry `index.ts`: `space/` (create, read, hide, delete, restore), `profile/` (the edit), `facts/` (the one save path of a group, and every group's read), `hours/` (the hours and the shifts, with the pure rule of how a save changes the shifts), `prices/`, `amenities/`, `contacts/`, `confirm/` (a group confirmed unchanged), `listing/` (the page the admin's list reads); the pure rules beside them (the slug, staleness and missing groups, the profile's fields); the summaries in the module's root service; the admin router.
- **Shared:** `packages/shared/src/spaces/`: the requests (the profile and each fact group, with their rules), the responses, the contacts' forms, the fact groups and the Gaza Strip's box; the phone rule in `core`.

## Open findings

- [43](../architecture/findings.md#43-two-races-around-a-spaces-facts): a save can land on a space verified a moment before, and a read can mix two states of the hours.

## History

- #36 — the summaries of a user's spaces.
- #44 — the admin's spaces API: create, read, edit, hide, delete and restore, and the listing page.
- #48 — the facts API: a group missing until saved, each group confirmed, the hours with the shifts, the prices, the amenities and the contacts.
