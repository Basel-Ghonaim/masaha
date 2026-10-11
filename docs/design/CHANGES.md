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
| **SH-005** | The language toggle is in the site's phone header, where a non-Arabic reader meets it; the theme moved into the drawer. Both dashboard shells, which had no phone language toggle at all, now carry both in the drawer's foot | `masaha/shared.jsx`, `owner.jsx`, `admin.jsx` |
| **SH-006** | The 768 rail shows the space's mark as the switcher's trigger, named «تبديل المساحة — Focus Hub» with a tooltip; the admin's rail shows the «م» mark. The name beside it is dropped only where the rail has no room, and the button keeps its `aria-label` | `masaha/owner.jsx`, `masaha/admin.jsx` |
| **SH-018** | A «تخطَّ إلى المحتوى» link is the first focusable element of every shell, seen only on focus, leading to `main` | `masaha/shared.jsx` (`SkipLink`), the four shells, `masaha.css` |
| **SH-020** | Menu items take the menu's own colour. The cause was the archive's own `a{color:var(--primary)}`, which also reached the row-action menus and the breadcrumbs, so it is scoped once rather than patched per menu | `masaha/masaha.css` |
| **DI-2** | `min-h-14` and `md:inline` were used by both shells but are not in the prebuilt bundle, so the top bar had no minimum height and the account name never appeared from 768 | `masaha/masaha.css`, `owner.jsx`, `admin.jsx` |

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
