# Design System — Foundation

_Also the brief given to Claude Design._

> **Status:** Active — structure decided ([ADR 0005](../../architecture/decisions/0005-design-system-approach.md)); visual values **locked**: the colours are *ink + berry* ([ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md), 2026-11-12, #144); the type, radius, shadow and density are the Claude Design direction *1a Sea*'s (§14 Steps 1–2). The layer is **built** (§14 Step 3): the tokens, the layer base (`tokens/`, `lib/cn.ts`, `icons/`, `DirectionProvider`, the showcase; §3) and every §12 component, with the theme and language toggles. The whole showcase was checked in light and dark, RTL and LTR, at 360, 768 and 1280 (WI-9). The layer is **synced** into Claude Design (§14 Step 4).
> **Owner:** Basel Ghoneim
> **Last Updated:** 2026-11-12
> **Audience:** Claude Design (to design every screen), Claude Code and the developer (to build the layer).

This document defines **how** Masaha's Design System is structured, **what** it must cover, and the **values** of its tokens. The values were chosen in Claude Design (direction *1a Sea*, stress-tested on forms, dense tables and menus), its colours then replaced by *ink + berry* after a measured trial ([ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md)), and are written here as the single source the layer is built from. A value changes here first, then in code.

---

## 1. Product context

**Masaha (مساحة)** is a bilingual (Arabic / English) web platform for coworking spaces in the Gaza Strip. It has three areas:

| Area | Who | Purpose |
|---|---|---|
| **Public site** | everyone | Directory of coworking spaces (list or map), space details, live status (available, full, closed now) |
| **My account** | User, Owner | Profile, favourites, reports the user submitted |
| **Dashboard** | Owner, Reception, Admin | One role-based dashboard: Owner runs their own space(s), Reception works the front desk of its space; Admin manages the platform |

**Roles:** `USER` (freelancer or student looking for a space), `OWNER` (space owner), `RECEPTION` (front-desk staff of one space, added by its owner), `ADMIN` (platform administrator). `OWNER` and `RECEPTION` are roles at a space ([ADR 0009](../../architecture/decisions/0009-space-scoped-reception-role.md)).

**Context that shapes the design:**
- Users are freelancers and students in Gaza. Internet is weak and intermittent, so pages must stay light.
- Arabic is the primary language, and RTL is a first-class direction, not an adaptation.
- Owners and their reception staff run a daily operation: check-ins, visits, subscriptions, payments, announcements. Speed of repeated actions matters more than decoration.
- Tone: calm, trustworthy, practical. No playful or decorative styling.

---

## 2. Principles

1. **One layer, one place.** Every visual decision lives in `shared/design-system/`. Pages and features compose it and never restyle it.
2. **Semantic, never raw.** Consumers bind semantic roles (`primary`, `muted-foreground`), never palette values (`blue-500`) or arbitrary values (`text-[13px]`).
3. **Themes are a resolution layer.** Light and dark are two complete resolutions of the same semantic keys. Components never know which theme is active.
4. **RTL is first-class.** Every component works identically in both directions, using logical properties only.
5. **Components hold no words.** Every visible or assistive string arrives as a prop from the copy catalogue.
6. **Responsive everywhere.** Public site and dashboard alike work on phone, tablet and desktop.
7. **Accessible by default.** AA contrast in both themes, visible focus, keyboard reachable, adequate hit targets.
8. **Admission test.** A component belongs to the layer only if its meaning survives outside Masaha's domain. `Button`, `Badge` and `Table` belong. `SpaceCard` and `OccupancyMeter` belong to features, built *from* the layer.

---

## 3. Architecture

```
apps/web/src/shared/design-system/
  tokens/
    primitives.css    raw scales (palette, radius, shadow) — the only place raw values exist
    semantic.css      semantic roles, per theme ([data-theme="light"] / [data-theme="dark"])
    typography.css    font stacks per script + composite text styles
    tailwind.css      @theme mapping: exposes semantic roles as Tailwind utilities
  components/
    <category>/       one folder per category (below)
      <ComponentName>/  one folder per component (shadcn-sourced or hand-built), own index.ts
  icons/              single wrapper over the icon library + mirroring rule; GlyphIcon, an icon by
                      its glyph's name from a closed set (GlyphName), for data that names its icon
  lib/cn.ts           class-merge helper (lives inside the layer — the layer imports nothing from outside)
  lib/DirectionProvider.tsx  the reading direction for Radix and the icons (§8); not a visual component
  lib/useMediaQuery.ts  whether a media query matches now, read during render; exported
  lib/sortableKeys.ts  Sortable's keyboard step: where an arrow, Home or End moves a lifted item
  lib/sortableMotion.ts  Sortable's slide on the layer's motion tokens, so reduced motion stops it
  index.ts            the public surface
  data.ts             the second entry: the data components that carry a heavy library (DataTable)
  calendar.ts         the third entry: Calendar and DatePicker, over react-day-picker
  sortable.ts         the fourth entry: Sortable, over dnd-kit
  leaflet.css         the map's stylesheet: Leaflet's own, then its frame, controls, pin, marks and
                      crosshair on the semantic tokens; imported by shared/map only
```

**Categories.** A component's category is its **primary role for the user**: what the user does with it or gets from it, never its form. Each component has exactly one. A component that takes another's form is still classed by its role: Select's list floats, and Sidebar becomes a drawer on a phone, but they are a field and navigation.

| Category | Role | Components |
|---|---|---|
| `actions` | triggers an action | Button · ThemeToggle · LanguageToggle · DropdownMenu |
| `fields` | enters or chooses a value, usually inside a Field | Field · Input · Textarea · Select · Combobox · Checkbox · RadioGroup · SegmentedControl · Switch · ToggleGroup · Calendar · DatePicker · Sortable |
| `display` | shows content | Avatar · Badge · Card · StatCard · Separator · FilterTag · Logo |
| `data` | shows records in rows and columns | Table · DataTable |
| `feedback` | tells the system's state | Alert · Toast · Skeleton · Spinner · EmptyState |
| `overlays` | holds the caller's content above the page | Dialog · AlertDialog · Sheet · Popover · Tooltip |
| `navigation` | moves between places | Breadcrumb · Tabs · Pagination · Sidebar |

A new component goes in the category of its role: the removable filter tag ([finding 8](../../architecture/findings/8-the-stress-tests-applied-filter-tag-has-no-component.md)) in `display`, charts in `data`. A new category is added only when a role fits none of these.

**Rules:**
- **Public surface:** consumers import from `@shared/design-system`, never from inside a component folder. The exceptions are three more entries for the components that carry a heavy library: `@shared/design-system/data` for the data components (`DataTable`, over TanStack Table; [finding 45](../../architecture/findings/45-the-data-tables-library-reaches-the-sites-first-download.md)), `@shared/design-system/calendar` for `Calendar` and `DatePicker` (over react-day-picker and date-fns; [finding 169](../../architecture/findings/169-the-calendar-rides-in-the-sites-first-download.md)), and `@shared/design-system/sortable` for `Sortable` (over dnd-kit, 2026-11-10, #141). Only the pages that draw them import these entries, so their libraries stay out of the site's first download, which `check:build` verifies. Lint allows these entries alone.
- **Closure:** the layer imports nothing from outside itself (no features, pages, app, or other `shared/` modules).
- **Class merging:** `cn` (`lib/cn.ts`) joins classes; when two set the same thing, the later wins. It is configured with the layer's text styles and shadows, which tailwind-merge would otherwise misread (`text-body` as a colour, so `cn('text-body', 'text-primary')` would drop it). Every component, copied ones included, merges through it; the layer exports it for pages and features too.
- **Width:** `useMediaQuery` (`lib/useMediaQuery.ts`), which the sidebar and the data table read, is exported too, so a feature that draws a part once per width, never twice with duplicate ids, reads it as the layer does: the site's Directory draws its filters as a sidebar from 1024 px and a bottom sheet below (2026-10-21, #103).
- **shadcn/ui** is configured (`apps/web/components.json`: style `radix-vega`, `rtl: true`, every alias inside the layer) to copy components into `components/`. With `rtl: true` the CLI writes logical classes. The CLI reads the aliases from `apps/web/tsconfig.json`, which repeats `@shared/*` for it. Once copied, a component is ours and follows this contract (§11).
- **Radix primitives, the icon library and variant utilities** (`class-variance-authority`) are imported **only** inside the layer.
- **No CSS files outside the layer.** Pages and features use Tailwind for layout only (grid, flex, gap, spacing, sizing).
- **Stylesheet entry:** `tokens/tailwind.css`. `index.html` links it directly, so it blocks first paint in development as well as in the build. This is the one reference into the layer from outside it; it is a document stylesheet, not a module import.
- **The map's stylesheet** (`leaflet.css`) is the other exception. Leaflet's own stylesheet comes first. Then it gives the map its frame (border, radius, focus outline), its zoom buttons and attribution (the card's colours), the pin (`.map-pin`, on `primary`), the marks of a map of many places (`.map-mark`: a dot filled, barred, hollow or dashed, toned `success`, `warning` or `muted-foreground`, the selected one ringed on `primary`, never filled; each drawn on a span that takes the light theme, as OpenStreetMap's tiles are light in both themes, so the map's marks and a legend's `MapMarkSample` agree in dark ([finding 135](../../architecture/findings/135-in-dark-the-maps-marks-disagree-with-its-legend.md), 2026-10-29, #132)), the visitor's point (`.map-user`), the crosshair at the centre while a point is picked (`.map-crosshair`) and a mark's name beside it (`.map-tooltip`), all on the semantic tokens. It also isolates the map, so Leaflet's stacked panes stay under the sticky bar and the overlays. Only `shared/map` imports it, from the part it loads lazily, so it arrives with the map and never in the site's first download ([architecture §6](../architecture.md#6-map)). Lint allows that import alone.

**Enforcement:** ESLint forbids (a) imports into the layer's internals, (b) importing Radix, the icon library, `cva`, Sonner, cmdk, react-day-picker, TanStack Table or dnd-kit outside the layer, and (c) the layer importing anything outside itself. `check:classes` forbids (d) arbitrary-value classes outside the layer, and (e) the selected tint as a hover anywhere, the layer included: `bg-accent`, `text-accent-foreground`, `bg-sidebar-accent` or `text-sidebar-accent-foreground` under a hover or highlight variant (`hover:`, `focus:`, `focus-visible:`, `aria-expanded:`, `data-open:`, `has-data-open:`, `data-[selected=true]:`, `data-highlighted:`), alone or compounded (`md:hover:`, `not-data-active:hover:`), read on another element (`group-hover:`, `peer-hover/…:`) or with an opacity or important mark; palette classes do not exist, because the Tailwind palette is reset. A test checks theme key parity (§6).

**Wrapped libraries:** every third-party UI library the layer wraps is added to (b), the ESLint import restriction, in the same PR that introduces it, so pages and features reach it only through the layer.

**Showcase:** a development-only page, `/__showcase` (`apps/web/src/pages/showcase/`), shows the layer in either theme and direction, at 360, 768 or 1280 px. The preview sits in an iframe of that width, so breakpoints respond as they would on a device. It has three views, each with its own address:
- every section, in the order the components were built (`/__showcase`);
- one category (`/__showcase/fields`);
- one component (`/__showcase/fields/date-picker`).

A navigation grouped by category leads to all three; on a phone it is a drawer. The toolbar's settings stay in the address across views. Each component adds a section in `sections/<category>/` and one entry in the registry (`registry.tsx`), the one list behind the navigation and the views; a test keeps its categories in step with the layer's folders. Sample text comes from `fixtures.json`, since the page is not user-facing. The build leaves the page out, and `check:build` verifies it.

---

## 4. Token tiers

| Tier | What it holds | Who binds it |
|---|---|---|
| **Primitive** | Raw scales with no meaning: palette ramps (`neutral-50…950`, `spark-50…950`, `green-*`, `amber-*`, `red-*`, `blue-*`), radius scale, shadow scale | Only `semantic.css` |
| **Semantic** | Roles with meaning, resolved per theme | Components, and pages/features for colour needs |
| **Component** | Optional, derived from semantic; only when a component needs a value no role covers | That component only |

**Binding rule:** use the semantic role where one exists; otherwise the primitive scale inside the layer; never a literal.

**Coincidence is not identity:** two roles that happen to share a value in one theme stay separate if they mean different things.

### Primitive palette (locked — *ink + berry*, [ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md))

The brand has two roles: the **ink**, `neutral-900` / `neutral-50`, and the **spark**, a berry, `spark-500` / `spark-400`. The neutrals are drawn in the ink's hue (OKLCH h 250, chroma 0.014); the spark's seed is #A149A0 (h 328). Short names used in the tables below: `n` neutral, `s` spark, `g` green, `a` amber, `r` red, `i` blue.

| Ramp | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `neutral` | #F7FBFF | #ECF4FC | #DDE5ED | #C9D0D7 | #9FA6AD | #767D84 | #5E646A | #484E54 | #2C3137 | **#1A1F25** | #0D1217 |
| `spark` | #FEF3FE | #FFE3FD | #FAC8F7 | #EBA5E8 | **#D27ED0** | **#B55BB3** | #934791 | #773A75 | #5A2A59 | #3F1B3E | #260D25 |
| `green` | #ECFCEF | #D9F5DF | #BAE8C5 | #90D3A2 | #63B77C | #39995B | #137D41 | #026732 | #034D25 | #013517 | #001F0A |
| `amber` | #FFF5EA | #FFE9CF | #FBD3A2 | #EEB56C | #D6912B | #B27406 | #905C01 | #754B04 | #593700 | #3E2500 | #261400 |
| `red` | #FEF4F3 | #FDE7E4 | #FFCDC8 | #FEA69E | #FC6E68 | #DE4544 | #BE222A | #A20419 | #7C0110 | #580007 | #370003 |
| `blue` | #F1F8FE | #E0EFFF | #C0DEFF | #90C6FE | #64A6E9 | #3E87CE | #1F6CB0 | #075796 | #004174 | #002C52 | #001934 |

Plus `white` (#FFFFFF). There is no `brand` ramp: the brand is the ink and the spark, each with its own role (§5). The status ramps are unchanged from *Sea*.

### Component tokens (locked)

| Token | Value | Used by |
|---|---|---|
| `card-border` | light `n-200` (= `border`) · dark `n-700` | Card, table container, panels, the outline Button — dark cards have no shadow, so the border carries the edge |
| `control-height` | 40px · **44px on touch** (`pointer: coarse`) | Button, Input, Select, Checkbox row |
| `control-height-lg` | 48px · **52px on touch** | Input at `size="lg"`: a page's main field, such as the front desk's search |
| `control-text-size` | 15px (`body`) · **16px on touch** | The value typed or chosen in Input, Textarea and the Select trigger, with `body`'s line height. iOS Safari zooms the page into a focused input whose text is under 16px |
| `button-padding-inline` | 16px | Button |
| `card-padding` | 20px | Card, StatCard |
| `table-row-padding-block` | 14px | Table |
| `radius-control` | 6px (`radius-md`) | Button, Input, Select |
| `radius-pill` | 999px | Badge, filter chips |
| `skeleton` | light `n-200` · dark `n-800`: the `hover` fill's steps, a different meaning | Skeleton's fill: a loading placeholder seen on `card` and `background` (§5, *Verified*) |
| `overlay-scrim` | light `n-950` at 50% · dark `n-950` at 70% (mixed with transparent), no blur | The scrim behind Dialog, AlertDialog and Sheet, on the `overlay` layer. No role covers a translucent dimming layer |
| `chart-height-md` · `chart-height-sm` | 200px · 120px | BarChart's two sizes: a chart of its own, and one beside others |
| `refreshing` | opacity 0.6 | Refreshing and DataTable's `refreshing`: the rows or cards shown while the next page or filter loads over them |
| `heatmap-step-1` … `heatmap-step-5` | opacity 0.12 · 0.3 · 0.5 · 0.72 · 1 | Heatmap: `primary` over a `muted` cell, from the fewest to the most, and its legend |

**Layout is not tokenised.** Pages use Tailwind's 4px scale; *Sea*'s rhythm maps to it: page gutter 32px (`8`; 16px on phones), grid gap 16px (`4`) / 24px (`6`), section spacing 56px (`14`), home hero padding 64px (`16`). These are guidance for page composition, not layer tokens.

---

## 5. Semantic roles

Names follow shadcn/ui's convention so copied components work unchanged, plus Masaha's additions. Every role with a surface has a matching `-foreground`. A state takes its surface's text: `primary-hover` (its text `primary-foreground`) and `hover-on-muted` (over a muted ground, the control's `foreground`) have none, and `spark` carries no text (a count on it is `sidebar-primary`, whose `-foreground` is verified).

### Surfaces and text
| Role | Purpose |
|---|---|
| `background` / `foreground` | Page ground and default text |
| `card` / `card-foreground` | Raised surfaces: cards, panels, table containers |
| `popover` / `popover-foreground` | Floating surfaces: menus, popovers, dropdowns |
| `muted` / `muted-foreground` | Subtle fills; secondary text (captions, meta, placeholders) |
| `border` | Default borders and dividers |
| `input` | Form control borders |
| `ring` | Focus indicator (one focus style for the whole system) |
| `scrim` / `scrim-foreground` | Text laid over a photo, such as the photo grid's «+N»: the ink at 70% (light) or its light end at 70% (dark) |

### Actions
| Role | Purpose |
|---|---|
| `primary` / `primary-foreground` | The **ink**: main action, links, checked and active controls |
| `primary-hover` | The ink's hover: `primary` mixed 18% toward the page, as the ink and the text are one colour |
| `secondary` / `secondary-foreground` | Secondary actions |
| `accent` / `accent-foreground` | **Selected**, the spark's tint: a chip that is on, the current item, today's row, the inside of a range |
| `hover` / `hover-foreground` | **Hover**, a neutral fill of its own: a hovered row, item, card or outline and ghost control; never the spark |
| `hover-on-muted` | The hover of a control drawn on a `muted` or `secondary` ground: an ink wash, where an opaque fill would vanish |
| `spark` | **What matters now**, sparingly: a fill, an edge, an outline or a mark. It has no text utility: only `bg-spark`, `border-spark`, `outline-spark` and `fill-spark` exist |
| `destructive` / `destructive-foreground` | Delete, deactivate, errors |

### Status (Masaha additions)
| Role | Purpose | Domain uses (decided by features, not the layer) |
|---|---|---|
| `success` / `success-foreground` | Positive state | Available now, active subscription, paid, verified |
| `warning` / `warning-foreground` | Attention | Space full, subscription ending soon, partly paid, possibly outdated data |
| `info` / `info-foreground` | Neutral notice | Announcements, tips |
| `destructive` (above) | Negative state | Expired subscription, unpaid, errors |

A space closed now is neutral (the `secondary` surface), not a status role (DECISIONS_SHARED, 2026-10-10).

Each status also needs a **subtle** surface for badges and alerts (`success-subtle`, `warning-subtle`, `info-subtle`, `destructive-subtle`) with text that meets AA on it.

### Dashboard shell
`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` — as in shadcn's Sidebar component.

### Data visualisation
`chart-1` … `chart-5` — for finance and statistics (income by month, visits and subscriptions; occupancy by hour and by day).

### Values (locked — *ink + berry*)

| Role | Light | Dark |
|---|---|---|
| `background` / `foreground` | n-50 / n-900 | n-950 / n-50 |
| `card` / `card-foreground` | white / n-900 | n-900 / n-50 |
| `popover` / `popover-foreground` | white / n-900 | n-900 / n-50 |
| `muted` / `muted-foreground` | n-100 / n-600 | n-800 / n-400 |
| `border` | n-200 | n-800 |
| `input` | n-500 | n-500 |
| `ring` | n-900 | n-50 |
| `primary` / `primary-foreground` | n-900 / white | n-50 / n-950 |
| `primary-hover` | n-900 mixed 18% toward n-50 (OKLab) | n-50 mixed 18% toward n-950 (OKLab) |
| `secondary` / `secondary-foreground` | n-100 / n-900 | n-800 / n-100 |
| `accent` / `accent-foreground` | s-100 / n-900 | s-900 mixed 30% toward s-800 (OKLab) / n-50 |
| `hover` / `hover-foreground` | n-200 / n-900 | n-800 / n-50 |
| `hover-on-muted` | n-900 at 10% | n-50 at 8% |
| `spark` | s-500 | s-400 |
| `scrim` / `scrim-foreground` | n-900 at 70% / n-50 | n-50 at 70% / n-950 |
| `destructive` / `-foreground` | r-600 / white | r-400 / r-950 |
| `destructive-subtle` / `-foreground` | r-50 / r-800 | r-950 / r-200 |
| `success` / `-foreground` | g-600 / white | g-400 / g-950 |
| `success-subtle` / `-foreground` | g-50 / g-800 | g-950 / g-200 |
| `warning` / `-foreground` | a-500 / a-950 | a-400 / a-950 |
| `warning-subtle` / `-foreground` | a-50 / a-800 | a-950 / a-200 |
| `info` / `-foreground` | i-600 / white | i-400 / i-950 |
| `info-subtle` / `-foreground` | i-50 / i-800 | i-950 / i-200 |
| `sidebar` / `sidebar-foreground` | white / n-700 | n-900 / n-300 |
| `sidebar-primary` / `-foreground` | s-500 / n-950 | s-400 / n-950 |
| `sidebar-accent` / `-foreground` | s-100 / n-900 | as `accent` / n-50 |
| `sidebar-border` / `sidebar-ring` | n-200 / n-900 | n-800 / n-50 |
| `chart-1` … `chart-5` | s-500 · i-600 · a-500 · g-500 · n-500 | s-400 · i-400 · a-400 · g-400 · n-500 |

A role "at 10%" is the colour mixed with transparent in OKLab, so it lies over its ground. Every mix of the tokens is written in OKLab: in OKLCH Chrome treats a near-grey's hue as missing, so a mix of the ink's neutrals would paint a warm grey (2026-11-12, #144).

**Verified** by the layer's token test, in both themes, translucent roles composited over their ground as painted:
- **Text, 4.5:1:** every `-foreground` on its surface; `muted-foreground`, `primary`, `destructive`, `success` and `info` on `background`, `card` and `muted`; `foreground` and `muted-foreground` on the selected tints (`accent`, `sidebar-accent`); `muted-foreground` and `sidebar-foreground` on `hover`; `primary-foreground` on `primary-hover`; `foreground` on `hover-on-muted` over `muted`; `scrim-foreground` on `scrim` over a photo's white and its black.
- **Non-text, 3:1:** `input`, `ring`, every `chart-*` and the status fills on `background` and `card`; the `spark` on `background`, `card`, `popover`, `sidebar` and the selected tints; `ring` on `muted`, the tints and `hover`.
- **Fills seen:** `hover` at 1.2:1 from `card`, `background`, `popover` and `sidebar`; `hover-on-muted` from `muted`, and the `skeleton` from `card` and `background`, at 1.2:1; the selected tints at 1.15:1 from `card` and `sidebar` (a second mark or a word carries the rest).
- **Apart:** `hover` is not the selected tint (OKLab ΔE ≥ 0.02); the ink and the spark stand ΔE ≥ 0.10 from `destructive`, and ≥ 0.08 under simulated protanopia and deuteranopia; in dark the tints stand ΔE ≥ 0.10 from `destructive-subtle`, and `destructive` keeps a red's hue (OKLCH 15–45°).
- **The identity's colours** that the logo's files write by hand: light `background` #F7FBFF, `foreground` #1A1F25, `spark` #B55BB3; dark #0D1217, #F7FBFF, #D27ED0.

**Usage rules the values depend on:**
- **The spark is never text, never on an action, never destructive.** It marks what matters now as a fill, an edge, an outline or a mark, and has no text utility. A count on it takes `sidebar-primary` and its `-foreground`. `text-sidebar-primary` and `text-chart-1` reach the spark through other roles: they draw marks, never words.
- **Text over a photo** sits on `scrim` with `scrim-foreground`, never on an opacity of another role.
- **Hover is not selected.** A hover is the neutral `hover` fill; selected is the spark's tint (`accent`, `sidebar-accent`). They differ by hue and, where the design gives one, a second mark: the sidebar's current item has a 3 px `spark` bar at its inline start, a chip that is on a `spark` edge and a check. Selected keeps its tint under the pointer: an item hovers only while it is not selected (`not-data-on:`, `not-data-active:`, `not-data-[active=true]:`, or the caller's own condition), never by the order Tailwind emits its variants in. A control drawn on a `muted` or `secondary` ground hovers with `hover-on-muted`: in dark, `hover` equals `muted` and would vanish there.
- **Links in running text are underlined.** The ink is also the text's colour, so a link inside a sentence, a note or the footer is underlined at rest (`text-primary underline underline-offset-4`), not only under the pointer; so is the link Button.
- **Warning is never text on its own.** `warning` is for fills and icons only (3.9:1 on white). Warning text uses `warning-subtle-foreground` on `warning-subtle`.
- **Status is never colour alone.** A badge always carries its word ("نشط", "ينتهي خلال 3 أيام", "منتهية").
- **Disabled** = the control at 50% opacity, and in a Field the whole field with it: label, helper and error too. Exempt from contrast, but never the only way a reason is shown.
- **A tooltip only supplements.** Touch screens cannot open it, so it never holds information or an action that is unavailable without hover. An icon-only button still has its own `aria-label`; the tooltip repeats it for sighted mouse users.

### Other scales
| Family | Tier | Values (*Sea*) |
|---|---|---|
| Radius | Primitive scale + one semantic `radius` base | `--radius` 8px → `sm` 4 · `md` 6 · `lg` 8 · `xl` 12 · `full` 999 |
| Shadow | Primitive scale | **raised** `0 1px 2px rgb(15 30 40 / .06), 0 2px 6px rgb(15 30 40 / .06)` · **floating** `0 8px 24px rgb(15 30 40 / .10)` · **overlay** `0 16px 48px rgb(15 30 40 / .16)`. Dark: raised `none`, floating and overlay use `rgb(0 0 0 / .4)` |
| Spacing | Tailwind's 4px scale | Layout binds the scale; control padding is owned by components (§4 component tokens) |
| Z-index | Named layers | `sticky` 100 · `overlay` 200 · `modal` 300 · `dropdown` 400 · `toast` 500. Dropdown sits above modal: floating content is portalled to `<body>`, and one opened from a dialog must appear over it. Outside the layer, a sticky bar names its layer with the `z-sticky` utility |
| Motion | 2 durations + 1 easing | 150ms · 250ms · `cubic-bezier(.2, 0, 0, 1)`; off under `prefers-reduced-motion` |

---

## 6. Theming

- **Themes:** `light` and `dark`, each a complete resolution of every semantic key (**key parity**, checked by a test). The layer exports their names as `THEMES`, and the same test holds the list to the themes the token files define.
- **Mechanism:** `data-theme` on `<html>`. Tailwind's `dark:` variant is redefined to read `[data-theme="dark"]` instead of shadcn's `.dark` class.
- **Pre-paint script:** the theme is set before first paint, so there is no flash ([localisation › Before first paint](../localisation.md#before-first-paint)).
- **Policy (owned by the app, not the layer):** follow the system preference until the user chooses. The explicit choice is stored and wins.
- **Both themes are designed, not generated.** Claude Design delivers every key screen in both.

---

## 7. Typography

- **Script axis:** font stacks resolve per language via `:lang(ar)` / `:lang(en)`.
- **Font (locked):** *IBM Plex Sans Arabic*, weights 400 / 500 / 600, for **both** languages — one family covers Arabic and Latin, keeping them visually consistent. Self-hosted (woff2, subset), with `font-display: swap`; fallback `system-ui, sans-serif`.
- **Composite text styles** (size + weight + line height as one unit), not a raw size ramp. Values are *Sea*'s, tuned for Arabic:

| Style | Use | Size / line height / weight |
|---|---|---|
| `display` | Home hero only | 44px / 1.4 / 600 · phone 30px |
| `heading-1` | Page titles | 30px / 1.5 / 600 · phone 24px |
| `heading-2` | Section titles | 22px / 1.55 / 600 |
| `heading-3` | Card and panel titles | 17px / 1.6 / 600 |
| `body` | Default text | 15px / 1.8 / 400 |
| `body-sm` | Dense tables, secondary content | 13px / 1.7 / 400 |
| `label` | Form labels, buttons, tabs | 14px / 1.5 / 500 |
| `caption` | Meta text, timestamps, helper text | 12px / 1.6 / 400 |

- **Arabic line height is taller** than Latin. The values above are Arabic's; `:lang(en)` may tighten them (body around 1.6) — confirmed on the English screens in Step 5. The script axis resolves it, not each component.
- **Digits:** Western (0–9) in both languages.

---

## 8. Direction (RTL / LTR)

- **Logical properties only:** `ms-/me-/ps-/pe-/start-/end-/text-start/text-end/border-s/border-e/rounded-s/rounded-e`. Physical ones (`ml-`, `left-`, `text-left`) are forbidden.
- **Direction follows language:** `ar` → `rtl`, `en` → `ltr`. It is never chosen separately.
- **`DirectionProvider`** (the layer's, over Radix's) wraps the app with the direction the pre-paint script set on `<html>`, so Radix-based components (menus, tabs, sliders) and the icons follow it. A subtree shown in the other direction nests its own.
- **Icons declare mirroring:** directional icons (arrows, chevrons, log-in/out, "back") mirror in RTL; non-directional ones (search, calendar, check) never do. The mirroring rule lives in the `icons/` wrapper, not in each component. Each icon is declared once in `icons/` with its flag and named for the reading direction (`ChevronStartIcon`, `ChevronEndIcon`). Mirroring is a horizontal flip, not a rotation, so icons that are not symmetric top to bottom keep their shape.
- **Always-LTR values:** phone numbers, emails, prices, times and numeric IDs render with `dir="ltr"` inside RTL text. User-written text uses `dir="auto"`.
- **Mixed content:** a value inserted into a sentence is isolated (`<bdi>` or Unicode isolates) so it never reorders the sentence.

---

## 9. Responsive layout

| Size | Width | Behaviour |
|---|---|---|
| Phone | 360–767px | Single column. Dashboard sidebar becomes a drawer (`Sheet`). Tables become stacked cards. Filters open in a bottom sheet. |
| Tablet | 768–1023px | Two columns where useful. Sidebar collapses to icons. |
| Desktop | ≥1024px | Full layout: visible sidebar, full tables. |

Tailwind breakpoints: `md` = 768, `lg` = 1024 (defaults).

**Directory, at every width:** the list **or** the map, never side by side, switched by a «قائمة | خريطة» toggle. The list is the default, and the view is kept in the URL (`?view=map`).

**Shells:**
- **Public shell:** a top header, the content, a footer.
- **Dashboard shell:** a sidebar, a top bar, the content.
- What each shell holds is the frontend architecture's ([architecture §2](../architecture.md#2-page-groups)).

---

## 10. Accessibility baseline

- WCAG AA contrast for text and UI in **both** themes, including status-subtle surfaces.
- One visible focus ring (`ring`) on every interactive element.
- Minimum hit target: 44×44px on touch.
- Every page has a document title, "{page} · Masaha", in the interface's language (WCAG 2.4.2), set as [architecture §2](../architecture.md#2-page-groups) describes.
- Every control has a programmatic label; errors are linked with `aria-describedby`.
- Form submit buttons stay **enabled**; validation runs on submit and moves focus to the first invalid field. A button is disabled only while its request is in flight, or when an action is unavailable for a reason shown next to it.
- Full keyboard use in dashboards (tables, dialogs, menus).
- `prefers-reduced-motion` respected.

---

## 11. Component contract (applies to every component, including copied shadcn ones)

When a shadcn component is added, it is adapted before it is used:

1. **No built-in words.** Hardcoded strings ("Close", "Previous", "Next", "More", `sr-only` text) become props, supplied from the catalogue.
2. **Logical properties.** Convert any physical class to its logical form (§8).
3. **Icons through the wrapper**, with the mirroring flag. A `lucide-react` icon becomes the matching layer icon (§8), including the directional ones the CLI marks `rtl:rotate-180`.
4. **Semantic roles only.** No palette or arbitrary values.
5. **Variants via `cva`**, typed. Props extend the native element's props.
6. **Accessibility** as in §10, using Radix behaviour where available.
7. **Own `index.ts`**, exported from the layer's root `index.ts`.

### Adapting the CLI's output

A copy also needs these steps, which the contract above does not cover ([finding 2](../../architecture/findings/2-copied-shadcn-components-need-more-than-the-contract-lists.md)):

- **Source and place.** Take the source from `npx shadcn add <name> --dry-run --view`, so the CLI never installs a package. Move it into its category folder: write it to `components/<category>/<Name>/<Name>.tsx` beside its `index.ts`, the category chosen by its role (§3). Drop `"use client"`.
- **Merge through the layer's `cn`.** `import { cn } from "cn"` becomes `../../../lib/cn`. The `cn` package is never installed: it lacks the text styles and shadows (§3).
- **No `dark:` classes.** The tokens resolve each theme (§6); a component never styles per theme.
- **State variants** (`data-checked:`, `data-open:` …) are defined in shadcn's `shadcn/tailwind.css`, which the layer does not load. Each one a copy uses is declared once in `tokens/tailwind.css` as a `@custom-variant` over Radix's `data-state`. Radix's presence attributes (`data-disabled`, `data-placeholder`) need none: Tailwind's own `data-*` variant matches them.
- **Tailwind's default scales** do not exist in the layer. Map them:

| CLI class | Layer class |
|---|---|
| `text-xs` · `text-sm` · `text-base`, with the `font-*` and `leading-*` beside them | a text style by role: `text-label` (buttons, labels), `text-body` (listed values), `text-body-sm` (dense content), `text-caption` (helper text, meta, group labels). The style carries the weight and line height |
| `shadow-xs` | none: controls are flat |
| `shadow-md` · `shadow-lg` | `shadow-floating` (menus, popovers) |
| `shadow-xl` · `shadow-2xl` | `shadow-overlay` |
| `rounded-md` on a control | `rounded-(--radius-control)` |
| `rounded-[4px]` | `rounded-sm` |
| `h-9` on a control | `h-(--control-height)` |
| `z-50` | the named layer (§5): `z-(--z-dropdown)` for anything portalled beside its trigger (menus, selects, popovers, tooltips); `z-(--z-overlay)` for a modal's scrim; `z-(--z-modal)` for a modal's content (Dialog, AlertDialog, Sheet) |
| `bg-black/10` · `bg-black/50` on an overlay | `bg-(--overlay-scrim)` (§4) |
| `duration-*` on an animation | `duration-(--duration-short) ease-(--easing-standard)`. `tw-animate-css` otherwise runs a fixed 150ms, reduced motion or not |
| the value text of a control (`text-base md:text-sm`) | `text-(length:--control-text-size) leading-(--type-body-line-height)`, in that order, so `cn` keeps both |

- **One focus style:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`, in place of `focus-visible:ring-3 focus-visible:ring-ring/50`. At 50% the ring loses the 3:1 that §5 verifies, and an outline also survives forced-colours mode. A bordered control (input, textarea, select trigger, checkbox, radio) also turns its border to `ring`, except while invalid, when it keeps its error border.
- **A hover never fades a fill.** `bg-primary/90` drops the light theme's white label below AA. The ink's hover is its own role (`hover:bg-primary-hover`); secondary and destructive mix their fill toward the foreground, which raises the label's contrast in both themes: secondary in OKLab, since in OKLCH Chrome drops the hue of two near-greys and paints them warm (§5, *Values*), destructive in OKLCH (`hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_12%)]`), where the red keeps its hue. Outline and ghost variants, rows, and menu and list items hover with `hover` (`hover:bg-hover hover:text-hover-foreground`), never `accent`, which means selected (§5; `check:classes` refuses it, §3); on a `muted` or `secondary` ground, with `hover-on-muted`.
- **Verified pairs only.** A fill carries the text §5 verifies on it (`bg-destructive text-destructive-foreground`), never a tint of a role under a colour it was not checked against (`bg-destructive/10 text-destructive`).
- **`data-side` offsets stay physical.** Radix names the side a popup opened on (`left`, `right`) the same in either direction, so the CLI's `rtl:` reversals of those offsets are dropped.
- **Raw px values** (`h-[18.4px]`, `translate-x-[calc(100%-2px)]`) become the spacing scale.
- **Hooks into composites the layer does not have** (`in-data-[slot=button-group]`, `group-has-…/field`) are dropped.

---

## 12. Component inventory

Grouped by category (§3). The theme and language toggles (`actions`) have no row; the last line below covers them.

### `actions`

| Component | Source | Notes / variants |
|---|---|---|
| Button | shadcn | primary, secondary, outline, ghost, destructive, link (underlined at rest) · sizes sm/md/lg/icon · loading state · `aria-disabled` (waiting, kept in the focus order) looks disabled |
| DropdownMenu | shadcn | Row actions, account menu · a highlighted item takes `hover` · a `destructive` item variant; checkbox and radio items; a submenu toward the end side · a `held` item, for an action that cannot be taken now: `aria-disabled` and drawn disabled, its reason inside the item's text, and selecting it does nothing; unlike `disabled`, which Radix skips in the arrow keys and typeahead, it stays reachable, so its reason is read (§10; [finding 105](../../architecture/findings/105-a-held-menu-item-may-be-unreachable-by-the-keyboard.md)) |

### `fields`

| Component | Source | Notes / variants |
|---|---|---|
| Input, Textarea | shadcn | with error state; `dir` prop for LTR values; Input holds start and end icons and a button (`InputAction`) inside its box · Input's `size="lg"` is a page's main field, such as the front desk's search: `control-height-lg`, its value text `control-text-size` as at the standard size |
| Field | hand-built | Label + control + helper + error, wiring ids and `aria-describedby`; an end slot on the label row; shown disabled with its control |
| Select / Combobox | shadcn | Area filter, a filter of several choices (multi-select) · Combobox is a Popover holding cmdk's search and list (shadcn's current `combobox` is built on Base UI, which the layer does not use): `single` closes on a choice, `multiple` stays open · its trigger is drawn like Select's and shows the caller's summary («الحالة: 2 محدّدة»); outside a Field that text names it; `empty` shows a placeholder muted, as on DatePicker's trigger · the search, list and empty text are props (cmdk's default list label is replaced); the search row shows its focus by its divider turning `ring`, not an outline · a chosen option is `aria-checked` with a check at its end, because cmdk keeps `aria-selected` for the highlighted one · the highlighted item (pointer or arrow keys) takes `hover`, never the selected tint · a caller that finds its own options, such as a server's search, passes `search` (the text and its change): the list shows the options as given, unfiltered, and `loading` stands in for the empty text while they come. |
| Checkbox, RadioGroup, Switch | shadcn | Switch: `aria-disabled` (waiting, kept in the focus order) looks disabled |
| Calendar / DatePicker | shadcn | Subscription start and end dates; report periods · one date or a range; a range starts afresh on each click once it is empty or whole, so its first click leaves `to` empty · `lang` sets the month and day names, from react-day-picker's locales (never date-fns directly): Gregorian with Western digits, the week from Saturday in Arabic and Sunday in English · arrow keys follow the direction, and the month buttons are `ChevronStartIcon` and `ChevronEndIcon` · no built-in words: the month buttons' names are props, a day is named by its date alone, and today and the chosen day are `aria-current` and `aria-selected` · 36px days, 44px on touch; chosen days on `primary`, hovering with `primary-hover`; the inside of a range on `accent`, kept under the pointer; today's cell on `muted`, its day hovering with `hover-on-muted` · DatePicker is a Popover with a calendar-icon trigger showing the caller's formatted text; formatting stays with the app ([localisation.md](../localisation.md)) |
| ToggleGroup (filter chips) | shadcn | Filter chips, as in the Admin › Data reports phone filter sheet: `radius-pill`, 36px (the control height on touch), edged with `input`; when on, the `accent` pair (selected), a `spark` edge and a check at the start, kept under the pointer; a chip that is off hovers with `hover` · `multiple` (any number on) or `single` · arrow keys follow the direction · inside a Field, named by its label ([finding 7](../../architecture/findings/7-the-stress-tests-filter-chips-have-no-component.md)) |
| SegmentedControl | hand-built (Radix radio group) | One choice among a few short ones, as joined segments on a track: the directory's subscription «الكل · ساعة · يوم · أسبوع · شهر» · a radiogroup with one tab stop, entering on the chosen segment; the arrow keys choose the next or previous, following the direction, and loop; Home and End choose the first and the last (Radix only moves the focus there) · the track `muted` with `radius-control`; a segment `muted-foreground` at the `label` size, on hover `foreground` over the `hover-on-muted` wash; the chosen one on `card` with the card's edge and the raised shadow, so in dark, which has no shadow, its edge still shows it · 32px segments, the control height on touch · inside a Field, named by its label and described by its helper · no disabled or invalid styling: no caller needs one |
| Sortable | hand-built (dnd-kit) | A list or a grid its user reorders by dragging, made for the space profile's photos (a grid, the whole tile dragged) and contacts (a list, by a handle) · the mouse starts a drag after 6 px, so a click on a button inside an item stays a click; a finger after a 250 ms press, so a swipe still scrolls; an item never sets `touch-action: none`, which would stop that swipe · the keyboard mode is the layer's own, by index, with no visible buttons: Space or Enter lifts the focused handle, the arrows move it (in a grid, left and right follow the reading direction; a list moves up and down), Home and End go to the ends, Space or Enter drops, Escape puts it back (heard on the window in the capture phase, before an overlay's listener, and kept from it, so a Sheet around the list stays open; Escape during a drag ends the drag the same way), Tab or the focus leaving for another element drops it where it is; the focus stays on the moved item, a cancel included · every word is the caller's: the handles' role description and instructions, and each step's announcement (lifted, moved, dropped, cancelled, and why a held list lifts nothing), said with the item's name and its place «2 من 3» in the layer's one live region; dnd-kit's English words are never drawn · `onMove` once per drop, with the new order; the order shown while an item is lifted is the layer's own · the item is a list item the layer draws; `renderItem` spreads `handleProps` on the whole tile or on a handle; a control in an item (a tile's delete button) sits beside the handle's element, never inside it (a focusable control inside a `role="button"` is axe's nested-interactive), and a handle leaves a control's own keys to it · its slide follows `--duration-medium` and `--easing-standard`, so reduced motion stops it · its own entry, so dnd-kit reaches only what imports it: the space profile's photos and contacts (2026-11-11, #143) |

### `display`

| Component | Source | Notes / variants |
|---|---|---|
| Badge | shadcn | neutral, primary, success, warning, info, destructive (subtle variants) |
| Card | shadcn | |
| Avatar | shadcn | Initials fallback |
| Separator | shadcn | |
| StatCard | hand-built | Dashboard overview numbers |
| FilterTag | hand-built | A filter in force: its label and a remove button named by a prop · the chips' `radius-pill` on the `secondary` pair · the button 32px, the control height on touch, hovering with `hover-on-muted` ([finding 8](../../architecture/findings/8-the-stress-tests-applied-filter-tag-has-no-component.md)) |
| Logo | hand-built | Masaha's logo (§16), drawn inline on `foreground` and `spark`, so it follows the theme · `form="full"` («مساحة» over "MASAHA") or `"mark"` (the ة with its dots) · named by `label`, in the interface's language, as an image; without one it is decorative, hidden from assistive technology where its name is beside it · sized by its height (`h-10`, `size-9`), its width following the drawing · never mirrored · in the layer as the identity the tokens draw, not a domain concept (§2) |
| Meter | hand-built | A share of a whole as a bar: a `muted` track 12px high, `radius-pill`, filled from the start side in `primary` or `warning` (`tone`) · `kind="meter"` (a measure, such as occupancy) or `"progress"` (a task on its way, such as a photo's upload), with `aria-valuemin/max/now`, an optional `valueText`, and named by `label` · the value kept inside 0…max; the fill's width is set inside the layer, so no page draws a bar |

### `data`

| Component | Source | Notes / variants |
|---|---|---|
| Table + DataTable | shadcn | Sorting, empty state, loading rows; **stacked-card mode on phones** · Table, as in the Owner › Members stress test: a `muted` header row with `caption` headings, `body-sm` rows with `table-row-padding-block` and a `border` divider, the outer cells in line with `card-padding`; a row takes `hover` when hovered and while its row menu is open, never the selected tint · Table has no frame: DataTable frames it as a card · DataTable is TanStack Table v9; features build its columns with `createDataTableColumnHelper`, so they never import the library · a column sorts only when it asks to (`enableSorting`): its header becomes a button with an arrow, hovering with `hover-on-muted` on the muted header row, and `aria-sort` says the order; client-side, or `manualSorting` when the server sorts · from 768px, one card holds the toolbar, the table and a footer with the summary at the start and the pagination at the end; below it there is no frame, and each row is a card drawn from the feature's `renderCard` in a named list, with the pagination under it · `loading` stands placeholder rows or cards in and marks the table busy; `empty` stands in for the rows · `refreshing` keeps the rows or cards shown while another page or filter loads over them, dimmed (`refreshing`) and the table or list marked busy, so a list never blanks between two answers · `cardsBelow="lg"` keeps the cards until 1024px, for the lists the design draws as cards until 1024 (A7: the spaces, users and data-report lists) |
| BarChart | hand-built | Stacked vertical bars on the `chart-1…5` roles (each series names its `tone`), hand-built without a chart library: `md` 200px or `sm` 120px high (`chart-height-*`), a tick under each bar, a legend only for two series or more · the bars are for the eye (`aria-hidden`); a visually hidden table, captioned with the `title`, holds every value of every series as the caller's `format` writes it, its first header the `periodLabel` |
| Heatmap | hand-built | Rows by columns (days by hours), each cell `primary` at one of five steps over `muted` (`heatmap-step-*`), with a legend from `fewer` to `more` · the cells are for the eye; a visually hidden table holds every value, captioned with the `title` and the `unit`, its first header the `dayLabel` |

### `feedback`

| Component | Source | Notes / variants |
|---|---|---|
| Toast | shadcn (Sonner) | Success and error feedback |
| Alert | shadcn | info, warning, destructive |
| Skeleton | shadcn | Loading states |
| EmptyState | hand-built | Icon + title + text + action |
| Spinner | hand-built | |
| Refreshing | hand-built | A wrapper for a list that is not a table, such as a grid of cards, while its next page or filter loads: what it holds stays, dimmed (`refreshing`), and it is marked `aria-busy` ([finding 132](../../architecture/findings/132-a-paged-list-shows-no-sign-of-the-next-page-loading.md)) |

### `overlays`

| Component | Source | Notes / variants |
|---|---|---|
| Dialog, AlertDialog | shadcn | Confirmations (check-out, void a payment, deactivate staff, hide space) |
| Sheet | shadcn | Logical sides: `start` for mobile navigation (where the sidebar sits), `end` for a secondary panel, `bottom` for the phone filter panel (with a handle, which does not drag) · a side sheet takes the whole width below 768 px and three quarters (at most 24 rem) from there on, its body letting its content shrink · a modal dialog by default (a scrim; the focus trapped, then returned to its trigger); non-modal on request (`modal={false}`): no scrim and no trap, the page behind it still used, as the directory's chosen space on a phone |
| Tooltip | shadcn | |
| Popover | shadcn | The floating panel under Combobox and DatePicker, and for features' small panels · on `--z-dropdown`, `rounded-lg`, bordered, `shadow-floating` · a dialog, so it is named by `aria-label` or its title |

### `navigation`

| Component | Source | Notes / variants |
|---|---|---|
| Pagination | shadcn | Words as props · page numbers from `md`, the current one outlined on the page `background`; on a phone, Previous and Next around a summary ("Page 1 of 5"), as in the Owner › Members stress test · a missing step stays in place, marked `aria-disabled` |
| Tabs | shadcn | `default`: pills on a phone (the active one `primary`), a segmented control from `md` (the active one on `card`); a tab that is not active hovers with `hover`, on the `md` track with `hover-on-muted`, as in the Owner › Members stress test · `line`: underlined, for the sections of a page |
| Sidebar | shadcn | Dashboard shell · its form follows the width (§9): expanded from `lg`, an icon rail with tooltips from `md`, a start-side Sheet opened by `SidebarTrigger` on a phone · `SidebarHeader` takes the logo's `mark`, shown on the rail, and its full `logo`, shown expanded and in the drawer · an item hovers with `hover`; the current page keeps `sidebar-accent` under the pointer, with a 3 px `spark` bar at its inline start, clipped by its radius · `SidebarText` holds text beside a mark outside the menu, such as the space switcher's name, kept for assistive technology only on the rail · a menu item's count is shown only, and its `badgeLabel` describes the item · cut down from shadcn's: no stored state, no keyboard shortcut, no rail toggle or submenus |
| Breadcrumb | shadcn | Dashboard sub-pages · named by a `label` prop; separators are `ChevronEndIcon` · ancestors `muted-foreground`, the current page `foreground` at the `label` weight, as in the Owner › Members stress test |

**Not in the layer (built by features from it):** SpaceCard, SpaceMap and markers, OccupancyIndicator, CustomerRow, AnnouncementBanner, VerifiedBadge (a Badge usage).
**Not in the layer (app-level):** theme and language *policy*. The toggles' visual controls are ordinary layer components.

---

## 13. Screens to design (33)

Every screen: phone and desktop, light and dark. Key screens also in LTR (English). States: default, loading (skeleton), empty, error.

The final designs are archived in [docs/design/](../../design/README.md): [SCREENS.md](../../design/SCREENS.md) maps each screen below to its prototype page and screenshots.

### Public site (9)
1. **Home** — hero with search, quick area filters; «الأقرب إليك» when a location is in use, otherwise «مفتوحة الآن»
2. **Directory** — list **or** map (the «قائمة | خريطة» toggle, §9); filters: area, the price (a subscription, «الكل · ساعة · يوم · أسبوع · شهر», then its range), «الدوام» («مفتوحة الآن», «مفتوحة مساءً», «مفتوحة يوم الجمعة») and «أخرى» («المساحات الموثّقة فقط», «أسعار للطلاب»); sort, including «الأقرب إليّ» and, once a subscription is chosen, by its price («الأرخص شهريًا»)
   - **Near me:** the browser's location, rounded on the device to 3 decimals and sent in a header only to sort by distance, never stored or logged (the owner's change, 2026-10-13: it was never sent; [security › Location](../../backend/security.md#location)); distances are straight-line and labelled approximate.
   - A location is **not used** when the permission is denied or unavailable, when it is imprecise (accuracy worse than about 2 km), or when it falls outside the Gaza Strip. The screen then offers choosing an area, or placing a pin by hand on the map.
3. **Space details** — photos, prices (display only), amenities, hours, contact, announcements, live status (available, full or closed now; verified spaces), "last updated" notes, "Are you the owner? Contact us" (unverified), report wrong info
4. **About / Contact** — contact email and WhatsApp
5. **Sign in** — email and password, or Google
6. **Register** — name, email and password
7. **Forgot / reset password** — a reset link by email; lost access to the email → contact Masaha on WhatsApp
8. **404**

33\. **Privacy policy** — what Masaha collects and why, who sees it, how it is protected; linked from the footer and from Register (the owner's decision, 2026-11-04)

### My account (3)
9. **Profile & settings** — name, password (a Google-only account can add one), language, theme; the ways the account signs in, Google and the password (2026-10-29, #132)
10. **Favourites**
11. **My reports** — submitted reports, their status and the resolution note («ردّ إدارة المساحة» or «ردّ فريقنا»)

### Dashboard — owner and reception (13)

**O** = owner only · **O+R** = owner and reception. Navigation follows the user's role at the selected space; who may do what is owned by [ADR 0009](../../architecture/decisions/0009-space-scoped-reception-role.md).

12. **Overview** (O) — needs attention (missing or stale groups, new reports, uncollected visits, a closure awaiting its extension, capacity not set, customers who owe — counts, no amounts, O3), present now / capacity and the live status, subscriptions ending this week, active announcements
13. **Front desk** (O+R) — present now / capacity («الحاضرون الآن 27 / 40»); check in a visitor by name or a customer, with a warning when the space is full; check out with the visit charge and its payment; uncollected visits; set or clear the manual state override
14. **Customers** (O+R) — everyone on file; search; filters: subscription type (monthly, weekly, package, custom, none), status, payment (has debt, settled)
15. **Customer details** (O+R) — subscriptions with their progress and statement, payments, balance or credit, attendance; receive a payment, renew (a warning when a balance is due), end a subscription early
16. **New subscription** (O+R) — from a package or «مخصّص»; limits (date range, total days, days per week, hours per day, total hours); billing (fixed, per hour or per day); price
17. **Payments** (O+R) — the owner sees every payment, filtered by date, staff member and method, and can void one with a reason; reception sees only its own payments today (shift handover)
18. **Announcements** (O+R) — create with type and duration, including a closure notice; the owner can then extend the subscriptions it covered, by the days typed, once
19. **Finance & statistics** (O) — income today, this month (against last month) and all time; total debt; income by month, split into visits and subscriptions; visit income per day; debtors (a WhatsApp reminder link) and payers; collections per staff member; occupancy (peak hours, average stay, charts); CSV export
20. **Space profile** (O) — bilingual fields, map location, hours, capacity, amenities, photos, contact; «المعلومات ما زالت صحيحة» per fact group
21. **Prices & packages** (O) — the published prices (hour, day, week, month, student), which are the public packages, and private packages
22. **Staff** (O) — reception accounts: add by name and email (a temporary password shown once, or an existing account linked), deactivate
23. **Data reports** (O) — users' reports about the space's info; resolve with an optional note
24. **Settings** (O) — auto check-out rule, visit rounding rule; the account card, «حسابي», leading to one's own settings (screen 9) (2026-10-29, #132)

### Admin dashboard (8)
25. **Overview** — spaces verified / unverified, open reports, new users, data completeness
26. **Spaces** — all spaces, filters, add / edit / hide, link owner
27. **Space owners** — create an Owner account or upgrade a user; link to one or more spaces
28. **Data reports** — all reports and their status; resolve those of unverified spaces with an optional note
29. **Users** — search, suspend, change role; issue a temporary password to a user who lost access to their email
30. **Lookups** — areas and amenities, in Arabic and English
31. **Audit log** — the admin's; and the owner's, scoped to the space (O13: the admin's page for one space, in «الفريق والإعدادات»), one screen, not a 33rd (DI1; 2026-10-29, #132)
32. **Settings** — contact email and WhatsApp, default auto check-out, data-staleness threshold

---

## 14. Workflow with Claude Design

1. ✅ **Visual direction (Claude Design).** Use this document as the brief. Explore 2–3 directions on three anchor screens: *Home*, *Space details*, *Owner overview*, each in light and dark, RTL. Choose one direction. **Output:** the palette ramps, semantic role values for both themes, font choice, radius and shadow.
2. ✅ **Lock the tokens.** Write the chosen values into §4–§7 of this document. *(Done: direction 1a Sea, with contrast fixes and a stress test on Sign in, Owner › Members and Admin › Data reports.)*
3. ✅ **Build the layer in code (Claude Code).** Tokens, themes, pre-paint script, the shadcn components from §12 adapted per §11. Push to GitHub.
4. ✅ **Sync into Claude Design.** Import the repository's design system (`/design-sync` from Claude Code, or a GitHub import) so every screen is designed with the real components. *(Done: synced with `/design-sync` into the Claude Design project «Masaha Design System»; the sync's inputs live in `.design-sync/`.)*
5. **Design the 32 screens** (§13) in Claude Design.
6. **Hand off** each area to Claude Code with Claude Design's handoff bundle, and implement.

Steps 3–4 make the design and the code share one design system, so what is designed is what gets built.

---

## 15. Visual decisions

| # | Decision | Status |
|---|---|---|
| 1 | Brand colour and full palette | **Settled** — *ink + berry spark* ([ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md)): the ink `neutral-900` / `neutral-50`, the spark `spark-500` / `spark-400` (§4, §5) |
| 2 | Font family | **Settled** — IBM Plex Sans Arabic (§7) |
| 3 | Radius style and density | **Settled** — soft (8px base) and comfortable (40px controls) (§4, §5) |
| 4 | Icon library | **Settled** — Lucide |
| 5 | Logo / wordmark for «مساحة» / Masaha | **Settled** — the logo (§16) |

*1a Sea*, the first direction, set the type, the radius and the density; its petrol teal gave way to ink + berry ([ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md)). The other directions explored (*1b Dusk*: compact indigo; *1c Ink*: warm monochrome, round) are not carried forward.

---

## 16. The logo

The identity's mark, drawn with ink + berry ([ADR 0019](../../architecture/decisions/0019-ink-and-spark-brand.md)) and settled with it (§15).

- **Forms.** The full logo: «مساحة» over "MASAHA" in the ink, the ة's two dots in the spark. The small mark: the ة with its dots, square. The layer's `Logo` draws both, on `foreground` and `spark`, so it follows the theme (§12).
- **Sizes.** Never under 36 px tall, the smallest the owner reviewed; the small mark from 16 px.
- **Clear space.** 20% of its height on every side: 8 px around the 40 px logo.
- **Never** mirrored (the same drawing in both directions), cropped, stretched, recoloured, or set on a photo without a plain ground.
- **Its name** is «مساحة» / "Masaha" in the interface's language. Where the name is written beside it, the logo is decorative, so the name is read once.
- **The source files**, the owner's: `docs/design/prototype/masaha/logo/` (`*-berry.svg`: the full logo, the mark and the app icon, light and dark).
