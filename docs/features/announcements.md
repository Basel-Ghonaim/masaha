# Announcements

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-28 · **Owner:** Basel Ghoneim
> **Authority:** The `announcements` capability: what a space tells its users changes — a closure, an outage, an offer, an event or general news — posted and changed by its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#announcements-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; on the dashboard, the owner's and reception's «الإعلانات».
> **Scope:** the API module `announcements` (L2); `@masaha/shared/announcements`; the web feature `features/announcements`, any page group: screen 18, and the public pieces a space's page sets: its running closure's notice and its other announcements.

## What it does

- Lets a space's staff, the owner and reception, post an announcement: a type, an Arabic text, an English one when given, a start (now when none is sent) and an end, or none. A retried post answers the first, never a second.
- Lets them edit any of its fields; the period is held to its bounds.
- Lets them end a running one now, start an upcoming one now, and delete one in any state, softly.
- Answers each announcement with its state now: upcoming, running or ended.
- Pages one state's announcements and counts them by state, for the managed list and its summary, which [`subscriptions`](subscriptions.md) composes with each closure's extension.
- Answers a space's running and upcoming announcements, not deleted, by start then id, up to the count the caller gives, for its public page.
- Tells the live status which spaces a running closure covers ([occupancy](occupancy.md)).

## Who uses it

