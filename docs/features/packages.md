# Packages

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-22 · **Owner:** Basel Ghoneim
> **Authority:** The `packages` capability: a space's packages, the subscription templates its owner keeps, private to its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#packages-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; on the web, the owner's private packages on Packages & prices.
> **Scope:** the API module `packages` (L2); `@masaha/shared/packages`; the web feature `features/packages`, dashboard-only.

## What it does

- Keeps a space's packages: a name, a validity in days, optional limits (total days, days a week, hours a day, total hours), a billing (a whole price, or a rate per hour or per day) with its price, an audience, an optional shift of the space, and whether the package is still offered.
- Answers the space's staff every package, retired ones included, in order, whole.
- Lets the owner add a package, placed last.
- Lets the owner edit any of a package's terms, and retire it; a package is never deleted.
- On the dashboard, shows the owner the space's private packages on Packages & prices: each offered or paused by its switch, added and edited in the package sheet, and a paused one that still holds a shift cleared of it.

## Who uses it

- **The space's owner,** on the dashboard's Packages & prices (`/dashboard/spaces/:spaceId/packages`): reads, adds and edits.
- **The space's reception,** through the API: reads them, for the front desk, which chooses from them when it makes a subscription.
- **The front desk** ([desk](desk.md)): a subscription copies an offered package's terms when it is made (`termsOf`), and keeps them whatever the package becomes.
- Reception's desk does not read it on the web yet. The public never does: its packages are the space's published prices ([glossary](../project/glossary.md)).

## Responsibility boundary

- **Owns** the `packages` table, the order of a space's packages, and the rule of what an edit changes.
- **Leaves** the space, its lock and its shifts to [`spaces`](spaces.md); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)); the subscriptions made from a package, which copy its terms, to `subscriptions` (not built).

## How it composes the platform

