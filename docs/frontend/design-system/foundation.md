# Design System — Foundation

_Also the brief given to Claude Design._

> **Status:** Active — structure decided ([ADR 0005](../../architecture/decisions/0005-design-system-approach.md)); visual values **locked** from the Claude Design direction *1a Sea* (§14 Steps 1–2). The layer is **built** (§14 Step 3): the tokens, the layer base (`tokens/`, `lib/cn.ts`, `icons/`, `DirectionProvider`, the showcase; §3) and every §12 component, with the theme and language toggles. The whole showcase was checked in light and dark, RTL and LTR, at 360, 768 and 1280 (WI-9). The layer is **synced** into Claude Design (§14 Step 4).
> **Owner:** Basel Ghoneim
> **Last Updated:** 2026-10-10
> **Audience:** Claude Design (to design every screen), Claude Code and the developer (to build the layer).

This document defines **how** Masaha's Design System is structured, **what** it must cover, and the **values** of its tokens. The values were chosen in Claude Design (direction *1a Sea*, stress-tested on forms, dense tables and menus) and are written here as the single source the layer is built from. A value changes here first, then in code.

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
  index.ts            the public surface
  data.ts             the second entry: the data components that carry a heavy library (DataTable)
  leaflet.css         the map's stylesheet: Leaflet's own, then its frame, controls and pin on the
                      semantic tokens; imported by shared/map only
