# Spaces

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** The `spaces` capability: a space's profile and its facts (hours and shifts, prices, amenities, contacts), their freshness, and its life on the platform (created, hidden, deleted, restored), as the admin keeps it. Its endpoints are owned by the [API contract](../api/api-contract.md#spaces-the-admin); its entities and derived values by the [data model](../architecture/data-model.md#spaces). Only the admin's side is built: the API, and on the web the row actions of the admin's spaces list.
> **Scope:** the API module `spaces` (L1); `@masaha/shared/spaces`; the web feature `features/spaces`, dashboard-only.

## What it does

- Lets the admin create a space from its profile, its basics and its location; read it; edit the profile and its facts, one group at a time (the hours with the shifts, the prices, the amenities, the contacts), and confirm each group unchanged, as far as [security](../backend/security.md#authorization) allows; hide and show it again; delete it softly and restore it.
- Dates each of the space's fact groups when it is saved or confirmed unchanged, and computes from those dates which groups are stale, which are missing, and when the space was last updated.
- Answers the modules above it: the summaries of a set of spaces, and a page of the admin's spaces list over the ids it is given.
- On the web, gives each row of the admin's spaces list its menu: hide the space or show it again, and delete it, with an Undo that restores it.

The photos and the owner's side are not built.

## Who uses it

- **The admin,** through the API, and the row menu of the dashboard's spaces list.
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
- **The web** writes through the transport and TanStack Query; a write fetches the whole admin scope again, since the list it changes is [`space-links`](space-links.md)' ([architecture §7](../frontend/architecture.md#7-server-state)). The page sets the row menu in that list's slot, and the 429's wait above it ([architecture › What a feature exports](../frontend/architecture.md#what-a-feature-exports)). The dashboard-only rule keeps it out of the site's download ([architecture §3](../frontend/architecture.md#3-capabilities-features)).

## Behaviour and flows

**Create.** The area must be active, in an active governorate. In one transaction: the slug is chosen, the space is written unverified and shown, its profile dated now and its other fact groups missing, its settings copied from the defaults, and its audit entry written. When the defaults cannot be read, nothing is written. Two creations that chose the same slug at once: the later one tries again with the slugs as they are then, three attempts in all, then answers 409.

**Read and edit.** The space is read with whether it is verified, from its links, so an edit screen can show it editable or read-only; what an edit writes and audits is the [contract](../api/api-contract.md#spaces-the-admin)'s.

**Hide, delete, restore.** Each changes the space under its row lock, verified or not; what each answers and leaves behind is the [contract](../api/api-contract.md#spaces-the-admin)'s, and a deleted space's links count for nothing ([space-links](space-links.md#decisions)).

**On the web.** `SpaceActionsMenu` is a row's menu in the admin's spaces list: **Hide**, or **Show** for a hidden space, then **Delete**.
- **Hide and Show** apply at once. The action stays pending until the list has arrived again, then a toast says what changed, by the space's name.
- **Delete** asks first, in a dialog that opens on Cancel, its title naming the space. Confirmed, the space is deleted; once the list has arrived again, a toast says so with **Undo** for ten seconds, which restores that space, even once its row or the page has gone, and once the list has arrived again a toast says it is restored. Once that restore has settled, the cache keeps no action of the row. It is the only way the interface restores a space ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)).
- **While an action waits,** the row's menu button stays, busy, and keeps the focus; its items wait. The dialog returns the focus to that button.
- **A failure** shows in a toast that names the action and the space, with the refusal's line and, without a domain code, the request's reference; it stays until it is closed. A 429 on any action, the Undo's restore included, records until when the server refuses, the later of two; until then every row's items wait, and `SpaceActionsHold` shows the wait above the list, whatever fails after it. The time is kept apart from the rows, so a change of filter or page keeps the wait, and a page opened during it counts the time left; once it has passed, it is cleared.
- **A name** in a toast or the dialog's title is set apart, marked as English when an English-only name sits in an Arabic sentence; the menu button's name is one string, so its space's name is isolated there instead.

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
- **A group that can be empty is missing until its first save, never fresh while empty** (F2). *Why:* a new space was shown as up to date with no hours, prices, amenities or contacts ([finding 36](../architecture/findings/36-a-new-spaces-empty-fact-groups-count-as-fresh.md)). Spaces that had rows kept their dates. 2026-10-07, #48.
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
- **The web's row actions are this capability's,** set by the page in the admin's list's slot ([space-links](space-links.md#decisions)) (L1). *Why:* hiding and deleting a space are its life on the platform; the list is `space-links`' read. 2026-10-07, #50.
- **An admin's write on a space fetches the whole admin scope again,** and stays pending until it has arrived. *Why:* the list it changes is another capability's, whose keys this one does not name; the front desk refreshes a space's scope the same way ([architecture §7](../frontend/architecture.md#7-server-state)). 2026-10-07, #50.
- **Each action ends in a toast that names its space:** hidden, shown again, deleted with an Undo (L2), and restored once the Undo succeeds (the owner's alternative 2). *Why:* the design's feedback, a first for the admin's screens, the lookups keeping none; the restored toast confirms the Undo even once the page has changed. 2026-10-07, #50.
- **The Undo restores that space for ten seconds,** even once its row or the page has gone, and is the only restore in the interface. *Why:* long enough to reach from the keyboard; a later restore has no screen ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)). 2026-10-07, #50.
- **Delete asks first, and its line says only what is true:** "It leaves the site and this list. You can undo it right after." *Why:* the design's "can be restored" holds only through the toast. The confirmation is destructive, as the design system marks a removal. 2026-10-07, #50.
- **A failure's toast names the action and the space, and stays until it is closed;** while a 429 counts down on any row, every row's items wait, and the wait shows above the list (L5). *Why:* a table has no room for a failure in its row, a toast outlives the row a delete removes, and a disabled item shows its reason beside it ([foundation §10](../frontend/design-system/foundation.md#10-accessibility-baseline)). 2026-10-07, #50.
- **A 429's wait is one time, kept in the query cache under the admin's scope (`['admin', 'spaces', 'hold']`),** set by any action's 429 to now plus its wait, the later of two, read as the time left, and cleared once it has passed; each action still leaves the cache with its row (`gcTime: 0`). *Why:* the server holds the window, and the cache keeps its last answer ([architecture › Where state lives](../frontend/architecture.md#where-state-lives)), cleared with the rest of the user's data when the session ends. Read from the failed actions, the wait lifted as soon as a change of filter or page unmounted their rows, and a page opened later counted the whole wait again (the owner's decision after #50's review). 2026-10-08, #50.
- **A space's name in a toast or the dialog's title carries its language;** in the menu button's name, a string, it is isolated. *Why:* an English-only name in an Arabic sentence ([localisation › Content in two languages](../frontend/localisation.md#content-in-two-languages)). 2026-10-07, #50.
- **No Edit, Add or owners' items yet** (L7). *Why:* no entry point leads nowhere; they arrive with their screens. 2026-10-07, #50.
- **Every group changes through one save path, the profile's edit included:** the lock, `can()`, the change, the group's date and its audit entry, in one transaction. *Why:* the owner's endpoints (step 5) reuse it (S9). 2026-10-07, #48.

## Code map

- **API:** `apps/api/src/modules/spaces/`, entry `index.ts`: `space/` (create, read, hide, delete, restore), `profile/` (the edit), `facts/` (the one save path of a group, and every group's read), `hours/` (the hours and the shifts, with the pure rule of how a save changes the shifts), `prices/`, `amenities/`, `contacts/`, `confirm/` (a group confirmed unchanged), `listing/` (the page the admin's list reads); the pure rules beside them (the slug, staleness and missing groups, the profile's fields); the summaries in the module's root service; the admin router.
- **Shared:** `packages/shared/src/spaces/`: the requests (the profile and each fact group, with their rules), the responses, the contacts' forms, the fact groups and the Gaza Strip's box; the phone rule in `core`.
- **Web:** `apps/web/src/features/spaces/`, entry `index.ts` (`SpaceActionsMenu`, `SpaceActionsHold`), mounted by `pages/dashboard/admin/`: a folder per operation in `hooks/` and `components/` (`hide/`, `delete/` with the Undo's restore, `menu/`, `hold/`), the toasts in `components/toast/`, and the space's name and a line cut around it in `services/`.

## Open findings

- [43](../architecture/findings/43-two-races-around-a-spaces-facts.md): a save can land on a space verified a moment before, and a read can mix two states of the hours.
- [44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md): no screen restores a deleted space once its toast has gone.

## History

- #36 — the summaries of a user's spaces.
- #44 — the admin's spaces API: create, read, edit, hide, delete and restore, and the listing page.
- #48 — the facts API: a group missing until saved, each group confirmed, the hours with the shifts, the prices, the amenities and the contacts.
- #50 — the web's row actions: hide, show, delete and its Undo.
