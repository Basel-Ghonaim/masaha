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
| **SH-005** | The language toggle is in the site's phone header, where a non-Arabic reader meets it; the theme moved into the drawer. Both dashboard shells, which had no phone language toggle at all, now carry both in the drawer's foot | `masaha/shared.jsx`, `owner.jsx`, `admin.jsx` |
| **SH-006** | The 768 rail shows the space's mark as the switcher's trigger, named «تبديل المساحة — Focus Hub» with a tooltip; the admin's rail shows the «م» mark. The name beside it is dropped only where the rail has no room, and the button keeps its `aria-label` | `masaha/owner.jsx`, `masaha/admin.jsx` |
| **SH-018** | A «تخطَّ إلى المحتوى» link is the first focusable element of every shell, seen only on focus, leading to `main` | `masaha/shared.jsx` (`SkipLink`), the four shells, `masaha.css` |
| **SH-020** | Menu items take the menu's own colour. The cause was the archive's own `a{color:var(--primary)}`, which also reached the row-action menus and the breadcrumbs, so it is scoped once rather than patched per menu | `masaha/masaha.css` |
| **DI-2** | `min-h-14` and `md:inline` were used by both shells but are not in the prebuilt bundle, so the top bar had no minimum height and the account name never appeared from 768 | `masaha/masaha.css`, `owner.jsx`, `admin.jsx` |

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

### Notes for the web worker

- The prebuilt `_ds_bundle.css` only holds the utility classes the original prototype used, so a
  class added by hand can be silently dead. Three rules were written into `masaha.css` for that
  reason (the skip link, the menu colour, `min-h-14`); none of them is a new colour, size or font,
  and none is needed in the code, where Tailwind compiles from source.
- **P2's short form on a phone** is the state word alone («ممتلئ»), and the control drops its
  chevron below 768. With P1's «⋯» also in the bar, 390 px does not fit the countdown as well without truncating the page title to five characters, so the countdown moved one tap away: it opens the panel and is in the control's `aria-label`. From 768 the full sentence is shown.
- The vendored bundle has **no `PageHeader`** and **no `SidebarText`**. `SidebarHeader`'s `mark`
  prop already does what SH-006 asks for: it stays visible when the sidebar collapses while its
  children turn `sr-only`.