```

**Categories.** A component's category is its **primary role for the user**: what the user does with it or gets from it, never its form. Each component has exactly one. A component that takes another's form is still classed by its role: Select's list floats, and Sidebar becomes a drawer on a phone, but they are a field and navigation.

| Category | Role | Components |
|---|---|---|
| `actions` | triggers an action | Button · ThemeToggle · LanguageToggle · DropdownMenu |
| `fields` | enters or chooses a value, usually inside a Field | Field · Input · Textarea · Select · Combobox · Checkbox · RadioGroup · Switch · ToggleGroup · Calendar · DatePicker |
| `display` | shows content | Avatar · Badge · Card · StatCard · Separator |
| `data` | shows records in rows and columns | Table · DataTable |
| `feedback` | tells the system's state | Alert · Toast · Skeleton · Spinner · EmptyState |
| `overlays` | holds the caller's content above the page | Dialog · AlertDialog · Sheet · Popover · Tooltip |
| `navigation` | moves between places | Breadcrumb · Tabs · Pagination · Sidebar |

A new component goes in the category of its role: the removable filter tag ([finding 8](../../architecture/findings/8-the-stress-tests-applied-filter-tag-has-no-component.md)) in `display`, charts in `data`. A new category is added only when a role fits none of these.

**Rules:**
- **Public surface:** consumers import from `@shared/design-system`, never from inside a component folder. The one exception is a second entry, `@shared/design-system/data`, for the data components that carry a heavy library (`DataTable`, over TanStack Table): only the pages that draw them import it, so the library stays out of the site's first download, which `check:build` verifies ([finding 45](../../architecture/findings/45-the-data-tables-library-reaches-the-sites-first-download.md)). Lint allows these entries alone.
- **Closure:** the layer imports nothing from outside itself (no features, pages, app, or other `shared/` modules).
- **Class merging:** `cn` (`lib/cn.ts`) joins classes; when two set the same thing, the later wins. It is configured with the layer's text styles and shadows, which tailwind-merge would otherwise misread (`text-body` as a colour, so `cn('text-body', 'text-primary')` would drop it). Every component, copied ones included, merges through it; the layer exports it for pages and features too.
- **shadcn/ui** is configured (`apps/web/components.json`: style `radix-vega`, `rtl: true`, every alias inside the layer) to copy components into `components/`. With `rtl: true` the CLI writes logical classes. The CLI reads the aliases from `apps/web/tsconfig.json`, which repeats `@shared/*` for it. Once copied, a component is ours and follows this contract (§11).
- **Radix primitives, the icon library and variant utilities** (`class-variance-authority`) are imported **only** inside the layer.
- **No CSS files outside the layer.** Pages and features use Tailwind for layout only (grid, flex, gap, spacing, sizing).
- **Stylesheet entry:** `tokens/tailwind.css`. `index.html` links it directly, so it blocks first paint in development as well as in the build. This is the one reference into the layer from outside it; it is a document stylesheet, not a module import.
- **The map's stylesheet** (`leaflet.css`) is the other exception. Leaflet's own stylesheet comes first. Then it gives the map its frame (border, radius, focus outline), its zoom buttons and attribution (the card's colours), and the pin (`.map-pin`, on `primary`), all on the semantic tokens. It also isolates the map, so Leaflet's stacked panes stay under the sticky bar and the overlays. Only `shared/map` imports it, from the part it loads lazily, so it arrives with the map and never in the site's first download ([architecture §6](../architecture.md#6-map)). Lint allows that import alone.

**Enforcement:** ESLint forbids (a) imports into the layer's internals, (b) importing Radix, the icon library, `cva`, Sonner, cmdk, react-day-picker or TanStack Table outside the layer, and (c) the layer importing anything outside itself. `check:classes` forbids (d) arbitrary-value classes outside the layer; palette classes do not exist, because the Tailwind palette is reset. A test checks theme key parity (§6).

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
| **Primitive** | Raw scales with no meaning: palette ramps (`brand-50…950`, `neutral-50…950`, `green-*`, `amber-*`, `red-*`, `blue-*`), radius scale, shadow scale | Only `semantic.css` |
| **Semantic** | Roles with meaning, resolved per theme | Components, and pages/features for colour needs |
| **Component** | Optional, derived from semantic; only when a component needs a value no role covers | That component only |

**Binding rule:** use the semantic role where one exists; otherwise the primitive scale inside the layer; never a literal.

**Coincidence is not identity:** two roles that happen to share a value in one theme stay separate if they mean different things.

### Primitive palette (locked — *Sea*)

Brand is a petrol teal; neutrals are cool greys with a slight teal cast. Short names used in the tables below: `b` brand, `n` neutral, `g` green, `a` amber, `r` red, `i` blue.

| Ramp | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `brand` | #EAFBFC | #D5F4F5 | #B3E6E8 | #85D0D4 | #50B3B8 | #15959B | **#02787D** | #096165 | #05494C | #023235 | #001D1F |
| `neutral` | #F4FCFE | #EAF5F7 | #DBE6E9 | #C7D1D4 | #9DA7A9 | #747E80 | #5C6567 | #464F51 | #2A3234 | #182022 | #0C1315 |
| `green` | #ECFCEF | #D9F5DF | #BAE8C5 | #90D3A2 | #63B77C | #39995B | #137D41 | #026732 | #034D25 | #013517 | #001F0A |
| `amber` | #FFF5EA | #FFE9CF | #FBD3A2 | #EEB56C | #D6912B | #B27406 | #905C01 | #754B04 | #593700 | #3E2500 | #261400 |
| `red` | #FEF4F3 | #FDE7E4 | #FFCDC8 | #FEA69E | #FC6E68 | #DE4544 | #BE222A | #A20419 | #7C0110 | #580007 | #370003 |
| `blue` | #F1F8FE | #E0EFFF | #C0DEFF | #90C6FE | #64A6E9 | #3E87CE | #1F6CB0 | #075796 | #004174 | #002C52 | #001934 |

`brand-600` is the brand colour. Plus `white` (#FFFFFF).

### Component tokens (locked)

| Token | Value | Used by |
|---|---|---|
| `card-border` | light `n-200` (= `border`) · dark `n-700` | Card, table container, panels, the outline Button — dark cards have no shadow, so the border carries the edge |
| `control-height` | 40px · **44px on touch** (`pointer: coarse`) | Button, Input, Select, Checkbox row |
| `control-text-size` | 15px (`body`) · **16px on touch** | The value typed or chosen in Input, Textarea and the Select trigger, with `body`'s line height. iOS Safari zooms the page into a focused input whose text is under 16px |
| `button-padding-inline` | 16px | Button |
| `card-padding` | 20px | Card, StatCard |
| `table-row-padding-block` | 14px | Table |
| `radius-control` | 6px (`radius-md`) | Button, Input, Select |
| `radius-pill` | 999px | Badge, filter chips |
| `overlay-scrim` | light `n-950` at 50% · dark `n-950` at 70% (mixed with transparent), no blur | The scrim behind Dialog, AlertDialog and Sheet, on the `overlay` layer. No role covers a translucent dimming layer |

**Layout is not tokenised.** Pages use Tailwind's 4px scale; *Sea*'s rhythm maps to it: page gutter 32px (`8`; 16px on phones), grid gap 16px (`4`) / 24px (`6`), section spacing 56px (`14`), home hero padding 64px (`16`). These are guidance for page composition, not layer tokens.

---

## 5. Semantic roles

Names follow shadcn/ui's convention so copied components work unchanged, plus Masaha's additions. Every role with a surface has a matching `-foreground`.

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

### Actions
| Role | Purpose |
|---|---|
| `primary` / `primary-foreground` | Main action, links, selected state, the brand accent |
| `secondary` / `secondary-foreground` | Secondary actions |
| `accent` / `accent-foreground` | Hover and highlighted rows or items |
| `destructive` / `destructive-foreground` | Delete, deactivate, errors |

### Status (Masaha additions)
| Role | Purpose | Domain uses (decided by features, not the layer) |
|---|---|---|
| `success` / `success-foreground` | Positive state | Available now, active subscription, paid, verified |
| `warning` / `warning-foreground` | Attention | Subscription ending soon, partly paid, possibly outdated data |
| `info` / `info-foreground` | Neutral notice | Announcements, tips |
| `destructive` (above) | Negative state | Space full, expired subscription, unpaid, errors |

Each status also needs a **subtle** surface for badges and alerts (`success-subtle`, `warning-subtle`, `info-subtle`, `destructive-subtle`) with text that meets AA on it.

### Dashboard shell
`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` — as in shadcn's Sidebar component.

### Data visualisation
`chart-1` … `chart-5` — for finance and statistics (income by month, visits and subscriptions; occupancy by hour and by day).

### Values (locked — *Sea*)

| Role | Light | Dark |
|---|---|---|
| `background` / `foreground` | n-50 / n-900 | n-950 / n-50 |
| `card` / `card-foreground` | white / n-900 | n-900 / n-50 |
| `popover` / `popover-foreground` | white / n-900 | n-900 / n-50 |
| `muted` / `muted-foreground` | n-100 / n-600 | n-800 / n-400 |
| `border` | n-200 | n-800 |
| `input` | n-500 | n-500 |
| `ring` | b-500 | b-400 |
| `primary` / `primary-foreground` | b-600 / white | b-400 / b-950 |
| `secondary` / `secondary-foreground` | n-100 / n-900 | n-800 / n-100 |
| `accent` / `accent-foreground` | b-50 / b-800 | b-900 / b-100 |
| `destructive` / `-foreground` | r-600 / white | r-400 / r-950 |
| `destructive-subtle` / `-foreground` | r-50 / r-800 | r-950 / r-200 |
| `success` / `-foreground` | g-600 / white | g-400 / g-950 |
| `success-subtle` / `-foreground` | g-50 / g-800 | g-950 / g-200 |
| `warning` / `-foreground` | a-500 / a-950 | a-400 / a-950 |
| `warning-subtle` / `-foreground` | a-50 / a-800 | a-950 / a-200 |
| `info` / `-foreground` | i-600 / white | i-400 / i-950 |
| `info-subtle` / `-foreground` | i-50 / i-800 | i-950 / i-200 |
| `sidebar` / `sidebar-foreground` | white / n-700 | n-900 / n-300 |
| `sidebar-primary` / `-foreground` | b-600 / white | b-400 / b-950 |
| `sidebar-accent` / `-foreground` | b-50 / b-800 | n-800 / n-50 |
| `sidebar-border` / `sidebar-ring` | n-200 / b-500 | n-800 / b-400 |
| `chart-1` … `chart-5` | b-600 · i-600 · a-500 · g-500 · n-500 | b-400 · i-400 · a-400 · g-400 · n-500 |

**Verified:** every `-foreground` on its surface, and `muted-foreground`, `primary`, `destructive`, `success` and `info` as text on `background`, `card` and `muted`, and `foreground` and `muted-foreground` on `accent` (a highlighted table row), meet 4.5:1 in both themes. `input`, `ring`, every `chart-*` and the status fills meet 3:1 against `background` and `card`. The layer's contrast test re-checks these pairs.

**Usage rules the values depend on:**
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
- **A hover never fades a fill.** A filled variant's hover mixes the fill toward the foreground (`hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_12%)]`), which raises its label's contrast in both themes; `bg-primary/90` drops the light theme's white label below AA. Outline and ghost hovers use `accent`.
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
| Button | shadcn | primary, secondary, outline, ghost, destructive, link · sizes sm/md/lg/icon · loading state · `aria-disabled` (waiting, kept in the focus order) looks disabled |
| DropdownMenu | shadcn | Row actions, account menu · a `destructive` item variant; checkbox and radio items; a submenu toward the end side |

### `fields`

| Component | Source | Notes / variants |
|---|---|---|
| Input, Textarea | shadcn | with error state; `dir` prop for LTR values; Input holds start and end icons and a button (`InputAction`) inside its box |
| Field | hand-built | Label + control + helper + error, wiring ids and `aria-describedby`; an end slot on the label row; shown disabled with its control |
| Select / Combobox | shadcn | Area filter, amenity filter (multi-select) · Combobox is a Popover holding cmdk's search and list (shadcn's current `combobox` is built on Base UI, which the layer does not use): `single` closes on a choice, `multiple` stays open · its trigger is drawn like Select's and shows the caller's summary («الحالة: 2 محدّدة»); outside a Field that text names it; `empty` shows a placeholder muted, as on DatePicker's trigger · the search, list and empty text are props (cmdk's default list label is replaced); the search row shows its focus by its divider turning `ring`, not an outline · a chosen option is `aria-checked` with a check at its end, because cmdk keeps `aria-selected` for the highlighted one |
| Checkbox, RadioGroup, Switch | shadcn | Switch: `aria-disabled` (waiting, kept in the focus order) looks disabled |
| Calendar / DatePicker | shadcn | Subscription start and end dates; report periods · one date or a range · `lang` sets the month and day names, from react-day-picker's locales (never date-fns directly): Gregorian with Western digits, the week from Saturday in Arabic and Sunday in English · arrow keys follow the direction, and the month buttons are `ChevronStartIcon` and `ChevronEndIcon` · no built-in words: the month buttons' names are props, a day is named by its date alone, and today and the chosen day are `aria-current` and `aria-selected` · 36px days, 44px on touch; chosen days on `primary`, the inside of a range on `accent` · DatePicker is a Popover with a calendar-icon trigger showing the caller's formatted text; formatting stays with the app ([localisation.md](../localisation.md)) |
| ToggleGroup (filter chips) | shadcn | Filter chips, as in the Admin › Data reports phone filter sheet: `radius-pill`, 36px (the control height on touch), edged with `input`; when on, the `accent` pair, a `primary` edge and a check at the start · `multiple` (any number on) or `single` · arrow keys follow the direction · inside a Field, named by its label ([finding 7](../../architecture/findings/7-the-stress-tests-filter-chips-have-no-component.md)) |

### `display`

| Component | Source | Notes / variants |
|---|---|---|
| Badge | shadcn | neutral, primary, success, warning, info, destructive (subtle variants) |
| Card | shadcn | |
| Avatar | shadcn | Initials fallback |
| Separator | shadcn | |
| StatCard | hand-built | Dashboard overview numbers |

### `data`

| Component | Source | Notes / variants |
|---|---|---|
| Table + DataTable | shadcn | Sorting, empty state, loading rows; **stacked-card mode on phones** · Table, as in the Owner › Members stress test: a `muted` header row with `caption` headings, `body-sm` rows with `table-row-padding-block` and a `border` divider, the outer cells in line with `card-padding`; a row takes `accent` when hovered and while its row menu is open · Table has no frame: DataTable frames it as a card · DataTable is TanStack Table v9; features build its columns with `createDataTableColumnHelper`, so they never import the library · a column sorts only when it asks to (`enableSorting`): its header becomes a button with an arrow, and `aria-sort` says the order; client-side, or `manualSorting` when the server sorts · from 768px, one card holds the toolbar, the table and a footer with the summary at the start and the pagination at the end; below it there is no frame, and each row is a card drawn from the feature's `renderCard` in a named list, with the pagination under it · `loading` stands placeholder rows or cards in and marks the table busy; `empty` stands in for the rows |

### `feedback`

| Component | Source | Notes / variants |
|---|---|---|
| Toast | shadcn (Sonner) | Success and error feedback |
| Alert | shadcn | info, warning, destructive |
| Skeleton | shadcn | Loading states |
| EmptyState | hand-built | Icon + title + text + action |
| Spinner | hand-built | |

### `overlays`

| Component | Source | Notes / variants |
|---|---|---|
| Dialog, AlertDialog | shadcn | Confirmations (check-out, void a payment, deactivate staff, hide space) |
| Sheet | shadcn | Logical sides: `start` for mobile navigation (where the sidebar sits), `end` for a secondary panel, `bottom` for the phone filter panel (with a handle, which does not drag) |
| Tooltip | shadcn | |
| Popover | shadcn | The floating panel under Combobox and DatePicker, and for features' small panels · on `--z-dropdown`, `rounded-lg`, bordered, `shadow-floating` · a dialog, so it is named by `aria-label` or its title |

### `navigation`

| Component | Source | Notes / variants |
|---|---|---|
| Pagination | shadcn | Words as props · page numbers from `md`, the current one outlined on the page `background`; on a phone, Previous and Next around a summary ("Page 1 of 5"), as in the Owner › Members stress test · a missing step stays in place, marked `aria-disabled` |
| Tabs | shadcn | `default`: pills on a phone (the active one `primary`), a segmented control from `md` (the active one on `card`), as in the Owner › Members stress test · `line`: underlined, for the sections of a page |
| Sidebar | shadcn | Dashboard shell · its form follows the width (§9): expanded from `lg`, an icon rail with tooltips from `md`, a start-side Sheet opened by `SidebarTrigger` on a phone · `SidebarText` holds text beside a mark outside the menu, such as the space switcher's name, kept for assistive technology only on the rail · a menu item's count is shown only, and its `badgeLabel` describes the item · cut down from shadcn's: no stored state, no keyboard shortcut, no rail toggle or submenus |
| Breadcrumb | shadcn | Dashboard sub-pages · named by a `label` prop; separators are `ChevronEndIcon` · ancestors `muted-foreground`, the current page `foreground` at the `label` weight, as in the Owner › Members stress test |

**Not in the layer (built by features from it):** SpaceCard, SpaceMap and markers, OccupancyIndicator, CustomerRow, AnnouncementBanner, VerifiedBadge (a Badge usage).
**Not in the layer (app-level):** theme and language *policy*. The toggles' visual controls are ordinary layer components.

---

## 13. Screens to design (32)

Every screen: phone and desktop, light and dark. Key screens also in LTR (English). States: default, loading (skeleton), empty, error.

The final designs are archived in [docs/design/](../../design/README.md): [SCREENS.md](../../design/SCREENS.md) maps each screen below to its prototype page and screenshots.

### Public site (8)
1. **Home** — hero with search, quick area filters; «الأقرب إليك» when a location is in use, otherwise «متاحة الآن»
2. **Directory** — list **or** map (the «قائمة | خريطة» toggle, §9); filters: area, price range, amenities (only the ones that tell spaces apart, not Internet or stable power), an "Other" group («أسعار للطلاب», «مفتوحة يوم الجمعة»), verified only, available now; sort, including «الأقرب إليّ»
   - **Near me:** the browser's location, used on the device and never sent to the API; distances are straight-line and labelled approximate.
   - A location is **not used** when the permission is denied or unavailable, when it is imprecise (accuracy worse than about 2 km), or when it falls outside the Gaza Strip. The screen then offers choosing an area, or placing a pin by hand on the map.
3. **Space details** — photos, prices (display only), amenities, hours, contact, announcements, live status (available, full or closed now; verified spaces), "last updated" notes, "Are you the owner? Contact us" (unverified), report wrong info
4. **About / Contact** — contact email and WhatsApp
5. **Sign in** — email and password, or Google
6. **Register** — name, email and password
7. **Forgot / reset password** — a reset link by email; lost access to the email → contact Masaha on WhatsApp
8. **404**

### My account (3)
9. **Profile & settings** — name, password (a Google-only account can add one), language, theme
10. **Favourites**
11. **My reports** — submitted reports, their status and the resolution note («ردّ إدارة المساحة» or «ردّ فريق مساحة»)

### Dashboard — owner and reception (13)

**O** = owner only · **O+R** = owner and reception. Navigation follows the user's role at the selected space; who may do what is owned by [ADR 0009](../../architecture/decisions/0009-space-scoped-reception-role.md).

12. **Overview** (O) — present now / capacity and the live status, income today and this month, total debt, subscriptions ending this week, active announcements, new reports
13. **Front desk** (O+R) — present now / capacity («الحاضرون الآن 27 / 40»); check in a visitor by name or a customer, with a warning when the space is full; check out with the visit charge and its payment; uncollected visits; set or clear the manual state override
14. **Customers** (O+R) — everyone on file; search; filters: subscription type (monthly, weekly, package, custom, none), status, payment (has debt, settled)
15. **Customer details** (O+R) — subscriptions with their progress and statement, payments, balance or credit, attendance; receive a payment, renew (a warning when a balance is due), end a subscription early
16. **New subscription** (O+R) — from a package or «مخصّص»; limits (date range, total days, days per week, hours per day, total hours); billing (fixed, per hour or per day); price
17. **Payments** (O+R) — the owner sees every payment, filtered by date, staff member and method, and can void one with a reason; reception sees only its own payments today (shift handover)
18. **Announcements** (O+R) — create with type and duration, including a closure notice; the owner can then extend all active subscriptions by the closure days
19. **Finance & statistics** (O) — income today, this month (against last month) and all time; total debt; income by month, split into visits and subscriptions; visit income per day; debtors (a WhatsApp reminder link) and payers; collections per staff member; occupancy (peak hours, average stay, charts); CSV export
20. **Space profile** (O) — bilingual fields, map location, hours, capacity, amenities, photos, contact; «المعلومات ما زالت صحيحة» per fact group
21. **Prices & packages** (O) — the published prices (hour, day, week, month, student), which are the public packages, and private packages
22. **Staff** (O) — reception accounts: add by name and email (a temporary password shown once, or an existing account linked), deactivate
23. **Data reports** (O) — users' reports about the space's info; resolve with an optional note
24. **Settings** (O) — auto check-out rule, visit rounding rule, account

### Admin dashboard (8)
25. **Overview** — spaces verified / unverified, open reports, new users, data completeness
26. **Spaces** — all spaces, filters, add / edit / hide, link owner
27. **Space owners** — create an Owner account or upgrade a user; link to one or more spaces
28. **Data reports** — all reports and their status; resolve those of unverified spaces with an optional note
29. **Users** — search, suspend, change role; issue a temporary password to a user who lost access to their email
30. **Lookups** — areas and amenities, in Arabic and English
31. **Audit log**
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
| 1 | Brand colour and full palette | **Settled** — *Sea*, petrol teal `brand-600` (§4, §5) |
| 2 | Font family | **Settled** — IBM Plex Sans Arabic (§7) |
| 3 | Radius style and density | **Settled** — soft (8px base) and comfortable (40px controls) (§4, §5) |
| 4 | Icon library | **Settled** — Lucide |
| 5 | Logo / wordmark for «مساحة» / Masaha | **Open** — the directions used a placeholder mark; decided during Step 5 |

The other directions explored (*1b Dusk*: compact indigo; *1c Ink*: warm monochrome, round) are not carried forward.
