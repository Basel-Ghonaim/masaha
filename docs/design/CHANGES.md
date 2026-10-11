# Changes to the living design

The prototype in `prototype/` is the **living design**: since the Claude Design project was deleted
it is fixed and improved by hand, and `README.md` says what that means for the archive. The design
as it was delivered on 2026-09-29 stays at the tag `design-2026-09-29`.

Every applied decision gets one line here: what changed, where, and when. Decisions are settled
before the work, from the design reviews; this file is the record of what was built, not where the
decision was made.

## Batch 1 — the shared layer (2026-10-11)

Reviewed as SH-001…SH-022; the decisions marked *prototype* are applied here. The **design system**
items (SH-012, SH-017, SH-022) and the `foundation.md` rule changes belong to the web, not to this
archive.

| Decision | What changed | Where |
|---|---|---|
| **P3** | The owner's eleven navigation items are grouped by what people do — اليوم · المال · المساحة · الفريق والإعدادات — and the admin's eight into المساحات · المنصة, with `SidebarGroupLabel`, which goes `sr-only` on the 768 rail | `masaha/owner.jsx`, `masaha/admin.jsx` |
| **P4** | One account menu in every shell: the name and role, the email, the way between the site and the dashboard, «إعدادات حسابي», the site's favourites and «بلاغاتي», and — on a phone in the dashboard — the theme and the language. The site's phone header now shows the avatar, and the drawer's second account list is gone | `masaha/shared.jsx` (`AccountMenuContent`), `owner.jsx`, `admin.jsx`, `account.jsx` |
| **P1** | One page header. The page's own actions (CSV export, the overview's shortcut to the desk) sit in the top bar beside the title from 768 and fold into a «⋯» menu there below it; the separate actions row in `main` is gone, and so are the eight per-page phone copies. A list's **add** sits at the end of the row above its list, at every width. The phone's fixed bottom bar holds **only** the desk's «تسجيل زيارة» — the owner's overview has none, since the desk is in the navigation, and `AdminShell` never gained one | `masaha/shared.jsx` (`PageActions`), `owner.jsx`, `admin.jsx`, and the ten pages with an action |
| **SH-016** | A sub-page's h1 is the record's own name — the customer's, the space's — so the outline is no longer inverted by a larger heading under a generic 17 px title. The second, bigger heading is gone from both; the back link stays in the page as a `Breadcrumb` | `Customer file.html`, `Admin space edit.html` |
| **P2** | The public-state badge and «ضبط الحالة» were the same fact twice and took one or two extra rows of the sticky bar on every owner and reception page; the shell also mounted the control twice, so the state parameter opened two popovers. They are now one button, in the state's colour, labelled with what visitors see, opening the panel that changes it — which also holds «العودة للحالة التلقائية» in place of the separate «إلغاء». The phone bar is **61 px**, against 112 with the state and 140 with an override running. Its parameter is renamed **`?publicstate=open`**, ending the clash with the list filter of the same name on three pages, and `?override=<minutes>` now parses as Full for that long instead of blanking the badge | `masaha/owner.jsx`, `admin.jsx`, `INDEX.md`, `Flows - states.html`, `README.md` |
| **P5** | One filter bar. Search is always visible; every other filter is a labelled `Field`, inline from 768 and in the shared bottom sheet below it, with the active-count badge. The sheet's footer is the Directory's — a primary «عرض N نتيجة» then a ghost «مسح الفلاتر» — and the result count moved up beside the toolbar, where the user looks after filtering. Admin users, audit and the two data-report lists had no phone sheet at all; the Directory's own sheet merged into the shared one, keeping only its `lg` breakpoint and its desktop sidebar (amended 2026-10-10). A single status filter of four or fewer choices stays `ToggleGroup` chips | `masaha/shared.jsx` (`FilterSheet`, `ResultCount`), nine pages |
| **P6** | Every list pages: 20 a page ([API contract §4](../api/api-contract.md#4-pagination)), «عرض 1–20 من 312» in the table's footer, page numbers from 768 and Previous/Next around a «صفحة 1 من 16» summary below it. A short list keeps its steps, marked `aria-disabled`, so every list reads the same way. The four lists the review named as the worst grew sample rows so that paging is real: payments **312**, the audit log **240**, users **84**, customers **61**, from small deterministic generators in the data files | `masaha/shared.jsx` (`usePaged`), `desk-data.js`, `admin-data.js`, twelve lists |
| **SH-007** | A table of more than five columns names a **column priority**: every column from 1024, the priority columns between 768 and 1023, and `DataTable`'s own cards below 768. The vendored `DataTable` switches to cards at 768, not 1024, and has no column-priority prop, so «becomes cards below `lg`» was not buildable and the decision's other branch was taken. Every always-LTR value in a cell is now isolated and `nowrap`, so a phone number no longer breaks mid-number | `masaha/masaha.css` (`.lg-col`), `shared.jsx` (`Ltr`), eight tables |
| **P7** | One set of states. The shells own the route's own: `?state=offline`, `403` and `404` draw an `EmptyState` inside the shell with no actions, so one implementation covers all 22 dashboard pages, and `?state=error` puts «تعذّر تحميل …» with «إعادة المحاولة» in place of the content. Each list owns `?state=loading`. `Error.html` gains the 403 the site had no answer for | `masaha/shared.jsx` (`RouteState`, `LoadError`), `owner.jsx`, `admin.jsx`, `Error.html`, eight lists |
| **P8** | Every action says it is working, it worked, or it failed. Working is live: the button waits about three quarters of a second with its `loading` state, so a second tap is impossible and a slow check-in cannot become a double one. Failing is a frame, as on the auth pages: `?fail=<action>` shows a destructive `Alert` inside the dialog or sheet, which stays open and keeps what was typed, or a toast with «إعادة المحاولة» on a page; `?state=ratelimit` brings the 429 line to the dashboard. Toasts sit above the desk's bottom bar. **The exception** (amended): an action whose result shows in the row it changed raises no success toast — but not at the front desk, where a check-in, a check-out and every money action always say so, and money says how much | `masaha/shared.jsx` (`ActionButton`, `useActionRun`, `ActionAlert`, `RateLimitNote`), `desk-core.jsx`, `profile-a.jsx`, the money dialogs and the settings pages |
| **DI-5** | `Error.html` was the only page with a header and no `PageToaster`, so a toast carried to it in `sessionStorage` was swallowed | `Error.html` |
| **P9** | One rule. Reversible and affecting no one else — hiding a space, archiving a **settled** customer, removing a favourite — happens at once and offers «تراجع», with no dialog. Irreversible or felt by others — voiding a payment, suspending a user or a staff member, ending a subscription, unlinking an owner, archiving a customer **who owes**, which the dialog names — keeps its `AlertDialog`, whose action now repeats the verb in `variant="destructive"`; none did before, so delete, suspend, archive and unlink were all teal. Deleting a space keeps both its confirmation and its undo ([finding 44](../architecture/findings/44-no-screen-restores-a-deleted-space-once-its-toast-has-gone.md)). Every dismiss says **«رجوع»** — nine said «إلغاء» — so «إلغاء» is once more only the verb of voiding a payment. The «sign out of all devices» dialog is not touched: batch 4 drops it from v1 | seven pages, `desk-core.jsx` |
| **P10** | A section's «حفظ» is always enabled (foundation §10); the «تغييرات غير محفوظة» badge beside it already said what was pending. Shipped with the feedback commit, since it is the same button | `profile-a.jsx`, `Owner settings.html`, `Admin settings.html` |
| **SH-021** | «للعرض فقط · الدفع في المساحة» was on each of six cards, a line each. It is said once now, in the list's header line on the Directory, Home and Favourites; each card keeps «آخر تحديث …» and the «قد يكون تغيّر» badge, which are its own. An unoffered price period loses its border, so a missing price is quieter than a price instead of louder | `masaha/shared.jsx`, `Directory.html`, `Home.html`, `Favorites.html` |
| **DI-4** | The two discard labels, «تجاهل» and «تجاهل التغييرات», become one | `Owner settings.html`, `Admin settings.html` |
| **DI-7** | `Money` and every other always-LTR value in `shared.jsx` are isolated and `nowrap`, as SH-007 requires; the duplication between `Money`'s two definitions and `Num`'s two copies is recorded, not fixed | `masaha/shared.jsx` |
| **SH-019** | Every English «membership» becomes «subscription», the glossary's term — 74 occurrences across 13 prototype files, plus the board's frame labels and their rows in `INDEX.md`. The Arabic «اشتراك» was already right. `prototype/BRIEF.md` keeps the word: it is the record of the brief the screens were designed against, not product copy | 13 prototype files, `Flows - states.html`, `INDEX.md` |
| **DI-6** | The five `masaha/_*head.txt` templates still fetched Babel from `unpkg.com`, while all 35 generated pages use the vendored copy, so a page regenerated from a template would have broken the archive's offline claim | `masaha/_head.txt` and its four siblings |
| **SH-005** | The language toggle is in the site's phone header, where a non-Arabic reader meets it; the theme moved into the drawer. Both dashboard shells, which had no phone language toggle at all, now carry both in the drawer's foot | `masaha/shared.jsx`, `owner.jsx`, `admin.jsx` |
| **SH-006** | The 768 rail shows the space's mark as the switcher's trigger, named «تبديل المساحة — Focus Hub» with a tooltip; the admin's rail shows the «م» mark. The name beside it is dropped only where the rail has no room, and the button keeps its `aria-label` | `masaha/owner.jsx`, `masaha/admin.jsx` |
| **SH-018** | A «تخطَّ إلى المحتوى» link is the first focusable element of every shell, seen only on focus, leading to `main` | `masaha/shared.jsx` (`SkipLink`), the four shells, `masaha.css` |
| **SH-020** | Menu items take the menu's own colour. The cause was the archive's own `a{color:var(--primary)}`, which also reached the row-action menus and the breadcrumbs, so it is scoped once rather than patched per menu | `masaha/masaha.css` |
| **DI-2** | `min-h-14` and `md:inline` were used by both shells but are not in the prebuilt bundle, so the top bar had no minimum height and the account name never appeared from 768 | `masaha/masaha.css`, `owner.jsx`, `admin.jsx` |

### Review fixes (2026-10-11)

| Fix | What changed | Where |
|---|---|---|
| **F1** | A card's save footer touched the last field above it. `Card` spaces its own children with `gap-(--card-padding)`, but a `<form>` wrapping the content and the footer swallowed that, so every `ProfileSection` card and the account's profile card had a 0 px gap where every other card had 20. The form takes the Card's layout back | `masaha/profile-a.jsx`, `Settings.html` |
| **F2** | The Directory drew its filters twice from 1024 — inline in the toolbar and again in the sidebar — a regression of P5. `FilterSheet`'s `always` flag becomes **`wide`**, which says what the caller wants above the breakpoint: `inline` (the default, every list), `sheet` (the Directory's map, which has nowhere else), or `none` (the Directory's list view, whose sidebar holds them) | `masaha/shared.jsx`, `Directory.html` |
| **X1** | `npx serve`, which `README.md` recommends, redirected `X.html?…` to `X` and dropped the query, so no URL in `INDEX.md` opened its state and `role`, `auth` and `id` were lost while navigating. `serve.json` turns its clean URLs off | new `prototype/serve.json` |

### SH-007 — each table's column priority

What survives between 768 and 1023, for the web to repeat when it builds these tables.

| Table | cols | kept at 768–1023 |
|---|---|---|
| Customers | 7 | name · subscription · status · balance · actions |
| Payments | 7 | date · who · item · amount · method · by · actions (all; none is droppable) |
| Staff | 7 | name · role · status · this month · actions |
| Desk › present | 6 | name · kind · since · duration · actions |
| Data reports | 6 | field · message · who · status · actions |
| Admin spaces | 7 | name · area · status · owner · actions |
| Admin users | 7 | name · email · role · status · actions |
| Admin reports | 8 | space · field · report · status · actions |

- **The map's selected card** shows no prices, so SH-021's note has nothing to attach to there
  and was not added; the note is on the three lists that show prices.

### Notes for the web worker

- **An `AlertDialog`'s action cannot show a pending state.** `AlertDialogAction` wraps `Button`
  with `asChild`, and `Button` returns early on that branch, dropping `loading` and `disabled`.
  The confirmations keep the component — the destructive variant and the close behaviour both
  work — and their pending state waits on the layer. Reported as a design-system issue.


- The prebuilt `_ds_bundle.css` only holds the utility classes the original prototype used, so a
  class added by hand can be silently dead. Three rules were written into `masaha.css` for that
  reason (the skip link, the menu colour, `min-h-14`); none of them is a new colour, size or font,
  and none is needed in the code, where Tailwind compiles from source.
- **P2's short form on a phone** is the state word alone («ممتلئ»), and the control drops its
  chevron below 768. With P1's «⋯» also in the bar, 390 px does not fit the countdown as well without truncating the page title to five characters, so the countdown moved one tap away: it opens the panel and is in the control's `aria-label`. From 768 the full sentence is shown.
- The vendored bundle has **no `PageHeader`** and **no `SidebarText`**. `SidebarHeader`'s `mark`
  prop already does what SH-006 asks for: it stays visible when the sidebar collapses while its
  children turn `sr-only`.

## Batch 2a — the admin's space editor (2026-10-11)

Reviewed as AD-001…AD-012 (with AD-002's creation form); decided in `DECISIONS_ADMIN.md` as the
first of two items. The owner's Space profile shares the editor (O1) and inherits what changes in
it; its own differences are batch 5's.

| Decision | What changed | Where |
|---|---|---|
| **E8** | The two checks fix 1 ran by hand are committed: a Babel parse of every module and inline script, and a check for classes no stylesheet defines. The check keeps the classes already dead **by file**, so the same class anywhere else still fails; they are the five of fix 1's DI-9 outside the editor and the Wordmark's two unstyled markers. The editor's own two, `md:w-44` and `h-28`, are dropped from it, which changes nothing on screen. `README.md` says how to run them and what they cannot see, the class check's blind spots included | new `scripts/check-parse.mjs`, `scripts/check-classes.mjs`, `README.md`, `masaha/profile-a.jsx`, `profile-b.jsx` |
| **AD-005, AD-010** | The design catches up with #57: the area is one field over the whole catalogue, each governorate a group with its active areas under it, with no helper naming one governorate; every field that may stay empty says «اختياري» and the English name, the Arabic address, the area and the pin are checked on their own fields, the first error taking the focus; the landmark is asked in both languages; the pin has its coordinates under the map, one value with it, Arabic digits read. The fields are one pair of blocks, which the creation form and the editor share | `masaha/profile-a.jsx` |
| **E1 (A1)** | The editor's seven cards become the contract's five fact groups and a gallery. «الأساسيات» and «الموقع» are one «المساحة» section — two blocks under a `Separator`, one date, one footer, one confirm — keeping their `#basics` and `#location` anchors for the links that target them. A group never saved says «لم تُضف بعد» and offers «حفظ» only; its first save dates it. Every section title is an `h2`. Below `lg` the navigation is a row of chips, sticky under the top bar and scrolling sideways; at every width the section in view is marked (`aria-current`), and the cards and the navigation share one name each («الأسعار المعلنة» goes). Each group's date and whether it is missing come from the sample data; no capacity on the admin's editor. On the admin's editor the amenities end with «إدارة قائمة المرافق», leading to the lookups' amenities (`Admin lookups.html?tab=amenities`) for one the list lacks; the owner's page has no such link | `masaha/profile-a.jsx`, `profile-b.jsx`, `masaha.css`, `Admin space edit.html` |
| **E7 (O1)** | The owner's Space profile is the same editor, so it takes the «المساحة» section, the `h2` titles and the navigation with it. Its own content — the intro line, the unsaved-sections alert, the prices card leading to Packages & prices, the capacity section — is batch 5's and stays | `Owner space profile.html` |
| **E2 (AD-002)** | «إضافة مساحة» leads to a creation form of its own, as #57 built it, not the editor in a "new" state with seven saves for a space that does not exist: a «الأساسيات» card and a «الموقع» card (the shared fields), then one «إضافة مساحة». It checks on submit with #57's lines, the first error taking the focus; `?fail=add` shows its failure above the submit. Once added, a toast «أُضيفت {name}» and the new space's editor (`?id=new`), with the profile as typed. **The built web still returns to the list (#57's D2) until S2b-4 builds the editor.** `Admin space edit.html?new=1` leads to the new page, so its old links still work | new `Admin space add.html`, `Admin space edit.html`, `Admin spaces.html` (its «إضافة مساحة» only), `Flows - states.html`, `INDEX.md`, `SCREENS.md` |
