# Directory

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-13 · **Owner:** Basel Ghoneim
> **Authority:** The `directory` capability: what anyone reads without signing in, over the publicly listed spaces: the directory's list, the map's pins and a space's public page. Its endpoints are owned by the [API contract](../api/api-contract.md#directory-public); "publicly listed", "verified" and the stale prices by the [data model](../architecture/data-model.md#derived-values-computed-not-stored); the location's rules by [security](../backend/security.md#location). Only the API is built.
> **Scope:** the API module `directory` (L5); `@masaha/shared/directory`.

## What it does

- Lists the publicly listed spaces a page at a time, filtered by area, price, student prices, Friday, verified and a search, ordered by the latest update, by name, by best match, or nearest first from a location the device sends.
- Answers the map its pins: every space that passes the same filters, unpaged, up to a ceiling, within the map's viewport when it is given.
- Answers a space's public page: its profile, hours and shifts, prices, amenities, contacts and each group's freshness.

Live status, the announcements, the reports and the favourites' cards are not built.

## Who uses it

- **Anyone,** signed in or not, through the API. No page of the site reads it yet.

## Responsibility boundary

- **Owns** no table. It composes the reads below it, and owns the public payloads and their caching.
- **Leaves** the spaces' filters, the search's score, the orders and the pages to [`spaces`](spaces.md), which owns the tables they read, and the rule of the hidden prices.
- **Leaves** which areas are listed, and how a search matches an area's names, to [`lookups`](lookups.md); which spaces are verified to [`space-links`](space-links.md).
- **Leaves** the live status to `occupancy` (step 7).

## How it composes the platform

- Its public router is mounted at the API's root, unguarded, behind the general rate limit ([security › Rate limits](../backend/security.md#rate-limits-fixed-window)).
- **A composed read** ([conventions › Composed reads](../backend/conventions.md#composed-reads)): each filter on another module's value is resolved to ids first, by its owner, in one query: the listed areas and the areas a search matches by `lookups`, the verified spaces by `space-links`. `spaces` then filters, searches, orders and pages ([conventions §5](../backend/conventions.md#5-pagination)); the areas' names, and on the page the amenities' names, follow, one query each.
- **The search's one rule** is the database's: a function normalises the names and the query alike, and another scores how well they match ([data model › Conventions](../architecture/data-model.md#conventions)).
- **The page** is read under the space's share lock, as the admin's read is ([conventions §13](../backend/conventions.md#concurrency)); whether it is verified is read from its links under the same lock, through `space-links`, with the facts it decides on.
- **The location** is read from its header with the query, by one shared schema, and kept off the request, so the request logger, which redacts the header, never writes it ([security › Location](../backend/security.md#location)).

## Behaviour and flows

**The list.** Every filter applies before the page is cut, so every page is full and the total right; every order ends with the id, so a tie keeps its place across pages. With `q`, the best match comes first unless another order is asked. The card carries the names, the area, verified, the week and its cover's card-size URL, or none; no price, freshness or live state.

**Near me.** The device rounds its location to three decimals and sends it in the `Masaha-Near` header, only to sort by distance. Each space then carries its straight-line distance, to the nearest 100 m, and the answer is stored by no cache.

**The map.** The pins of every space that passes, unpaged; past 1,000, the first 1,000 by id, marked truncated, and the map asks again within its viewport. A pin carries what its selected card shows: the names, the area's id (named from the public catalogue), the place, verified, the week and the cover.

**A space's page.** A space that is not publicly listed is not found. An unverified space's stale prices are hidden (`null`), a verified space's shown with the group marked stale. The amenities are one list: the platform's active ones in its order, with their icons, then the space's own. Its photos come in the gallery's order, the cover first, each in both sizes, read under the same lock as its facts.

**Caching.** Every answer may be kept for 30 seconds and revalidated with its `ETag`, except one ordered by distance.

## Decisions

### API decisions

- **The list is paged and filtered on the server** (the owner, D1). *Why:* it must hold at a thousand spaces; it replaces the plan's "whole filtered set in one request". 2026-10-13, the directory item.
- **"Near me" sorts on the server, from a location sent in a request header, rounded on the device to three decimals, never stored or logged** (the owner, D2 and the reply's decisions 4 and 5). *Why:* paging needs the server to sort; a header reaches no URL a host or a proxy logs; at about 110 m, "near" keeps its meaning among close spaces while naming a block, not a home. It changes the v1 commitment that the location is never sent ([overview](../project/overview.md#public-site)). 2026-10-13, the directory item.
- **A finer point is refused, not rounded** (S3). *Why:* a client that skips the rounding fails loudly instead of sending a precise location. 2026-10-13, the directory item.
- **The map reads its own light pins, at `/map/spaces`** (D3, S1). *Why:* the map needs the whole set, and a slug could be `pins`. 2026-10-13, the directory item.
- **The map's ceiling is 1,000 pins, the rest asked within the viewport** (D3). *Why:* it holds at a thousand spaces in about 25 kB compressed. 2026-10-13, the directory item.
- **A pin carries its area's id and the week** (S2, the owner's approval). *Why:* the selected card shows the area and today's hours; the area's id also gives Home its counts per area. 2026-10-13, the directory item.
- **The card carries no price, photo or freshness** (the owner, D4). *Why:* prices live on the page; photos are a later decision; the card shows no freshness. 2026-10-13, the directory item. *Revised* by the next line.
- **The card and the pin carry the cover's card-size URL, or none; the page carries every photo in both sizes** (D12, the owner's answer 6). *Why:* the card's cover leads it (U12), the selected card on the map is the same card, and the page's gallery opens a photo alone. A space with none shows its mark, and its page a caption. The covers of a page of cards are one query. 2026-10-13, #77.
- **The week goes to the device, which reads today in Gaza at view time** (D5). *Why:* a kept list may cross midnight; "open on Friday" is read on the server from the same rows. 2026-10-13, the directory item.
- **The search forgives the way people type** (the owner, D6): both names and the area's names, Arabic letters folded, and a near match counted, ranked best first. It is PostgreSQL's `pg_trgm`, not a similarity in the application, which would load every space for each search. 2026-10-13, the directory item.
- **A search with nothing to match is refused** (the owner's addition). *Why:* it would match every space. 2026-10-13, the directory item.
- **Price bounds are in agorot, and both price filters leave out the spaces whose prices the page hides** (S4, S5). *Why:* the contract's one unit; a space found by "student prices" must show them. 2026-10-13, the directory item.
- **A retired amenity is not shown on the page** (S8). *Why:* retiring withdraws it from what the platform offers. 2026-10-13, the directory item.
- **Answers are kept 30 seconds with a validator; one ordered by distance is never kept** (D7, S7). 2026-10-13, the directory item.
- **No answer to a request that carries the location is kept, a refusal or a failure included.** *Why:* the rule is about the request, not its success; the header was marked only after a successful read (Issue #69). 2026-10-13, #77.
- **The page decides verified under the space's lock, with its facts.** *Why:* read just before, an owner unlinked meanwhile showed an unverified space's stale prices for one answer (Issue #69). 2026-10-13, #77.

## Code map

- **API:** `apps/api/src/modules/directory/`, entry `index.ts`: the public router, its controller with the caching rule, the list's query read with its header, and the service that composes the reads.
- **Shared:** `packages/shared/src/directory/`: the queries (the filters, the orders, the location and the viewport, with their rules) and the answers.

## Open findings

- [64](../architecture/findings/64-the-deployments-headers-must-let-cloudinarys-photos-load.md): the deployment's headers must let Cloudinary's photos load.

## History

### API history

- The directory item — the list, the map's pins and a space's page; the search; near me from a header.
- #77 — the cover on the card and the pin, and the photos on the page.
- #77 — Issue #69: the tie-break tests made able to fail, `no-store` on every answer carrying the location, the page's verified under its lock, the spaces-only `q` named `too_short`.
