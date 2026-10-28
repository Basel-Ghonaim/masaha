# Space settings

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-28 · **Owner:** Basel Ghoneim
> **Authority:** The `space-settings` capability: a space's settings, the rules its front desk will run on. Its endpoints are owned by the [API contract](../api/api-contract.md#settings-managed); its entity by the [data model](../architecture/data-model.md#spaces). The API is built; on the web, the owner's settings page.
> **Scope:** the API module `space-settings` (L0); `@masaha/shared/space-settings`; the web feature `features/space-settings`, dashboard-only.

## What it does

- Keeps a space's settings, one row per space: auto check-out at closing, the stay limit, the visit rounding rule and its minutes, the cap at the day price, student prices for visits, whether reception may type a price by hand, and the WhatsApp debt reminder.
- Creates the row with the space, from the platform's new-space defaults.
- Answers the space's owner its settings, whole.
- Lets the owner edit any of them.
- On the dashboard, shows the owner the space's settings as cards on «الإعدادات», each saved alone: visit pricing, reception and the debt reminder; with `occupancy`'s capacity, the attendance card.

## Who uses it

- **The space's owner,** on the dashboard's «الإعدادات» (`/dashboard/spaces/:spaceId/settings`): reads and edits.
- **The front desk's modules** will read the values they apply: visits and subscriptions (auto check-out, the stay limit, hand-typed prices), visits (the rounding, the cap, student prices); finance, the reminder. None is built yet.
- Reception reads nothing here, and the admin never reaches it.

## Responsibility boundary

- **Owns** the `space_settings` table, the settings' bounds, and the rule of what an edit changes.
- **Leaves** the space and its lock to [`spaces`](spaces.md); the new-space defaults to `platform-settings` ([conventions › New-space defaults](../backend/conventions.md#new-space-defaults)); the capacity to `occupancy`; the charge and auto check-out themselves to `visits` and `subscriptions` (not built); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits at `/manage/spaces/:spaceId/settings`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Both routes ask `can()` at the route, through `requireCan`; the edit asks it again under the space's lock, which the composition root passes in ([conventions › Space access](../backend/conventions.md#space-access), [§13](../backend/conventions.md#13-idempotency-and-concurrency)).
- The space's creation calls it in its own transaction, with the new-space defaults ([spaces › How it composes the platform](spaces.md#how-it-composes-the-platform)).
- Each edit is audited by the audit writer, in the edit's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the name the [contract](../api/api-contract.md#settings-managed) gives.
- Its request is checked by the shared schema ([shared-package.md](../architecture/shared-package.md)), in the browser too.

## Behaviour and flows

**The creation.** The space's creation writes the row in its own transaction: the four settings the new-space defaults govern, copied; the others take their database defaults (student prices on, hand-typed prices off, no stay limit, the catalogue's reminder).

**The read.** One query reads the space's row.

**The edit.** In one transaction: the space's lock; `can()` on the links as they are under it; the row; only the fields the edit sets to a new value are written and audited, `null` clearing the stay limit or the reminder. An edit that changes nothing writes nothing.

A change applies from then on ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)).

