# Space Links

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-18 · **Owner:** Basel Ghoneim
> **Authority:** The `space-links` capability: a user's links to spaces and their role at each ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)), as the session, the caller's own list, the space switcher, the admin's spaces list and users list, the admin's owners (added, linked and unlinked) and the links loader use them. Its endpoints are owned by the API contract: [*Managed spaces*](../api/api-contract.md#managed-spaces), [*Owners (the admin)*](../api/api-contract.md#owners-the-admin) and [*Users (the admin)*](../api/api-contract.md#users-the-admin); the `SpaceManager` entity and "verified" by the [data model](../architecture/data-model.md#spaces).
> **Scope:** the API module `space-links` (L2); `@masaha/shared/space-links`; the web feature `features/space-links`, dashboard-only.

## What it does

- Gives the session a user's active links, with the role at each, oldest first.
- Lists the spaces the caller works at, with their names, area and role there.
- Shows the space switcher in a space's dashboard.
- Composes the admin's spaces list: its filters, its owners and its verified state, and on the API the soft-deleted spaces as a list of their own; and shows it on the dashboard's spaces page, its deleted spaces included, with its filters kept in the address.
- Loads a space's links for the routes on one space, so `can()` knows the caller's role there and whether the space is verified.
- Answers the [directory](directory.md) which spaces are verified, every one in one query: its filter, and the stale prices it hides.
- Composes the admin's users list, on the API: its filters, and the spaces each person owns; the owners page is that list filtered to the owners, and shows it on the dashboard's owners page, with its search and its state kept in the address.
- Adds an owner for the admin, on the API: a new account with a temporary password, or an existing one upgraded on purpose, linked to one space.
- Links a space's owners for the admin, and ends their links, one space at a time, on the API; the person's global role follows their owner links.
- Changes a person's global role for the admin, between `USER` and `ADMIN`, on the API, while they hold no active link.

Reception accounts' management API access is built: an active `RECEPTION` link can read its
space and its photos, but cannot mutate profile, facts, confirmations or photos. The dashboard
screen and staff-management API remain planned.

## Who uses it

- **Every signed-in user with links,** through the switcher and the session's links, which the dashboard's guards and landing read.
- **The admin,** through the spaces list, on the dashboard's spaces page, the admin's routes on one space, the users list, on the dashboard's owners page, and adding an owner.
- **`auth`,** which puts the links in every `Session` it builds.

## Responsibility boundary

- **Owns** the `space_managers` table, the role at a space, whether a space is verified (an active `OWNER` link), and the rule that the global `OWNER` follows a person's owner links ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)), applied through `users`, which owns the role and the sessions' end.
- **Leaves** a space's facts, the listing's own filters and the pagination to [`spaces`](spaces.md), and a governorate's areas to [`lookups`](lookups.md); it asks each for ids or names, one query per module.
- **Leaves** the access decision to `can()` and the space middleware ([conventions › Space access](../backend/conventions.md#space-access)); no module imports `space-links` to learn its access.
- **Leaves** routing to the platform: the space guard, the landing and the last space are [frontend architecture §2](../frontend/architecture.md#landing-and-guards)'s. The switcher only navigates: the selected space is the URL's ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).

## How it composes the platform

- **The caller's spaces** use the `me` router at `/manage/spaces`, behind `requireAuth` only: the path names no space, so the space middleware does not run.
- **The links loader** is `shared/auth`'s, wired with this module's links. On the admin's space routes it runs without its refusal ([conventions › Space access](../backend/conventions.md#space-access)).
- **Managed routes** take their access from these links: the boundary on `/manage/spaces/:spaceId` reads them through the links loader ([security › Authorization](../backend/security.md#authorization)).
- **The admin's spaces list** is a composed read ([conventions › Composed reads](../backend/conventions.md#composed-reads)). Each filter on another module's value is resolved to ids first: the verified state from the links, here, and a governorate to its areas, by `lookups`. `spaces` then applies its own filters (deleted, hidden, stale, the area, the search) to those ids and pages ([conventions §5](../backend/conventions.md#5-pagination)). The page's owners, their names (from `users`) and its areas' names follow, one query per module.
- **The single-space admin read** is supplied active owner names (`ownersFor`) by the admin composition here, while the list composition remains unchanged. The names are read from `users` in the read's own transaction, under the space's share lock.
- **A link change** is one transaction: it takes the space's lock through `spaces`; for an existing account, then the person's session lock through `users` (a new account's row is inserted under the space's lock), then counts the person's owner links and asks `users` to change the role when they give another ([conventions §13](../backend/conventions.md#concurrency)).
- **The admin's users list** is a composed read too: every filter is the account's own, so `users` filters and pages its accounts; the page's active owner links follow, and their spaces' names from `spaces`, which leaves a soft-deleted space out, one query per module.
- **The web** reads through the transport and TanStack Query, the caller's spaces under the user's own key scope and the admin's list under the admin's ([architecture §7](../frontend/architecture.md#7-server-state)); the dashboard-only rule keeps it out of the site's download ([architecture §3](../frontend/architecture.md#3-capabilities-features)).
- **The admin's list on the web** is one section that the spaces page sets, with two slots it fills from other capabilities: each row's actions, from [`spaces`](spaces.md), and the place field, from [`lookups`](lookups.md) ([architecture › What a feature exports](../frontend/architecture.md#what-a-feature-exports)); and the path each space's name leads to, the space's editor (`spaceLink`). Its filters and page live in the address ([architecture › Where state lives](../frontend/architecture.md#where-state-lives)).
- **The owners page on the web** reads the users list under `['admin', 'space-links', 'users', request]`, in the admin's scope, with `role=owner` fixed by its own hook; the section takes from the page only the path of the deleted spaces, where an owner whose every space is deleted is led.

## Behaviour and flows

**The session's links** are the user's active links, oldest first, without those to a soft-deleted space. **The caller's spaces** are the same links with each space's slug, names and area, a hidden space included.

**The switcher** sits in the space's sidebar header. It shows the space in the URL, its name and area. For anyone with more than one active link, whatever their role at each, it opens their spaces, and choosing one follows the link the page gives it. A URL whose space is none of theirs offers their spaces. While the spaces load it shows a skeleton; a failure offers to try again, and a failed refetch keeps the list already loaded. The space's shell also reads the list for the space's slug, which its public page link needs.

**The admin's list** is composed as above, one page at a time; its rows are the [contract](../api/api-contract.md#spaces-the-admin)'s. Its `deleted` status lists the soft-deleted spaces alone, with the same filters, order and pages, each row naming its owners and when it was deleted, so a screen can restore one (`POST …/restore`) once the delete's Undo has gone; every other status leaves them out. On the web it is the list's fourth status, shown with the rest.

**Adding an owner.** An email with no account gets one, an `OWNER` with a temporary password, answered once, linked to the chosen space in the same transaction. An email with an account is refused, so the admin learns of it, and upgraded only when sent again with the upgrade asked: it keeps its name and password. An admin, a suspended account, an owner already (linked instead) and the space's active reception are refused.

**Linking and unlinking an owner.** Linking makes a user an owner, or gives an owner one more space; the space is verified. A suspension keeps the owner's links, so their space stays verified, and the admin edits it only after unlinking them ([security › Authorization](../backend/security.md#authorization)). Ending a link deactivates it; the last one leaves the space unverified and the person a user again. An admin, a suspended account and the space's active reception are refused; what each answers is the [contract](../api/api-contract.md#owners-the-admin)'s.

**The admin's role change** makes a person an admin or a user again. `OWNER` follows the links, so a person holding any active link, owner or reception, is refused until their links end. The change takes the person's lock with every active admin's row ([conventions › Concurrency](../backend/conventions.md#concurrency)), then counts their links under it; `users` writes the role, ends their sessions and audits it.

**The admin's users list** is composed as above, newest first, one page at a time; each row carries how the account signs in, when it joined, and the spaces of its active owner links, oldest first ([the contract](../api/api-contract.md#users-the-admin)).

**The admin's list on the web.** `AdminSpacesList` shows the search and the filters, then the page's spaces: a table from 768 px (the name, a link to the space's page the page gives, the area, the state, the owners, the freshness, the last update and the row's actions), with the count the filters keep beside the search and the pages under the table; on a phone, a card per space with the same facts, the search in view and the other filters in a bottom sheet behind a "Filters" button that counts the sheet's own two fields.
- **The filters:** part of a name, typed and written once typing pauses; one "Governorate / area" field; and the state, whose four choices are the contract's, «محذوفة» included. Each applies at once and returns to the first page.
- **The count and the chip:** the count the filters keep stands beside the search, at every width, and next to it a chip, «قديمة أو ناقصة», keeps the spaces with a stale or a missing fact group — the contract's `stale=true`, missing groups included, so its words say both. A filter is a chip, not a field (A7): it is in no sheet and no row.
- **The address** keeps them, `?q=&status=&governorate=&area=&stale=true&page=`, so a reload, a link or Back shows the same list. Each is read by the contract's own rule, so a value the server would refuse falls back to its default; an area wins over a governorate; the defaults are left out. A filter replaces the address; the pages are links. A page past the last, as after deleting its last row, shows the last page. A governorate or an area the address names by a valid id that no place has leaves the place field blank and the list empty, and "Clear filters" recovers it.
- **A row** names the space in the interface's language, an English-only name marked as English in the Arabic interface; its area; its state as two facts, its verification on a badge always — verified or unverified — and «مخفية» beside it when hidden, hidden no longer replacing the verification; its owners, or for none a dash read aloud as "No owner"; its freshness, the stale groups and the missing ones on a warning badge each, or "Up to date"; and its last update, the day and the month, with the year when it is not this one, on Gaza's calendar.
- **A deleted row**, under «محذوفة», is muted: its name is text and leads nowhere, since its editor would only say that it is gone; it carries no badge of its own, one muted line «محذوفة · …» by the same short date as the last update standing where its state was, and a dash, read aloud as nothing, where its freshness was — nothing will fill a deleted space's gaps. Its owners and its pages are the others'. Every other status leaves the deleted spaces out. Its one action, **Restore**, belongs to [`spaces`](spaces.md#behaviour-and-flows), and the way out of a deleted space to a user — restore it, unlink its owner, delete it again — is written there ([finding 50](../architecture/findings/50-an-owner-whose-only-spaces-are-deleted-stays-an-owner.md)); of the three steps, only the restore has a screen, the unlink arriving with the owners page.
- **Its states:** placeholder rows while the first page loads; while another page or filter loads, the rows and the pages shown stay, the list marked busy, so a page chosen from the keyboard keeps the focus; a failure, with its reference and "Try again", which waits out a 429; "No spaces yet"; and, while a filter applies, "No spaces match the filters", with a button that clears them all. A failed refetch keeps the rows.
- **The focus:** when the row that held it leaves the list, as a deleted space's does, the focus moves to the list rather than being lost.

**The owners page on the web.** `OwnersList` is the users list with its role fixed to the owners (`GET /admin/users?role=owner`), under a line that says what linking an owner does. From 768 px a table: the owner's name, their email (under the name until 1024 px, its own column from there, left to right), their linked spaces (a neutral badge each, an English-only name marked as English in the Arabic interface) and their state, «نشط» on a success badge or «موقوف» on a neutral one; on a phone, a card per owner with the same facts.
- **The search and the state:** part of a name or an email, written once typing pauses; the state is chips, «الكل · نشط · موقوف», beside the count the filters keep, at every width — a single filter of three choices is chips, not a field in a sheet (P5, A7). A chip applies at once and returns to the first page; the chip already on stays on.
- **The address** keeps them, `?q=&state=&page=`, each read by the contract's own rule, so a value the server would refuse falls back to its default; the defaults are left out. A choice replaces the address; the pages are links. A page past the last shows the last page.
- **An owner whose every space is deleted** has no space in the row, since the list leaves a deleted space out, while their role still counts its link ([finding 50](../architecture/findings/50-an-owner-whose-only-spaces-are-deleted-stays-an-owner.md)): the row reads «كل مساحاته محذوفة — استرجع المساحة لفك ربطه», the whole line a link to the deleted spaces, where the restore begins the way out.
- **Its states** are the spaces list's: placeholder rows while the first page loads; the rows kept, marked busy, while another page or filter loads; a failure with its reference and "Try again", which waits out a 429; «لا يوجد أصحاب مساحات بعد»; and, while a filter applies, «لا يوجد أصحاب مساحات يطابقون البحث», with a button that clears them. When the row that held the focus leaves the list, the focus moves to the list.

## Decisions

### API decisions

- **The caller's spaces are open to any signed-in user:** the active links with the role at each, oldest first. *Why:* the path names no space, so no space middleware applies. 2026-10-04, #36.
- **A hidden space is listed; a deleted one is not.** *Why:* an owner still manages a hidden space. 2026-10-04, #36.
- **Names come in both languages, with the area's;** a retired area still names its spaces. 2026-10-04, #36.
- **The list is composed from three modules, one query each.** *Why:* the module levels, and no N+1. 2026-10-04, #36.
- **A link to a deleted space counts for nothing, for access and in the lists,** the session's links included; deleting a space writes nothing in the links. The global role and the admin's deleted spaces are the exceptions (below). *Why:* the delete stays reversible, and a restored space has its links again. It replaced #36's open question, under which the two lists disagreed ([finding 18](../architecture/findings/18-whether-a-link-to-a-deleted-space-still-counts.md)). 2026-10-06, #44.
- **The admin's spaces list is composed here:** the verified and governorate filters resolve to ids first, then `spaces` filters and pages; each row carries its owners, its stale groups and its last update. *Why:* every page full, and the total right. 2026-10-06, #44.
- **The list's states are lowercase, like its filter.** *Why:* one vocabulary. 2026-10-06, #44.
- **The links loader runs without its refusal on the admin's space routes,** and gives no links for a deleted space. *Why:* `can()` reads whether a space is verified there too. 2026-10-06, #44.
- **The owners page is a view of the users list,** `GET /admin/users?role=owner`, with no list of its own (the owner's A6). *Why:* one list, one search and one state filter for every account. 2026-10-11, #60.
- **Adding an owner creates the account, or upgrades it, and links it to one space, in one transaction** (D1). *Why:* all or nothing; more spaces are linked one at a time. 2026-10-11, #60.
- **An email with an account is refused first (`EMAIL_HAS_ACCOUNT`), then upgraded only when asked (`upgradeExisting`),** keeping its name and password (D2). *Why:* the admin is told before another person's account changes (A5). The flag allows an upgrade without requiring one. 2026-10-11, #60.
- **The space chosen in the body is refused on its field** (S4): 422 `invalid_choice`, as a body's `areaId` is. *Why:* the form shows it there; the routes on one space keep their 404. 2026-10-11, #60.
- **The admin links owners one space at a time, owners only;** reception links are the owner's (step 6). *Why:* the owner's D1 and D4: one consequence said before each act. 2026-10-11, #60.
- **Ending a link deactivates it, and linking again reactivates the same row,** for an owner as for reception; a deactivated reception row linked as an owner's becomes one, and its audit entry says the role changed (the owner's addition). *Why:* one rule for every link, and payments and the audit name the person. 2026-10-11, #60.
- **The global `OWNER` follows the active owner links, a soft-deleted space's included:** the first makes an owner, the end of the last a user, each change ending the person's sessions; a link that leaves the role as it is ends none (D7, S6). *Why:* ADR 0009's label kept in step; deleting a space writes nothing in its links, so it changes no role. *So:* a person whose only owner links are to deleted spaces stays `OWNER`, with no space in the users list, and an unlink of a deleted space answers 404: the way back to `USER` is to restore the space, unlink, and delete it again (the owner's option A, [finding 50](../architecture/findings/50-an-owner-whose-only-spaces-are-deleted-stays-an-owner.md)). 2026-10-11, #60.
- **Linking an owner already linked writes nothing, and answers as a success** (S3). *Why:* a link is idempotent by design ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)); a retry after a lost answer succeeds. The placeholder code `OWNER_ALREADY_LINKED` went. 2026-10-11, #60.
- **A person with an active reception link at the space is refused, not moved** (D5). *Why:* the reception link is the owner's to end; no silent change of role at a space. 2026-10-11, #60.
- **Every link change takes the space's lock, then the person's** (S5). *Why:* a save on the space decides on the links as they are ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)), and two ends of one person's links at once each count what the other left. 2026-10-11, #60.
- **The users list is composed here, `users` filtering and paging its own accounts first,** newest first; each row adds how it signs in and when it joined (the owner's S2). *Why:* every filter is the account's own, so the page is cut before the links are read; the users screen shows both columns, so the users item adds actions only. 2026-10-11, #60.
- **The admin's role change is composed here,** because only the links tell whether a role may change; `users` writes it (D1, D3). It offers `USER` or `ADMIN`, and refuses a person with any active link, owner or reception, a soft-deleted space's included, with `ACCOUNT_HAS_LINKS`. *Why:* an admin is never linked (`ACCOUNT_IS_ADMIN`), the `OWNER` follows the links ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)), and no change happens silently at a space. 2026-10-11, the users item.
- **A role change takes the person's lock with every active admin's row, and counts the links under it;** it takes no space's lock. *Why:* every link change takes the person's lock, so a link made meanwhile counts, and two admins demoting each other at once cannot leave none ([conventions › Concurrency](../backend/conventions.md#concurrency)). 2026-10-11, the users item.
- **A row carries its state as facts apart, `isVerified`, `isHidden` and `deletedAt`,** as `AdminSpace` does; the lowercase vocabulary is the status filter's alone (`SPACE_STATUSES`). *Why:* a state is two facts (the owner's A3): a hidden space keeps its verification, which the screen shows beside it. It replaced the row's one `state`, hidden first. 2026-10-12, the deleted-spaces item.
- **`status=deleted` lists the soft-deleted spaces alone,** hidden or not, verified or not, with the search, the place, stale or missing, the order and the pages of the others; every other status, and none, leaves them out (the owner's A3). *Why:* a space deleted by mistake can be restored once its toast has gone ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)); one list, filtered before the page is cut. 2026-10-12, the deleted-spaces item.
- **A deleted space's row names its owners, and is verified by them,** the second exception to "a link to a deleted space counts for nothing". *Why:* its links are kept as they are, and the way out of [finding 50](../architecture/findings/50-an-owner-whose-only-spaces-are-deleted-stays-an-owner.md), restore then unlink, needs to know whose space it was; the row says what a restore brings back. 2026-10-12, the deleted-spaces item.
- **The row dates a deletion (`deletedAt`), `null` for a live space** (the owner's choice over a flag). *Why:* the screen shows a deleted row as deleted on that day. 2026-10-12, the deleted-spaces item.
- **The admin-spaces composition supplies active owner names to the single-space admin read** (`ownersFor`), while its list composition remains unchanged. *Why:* `spaces` is an L1 capability and must not import `space-links` (L2); the composition root injects the reader so the read and writes carry owner names under the existing space share lock. 2026-10-15, #82.

### Web decisions

- **The web reads under `['me', 'spaces']`.** *Why:* the user's own data, in its key scope. 2026-10-04, #36.
- **`space-links` is dashboard-only** on the web. 2026-10-05, #39.
- **The switcher lives in this capability:** name and area, the other spaces, navigation on a choice, a skeleton, a retry. 2026-10-05, #39.
- **An English-only name shows marked `lang="en"` in the Arabic interface.** *Why:* the space name's language rule ([localisation › Content in two languages](../frontend/localisation.md#content-in-two-languages)). 2026-10-06, #44.
- **The admin's list on the web is one section with two slots, filled by the page:** each row's actions and the place field. *Why:* the page mixes three capabilities, so it composes them, and no feature imports another ([architecture §3](../frontend/architecture.md#what-a-feature-exports)); the edit screen and the owner's screens can reuse the seam. 2026-10-07, #50.
- **Each space's name is a link to the path the page gives** (`spaceLink`), the space's editor on the admin's page. *Why:* a row's name is what the admin looks for; the feature knows no routes. 2026-10-13, #74.
- **The list's filters and page live in the address,** each read by the contract's own rule, an invalid one falling back to its default; a filter replaces the address and returns to the first page, the pages are links. *Why:* a reload, a link or Back shows the same list, and Back leaves the page rather than stepping through filters, as the lookups' tab does. 2026-10-07, #50.
- **The list's page size is the contract's 20,** and the web does not send it. 2026-10-07, #50.
- **Freshness shows what is stale on a warning badge and what is missing on a warning badge each,** both when both apply, else "Up to date". *Why:* both need the admin's attention (the owner's A8). It replaced #50's missing on a neutral badge, a missing group being as wanted as a stale one. 2026-10-15, #84.
- **"Last update" is the day and the month, and the year when it is not the current one,** on Gaza's calendar, formatted inside the feature. *Why:* the design's short date, without a date from last year passing for this one; a platform formatter waits for a second feature that formats dates. 2026-10-07, #50.
- **While another page or filter loads, the page shown stays, marked busy** (#50's review). *Why:* a page link chosen from the keyboard kept no place while its page loaded, and the focus fell back to the list. 2026-10-08, #50.
- **The search field keeps what was typed;** it changes only when the address reads another search. *Why:* the address's search is trimmed, so a field reset to it after a pause ate the space before the next word (#50's review). 2026-10-08, #50.
- **When the row that held the focus leaves, the focus moves to the list.** *Why:* a deleted space's row takes its menu with it, and the focus would otherwise fall to the page's start. 2026-10-07, #50.
- **The admin's list reads under `['admin', 'space-links', 'spaces', request]`,** and the admin's writes on a space refresh the admin scope whole ([spaces › Decisions](spaces.md#decisions)). *Why:* the admin's scope, and no feature names another's keys. 2026-10-07, #50.
- **The users list lives in `space-links`, beside the spaces list,** with its read, its row, its search and its state filter. *Why:* a web capability carries the name of the backend module it calls, and `GET /admin/users` is this module's composed read, as the spaces list is; the paged list's pieces are reused, not copied; the users page will fill its row actions through a slot, as `spaces` fills the spaces list's. 2026-10-18, #88.
- **The owners page is the users list with `role=owner` fixed by its own hook;** the search and the state are the users list's (`?q=&state=&page=`). *Why:* the users page reuses the read, the row, the filters' address and the query. 2026-10-18, #88.
- **The owners page's state filter is chips, «الكل · نشط · موقوف», at every width, with no sheet.** *Why:* a single status filter of four or fewer choices is a `ToggleGroup` (P5), and a filter is a chip (A7); the design's sheet held that one filter only. 2026-10-18, #88.
- **An owner with no space reads that every space is deleted, the whole line a link to the deleted spaces.** *Why:* the list leaves a deleted space out while the role still counts its link, so the row would otherwise show an owner of nothing; the restore is where the way out begins ([finding 50](../architecture/findings/50-an-owner-whose-only-spaces-are-deleted-stays-an-owner.md)). 2026-10-18, #88.
- **The list's pages, states, paused search, return to the last page and focus keeper are pieces of the capability,** shared by the spaces and owners lists. *Why:* the owners list is their second instance (engineering principles §1). 2026-10-18, #88.
- *Superseded 2026-10-15 by #84's decisions, below.* **The row's badge stays one, hidden first, else verified or unverified,** read from the row's facts. *Why:* the list looks as it did until A3's screen shows the two facts apart. 2026-10-12, the deleted-spaces item.
- *Superseded 2026-10-15 by #84's decisions, below.* **The list keeps its own statuses, the contract's but `deleted`,** read from the address and offered in the filter; `?status=deleted` falls back to all. *Why:* the deleted spaces' screen (A3) is not built, and their rows would offer Hide and Delete. 2026-10-12, the deleted-spaces item.
- **A live row's state is badges, one per fact:** the verification always, then «مخفية» when hidden; the row view decides the set, so the table and the card cannot disagree. *Why:* A3 — a state is two facts, and hiding a space no longer erases who edits it. It replaced #50's one badge, hidden first. 2026-10-15, #84.
- **The list offers the contract's four statuses, «محذوفة» among them,** each read from the address by the contract's own rule, so `?status=deleted` reaches the server and survives the filters' and pages' links. *Why:* the API already lists them alone ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)); the web needed no status of its own. 2026-10-15, #84.
- **A deleted row is muted, its name text that leads nowhere,** and its date is worded by the list's own short date. *Why:* a deleted space's editor answers 404, and a link there would only say so. 2026-10-15, #84.
- **A deleted row carries one muted line and no badge, as the design draws it:** «محذوفة · …» where its state was, a dash where its freshness was, and nothing else. *Why:* a space that no longer exists cannot be verified or missing facts; its verification badge and its freshness warnings would be read on a row whose owner is restoring it, and the design chose the line (#84's review, the owner's decision). 2026-10-17, #85.
- **The stale filter is a `ToggleGroup` chip by the count, not a field** (A7), and the count moved beside the search to stand with it; the phone's sheet keeps the two fields only, and counts those two only, leaving the chip alone when it clears them. *Why:* a switch is not a filter field, and the count is what the admin looks for after filtering (the design's P5); a sheet that counted and cleared a field it does not hold would read a chip the sheet never showed (#84's review). 2026-10-15, #84.

## Code map

- **API:** `apps/api/src/modules/space-links/`, entry `index.ts`: the links, the caller's spaces and the loader in the module's root service, with its `me` router; `admin-spaces/` for the admin's list and its router; `admin-users/` for the admin's users list, `admin-owners/` for adding, linking and unlinking, and `admin-roles/` for the role change, on the same router, with the pure rule of the role the links give beside them.
- **Shared:** `packages/shared/src/space-links/`: the caller's spaces, the admin's list query and its rows, the users list's query and its rows, and the owner's add and link requests and the added owner.
- **Web:** `apps/web/src/features/space-links/`, entry `index.ts`: `SpaceSwitcher` (`components/switcher/`, `hooks/switcher/`), and `useMySpacesQuery` for the shell's public link, mounted by `pages/dashboard/shell/`; `AdminSpacesList` (`components/admin-list/`, `hooks/admin-list/`, with the pure address, row, date and page rules in `services/`) and `OwnersList` (`components/owners-list/`, `hooks/owners-list/`, the users list's read and filters in `hooks/users-list/`, its address and row rules in `services/`), both mounted by `pages/dashboard/admin/`; the lists' shared pages and states in `components/`, and their paused search, page-in-range and focus keeper in `hooks/`.

## Open findings

- [69](../architecture/findings/69-the-owners-endpoint-refuses-a-deleted-space-with-a-code-the-contract-does-not-name.md): the owners endpoint refuses a deleted space with a code the contract does not name.

## History

### API history

- #25 — the session's active links.
- #34 — the shared package split by capability.
- #36 — the caller's spaces.
- #44 — the admin's spaces list, the links loader on the admin's routes, and links to deleted spaces.
- #48 — the missing fact groups on the admin list's rows.
- #60 — the admin's users list; adding, linking and unlinking owners, with the role that follows the links.
- The users item — the admin's role change.
- The deleted-spaces item — a row's state as facts apart, and the soft-deleted spaces listed under `status=deleted`.
- The directory item — the verified spaces' ids, for the public directory.
- #82 — the active owners of one space, for the single-space admin read (`ownersFor`).
- #83 — the active-link access boundary used by the owner/reception managed-space API.
- #86 — `ownersFor` reads the names in its caller's transaction.

### Web history

- #36 — the caller's spaces.
- #39 — the space switcher.
- #44 — an English-only name marked as English in the Arabic interface.
- #50 — the admin's spaces list on the web.
- #74 — each space's name a link to its editor.
- The deleted-spaces item — the row's badge read from its facts; the list's own statuses, without `deleted`.
- #84 — the state's badges apart, the fourth status, the deleted row muted with its date, and the stale chip by the count.
- #85 — a deleted row as one muted line in place of its badges, the phone's sheet counting and clearing only its own two fields, and the chip's Arabic words as the design writes them.
- #88 — the admin's owners page: the users list filtered to the owners, its search and state chips, and an owner whose spaces are all deleted led to the deleted spaces; the lists' paging shared.
