# Spaces

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-13 · **Owner:** Basel Ghoneim
> **Authority:** The `spaces` capability: a space's profile and its facts (hours and shifts, prices, amenities, contacts), their freshness, and its life on the platform (created, hidden, deleted, restored), as the admin keeps it. Its endpoints are owned by the [API contract](../api/api-contract.md#spaces-the-admin); its entities and derived values by the [data model](../architecture/data-model.md#spaces). Only the admin's side is built: the API, and on the web the add-space page, the space editor and the row actions of the admin's spaces list; and on the API, what the public [directory](directory.md) reads.
> **Scope:** the API module `spaces` (L1); `@masaha/shared/spaces`; the web feature `features/spaces`, dashboard-only.

## What it does

- Lets the admin create a space from its profile, its basics and its location; read it; edit the profile and its facts, one group at a time (the hours with the shifts, the prices, the amenities, the contacts), and confirm each group unchanged, as far as [security](../backend/security.md#authorization) allows; hide and show it again; delete it softly and restore it.
- Dates each of the space's fact groups when it is saved or confirmed unchanged, and computes from those dates which groups are stale, which are missing, and when the space was last updated.
- Answers the modules above it: the summaries of a set of spaces, and a page of the admin's spaces list over the ids it is given, of the soft-deleted spaces when asked.
- Answers the [directory](directory.md) the publicly listed spaces over the ids and areas it is given: filtered, searched, ordered and paged, or whole up to a ceiling for the map, each with its week; and a space's public page, read whole, its prices hidden as the public is kept from them.
- On the web, adds a space from its basics and its location, its pin placed on a map; edits a space on a page of its own, its profile, its amenities and its contacts each saved, dated and confirmed as a section, under the groups still missing, asking before the page is left with unsaved changes, and shows a verified space read-only; and gives each row of the admin's spaces list its menu: hide the space or show it again, and delete it, with an Undo that restores it.

The photos and the owner's side are not built; on the web, neither are the hours with the shifts, nor the prices.

## Who uses it

- **The admin,** through the API, the dashboard's add-space page, the space editor, and the row menu of the dashboard's spaces list.
- **`space-links`,** which names the spaces of a user's links from the summaries, and composes the admin's spaces list on the listing page.

## Responsibility boundary

- **Owns** the `spaces` table and its profile, the slug, the hide flag, the soft delete, the fact groups' dates, the staleness rule and the rule of the hidden prices; the hours and the shifts, the prices, the space's amenity links and its own amenities, and its contacts.
- **Leaves** whether a space is verified to `space-links`, whose links are on the request ([conventions › Space access](../backend/conventions.md#space-access)); `spaces` never imports `space-links`.
- **Leaves** a space's settings to `space-settings`, the defaults and thresholds to `platform-settings`, and the areas and the amenities, and whether an amenity is active, to [`lookups`](lookups.md).
- **Leaves** who may edit a profile or a fact to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- The admin's router sits inside `/admin`, behind the one guard there; the routes on one space first load its links without refusing anyone ([conventions › Space access](../backend/conventions.md#space-access)).
- **A new space's settings:** in the creation's transaction, `spaces` reads the new-space defaults from `platform-settings` and writes the space's settings row through `space-settings`, both below it ([conventions › New-space defaults](../backend/conventions.md#new-space-defaults), [data model › Checked by the service](../architecture/data-model.md#checked-by-the-service)).
- Every change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#spaces-the-admin) gives.
- Staleness reads the platform's thresholds and the one clock ([conventions §11](../backend/conventions.md#11-time)).
- The list's filters are resolved to ids by the module above before `spaces` pages ([conventions §5](../backend/conventions.md#5-pagination)).
- **The web** writes through the transport and TanStack Query; a write fetches the whole admin scope again, since the list it changes is [`space-links`](space-links.md)' ([architecture §7](../frontend/architecture.md#7-server-state)). The page sets the row menu in that list's slot, and the 429's wait above it ([architecture › What a feature exports](../frontend/architecture.md#what-a-feature-exports)); on the add page, it sets the area field of [`lookups`](lookups.md) in the form's slot. The form follows `shared/forms` ([architecture › Forms](../frontend/architecture.md#forms)), preparing its values for the schema, and places the pin with `shared/map`'s point picker ([architecture §6](../frontend/architecture.md#6-map)). The editor's page gives the space's name to the page's title ([architecture §2](../frontend/architecture.md#2-page-groups), *Titles*), and sets in the editor the area field, the amenities' checklist and the area's and the amenities' names of [`lookups`](lookups.md), the way to the lookups' amenities and the space's public page; a write in the editor answers the whole space, which it keeps as the space's state, the rest of the admin scope only marked out of date. The dashboard-only rule keeps it out of the site's download ([architecture §3](../frontend/architecture.md#3-capabilities-features)).

## Behaviour and flows

**Create.** The area must be active, in an active governorate. In one transaction: the slug is chosen, the space is written unverified and shown, its profile dated now and its other fact groups missing, its settings copied from the defaults, and its audit entry written. When the defaults cannot be read, nothing is written. Two creations that chose the same slug at once: the later one tries again with the slugs as they are then, three attempts in all, then answers 409.

**Read and edit.** The space is read with whether it is verified, from its links, so an edit screen can show it editable or read-only; it is read whole under the space's share lock, so a save in progress is never read half done. An edit decides on the links as they are under the space's lock; what it writes and audits is the [contract](../api/api-contract.md#spaces-the-admin)'s.

**Hide, delete, restore.** Each changes the space under its row lock, verified or not; what each answers and leaves behind is the [contract](../api/api-contract.md#spaces-the-admin)'s, and a deleted space's links count for nothing ([space-links](space-links.md#decisions)).

**Adding a space on the web.** `AddSpaceForm` is the add-space page's form, which the spaces list's "Add space" leads to: two sections, *Basics* (the names and the descriptions) and *Location* (the area, the addresses, the landmarks and the pin), then one "Add space".
- **The fields:** each pair in its two languages, the Arabic at the start, each text in its own language and direction; every field that may stay empty is marked "Optional". The area is the field the page hands in, from [`lookups`](lookups.md); it takes the grid's first column.
- **The pin:** a map of the Gaza Strip ([architecture §6](../frontend/architecture.md#6-map)) holds no pin until one is placed; a click places it and a drag moves it. Under it, the pin's coordinates are one value with it: the map writes them, and coordinates typed or pasted ("31.52, 34.45", Arabic digits included) move the pin. They are the keyboard's way to place it, and the way when the map cannot load.
- **Checked in the browser** by the contract's schema: a blank optional field is no value, an empty required one is asked for in the form's own words, and coordinates that name no point, or a point outside the Strip's box, are refused on their field and nothing is sent.
- **Sent once.** The server's field errors land on their fields, the first taking the focus; a 409 (two creations of one name at once) says so and asks to add it again; a 429 counts down and holds the submit.
- **Once created,** the admin's lists are fetched again, the spaces list the page left included, a toast says "{name} added", and the page returns to the list.

**The space editor on the web.** `SpaceEditor` is a space's page in the dashboard, which the page titles by the space's name once it has loaded, «تعديل مساحة» until then. Its loading, its failure (with "Try again") and a space that does not exist or was deleted (the 404) are its own.
- **The frame:** the space's state as two badges, whether it is verified, always, and «مخفية» when hidden; an unverified space's warning that the team's information shows publicly and each section saves alone; the sections; and a note that the space's operating data is private to its management.
- **The sections** are the fact groups, one name each, in the navigation and on their cards. A list of them stays in view beside the sections from 1024 px; below it, a row of chips sticks under the top bar and scrolls sideways. The section in view is marked at every width, and one chosen is marked at once.
- **«المساحة»** is the profile: the basics and the location, the add page's two blocks, under a separator, each keeping its own anchor (`#basics`, `#location`), with one date, one footer and one confirmation.
- **«المرافق»** is the platform's amenities ticked, in the checklist `lookups` offers, with the way to the lookups' amenities to add one to every space's list, then «مرافق إضافية», the space's own: a row each, its Arabic name and its English one, optional, added up to twenty, the limit said beside the disabled "Add", and removed. An own amenity with no Arabic name, a name too long, or an Arabic name repeated is refused on its row before anything is sent. Both are one group, one save, one date and one confirmation.
- **«التواصل»** is the contacts, a row each, of the contract's seven types, a new one a WhatsApp number. Each value's helper shows the form it is stored in as it is typed, by the shared rule (`normaliseContact`), or an example of its type while it holds none; «هاتف» shows its carrier beside it, read from the stored number's prefix (+97059 جوال, +97056 أوريدو). A value that cannot be stored, an empty one, or one that repeats another once both are stored is refused on its row, in its type's words, before anything is sent. Up to twenty, the limit said as the amenities' is.
- **Each section** shows its group's date («آخر تحديث قبل 3 أيام», in Gaza's days), «قديمة» when the server counts it stale, or «لم تُضف بعد» while it is missing, when it offers Save only. Save stays enabled. While its fields differ from the group as saved, it says «تغييرات غير محفوظة» and offers to discard them; while they do not, and the group is saved, it offers «المعلومات ما زالت صحيحة», which renews the date alone. A save of the profile sends only the fields that changed, a cleared one as `null`; the amenities and the contacts send their group whole. A save that changed nothing sends nothing and says how to renew the date, unless the group is missing, whose first save dates it, even empty. A save or a confirmation is said in a toast naming the section, and the section then holds the server's answer; an unchanged section follows the space as it is fetched again.
- **A refusal stays in its section,** leaving the others as they are: its fields' errors on its fields, the first taking the focus; a 429 counting down; a 403 or a 404 saying the space was verified or deleted meanwhile, and the space fetched again, so a verified one turns read-only.
- **«ما زال ناقصًا»** heads a space with a group never saved: the five groups, each «تمّت» or «لم تُضف بعد», a drawn section's line a link to it. It goes once nothing is missing.
- **Leaving** the page with unsaved changes, by a link, Back or the sidebar, asks first, naming the sections, «البقاء» holding the focus; a move to a section's anchor never asks. Closing or reloading the tab asks through the browser.
- **A verified space** shows its values to read under the same sections, its texts each in its own language, the area and the amenities named by `lookups`, its own amenities, and each contact by its type, as stored, with a phone's carrier, with no section list below 1024 px and no checklist; its notice says its owner edits it, «يعدّلها مالكها», with no name ([finding 59](../architecture/findings/59-the-verified-spaces-editor-cannot-name-its-owner.md)), and leads to its page on the site.

**The row actions on the web.** `SpaceActionsMenu` is a row's menu in the admin's spaces list: **Hide**, or **Show** for a hidden space, then **Delete**.
- **Hide and Show** apply at once. The action stays pending until the list has arrived again, then a toast says what changed, by the space's name.
- **Delete** asks first, in a dialog that opens on Cancel, its title naming the space. Confirmed, the space is deleted; once the list has arrived again, a toast says so with **Undo** for ten seconds, which restores that space, even once its row or the page has gone, and once the list has arrived again a toast says it is restored. Once that restore has settled, the cache keeps no action of the row. It is the only way the interface restores a space ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)).
- **While an action waits,** the row's menu button stays, busy, and keeps the focus; its items wait. The dialog returns the focus to that button.
- **A failure** shows in a toast that names the action and the space, with the refusal's line and, without a domain code, the request's reference; it stays until it is closed. A 429 on any action, the Undo's restore included, records until when the server refuses, the later of two; until then every row's items wait, and `SpaceActionsHold` shows the wait above the list, whatever fails after it. The time is kept apart from the rows, so a change of filter or page keeps the wait, and a page opened during it counts the time left; once it has passed, it is cleared.
- **A name** in a toast or the dialog's title is set apart, marked as English when an English-only name sits in an Arabic sentence; the menu button's name is one string, so its space's name is isolated there instead.

**Freshness.** A group is missing until it is first saved, and stale once its date is older than its threshold, prices by their own ([data model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)). The admin's "stale only" filter keeps both.

**Save a group.** Each group is saved whole, alone, through one save path: under the space's lock, `can()` decides from the links whether the actor may, then the group is replaced, dated now and audited, in one transaction. A save that changes nothing writes nothing, unless the group is missing.

**Hours.** The week and the shifts are saved together. The week is written first, then the shifts change: one named by its id is updated in place, one without an id is created, one left out is removed. A removed shift that a price (or a package, a subscription or a visit) still uses is refused by the database's key, and the transaction takes the week back. Shifts whose Arabic names move between them are first given a passing name no saved shift can hold.

**Prices.** The prices are replaced whole, in their order: nothing refers to a price, so they are written anew. A price may name a shift only of its own space, as the shifts stand once the space's lock is taken, so a shift removed by an hours save meanwhile is refused.

**Amenities.** The group is the platform's amenities the space has, and its own, typed beside them. The set is made exact: the links left out are removed and the new ones added, a kept link untouched. An amenity added must be active, as `lookups` answers in the same transaction; one already linked stays, retired or not. The own amenities are replaced whole, in their order, only when they changed; the same list in another order is a change.

**Contacts.** Each contact arrives validated and in its type's one stored form, from the shared rules both apps run, and the list is replaced whole, in its order.

**Confirm.** A group confirmed unchanged has its date renewed and nothing else, under the space's lock, with its audit entry, on the same path and by the same `can()` rule as a save; a missing group has nothing to confirm (409).

## Decisions

### API decisions

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
- **A space keeps amenities of its own beside the platform's, in the amenities group** (the owner's decision, D2): short texts, Arabic required and English optional, in their order, saved, dated, audited and confirmed with the group. *Why:* an owner must be able to say what the space offers beyond the platform's common list, which stays the admin's ([lookups](lookups.md)). 2026-10-12, #64.
- **The own amenities are required in the body, never defaulted to none** (S1). *Why:* the group is saved whole, so a client that leaves them out would empty them unseen. 2026-10-12, #64.
- **An own amenity's Arabic name is its own within the space,** refused `not_unique` by the shared rule and by the database's key (S2); an English name may repeat. *Why:* as the shifts' names; the English rule follows the lookups' ([finding 30](../architecture/findings/30-a-lookups-english-name-is-not-unique.md)). 2026-10-12, #64.
- **An own amenity that names one of the platform's is not refused** (S4). *Why:* an exact match would catch little, since spellings vary, and the save would read the platform's names from `lookups`; a repeat is seen where both lists are shown, as [finding 30](../architecture/findings/30-a-lookups-english-name-is-not-unique.md) reasons. 2026-10-12, #64.
- **The amenities' audit entry records the whole group,** the ids by id and the own amenities in order. *Why:* the group is saved whole, as every group is audited. 2026-10-12, #64.
- **Each group's lists and amounts are capped** (D8), at the sizes the [contract](../api/api-contract.md#spaces-the-admin)'s request bodies give. *Why:* bounded forms, and a guard against a slip of the keyboard. 2026-10-07, #48.
- **A new space has no hours until they are saved;** the Saturday–Thursday template is the form's starting point, not data (D9). *Why:* a stored template would date hours nobody entered. 2026-10-07, #48.
- **Every group changes through one save path, the profile's edit included:** the lock, `can()`, the change, the group's date and its audit entry, in one transaction. *Why:* the owner's endpoints (step 5) reuse it (S9). 2026-10-07, #48.
- **A save decides on the links read again under the space's lock,** not on those the loader read before it. *Why:* an owner linked between the two would let the admin's save land on a space just verified ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-11, #60.
- **The space's read is one consistent state, under the space's lock in share mode** (the owner's choice, S1). *Why:* a read during an hours save could show the old week with the new shifts (finding 43); a lock keeps one isolation level ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)), and unlike a snapshot, a test can prove it. 2026-10-11, #60.
- **Every price is above zero; a free event goes in the announcements** (the owner's decision). *Why:* a price of zero would list a space as free when only an event is; the announcements carry it. 2026-10-12, #64.
- **The public listing is one query over `spaces` and its facts, with the filters of other modules given as ids** ([directory › Decisions](directory.md#decisions)). *Why:* every filter applies before the page is cut; the search's score and the orders are computed in it. 2026-10-13, the directory item.
- **The hidden-price rule is `spaces`', with "verified" as an input:** an unverified space's stale prices are hidden on its page, and the same spaces are left out of both price filters, in the query. *Why:* the staleness is this capability's; "verified" is `space-links`', resolved first. 2026-10-13, the directory item.
- **The public page reads the space as the admin's read does,** under its share lock, and a hidden space reads as none. *Why:* a save in progress is never shown half done (finding 43). 2026-10-13, the directory item.

### Web decisions

- **The web's row actions are this capability's,** set by the page in the admin's list's slot ([space-links](space-links.md#decisions)) (L1). *Why:* hiding and deleting a space are its life on the platform; the list is `space-links`' read. 2026-10-07, #50.
- **An admin's write on a space fetches the whole admin scope again,** and stays pending until it has arrived. *Why:* the list it changes is another capability's, whose keys this one does not name; the front desk refreshes a space's scope the same way ([architecture §7](../frontend/architecture.md#7-server-state)). 2026-10-07, #50.
- **Each action ends in a toast that names its space:** hidden, shown again, deleted with an Undo (L2), and restored once the Undo succeeds (the owner's alternative 2). *Why:* the design's feedback, a first for the admin's screens, the lookups keeping none; the restored toast confirms the Undo even once the page has changed. 2026-10-07, #50.
- **The Undo restores that space for ten seconds,** even once its row or the page has gone, and is the only restore in the interface. *Why:* long enough to reach from the keyboard; a later restore has no screen ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)). 2026-10-07, #50.
- **Delete asks first, and its line says only what is true:** "It leaves the site and this list. You can undo it right after." *Why:* the design's "can be restored" holds only through the toast. The confirmation is destructive, as the design system marks a removal. 2026-10-07, #50.
- **A failure's toast names the action and the space, and stays until it is closed;** while a 429 counts down on any row, every row's items wait, and the wait shows above the list (L5). *Why:* a table has no room for a failure in its row, a toast outlives the row a delete removes, and a disabled item shows its reason beside it ([foundation §10](../frontend/design-system/foundation.md#10-accessibility-baseline)). 2026-10-07, #50.
- **A 429's wait is one time, kept in the query cache under the admin's scope (`['admin', 'spaces', 'hold']`),** set by any action's 429 to now plus its wait, the later of two, read as the time left, and cleared once it has passed; each action still leaves the cache with its row (`gcTime: 0`). *Why:* the server holds the window, and the cache keeps its last answer ([architecture › Where state lives](../frontend/architecture.md#where-state-lives)), cleared with the rest of the user's data when the session ends. Read from the failed actions, the wait lifted as soon as a change of filter or page unmounted their rows, and a page opened later counted the whole wait again (the owner's decision after #50's review). 2026-10-08, #50.
- **A space's name in a toast or the dialog's title carries its language;** in the menu button's name, a string, it is isolated. *Why:* an English-only name in an Arabic sentence ([localisation › Content in two languages](../frontend/localisation.md#content-in-two-languages)). 2026-10-07, #50.
- **No Edit or owners' items yet** (L7). *Why:* no entry point leads nowhere; they arrive with their screens. "Add space" arrived with its page (#57). 2026-10-07, #50.
- **A space is added in one form with one submit:** its basics and its location, sent as one creation (D1). *Why:* a space does not exist before it is created, so the design's save per section belongs to the edit screen. 2026-10-10, #57.
- **Once added, the page returns to the list, and a toast names the space** (D2). The creation fetches the admin's lists the add page left, and waits for them, so the list opens already holding the new space. *Why:* as #50's actions say what they did; the edit screen, where the facts follow, is not built, so the list is where the new space is seen; a list fetched only once shown would first show its old rows (#57's review). 2026-10-10, #57.
- **The two sections are this capability's, made for the edit screen to reuse,** with nothing only the edit would use (D3). *Why:* the edit screen shows the same fields, each section saved alone. 2026-10-10, #57.
- **The area is one active area, from the field `lookups` offers,** which the page sets in the form (D4). *Why:* the areas are that capability's fact, and no feature imports another ([architecture § What a feature exports](../frontend/architecture.md#what-a-feature-exports)). 2026-10-10, #57.
- **Field errors land on their fields, checked first in the browser by the contract's schema; a 409 is said plainly, a 429 counts down** (D5). *Why:* one rule in both apps, and the general conflict line's "refresh" would lose the form. 2026-10-10, #57.
- **The pin is placed on a real map, and has no place until the admin gives it one** (D6, D7). *Why:* a pin set by default would pass unseen, wrong. 2026-10-10, #57.
- **The coordinates are a field of their own, one value with the pin,** and read Arabic digits and the Arabic comma. *Why:* the keyboard's way to place the pin, the way when the map cannot load (D8), and how an admin pastes a place from a map application. 2026-10-10, #57.
- **Every field that may stay empty says so; the landmark is asked in both languages,** like the addresses. *Why:* the design marked the landmark alone, and showed one landmark where the contract has two (design issues 1 and 2). 2026-10-10, #57.
- **The page's title is in the top bar, with a trail back to the list; "Add space" sits above the list, at its end, at every width.** *Why:* the design drew the title twice, and the button in two places; on a phone the top bar is full (design issues 5 and 7). 2026-10-10, #57.

- **The editor is a page per space, titled by the space's name** through the one record title the top bar and the tab read (D4). *Why:* the record-name rule of [architecture §2](../frontend/architecture.md#2-page-groups), built here for its first page. 2026-10-13, #74.
- **The editor's sections are this capability's, made for the owner's Space profile to reuse:** nothing in them is the admin's; the page sets what differs (D5). *Why:* the owner edits the same groups (O1). 2026-10-13, #74.
- **One section per fact group, each saved, dated and confirmed alone;** a group never saved offers Save only, and the confirmation shows only while a saved section is unchanged (A1). *Why:* the API saves and confirms one group at a time, and a missing group has nothing to confirm. 2026-10-13, #74.
- **The profile's save sends only the fields that changed,** a cleared optional one as `null` (S1). *Why:* resent whole, an unchanged area hidden since would be refused, and the section could never be saved ([finding 60](../architecture/findings/60-the-area-field-shows-no-area-for-a-space-whose-area-was-hidden-since.md)); nor is a field another admin changed meanwhile sent back. 2026-10-13, #74.
- **A save that changes nothing sends nothing,** and the section says how to renew the date (S2, design issue 2). *Why:* the server writes nothing and keeps the date, so a toast saying "saved" would be untrue. 2026-10-13, #74.
- **A write's answer is the space's state:** kept as the space's query, the rest of the admin scope only marked out of date (S3). *Why:* the editor shows the answer itself; the list is fetched again when it is shown. It departs from the row actions' wait for the list, which they change on screen. 2026-10-13, #74.
- **A 403 or a 404 on a write fetches the space again** (S4). *Why:* an owner linked, or a delete, while the page was open: the page then shows the space as it is, a verified one read-only. 2026-10-13, #74.
- **Leaving with unsaved changes asks first,** naming the sections; a move within the page never asks (D2). The guard is this capability's until a second form needs it (S8). 2026-10-13, #74.
- **The section in view is read from where the sections cross the window,** a section chosen marked at once (S9); below 1024 px the row of chips sticks under the top bar, which keeps one line (S7, design issue 4). 2026-10-13, #74.
- **The platform's amenities are ticked in the checklist `lookups` offers,** over the admin's amenities, a retired one the space still has offered, marked, until a save leaves it out (S5, design issue 3). *Why:* the amenities are that capability's list, and a retired amenity would otherwise stay linked unseen. A ticked amenity retired meanwhile is refused on no field, and the section says so. 2026-10-13, #74.
- **A phone's carrier is a display rule of the web,** read from its stored form's prefix (S6). *Why:* the API never computes it, and the stored form stays the shared rule's; it moves to `shared/` once another capability shows it. 2026-10-13, #74.
- **A contact's helper shows its stored form as it is typed, by the shared rule** (AD-006). *Why:* the admin sees what will be kept, and the browser refuses what the server would, with no copy of the rule. A repeat is found only once every contact can be stored, as the server's schema finds it. 2026-10-13, #74.
- **Each toast names its section** (design issue 1). *Why:* with several sections, «حُفظ القسم» said nothing of which. 2026-10-13, #74.
- **The checklist lists the five groups; a line leads to its section only once the editor draws it** (design issue 5). *Why:* the editor draws no section for the hours or the prices, and a link must lead somewhere. 2026-10-13, #74.
- **A verified space's notice names no owner** (the owner's answer to Q1). *Why:* the space's read carries no owners ([finding 59](../architecture/findings/59-the-verified-spaces-editor-cannot-name-its-owner.md)); the name and the unlink come with the owners item's one dialog. 2026-10-13, #74.

## Code map

- **API:** `apps/api/src/modules/spaces/`, entry `index.ts`: `space/` (create, read, hide, delete, restore), `profile/` (the edit), `facts/` (the one save path of a group, and every group's read), `hours/` (the hours and the shifts, with the pure rule of how a save changes the shifts), `prices/`, `amenities/` (the links and the own amenities), `contacts/`, `confirm/` (a group confirmed unchanged), `listing/` (the page the admin's list reads), `public/` (the public listing and the public page, for the directory); the pure rules beside them (the slug, staleness and missing groups, the profile's fields); the summaries in the module's root service; the admin router.
- **Shared:** `packages/shared/src/spaces/`: the requests (the profile and each fact group, with their rules), the responses, the contacts' forms, the fact groups and the Gaza Strip's box; the phone rule in `core`.
- **Web:** `apps/web/src/features/spaces/`, entry `index.ts` (`AddSpaceForm` with its `AreaField` slot, `SpaceEditor`, `useSpaceName`, `SpaceActionsMenu`, `SpaceActionsHold`), mounted by `pages/dashboard/admin/`: a folder per operation in `hooks/` and `components/` (`add/`, `editor/` with the space's query, a section's frame, its save, the section in view and the leave guard, `profile/`, `amenities/`, `contacts/`, `confirm/`, `hide/`, `delete/` with the Undo's restore, `menu/`, `hold/`), the profile's fields shared by the add form and the editor in `hooks/useProfileFields.ts` and `components/profile/`, the toasts in `components/toast/`, and in `services/` the profile the schema reads from the form, as added and as edited, the changes a save sends, the amenities as their form holds them, a phone's carrier, the group's date, the space's name and a line cut around it.

## Open findings

- [44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md): no screen restores a deleted space once its toast has gone.
- [46](../architecture/findings/46-the-deployments-headers-must-let-the-maps-tiles-load.md): the deployment's headers must let the add page's map tiles load.
- [59](../architecture/findings/59-the-verified-spaces-editor-cannot-name-its-owner.md): the verified space's editor cannot name its owner.
- [60](../architecture/findings/60-the-area-field-shows-no-area-for-a-space-whose-area-was-hidden-since.md): the area field shows no area for a space whose area was hidden since.

## History

### API history

- #36 — the summaries of a user's spaces.
- #44 — the admin's spaces API: create, read, edit, hide, delete and restore, and the listing page.
- #48 — the facts API: a group missing until saved, each group confirmed, the hours with the shifts, the prices, the amenities and the contacts.
- #60 — a save decides on the links under the space's lock, and the read is consistent (finding 43).
- #64 — a space's own amenities, in the amenities group; no price of zero.
- The deleted-spaces item — the listing page of the soft-deleted spaces, with when each was deleted.
- The directory item — the public listing (filters, search, orders, pages and the map's set) and the public page.

### Web history

- #50 — the web's row actions: hide, show, delete and its Undo.
- #57 — the add-space page: the basics and the location, the pin on a map, and the list's "Add space".
- #74 — the space editor: its frame, the sections' navigation, «المساحة», «المرافق» with the space's own, «التواصل», the checklist, the leave guard and a verified space read-only.