- Its manage router sits below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Its list is one of the contract's exceptions to pagination ([api-contract §4](../api/api-contract.md#4-pagination)).
- Its writes ask `can()` at the route, through `requireCan`, then again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)).
- Each change is audited by the audit writer, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#packages-managed) gives.
- Its requests are checked by the shared schemas ([shared-package.md](../architecture/shared-package.md)), in the browser too.
- On the web, the page sets the space's shifts in the section, as [`spaces`](spaces.md) reads them (`useSpaceShifts`), so the feature reads no space; a save refused for a shift gone meanwhile fetches the whole `['space', spaceId]` scope again, since the shifts are `spaces`' ([architecture §7](../frontend/architecture.md#7-server-state)).

## Behaviour and flows

**The list.** One query reads the space's packages, by place, then by name, retired ones included, each saying whether it is offered.

**Add.** In one transaction: the space's lock; `can()` on the links as they are under it; the package written after the last, active; its audit entry. A name another package of the space holds, retired or not, is refused by the database's key; so is a shift that is not one of the space's. Each refusal names its field.

**Edit.** The same lock and `can()`, then the package, found among the space's own; only the fields the edit sets to a new value are written and audited, `null` clearing a limit or the shift. An edit that changes nothing writes nothing. Retiring is the same edit, `isActive: false`; a retired package stays listed, and `true` offers it again.

A retired package keeps its shift: the shift's own save refuses to remove a shift anything names ([finding 81](../architecture/findings/81-a-retired-package-that-keeps-its-shift-stops-the-owner-from-removing-that-shift.md)), so clearing it on the retired package — `PATCH { shiftId: null }` — is the way out, which the owner's screen offers (below).

**The owner's packages on the web.** «الباقات الخاصة», under the published prices on Packages & prices (`PackagesSection`), says «لا تظهر للزوار.» and offers «باقة جديدة» at its row's end:
- **The list** is every package, in the server's order, a row each: the name, «موقوفة» on a muted row for a paused one, its terms in one line — the validity, each limit set, «للطلاب», the shift's name, every count in its plural form — and its price, the amount for a fixed price or the rate «… للساعة», «… لليوم». It has its own loading, its failure with the request's reference and «إعادة المحاولة», and an empty state with «باقة جديدة».
- **The switch «متاحة»** (named «{name}: متاحة») offers or pauses the package at once; while its change waits it stays in the focus order and a press does nothing; the server's answer replaces the row; a refusal is a toast that stays, «تعذّر تغيير إتاحة {name}», with its reason in the owner's words, as the sheet's.
- **A paused package that still holds a shift** says «موقوفة وما زالت تحجز وردية «{shift}»؛ لا تُحذف الوردية قبل إزالتها منها.» and offers «إزالة الوردية», which clears it at once, as the switch acts — while the space's shifts load, or if they could not be read, the line names no shift ([finding 81](../architecture/findings/81-a-retired-package-that-keeps-its-shift-stops-the-owner-from-removing-that-shift.md), resolved).
- **The package sheet** (from the end, «باقة خاصة — لا تظهر للزوار.»), new or «تعديل الباقة», holds the name; the validity in days (30 for a new one); «الحدود» as chips, each one turned on showing its field and turned off clearing it; «طريقة الحساب» (fixed, per hour, per day) and the amount labelled by it, in shekels with up to two decimals, Arabic digits read; «لمن»; and the space's shifts as chips, «بدون وردية» first — or, with no shift saved, «لا ورديات محفوظة بعد.» and a link to the profile's opening hours. A summary under them follows what is typed. The terms are checked in the browser by the contract's schema before anything is sent: a limit on and empty asks «أدخل العدد أو أطفئ هذا الحد». A save waits until the list has arrived again, then closes and says «حُفظت الباقة {name}»; a repeated name is refused on the name, a shift gone meanwhile on the shift, and a shift the space no longer has is no longer chosen, so the next save goes on without it; a 403 says only that it is no longer open to the owner, a 404 that the package is gone or the space no longer open to them — for a new package, only that the space is no longer theirs. Any 404 on the packages' routes, the list's included, fetches the owner's own spaces again, so the space switcher stops offering a space whose link ended.

## Decisions

### API decisions

- **A package is private to the space's staff: no public route reads it** (D7). *Why:* the public's packages are the space's published prices; the module has no public router. 2026-10-18, #87.
- **The list answers every package, retired ones included, whole** (D5). *Why:* the owner's list shows the retired ones and the desk's picker offers the active ones; a space keeps tens at most, typed by hand. 2026-10-18, #87.
- **The order is a package's place, then its name; no route reorders them** (D4). *Why:* the design orders nothing by hand; the name orders the rows written outside the API. 2026-10-18, #87.
- **The read is one query, with no lock.** *Why:* one statement is never half of a change; the boundary has admitted the caller. 2026-10-18, #87.
- **A new package is active, placed after the last** (D4). *Why:* as a new lookup row; the design's switch sits on the row, not in the sheet. 2026-10-18, #87.
- **The writes are the owner's: refused at the route before the body is read, then decided again under the space's lock, on the links read there** (D1). *Why:* reception reads packages for the desk but never changes them ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)); a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-18, #87.
- **A package's price is above zero,** in whole agorot up to the prices' bound (the owner's DI-10). *Why:* as a space's prices: a free offer is an announcement. The database refuses zero too since the migration `subscription_terms` ([finding 80](../architecture/findings/80-the-database-still-takes-a-package-with-a-price-of-zero.md), resolved 2026-10-22, #106). 2026-10-18, #87.
- **A name is the package's own within its space, retired ones included,** refused on its field by the database's key, in the write's own transaction (the owner's O8). *Why:* the desk tells packages apart by name; no check before the write can race it. 2026-10-18, #87.
- **One name, 1–60 characters, in whatever language the owner types** (the model). *Why:* the owner's label for their own staff, as long as a price's label. 2026-10-18, #87.
- **The shift is one of the space's own, as the database's key holds it** (D6). *Why:* the key through `(shiftId, spaceId)` refuses another space's shift; `packages` reads no shift, as `spaces` reads no package ([spaces › Decisions](spaces.md#api-decisions)). 2026-10-18, #87.
- **The limits combine freely, each only bounded** ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)). *Why:* they only warn at check-in. 2026-10-18, #87.
- **Each create is audited, `package.created`, with its terms** (D8). 2026-10-18, #87.
- **No idempotency key on a create.** *Why:* a package is the owner's setup, not a desk create ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)); a create retried after a lost answer meets its own name, and the list shows it. 2026-10-18, #87.
- **A package is retired, never deleted:** `isActive: false`, and offered again with `true` (D1, the model). *Why:* the subscriptions made from it name it. 2026-10-18, #87.
- **An edit writes and audits only what it changes, `package.edited`, the flag included; one that changes nothing writes nothing** (D8). *Why:* as the space profile's edit; one entry per edit, since a package's flag has no public effect. 2026-10-18, #87.
- **Editing or retiring a package changes no subscription** (D9). *Why:* a subscription copies its terms when it is made ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)). 2026-10-18, #87.