**The owner's settings on the web.** «الإعدادات» is one column of cards, each saved and discarded alone — first the attendance card, which the page composes, then this capability's (`SpaceSettingsCards`):
- **Every card** is titled by its `h2`; while its fields differ from the saved settings it says «تغييرات غير محفوظة» and offers «تجاهل التغييرات»; «حفظ» sends only what changed, and when nothing did, sends nothing and says «لم يتغيّر شيء»; saved, a toast says «حُفظت إعدادات «{card}»». The fields are checked in the browser by the contract's schema; a 403 says only that it is no longer open to the owner, nothing saved; a 404 that the space no longer is, and, as any 404 on the settings' route, the read's included, fetches the owner's own spaces again (`shared/api`'s `useLinkEnded`). While the settings load, a placeholder stands for each card; if they cannot be read, one alert says so, with its reference and «إعادة المحاولة».
- **«الحضور والحالة المباشرة»** (`pages/dashboard/space/settings/`): the capacity (`occupancy`'s, «لا تظهر للزوار…», optional), «خروج تلقائي عند الإغلاق», and the stay limit in hours («خروج تلقائي بعد (ساعات)», optional, sent in minutes), checked in the browser by both contracts at once, each refusal on its field. One «حفظ» sends the capacity first, then the two settings, each only when it changed, and says «حُفظت إعدادات «الحضور والحالة المباشرة»» once. If the settings fail after the capacity was saved, whatever the second request's failure — a refusal, a field's, a wait, or no answer at all — the card's note says «حُفظت السعة، ولم تُحفظ إعدادات الخروج التلقائي» beside the failure, a 403 then saying only «لم يعد هذا متاحًا لك في هذه المساحة.», the saved capacity becomes its own, and every value typed stays, so the next save sends only the settings.
- **«تسعير الزيارات»**, its description leading to Packages & prices, where the hour and day prices are: the rounding — «تقريب لأعلى بعد» N «دقائق» (its minutes field enabled only for that rule, Arabic digits read, 1 to 59), with an example following N, «ساعتان و9 دقائق = ساعتان · ساعتان و11 دقيقة = 3 ساعات»; «لأقرب نصف ساعة»; or «بالدقيقة» — then «لا يتجاوز سعر اليوم» and «استخدام أسعار الطلاب للزيارات عند توفرها». The rule and its minutes are sent together whenever either changed, the minutes `null` for the two other rules.
- **«الاستقبال»**: one switch, «يكتب الاستقبال سعرًا يدويًا», and what it allows — a custom subscription, or a visit with no price, with a reason recorded — and that the owner always may.
- **«رسالة التذكير»**, «رسالة واتساب جاهزة لتذكير زبون بدينه؛ ترسلها أنت.»: the message — the space's own, or the catalogue's text while it keeps none — in a field that takes the direction of what is typed; «إدراج:» and three buttons that put `{الاسم}`, `{المبلغ}` or `{المساحة}` at the caret, the caret then after it; a preview, «معاينة», the placeholders filled for a sample customer, 150 shekels and the space's name; and «استعادة النص الافتراضي», which puts the catalogue's text back. The catalogue's text left as it is — in either language, after a change of language too — is saved as none (`null`). A refusal says which rule: «أضف {المبلغ} ليعرف الزبون كم عليه.», a placeholder off the list named, «{الاسم الكامل} ليس من الكلمات المتاحة؛ …», the length, or a character not allowed.

## Decisions

### API decisions

- **The settings and their reads are the owner's: reception is refused at the route before the body is read; anyone else without a link, the admin included, gets 404 from the boundary** (D2). *Why:* the settings screen is the owner's ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)); the desk's modules read the values they need themselves. 2026-10-19, #92.
- **The edit is decided under the space's lock, on the links read there.** *Why:* a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-19, #92.
- **The lock reaches the module as a function the composition root passes** (P1). *Why:* the lock is `spaces`' (L1) and this module is L0; a lower module takes an upward need as a parameter ([conventions §8](../backend/conventions.md#8-module-rules), R5). 2026-10-19, #92.
- **The read is one query, with no lock** (P4). *Why:* one statement is never half of a change; the boundary has admitted the caller. 2026-10-19, #92.
- **The stay limit is whole hours, 1 to 23, or none** (the design's S9). *Why:* a visit is a same-day stay, so closing time already ends every stay; kept in minutes, so a finer step is a validation change. 2026-10-19, #92.
- **The rounding rule and its minutes are sent together, the minutes 1 to 59 for "up after N minutes" only** (OW-021). *Why:* they are one choice; a patch is checked alone, never against the stored row, so no partial patch can reach the database's check. 2026-10-19, #92.
- **The reminder is a paragraph of 1–500 characters, or `null` for the catalogue's text.** *Why:* a reminder is a few lines; 500 keeps a `wa.me` link of Arabic text inside every browser's URL limit. 2026-10-19, #92.
- **The reminder's placeholders are `{الاسم}`, `{المبلغ}` and `{المساحة}`, typed in Arabic whatever the interface language; the amount is required, and any other `{…}` refused, with a code of its own** (D1b, the design's O2). *Why:* the customer is told what they owe, and never receives a literal placeholder; the form can say which rule failed. The rule is in its own shared file, for the web's form and the finance step that fills it. 2026-10-19, #92.
- **A switch is never `null`; what a patch leaves out is kept; unknown keys are stripped.** *Why:* a switch has two states; as every other managed write. 2026-10-19, #92.
- **Reception may type prices by hand only where the space allows it, off by default; not a new-space default** (D4). *Why:* a fraud guard whose safe value is fixed, as student prices' default is; the rule is the [data model's](../architecture/data-model.md#front-desk-and-money) and [ADR 0009's](../architecture/decisions/0009-space-scoped-reception-role.md). 2026-10-19, #92.
- **An edit writes and audits only what it changes, `space.settingsEdited`; one that changes nothing writes nothing** (D6). 2026-10-19, #92.
- **A missing settings row is a fault (500), never a 404 or a creation** (P2). *Why:* every space has one, created with it. 2026-10-19, #92. The auto check-out's read of many spaces (`settingsFor`) leaves such a space out instead, and the job logs each of its stays as not closed, so one space never halts the others. 2026-10-20, #100.
- **A missing student price falls back to the general one** (the owner's design decision DI-41) and **a change applies from then on** — both the [data model's](../architecture/data-model.md#front-desk-and-money). 2026-10-19, #92.

### Web decisions

- **The attendance card is one card and one save over two capabilities, composed in the page: the capacity first, then the settings; a second part that fails, whatever its failure, says what was saved in the card's note, the capacity becomes the card's own and every value stays** (the owner's O2, S8; [finding 96](../architecture/findings/96-the-attendance-card-saves-two-capabilities-in-one-save.md)). *Why:* the design draws one card; a component of two capabilities lives in neither; and its form is checked by a schema that runs both contracts, so no zod internals are needed. 2026-10-20, #99.
- **The settings are cards, each saved alone, sending only what changed** (the design's screen 24). *Why:* each card is one decision, and a save that changes nothing writes nothing on the server either. 2026-10-20, #99.
- **The rounding rule and its minutes are sent together whenever either changed.** *Why:* the contract checks the pair alone, never against the stored row. 2026-10-20, #99.
- **No «حسابي» card** (design issue 13). *Why:* it leads to `/me`, which is not built. 2026-10-20, #99.
- **Hand-typed prices are a card of their own, «الاستقبال»** (design issue 14). *Why:* the design has no place for the switch #92 added. 2026-10-20, #99.
- **The catalogue's reminder is shown while the space keeps none, and saved as none while it is left as it is; «استعادة النص الافتراضي» brings it back** (design issue 17). *Why:* a space that never wrote one follows the catalogue's words, in whichever language; the design had no way back to them. 2026-10-20, #99.
- **A refused placeholder is named in the line, isolated, and the amount's absence told apart from a character not allowed.** *Why:* the contract's two codes say which rule; the owner sees which token to fix. 2026-10-20, #99.
- **Visit pricing's description leads to Packages & prices, and its examples name no money** (design issue 16). *Why:* the hour and day prices are not on this page. 2026-10-20, #99.

## Code map

- **API:** `apps/api/src/modules/space-settings/`, entry `index.ts`: the service, the repository, the mapper, the manage router, and beside them the pure rule of what an edit changes (`settingsChange.ts`).
- **Shared:** `packages/shared/src/space-settings/`: the request, with the rounding rules and the bounds, the reminder's rule (`reminderTemplate.ts`), and the response; the new-space defaults' schema (`newSpaceDefaultsSchema`), a subset of a space's settings, which [`platform-settings`](platform-settings.md) stores and the admin saves (2026-10-28, #130).
- **Web:** `apps/web/src/features/space-settings/`, entry `index.ts` (`SpaceSettingsCards`), mounted by `pages/dashboard/space/SettingsPage.tsx`: the repository in `repository/`; in `hooks/` the keys, the query, the save, the cards' state (`useSpaceSettingsCards`), a card's form and frame (`card/`, with the rule of what a card changes), `pricing/`, `reception/`, `reminder/`; the rounding's example and the reminder's preview in `services/`; the card's frame, the cards and each card in `components/`.

## Open findings

- [103](../architecture/findings/103-arabic-indic-digits-are-read-by-five-helpers.md): Arabic-Indic digits are read by five helpers, `wholeNumberOf` among them.
- [106](../architecture/findings/106-two-approved-owner-lines-miss-a-case-or-the-label-in-name.md): the reminder's insert buttons are named without the token they show.

## History

### API history

- #92 — a space's settings, read and edited by its owner on the API; reception's hand-typed prices switch.
- #130 — the new-space defaults' schema in the shared folder, for the admin's save.

### Web history

- #99 — the owner's «الإعدادات»: visit pricing and reception, each card saved alone; the attendance card, with `occupancy`'s capacity, in one save (finding 96); the debt reminder, its placeholders inserted at the caret, its preview, and the catalogue's text restored.