- **The space's owner and reception,** through the API, under `/manage/spaces/:spaceId/announcements`: they post, edit, end, start and delete. On the dashboard, both read «الإعلانات» (`/dashboard/spaces/:spaceId/announcements`, 2026-10-28, #129).
- **The live status** ([occupancy](occupancy.md)): a running `CLOSURE` makes a space `CLOSED`.
- **[`subscriptions`](subscriptions.md),** whose managed list and summary read its pages, its counts and its started closures, and whose closure extension reads a closure (`closureIn`), locks it (`lockClosure`) and its days (`closureSpan`).
- **[`directory`](directory.md),** whose space page reads its running and upcoming announcements. On the site, the space's page shows them: a running closure's notice at its top, the others after its status (2026-10-28, #129).

## Responsibility boundary

- **Owns** the `announcements` table, its idempotency key, an announcement's state and the bounds of its period.
- **Leaves** the space and its lock to [`spaces`](spaces.md); who may write to `can()` (`announcements.manage`, [security › Authorization](../backend/security.md#authorization)); a closure's extension of the subscriptions it covered to [`subscriptions`](subscriptions.md), which owns `closure_extensions`.

## How it composes the platform

- Its manage router sits at `/announcements` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([conventions › Routers](../backend/conventions.md#routers)).
- Its writes ask `can()` at the route, through `requireCan`, then again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)).
- A post carries the `Idempotency-Key` ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)).
- Each change is audited in its own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#announcements-managed) gives.
- Its requests are checked by the shared schemas ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The state** (`announcementState`, pure): upcoming while its start is after now, ended once its end is at or before now, else running. These are the comparisons of `closedAt`, so a running closure is exactly what closes the live status ([data model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)).

**Post.** In one transaction: the space's lock; `can()` on the links as they are under it; the announcement this key already posted, answered as it is now; the period at now (`periodErrors`, pure: a start at most 30 days back and 365 ahead, an end after now and at most 365 days after the start), the start now when none is sent; the row with its key; its audit entry.

**Edit.** The same lock and `can()`; the announcement's row, locked (`FOR UPDATE`), the space's and not deleted; only the fields the edit sets to a new value (`announcementChange`, pure: an instant compared as an instant, `null` clearing the English text or the end). An edit that changes nothing writes nothing. What changed is checked against now and the window, and the merged end against the merged start, so an ended announcement's text can still be corrected.

**The list's reads.** A page of one state, not deleted: the state a filter on the instants, running and upcoming by start then id, ended by end, latest first, then id; its count in parallel. The counts of the three states are one grouped query; the started closures (since a given day) one more. `subscriptions` adds the extensions ([its document](subscriptions.md)).

**The public read** (`publicOf`). A space's announcements not deleted whose end is none or after now — running and upcoming, never an ended one — by start then id, at most the count the caller gives; [`directory`](directory.md) asks 20 for a space's page.

**End now, start now, delete.** Each takes the same lock and `can()`, then the row, locked. End now sets a running one's end to now; an ended one is answered as it is; an upcoming one is refused (`ANNOUNCEMENT_NOT_STARTED`). Start now sets an upcoming one's start to now, refused (`validation` on `endsAt`) when its end would then fall more than 365 days after its start; a started one is answered as it is. Delete sets `deletedAt` in any state, the row kept; a deleted one answers 204 again, writing nothing, and leaves every read and the live status.

**The announcements on the web** (`features/announcements`, composed by `pages/dashboard/space/announcements/`). «الإعلانات», the owner's and reception's, reads the managed list and its summary (S2): the tabs «نشطة · مجدولة · منتهية», each with the summary's count (a skeleton while it loads), the tab and the page in the address (`?state=upcoming|ended&page=`, running not written; a value the server would refuse falls back to running, a change replaces the address and returns to page 1). Each announcement of the tab is a card, in the server's order: its type as its heading's badge — `warning` for an outage or a closure, `neutral` otherwise —, its period on Gaza's clock («1 أكتوبر 08:00–18:00», «1 أكتوبر 08:00 – 3 أكتوبر 18:00», «من 1 أكتوبر 08:00 · بلا نهاية», the year when it is not this one), its text in the interface's language — the Arabic, marked as Arabic, when an English one is missing — and a closure's line: «يمكن تمديد الاشتراكات بعد أن يبدأ الإغلاق.» for the owner on one not started, «يمدّد المالك الاشتراكات بعد بدء الإغلاق.» for reception on one started and not extended. No status badge: the tab says it. Its states: three skeleton cards while it loads, the list marked busy; a failure with its reference and a retry; a failed refresh over the cards shown; each tab's empty state; the pages only past one page.

**The sheet on the web** (`AnnouncementSheet`). «إعلان جديد», at the end of the tabs' row and in an empty tab, and «تعديل», on a running or upcoming card, open the end sheet, full width on a phone, its first focus on the checked type's radio: the type with what it does; the Arabic text, required; the English one, «اختياري»; «يبدأ: الآن · في موعد» (a new one only: an edit moves the start by its date and time) and «ينتهي: في موعد · بلا موعد», each date on a calendar («29 سبتمبر 2026», Gaza's today marked) and its time, on Gaza's clock and sent as its instant, never the browser's; a closure's line, «تظهر المساحة «مغلق الآن» للزوار طوال هذه الفترة، ويُنبَّه الاستقبال عند تسجيل الحضور.»; the preview of the space's page, drawn by the page's own pieces (an item, or a closure's notice). The post carries one `Idempotency-Key` per opening of the sheet, kept across the transport's re-sends, a second press and «إعادة المحاولة»; no answer says «لم يصل الرد. أعد المحاولة — لن يُنشر مرتين.». An edit sends only what changed, once and with no key (`textEn: null` for an English text cleared, `endsAt: null` for «بلا موعد»), a start or an end compared at its Gaza date and minute as the sheet shows it, so one kept by the server with its seconds is never sent untouched; one that changed nothing says «لم يتغيّر شيء» and sends nothing. The server's period refusals land on their time fields; `CLOSURE_EXTENDED`, a 404 and a 403 are worded, a 404 or a 409 reads the list again, a 404 or a 403 with no code the user's spaces. Done, the whole space is read again and the toast names the tab the announcement went to, with «عرض», which opens it. Closed, the focus goes back to the control that opened the sheet.

**End now, start now and delete on the web.** Each card's footer holds its actions by its state: a running one «تعديل», «إنهاء الآن» and the «⋯»; an upcoming one «تعديل», «ابدأ الآن» and the «⋯»; an ended one the «⋯» alone, its card its view. The «⋯», named «إجراءات أخرى: {type} · {period}», holds «حذف…»; an extended closure has none, and its line says «مُدّدت اشتراكاته، فلا يُحذف ولا تُؤخَّر نهايته.». Each write is sent once, with no key. «إنهاء الآن» acts at once: its toast says «انتهى الإعلان» (a closure «انتهى الإغلاق · عادت الحالة تلقائية») and «في «منتهية»», with «تراجع», one `PATCH` giving back the old end — except on an extended closure, whose end may only come earlier, which offers «عرض». «ابدأ الآن» says «بدأ الإعلان الآن» and «في «نشطة»», with «عرض». A failure is an error toast with its line (`ANNOUNCEMENT_NOT_STARTED`, an end that a start would put past 365 days, a 403) and «إعادة المحاولة», which sends it once more. «حذف…» asks first, naming the announcement («حذف إعلان «{type} · {period}»؟») and the true consequence of its state now — a running closure reopens the space at once, a running one leaves the space's page, an upcoming one is never seen, an ended one leaves the list; none can be brought back —; a refusal stays in the dialog, `CLOSURE_EXTENDED` read again from the list. When the card whose action holds the focus leaves its tab, the next card's first action takes it, else the tab shown.

**A closure's extension on the web** ([`subscriptions`](subscriptions.md)' routes, S2). A closure's card says where its extension stands: «يمكن تمديد الاشتراكات بعد أن يبدأ الإغلاق.» for the owner on one not started; on one started and not extended, «يمدّد المالك الاشتراكات بعد بدء الإغلاق.» for reception and «تمديد الاشتراكات» for the owner; once extended, to both, «مُدّد {count} · {days} · {name} · {date}». «تمديد الاشتراكات» opens an alert dialog that reads the preview at each opening: how many subscriptions the extension moves now — those the closure covered and their renewals not started yet, as the server counts them —, the closure's Gaza days, and the days, prefilled with the proposal and typed (1–365, Arabic digits read). The typed days are sent with one `Idempotency-Key` per opening, kept across the transport's re-sends and «إعادة المحاولة»; a failure stays in the dialog with the days kept — `CLOSURE_ALREADY_EXTENDED` reads the list again, so the card shows the extension; `ANNOUNCEMENT_NOT_STARTED`, a 403 and no answer are worded. A closure that covered none says «لم يشمل هذا الإغلاق أي اشتراك، فلا شيء يُمدَّد.» and one extended meanwhile says so, each with «رجوع» only. Done, the whole space is read again and the toast says «مُدّدت الاشتراكات» with how many and by how many days.

**An extended closure.** Once its subscriptions were extended ([`subscriptions`](subscriptions.md)), an edit giving it a new type or start, a later end or no end, and its delete, are refused `CLOSURE_EXTENDED`, writing nothing; its text and an earlier end, end now included, change. The database's trigger refuses them ([data model › Constraints](../architecture/data-model.md#constraints-worth-stating)); this module asks nothing of the extensions.

## Decisions

### API decisions

- **A post carries an idempotency key, unique within the space** (S1). *Why:* reception posts a closure on the spot, on the desk's weak connection; a retried post would make two closures, and the owner could extend the subscriptions twice ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)). Rows made before the key got one of their own in the migration. 2026-10-24, #112.
- **The writes are the staff's, owner and reception** (ADR 0009's writers). *Why:* reception announces a closure at the desk; `announcements.manage` decides at the route and again under the space's lock, so a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-24, #112.
- **The period's bounds** (S5): a start at most 30 days back and 365 ahead, an end after now and at most 365 days after its start; texts 1–500 characters, line breaks kept. *Why:* a closure may be posted late, but a typo in a year must never make a closure of a decade; ending one now is its own route. 2026-10-24, #112. Revised: start now holds the end's bound too, an end more than 365 days after now refused. *Why:* starting a far-off announcement now kept its end, so its period could pass 365 days. 2026-10-24, #114.
- **An edit checks against now only what it changes.** *Why:* an ended announcement's text stays correctable; a changed end still comes after now. 2026-10-24, #112.
- **End now refuses an announcement not started yet: `ANNOUNCEMENT_NOT_STARTED`.** *Why:* its end would come before its start, which the database's `announcements_dates_check` refuses; the design offers deleting it there. 2026-10-24, #112.
- **End now, start now and delete answer a repeat as it is, writing nothing** (O10). *Why:* updates are idempotent by design ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)); a retry after a lost answer must not read as a refusal. 2026-10-24, #112.
- **Delete is soft and allowed in any state** (O10, [ADR 0007](../architecture/decisions/0007-soft-delete.md)). *Why:* the row stays for the audit and a closure's extension; a running closure deleted reopens the space at once. 2026-10-24, #112.
- **An extended closure keeps its type, its start and its existence; its end only comes earlier** (decision 6, refined by S3, the owner's Q3), held by a trigger (S2), `CLOSURE_EXTENDED`. *Why:* the days were given for the closure as it was; `announcements` (L2) cannot read the extensions, and a check in the service would race with an extension; a running closure, once extended, must still be able to end. 2026-10-26, #123.
- **No title and no author on an announcement** (O9). *Why:* the design shows neither; the audit records who. 2026-10-24, #112.

### Web decisions

- **One web feature holds screen 18** (S2): `announcements` calls this module's writes and the managed list, its summary and a closure's extension that [`subscriptions`](subscriptions.md) composes at the same path, the contract's one section — an exception to "names match the backend" ([architecture §3](../frontend/architecture.md#3-capabilities-features)). *Why:* one audience, the staff, works them on one screen; a `subscriptions` feature for one dialog would put a cross-feature dialog in the page. 2026-10-28, #129.
- **The tab and the page in the address** (S8): `?state=upcoming|ended&page=`, running not written; a value the server would refuse falls back; a change replaces the address and returns to page 1. 2026-10-28, #129.
- **No status badge on a card; the type's badge only** (DI-15): `warning` for an outage or a closure, `neutral` otherwise (OW-014). *Why:* the tab already says the state. 2026-10-28, #129.
- **A loading state of three skeleton cards, the counts as skeletons** (DI-23), the list `aria-busy`. 2026-10-28, #129.
- **The pages show only past one page** (DI-26): the tab already counts. 2026-10-28, #129.
- **An English text missing shows the Arabic, marked** `lang="ar" dir="rtl"` (DI-27). 2026-10-28, #129.
- **The post carries one key per opening of the sheet** (S4): kept across the transport's re-sends, a second press, «إعادة المحاولة» and an edit of the form; a new opening is a new intent. An edit is idempotent by design: sent once, with no key. 2026-10-28, #129.
- **Gaza's clock for every date and time** (S9): the sheet's date and time are Gaza's wall clock, sent as `gazaInstant(date, minute)`; a loaded instant is shown by `gazaClockOf`. 2026-10-28, #129.
- **Every write reads the whole space again** (S12): a closure written, ended, started or deleted changes the space's state now, and an extension moves subscriptions' ends. 2026-10-28, #129.
- **The sheet's first focus is the checked type's radio** (DI-21), placed by the sheet itself, with the layer's ring. 2026-10-28, #129.
- **The date over the time below 640 px, the date's trigger with the short month and the year** (DI-22). 2026-10-28, #129.
- **Each write's toast names the tab it went to, with «عرض»** (DI-24): an announcement that moves tab is never lost from sight. 2026-10-28, #129.
- **The preview draws the public page's own pieces on a muted surface** (DI-25): `AnnouncementItem` and the closure's warning (`ClosureAlert`), the components the space's page sets. 2026-10-28, #129.
- **A running closure is the page's top notice, never repeated in its announcements** (DI-59, U8: «the closure Alert stays at the top»): the first `CLOSURE` that has started and has no end, or ends after now (`runningClosure`), is a warning above the page with its text and «إعلان من إدارة المساحة · {period}»; the section «الإعلانات», after the status and before the prices, lists the others by their start, an upcoming closure among them, and is left out when none is left. *Why:* one closure said twice reads as two. 2026-10-28, #129.
- **A closure's consequence said in the sheet** (DI-29), as a warning. 2026-10-28, #129.
- **End now, start now and delete are sent once, with no key** (S4): each is idempotent by design, so a repeat answers as it is; no answer is said with «إعادة المحاولة», never re-sent by itself. 2026-10-28, #129.
- **An ended announcement has no «تعديل»; its card is its view** (DI-16). An action that cannot apply is left out, its reason said on the card, never a disabled menu item ([finding 105](../architecture/findings/105-a-held-menu-item-may-be-unreachable-by-the-keyboard.md)). 2026-10-28, #129.
- **The actions by state, and «تراجع» only where it can work** (DI-17): end now's undo restores the old end by `PATCH`, which an extended closure would refuse (`CLOSURE_EXTENDED`), so it is not offered there; an extended closure has no delete. 2026-10-28, #129.
- **The delete names the announcement and its true consequence by state** (DI-18), with «لا يمكن استرجاعه.»: no route restores one. 2026-10-28, #129.
- **The extension carries one key per opening of its dialog** (S4): the typed days sent, never the proposal; a retry from the same dialog answers the first. 2026-10-28, #129.
- **An extension that would move nothing is not offered** (S11): the preview's `subscriptions` 0 says so with «رجوع» only. *Why:* the server would mark the closure extended for nothing, and it could never be extended once its subscriptions are corrected. 2026-10-28, #129.
- **A failed extension stays in its dialog, the days kept** (DI-19). 2026-10-28, #129.
- **The count is what the extension moves, not "the active subscriptions"** (DI-20): the preview's, those the closure covered (any running on one of its days) and, since #128, their renewals not started; the dialog says «يشمل التمديد {n} اشتراكات.» and names both, and the days field is prefilled with the proposal, the closure's days under it. 2026-10-28, #129.
- **A closure's card says where its extension stands, by role** (DI-28): the owner's line before it starts, reception's once it has, and the extension once applied, to both. 2026-10-28, #129.
- **The period's refusals on their fields, in the contract's words** (DI-30): «البداية بين 30 يومًا مضت و365 يومًا قادمة.», «النهاية بعد الآن، وبعد البداية، وخلال 365 يومًا منها.». 2026-10-28, #129.

## Code map

- `apps/api/src/modules/announcements/` — the module: its service, its repository, its manage router, and the pure rules (`announcementState`, `period`, `announcementChange`, `closureSpan`).
- `packages/shared/src/announcements/` — the requests and answers.
- **Web:** `apps/web/src/features/announcements/`, entry `index.ts` (`AnnouncementsList`, `ClosureNotice`, `SpaceAnnouncements`), read by `pages/dashboard/space/announcements/AnnouncementsPage.tsx`, which reads the role at the space, and by `pages/site/public/space/SpacePage.tsx`, which sets the public pieces in the directory's slots: the repository in `repository/`; the keys, the list's tab in the address and its view (`list/`), the sheet and its post and edit (`sheet/`), a card's actions and the delete's dialog (`actions/`), the extension's preview, apply and dialog (`extension/`), the focus kept when a card leaves (`list/useCardFocus`) and the writes' shared invalidation (`useAnnouncementsWrite`), and the public page's view (`public/`) in `hooks/`; the address's query (`announcementsQueryOf`), the period's words (`periodText`), a type's (`typeView`), the text in the interface's language (`textOf`) and the sheet's requests (`sheetRequest`) and the running closure (`runningClosure`) in `services/`; the list, its card and a closure's line (`list/`), the sheet, its type and its period (`sheet/`), the «⋯» and the delete's dialog (`actions/`), the extension's action and dialog (`extension/`), the public page's item, its closure's notice and its announcements' section (`public/`), and the toasts (`toast/`) in `components/`. Words: the catalogue's `announcements` section; the refusals are `errors`'.

## Open findings

- [180. A site page's chunk reaches the table's and the calendar's libraries](../architecture/findings/180-a-site-pages-chunk-reaches-the-tables-and-the-calendars-libraries.md) — the space page's chunk reaches the calendar through this capability's entry

## History

### API history

- 2026-10-24, #112 — posted (idempotent), edited, ended, started and deleted by the staff; the pages and counts the managed list composes; the running and upcoming ones a space's public page reads.
- 2026-10-26, #123 — an extended closure guarded by the database (`CLOSURE_EXTENDED`).

### Web history

- #129 — «الإعلانات», the owner's and reception's: the announcements by state, with their counts; a new announcement and its edit in a sheet, with the preview of the space's page; end now with its undo, start now and delete; the owner's extension of a closure's subscriptions.
- #129 — on the site, a space's page shows its running closure's notice at its top and its other announcements after its status (finding 131).