### Web decisions

- **The packages are rows under the published prices, each offered or paused by its switch and edited in a sheet** (O8). *Why:* the design's Packages & prices; a switch on the row is one action, reversible, its result on the row. 2026-10-20, #98.
- **An edit sends the terms whole, a limit off as `null`, and is checked in the browser as a new package is** (S11). *Why:* one preparation for add and edit, and no client diff to drift; the server writes and audits only what changed. The edit's own schema takes every term as optional, so it would let a cleared term through as absent. 2026-10-20, #98.
- **The section and the sheet say the packages are never shown to visitors, and nothing of the desk** (design issue 4). *Why:* the desk that will choose from them is not built; the switch is «متاحة». 2026-10-20, #98.
- **The shift chips start with «بدون وردية», one always on** (design issue 5). *Why:* no shift is a choice, and a single choice must be seen. 2026-10-20, #98.
- **An amount is typed in shekels, up to two decimals, Arabic digits read, as the prices'** (design issue 6). *Why:* one rule for the money a space types. 2026-10-20, #98.
- **A paused package that holds a shift says so and clears it at once** (design issue 7, finding 81). *Why:* the hours refuse to remove that shift, and nothing else tells the owner why; the clear is reversible and touches no one else. 2026-10-20, #98.
- **A limit turned on and left empty is refused on its field, «أدخل العدد أو أطفئ هذا الحد».** *Why:* the shared rule reads an empty count as a wrong type, `invalid_format`, so the line is chosen by the field being empty. 2026-10-20, #98.
- **The sheet is the layer's end sheet,** full width on a phone since the layer's change ([finding 101](../architecture/findings/101-the-end-sheet-is-not-full-width-on-a-phone.md), resolved 2026-10-26, #124). *Why:* no design-system change in a feature's item. 2026-10-20, #98.
- **A row's refusal is worded as the sheet's, in the owner's words** (carried from #98). *Why:* the switch and the clear write on the package's route, whose 404 has the same two causes; the generic lines would say nothing of them. 2026-10-20, #99.
- **A 404 on the packages' routes fetches the owner's own spaces again**, through `shared/api`'s `useLinkEnded` (carried from #98). *Why:* the managed routes answer a link ended meanwhile so, and the switcher must stop offering the space, as the space editor's 404 does. 2026-10-20, #99.

## Code map

- **API:** `apps/api/src/modules/packages/`, entry `index.ts`: the service, the repository, the mapper, the manage router, and beside them the pure rule of a package's terms and of what an edit changes (`packageTerms.ts`).
- **Shared:** `packages/shared/src/packages/`: the requests, with the billings and the limits' bounds, and the response.
- **Web:** `apps/web/src/features/packages/`, entry `index.ts` (`PackagesSection`, `ShiftChoice`), mounted by `pages/dashboard/space/PackagesPage.tsx`: the repository in `repository/`; in `hooks/` the keys, `list/` (the query, the section, a row's write), `sheet/` (the sheet's form and its save); in `services/` a package's values as the sheet holds them and the request they make, and its summary and price lines; the row, the sheet with its limits and chips, and the row's failure toast in `components/`.

## Open findings

- [102](../architecture/findings/102-the-package-sheets-summary-is-announced-on-every-keystroke.md): the sheet's summary is announced on every keystroke.

## History

### API history

- #87 — a space's packages, on the API: listed whole to its staff, added and edited by its owner, retired rather than deleted.
- #106 — the database refuses a free package (finding 80); a package's terms read for a subscription to copy.

### Web history

- #98 — the owner's private packages on Packages & prices: the list, the switch, the sheet, and a paused package's shift cleared (finding 81).
- #99 — carried from #98's review: a row's refusal in the owner's words; a 404 refreshes the owner's spaces; a shift removed meanwhile no longer chosen; finding 102 recorded.
