# Directory

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-21 · **Owner:** Basel Ghoneim
> **Authority:** The `directory` capability: what anyone reads without signing in, over the publicly listed spaces: the directory's list, the map's pins, a space's public page and its live status. Its endpoints are owned by the [API contract](../api/api-contract.md#directory-public); "publicly listed", "verified" and the stale prices by the [data model](../architecture/data-model.md#derived-values-computed-not-stored); the location's rules by [security](../backend/security.md#location). On the web, the directory's list, its filters and near me are built.
> **Scope:** the API module `directory` (L5); `@masaha/shared/directory`; the web feature `features/directory`, for any page group.

## What it does

- Lists the publicly listed spaces a page at a time, filtered by area, price, student prices, Friday, verified, available now and a search, ordered by the latest update, by name, by best match, or nearest first from a location the device sends.
- Answers the map its pins: every space that passes the same filters, unpaged, up to a ceiling, within the map's viewport when it is given.
- Answers a space's public page: its profile, hours and shifts, prices, amenities, contacts and each group's freshness.
- Carries each card's and pin's live status, and answers a space's live status alone.
- On the site's «المساحات», lists the spaces a page at a time, with a search, filters by place, price and state, and an order, or nearest first from the device's rounded location, each card a link to the space's page.
- On the site's «المساحات», shows the same spaces on a map, «قائمة | خريطة», each a pin whose live state is a shape as well as a colour, the chosen one's card leading to its page.

The announcements, the reports and the favourites' cards are not built.

## Who uses it

- **Anyone,** signed in or not, through the API, and on the site's «المساحات», the directory's list.

## Responsibility boundary

- **Owns** no table. It composes the reads below it, and owns the public payloads and their caching.
- **Leaves** the spaces' filters, the search's score, the orders and the pages to [`spaces`](spaces.md), which owns the tables they read, and the rule of the hidden prices.
- **Leaves** which areas are listed, and how a search matches an area's names, to [`lookups`](lookups.md); which spaces are verified to [`space-links`](space-links.md).
- **Leaves** the live status to [`occupancy`](occupancy.md): its rule, and which spaces are available now.

## How it composes the platform

- Its public router is mounted at the API's root, unguarded, behind the general rate limit ([security › Rate limits](../backend/security.md#rate-limits-fixed-window)).
- **A composed read** ([conventions › Composed reads](../backend/conventions.md#composed-reads)): each filter on another module's value is resolved to ids first, by its owner, in one query: the listed areas and the areas a search matches by `lookups`, the verified spaces by `space-links`, and with `availableNow`, the verified spaces available now by `occupancy`. `spaces` then filters, searches, orders and pages ([conventions §5](../backend/conventions.md#5-pagination)); the areas' names, and on the page the amenities' names, follow, one query each, and the live status of the spaces answered, set-based, from `occupancy`, from the weeks they were listed with.
- **The search's one rule** is the database's: a function normalises the names and the query alike, and another scores how well they match ([data model › Conventions](../architecture/data-model.md#conventions)).
- **The page** is read under the space's share lock, as the admin's read is ([conventions §13](../backend/conventions.md#concurrency)); whether it is verified is read from its links under the same lock, through `space-links`, with the facts it decides on.
- **The location** is read from its header with the query, by one shared schema, and kept off the request, so the request logger, which redacts the header, never writes it ([security › Location](../backend/security.md#location)).
- **On the web,** the site's Directory page sets the list's slots: the space's link (`publicSpacePath`), each card's area, named by [lookups](lookups.md)' `AreaName` from the public catalogue, and the place filter, `lookups`' `AreaFilter`. The filters are drawn once per width with the design system's `useMediaQuery`. Near me keeps its state in a store of the feature's own, in memory. The pages are `shared/lists`' `ListPagination`; the list is read with TanStack Query's app defaults, under `['public', 'directory']`.

## Behaviour and flows

**The list.** Every filter applies before the page is cut, so every page is full and the total right; every order ends with the id, so a tie keeps its place across pages. With `q`, the best match comes first unless another order is asked. The card carries the names, the area, verified, the week, its cover's card-size URL, or none, and its live status; no price, freshness, capacity or count. `availableNow` keeps only the spaces `AVAILABLE` now, resolved to ids before the page is cut.

**Near me.** The device rounds its location to three decimals and sends it in the `Masaha-Near` header, only to sort by distance. Each space then carries its straight-line distance, to the nearest 100 m, and the answer is stored by no cache.

**The map.** The pins of every space that passes, unpaged; past 1,000, the first 1,000 by id, marked truncated, and the map asks again within its viewport. A pin carries what its selected card shows: the names, the area's id (named from the public catalogue), the place, verified, the week, the cover and the live status.

**A space's page.** A space that is not publicly listed is not found. An unverified space's stale prices are hidden (`null`), a verified space's shown with the group marked stale. The amenities are one list: the platform's active ones in its order, with their icons, then the space's own. Its photos come in the gallery's order, the cover first, each in both sizes, read under the same lock as its facts.

**A space's live status.** The status alone, for a publicly listed space; anything else is not found, as its page. Whether it is verified is read from its links.

**Caching.** Every answer may be kept for 30 seconds and revalidated with its `ETag`, except one ordered by distance.

**The directory's list on the web.** `DirectoryList` shows 20 spaces a page. Each card is one link to the space's page, named by its name and described by its area, its status, «موثّقة» and today's hours, so they are read after the name: the cover, or the space's mark (the shown name's first letter) when it has none or its cover fails to load, in a frame of fixed ratio; the name; the area with its governorate; the live status by its word, or «لا تتوفر حالة مباشرة»; «موثّقة»; today's hours on Gaza's calendar. No price. The search reads both names and the area's, and reaches the address once typing pauses; the order is «الأحدث تحديثًا» or «حسب الاسم», and «الأفضل تطابقًا» while a search applies. The search, the filters, the order and the page live in the address. The count says the Strip's spaces, or the matching ones once anything narrows the list, worded from a real answer only: while the next one loads, it keeps its last line; a count of none draws no line, the empty state saying it. Loading shows skeleton cards; a failure says so, with its reference and «إعادة المحاولة» (too many requests counts down its wait, then offers it again); a failed refresh keeps the cards, the failure above them; an empty directory and no match (with «مسح الفلاتر») are their own states; a page past the last shows the last. While another page loads, the cards shown stay, the results marked busy; a page the visitor chooses takes the focus to the results' heading, while a search, an order or a page past the last, which replace the address, leave it where it is.

**The directory's filters on the web.** The place (any number of areas, `lookups`' `AreaFilter`); «المساحات», two switches, «متاحة الآن فقط» and «المساحات الموثّقة فقط», with the note that available now covers verified spaces only; the price, a period («ساعة · يوم · أسبوع · شهر», two by two) and a budget «من» «إلى» in whole shekels, Arabic digits read, each refused bound said under its field and left out (0, letters, above 100,000, a maximum under the minimum), with a help line naming the period; and «أخرى», student prices and open on Friday. Each applies at once; the budget reaches the address once typing pauses, and a period chosen before any bound waits for one. From 1024 px they are a sidebar beside the results, «الفلاتر» with «مسح»; below it, a button «الفلاتر» that counts the filters in force opens them in a bottom sheet, whose primary button counts the spaces they leave and closes it, with «مسح الفلاتر» under it; the sheet closes once the screen reaches the sidebar's width. Clearing the filters keeps the search and the order, and empties the price's fields, a refused text included, with the period back to the day; no match's «مسح الفلاتر» does the same while a filter is in force, and takes off the search alone when the search alone finds nothing.

**Near me on the web.** «الأقرب إليّ» asks for the device's location only when pressed, never on load. The position is judged where it arrives: less precise than 2 km, or outside the Strip's box once rounded, it is not used; otherwise only its point rounded to three decimals is kept, in memory, never in the address or the browser's storage. While the list sorts by distance, it is asked with `sort=distance` and the point in the `Masaha-Near` header, never in the query; the order shows «حسب المسافة», each card «على بعد 0.7 كم», and the state line «مرتبة حسب المسافة من موقعك. المسافات تقريبية بخط مستقيم.» with the privacy line. Pressed again, or «إيقاف الترتيب حسب المسافة», or another order, stops the distance order and keeps the point; «مسح موقعي» drops it and every answer ordered by distance. A denied or unavailable location, no answer within 15 s (a later one is dropped), and an imprecise one each say so, with «اختر منطقتك», which focuses the place filter in the sidebar from 1024 px and opens the sheet below it; the privacy line shows only while a location is asked or sent. The state line is one live region that stays while its content changes, so each state is announced; while the location is asked, the button is busy but keeps the focus, and stopping or clearing hands the focus back to it. A card says its distance only while the list is ordered by distance, never from the answer still shown once the order stops.

**The map on the web.** «قائمة | خريطة» beside the page's heading switches the view at every width, kept in the address (`view=map`) with every filter. The map asks `GET /map/spaces` with the list's filters, the whole set, and draws each space as a pin: available filled green, full a warning dot with a bar across it, closed hollow, no live status dashed and muted, so a state is never told by colour alone; the legend in the map names each mark. A pin is a button named by the space and its state, chosen by a click, Enter or Space; its name shows beside it. On the map the filters open in the sheet at every width, with no order; near me and its state line are the list's, the visitor's point drawn on the map, with «مركّز على موقعي». The chosen space is a card over the map's foot from 768 px, and a bottom sheet below it that is not modal: it takes no focus, the map behind it still pans, and a tap on the map leaves it open; the chosen pin is brought into view above it. Each shows the name, the area, the status, «موثّقة» and today's hours, with «عرض التفاصيل» to the space's page; closing it, by «إغلاق» or Escape, hands the focus back to the pin. A change of filter clears the choice. Past 1,000 pins the map says «تظهر أول 1000 مساحة؛ قرّب الخريطة لترى ما بقي.», and once it has moved and paused 400 ms it asks again within the box in view, whose answer replaces the marks. Loading, a failure (with «إعادة المحاولة»), an empty directory and no match (with «مسح الفلاتر») are each said over or above the map; when the map cannot load, «لم تُحمَّل الخريطة. تصفّح المساحات في القائمة.»

**Setting one's location on the map.** A denied or imprecise location offers «حدّد موقعي على الخريطة» beside «اختر منطقتك», and a point set by hand offers «تغيير الموقع»; each opens the map, every filter kept. A crosshair stands at the map's centre and the map takes the focus, its arrow keys panning it under the crosshair (a visually hidden line says so); the marks cannot be chosen, and near me's button, its line, «مركّز على موقعي» and the chosen space are hidden. The card «حدّد موقعك على الخريطة» (over the map's foot, and under the map below 1024 px, where the map is shorter, so it never hides the crosshair) says the point is sent rounded and never stored; «ثبّت الموقع هنا» places the centre, and a tap on the map places that point. The point is rounded as the device's is, held inside the Strip's box, and kept the same way, in memory, sorting the lists by distance («مرتبة حسب المسافة من الموقع الذي حدّدته على الخريطة.»), drawn as «موقعي (يدوي)»; «رجوع» restores the location before, and so does leaving the map while picking (the list, Back or a link): the pick never outlives the map. Either returns the focus to «الأقرب إليّ».

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
- **The card and the pin carry the live status, never a count; `GET /spaces/:slug/occupancy` answers it alone** ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)). *Why:* the directory shows each space's state, and its filter selects by it; the page is cached whole for 30 seconds, and the endpoint refreshes the state without it. A card may lag the state by those 30 seconds. 2026-10-19, #94.
- **`availableNow` is resolved to ids by `occupancy` before the page is cut, from the verified spaces only** ([conventions §5](../backend/conventions.md#5-pagination)). *Why:* every page full and the total right; only a verified space has a live state. 2026-10-19, #94.

### Web decisions

- **The site's directory is a web feature of its own, `directory`, for any page group** (S1). *Why:* this capability owns the public reads; `spaces` stays the dashboard's editor. 2026-10-21, #101.
- **The address holds the search, the filters, the order and the page, no default written** (S5): `q`, `area`, `period`, `min`, `max` (whole shekels), `available`, `verified`, `students`, `friday`, `sort`, `page`. A value the server would refuse falls back to its default, and a maximum under the minimum is left out; a change replaces the address and returns to page 1. *Why:* a reload, Back and a shared link show the same list. 2026-10-21, #101; the budget's order, #103.
- **The page sets `lookups`' area name and area filter in the list's slots** (S7). *Why:* no feature imports another; the governorate is the catalogue's. 2026-10-21, #101; the area filter, #103.
- **«الأفضل تطابقًا» is offered only while a search applies** (S10, design issue 7). *Why:* it is the server's order for a search and refused without one; the trigger never shows an order its list lacks. 2026-10-21, #101.
- **The cards shown stay while the next page or filter loads** (S13). *Why:* on a weak connection the list never blanks between two answers. 2026-10-21, #101.
- **The live state's words are `terms`' and its roles DECISIONS_SHARED's:** available `success`, full `warning`, closed `neutral`, none in muted words (S14). 2026-10-21, #101.
- **A search with no letter to match never leaves the browser** (S15): it stays in the field with «اكتب حرفًا من اسم المساحة أو منطقتها», and the list is asked without it. *Why:* the server answers 422, which would replace the list by a failure. 2026-10-21, #101.
- **The card shows no price** (the decisions' amendments, 2026-10-12). 2026-10-21, #101.
- **The count says «في قطاع غزة» only when nothing narrows the list** (design issue 3). *Why:* «مساحة واحدة في قطاع غزة» was false under a filter. 2026-10-21, #101.
- **A cover that fails to load is replaced by the space's mark in the same frame** (design issue 13). 2026-10-21, #101.
- **A verified space with no live status reads «لا تتوفر حالة مباشرة», as an unverified one** (design issue 16). *Why:* it is true of both. 2026-10-21, #101.
- **The card's area is «{area} · {governorate}», from the public catalogue, in either language** (design issue 17). 2026-10-21, #101.
- **An empty directory has its own state, «لا توجد مساحات في الدليل بعد»,** with no action (design issue 18). 2026-10-21, #101.
- **The filters are drawn once per width: a sidebar from 1024 px, a bottom sheet below it,** read with the design system's `useMediaQuery` (S6). *Why:* never two copies with duplicate ids, and the switch is provable in the component tests. 2026-10-21, #103.
- **The budget is whole shekels in the address (`min`, `max`), sent as agorot** (S5). *Why:* one name and one unit in the address; the contract's unit on the wire. 2026-10-21, #103.
- **«أخرى» (student prices, open on Friday) is a filter of the list** (S9). *Why:* the design and the scope both have it; the API filters by both. 2026-10-21, #103.
- **The filters' button is the sheet's own trigger, its count's words read in place of the badge** (design issue 2). *Why:* it says whether the sheet is open and how many filters apply. **It counts the filters in force, not their values:** the place, the price, available now, verified, student prices, Friday, six at most (design issue 14). 2026-10-21, #103.
- **The sheet's primary button counts the spaces, in Arabic agreement** («عرض المساحتين», «عرض 6 مساحات»), «لا نتائج — غيّر الفلاتر» with none, «عرض النتائج» while unknown (design issue 4). 2026-10-21, #103.
- **The period's four chips sit two by two, and the help line names the period:** «يُطبَّق «من» و«إلى» على سعر اليوم» (design issues 10, 11). 2026-10-21, #103.
- **Near me's location lives in memory only: the rounded point, in the feature's store,** never the address or the browser's storage (S4). *Why:* the location's rules ([security](../backend/security.md#location)): a URL is logged by hosts and shared by people; a reload asks again with one tap. 2026-10-21, #103.
- **The privacy line is «يُرسَل موقعك مقرَّبًا لترتيب المساحات حسب المسافة فقط، ولا يُحفظ.», shown only while a location is asked or sent** (decision 8, design issue 5). *Why:* the refused and imprecise states send nothing. 2026-10-21, #103.
- **Stopping the distance order keeps the location; only «مسح موقعي» drops it** (design issue 6). *Why:* one meaning for the button wherever it stands. 2026-10-21, #103.
- **A card says «على بعد 0.7 كم», «على بعد 1 كم», «على بعد 12 كم»; the approximation is said once, in the state line** (design issue 9). 2026-10-21, #103.
- **An imprecise position is said as «يبدو أن موقعك خارج قطاع غزة، أو أن هامش الخطأ فيه أكبر من 2 كم، فلم نستخدمه.»** (design issue 12). 2026-10-21, #103.
- **What a pin means is the directory's; `shared/map` draws the marks it is named by shape and tone** (S12). *Why:* Leaflet stays in `shared/map`, and a map of many marks survives outside Masaha. 2026-10-21, #105.
- **Each live state is a pin's shape as well as its colour, and a space with no live status, verified or not, is one dashed mark** (U6, design issue 21). *Why:* colour alone fails the colour-blind and the sun; the card says the same «لا تتوفر حالة مباشرة» for both. 2026-10-21, #105.
- **The phone's chosen space is a sheet that is not modal** (design issue 22). *Why:* a modal sheet would trap the map behind it (U6). 2026-10-21, #105.
- **The map's failure line points to the list, and past 1,000 pins the map says so and asks within its view** (design issues 19, 20). 2026-10-21, #105.
- **A location can be set by hand at the map's centre, rounded and kept as the device's is; «رجوع» restores the one before** (U7 as built). *Why:* a denied or imprecise location still leaves a way to sort by distance, with the same privacy. 2026-10-22, #105.

## Code map

- **API:** `apps/api/src/modules/directory/`, entry `index.ts`: the public router, its controller with the caching rule, the list's query read with its header, and the service that composes the reads, the live status from `occupancy` among them.
- **Shared:** `packages/shared/src/directory/`: the queries (the filters, the orders, the location and the viewport, with their rules) and the answers.
- **Web:** `apps/web/src/features/directory/`, entry `index.ts` (`DirectoryView`, `ViewSwitch`, `DirectorySlots`), mounted by `pages/site/public/directory/`; the address and the request in `services/filtersOf.ts` and `requestOf.ts`, the card's words in `services/cardView.ts`, `todayHours.ts` and `distanceText.ts`, the rounded point and its header in `services/nearPoint.ts`, the budget's rule in `services/priceBounds.ts`, the list's hooks in `hooks/list/`, the filters' in `hooks/filters/`, near me's store and hooks in `hooks/near/`, the map's in `hooks/map/` (with `services/pinMark.ts` and `boundsText.ts`), the view's in `hooks/view/`, the card in `components/card/`, the results and their states in `components/list/`, the filters' form, sidebar and sheet in `components/filters/`, the near-me button and state line in `components/near/`, the map, its legend and the chosen space in `components/map/`, the view switch in `components/view/`.

## Open findings

- [64](../architecture/findings/64-the-deployments-headers-must-let-cloudinarys-photos-load.md): the deployment's headers must let Cloudinary's photos load.

## History

### API history

- The directory item — the list, the map's pins and a space's page; the search; near me from a header.
- #77 — the cover on the card and the pin, and the photos on the page.
- #77 — Issue #69: the tie-break tests made able to fail, `no-store` on every answer carrying the location, the page's verified under its lock, the spaces-only `q` named `too_short`.
- #94 — the live status on the card and the pin, the `availableNow` filter, and a space's live status alone.

### Web history

- #101 — the site's list: the card, the search, the order, the pages, and the address.
- #103 — the filters: the place, the price, the two switches and «أخرى»; the sidebar from 1024 px and the sheet below it.
- #103 — near me: the rounded point in memory, the distance order through the header, the cards' distances, the state line and the privacy line.
- #103 — carried from #101: the focus moves only for a page the visitor chose; the count is worded from a real answer; the retry stays after too many requests; a maximum under the minimum never reaches the server; a card's details are its link's description; a count of none draws no line.
- #105 — the map: «قائمة | خريطة», the pins by state, the legend, the chosen space's card and sheet, and the view's re-ask past 1,000 pins.
- #105 — setting one's location by hand on the map: the crosshair, «ثبّت الموقع هنا», «رجوع», «تغيير الموقع».
- #105 — carried from #103: near me's state line is one live region and hands the focus back; no distance once the distance order stops; asking ends after 15 s with no answer; no match's «مسح الفلاتر» keeps the search while a filter applies; clearing resets the price's fields; the sheet closes when the screen widens to the sidebar.
