# Design System — Foundation

_Also the brief given to Claude Design._

> **Status:** Active — structure decided ([ADR 0005](../../architecture/decisions/0005-design-system-approach.md)); visual values **locked** from the Claude Design direction *1a Sea* (§14 Steps 1–2). Tokens and the layer base built (`tokens/`, `lib/cn.ts`, `icons/`, `DirectionProvider`, the showcase; §3). Of the §12 components, Button, Field, Input, Textarea, Select, Checkbox, RadioGroup and Switch are built, with the theme and language toggles, and Badge, Card, Separator, Avatar, Skeleton, Spinner, Alert, Tooltip, Toast, EmptyState and StatCard (§12).
> **Owner:** Basel Ghoneim
> **Last Updated:** 2026-09-27
> **Audience:** Claude Design (to design every screen), Claude Code and the developer (to build the layer).

This document defines **how** Masaha's Design System is structured, **what** it must cover, and the **values** of its tokens. The values were chosen in Claude Design (direction *1a Sea*, stress-tested on forms, dense tables and menus) and are written here as the single source the layer is built from. A value changes here first, then in code.

---

## 1. Product context

**Masaha (مساحة)** is a bilingual (Arabic / English) web platform for coworking spaces in the Gaza Strip. It has three areas:

| Area | Who | Purpose |
|---|---|---|
| **Public site** | everyone | Directory of coworking spaces (list + map), space details, live available seats |
| **My account** | User, Owner | Profile, favourites, reports the user submitted |
| **Dashboard** | Owner, Admin | One role-based dashboard: Owner manages their own space(s); Admin manages the platform |

**Roles:** `USER` (freelancer or student looking for a space), `OWNER` (space owner; also does the receptionist's work), `ADMIN` (platform administrator).

**Context that shapes the design:**
- Users are freelancers and students in Gaza. Internet is weak and intermittent, so pages must stay light.
- Arabic is the primary language, and RTL is a first-class direction, not an adaptation.
- Owners manage a daily operation: check-ins, members, announcements. Speed of repeated actions matters more than decoration.
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
    <ComponentName>/  one folder per component (shadcn-sourced or hand-built), own index.ts
  icons/              single wrapper over the icon library + mirroring rule
  lib/cn.ts           class-merge helper (lives inside the layer — the layer imports nothing from outside)
  index.ts            the only public surface
```

**Rules:**
- **Public surface:** consumers import from `@shared/design-system` only, never from inside a component folder.
- **Closure:** the layer imports nothing from outside itself (no features, pages, app, or other `shared/` modules).
- **Class merging:** `cn` (`lib/cn.ts`) joins classes; when two set the same thing, the later wins. It is configured with the layer's text styles and shadows, which tailwind-merge would otherwise misread (`text-body` as a colour, so `cn('text-body', 'text-primary')` would drop it). Every component, copied ones included, merges through it; the layer exports it for pages and features too.
- **shadcn/ui** is configured (`apps/web/components.json`: style `radix-vega`, `rtl: true`, every alias inside the layer) to copy components into `components/`. With `rtl: true` the CLI writes logical classes. The CLI reads the aliases from `apps/web/tsconfig.json`, which repeats `@shared/*` for it. Once copied, a component is ours and follows this contract (§11).
- **Radix primitives, the icon library and variant utilities** (`class-variance-authority`) are imported **only** inside the layer.
- **No CSS files outside the layer.** Pages and features use Tailwind for layout only (grid, flex, gap, spacing, sizing).
- **Stylesheet entry:** `tokens/tailwind.css`. `index.html` links it directly, so it blocks first paint in development as well as in the build. This is the one reference into the layer from outside it; it is a document stylesheet, not a module import.

**Enforcement:** ESLint forbids (a) imports into the layer's internals, (b) importing Radix, the icon library or `cva` outside the layer, and (c) the layer importing anything outside itself. `check:classes` forbids (d) arbitrary-value classes outside the layer; palette classes do not exist, because the Tailwind palette is reset. A test checks theme key parity (§6).

**Showcase:** a development-only page, `/__showcase` (`apps/web/src/pages/showcase/`), shows the layer in either theme and direction, at 360, 768 or 1280 px. The preview sits in an iframe of that width, so breakpoints respond as they would on a device. Each component adds a section in `sections/`; sample text comes from `fixtures.json`, since the page is not user-facing. The build leaves the page out, and `check:build` verifies it.

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
| `success` / `success-foreground` | Positive state | Seats available, active membership, verified |
| `warning` / `warning-foreground` | Attention | Space filling up, membership ending within 7 days, possibly outdated data |
| `info` / `info-foreground` | Neutral notice | Announcements, tips |
| `destructive` (above) | Negative state | Space full, expired membership, errors |

Each status also needs a **subtle** surface for badges and alerts (`success-subtle`, `warning-subtle`, `info-subtle`, `destructive-subtle`) with text that meets AA on it.

### Dashboard shell
`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` — as in shadcn's Sidebar component.

### Data visualisation
`chart-1` … `chart-5` — for the occupancy reports (occupancy by hour and by day).

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

**Verified:** every `-foreground` on its surface, and `muted-foreground`, `primary`, `destructive`, `success` and `info` as text on `background`, `card` and `muted`, meet 4.5:1 in both themes. `input`, `ring`, every `chart-*` and the status fills meet 3:1 against `background` and `card`. The layer's contrast test re-checks these pairs.

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
| Z-index | Named layers | `sticky` 100 · `overlay` 200 · `modal` 300 · `dropdown` 400 · `toast` 500. Dropdown sits above modal: floating content is portalled to `<body>`, and one opened from a dialog must appear over it |
| Motion | 2 durations + 1 easing | 150ms · 250ms · `cubic-bezier(.2, 0, 0, 1)`; off under `prefers-reduced-motion` |

---

## 6. Theming

- **Themes:** `light` and `dark`, each a complete resolution of every semantic key (**key parity**, checked by a test).
- **Mechanism:** `data-theme` on `<html>`. Tailwind's `dark:` variant is redefined to read `[data-theme="dark"]` instead of shadcn's `.dark` class.
- **Pre-paint script:** an inline script in `index.html` sets `data-theme`, `lang` and `dir` before first paint (no flash).
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
| Phone | 360–767px | Single column. Dashboard sidebar becomes a drawer (`Sheet`). Tables become stacked cards. Directory shows list **or** map with a toggle. Filters open in a bottom sheet. |
| Tablet | 768–1023px | Two columns where useful. Sidebar collapses to icons. |
| Desktop | ≥1024px | Full layout: visible sidebar, full tables, directory list and map side by side. |

Tailwind breakpoints: `md` = 768, `lg` = 1024 (defaults).

**Shells:**
- **Public shell:** top header (logo, directory, language switch, theme toggle, sign-in / account menu), content, footer.
- **Dashboard shell:** sidebar (items built from the role), top bar (space switcher for owners with more than one space, language, theme, account menu), content.

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

A copy also needs these steps, which the contract above does not cover ([finding 2](../../architecture/findings.md#2-copied-shadcn-components-need-more-than-the-contract-lists)):

- **Source and place.** Take the source from `npx shadcn add <name> --dry-run --view`, so the CLI never installs a package, and write it to `components/<Name>/<Name>.tsx` beside its `index.ts`. Drop `"use client"`.
- **Merge through the layer's `cn`.** `import { cn } from "cn"` becomes `../../lib/cn`. The `cn` package is never installed: it lacks the text styles and shadows (§3).
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
| `z-50` | the named layer (§5): `z-(--z-dropdown)` for anything portalled beside its trigger (menus, selects, popovers) |
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

| Component | Source | Notes / variants |
|---|---|---|
| Button | shadcn | primary, secondary, outline, ghost, destructive, link · sizes sm/md/lg/icon · loading state |
| Input, Textarea | shadcn | with error state; `dir` prop for LTR values; Input holds start and end icons and a button (`InputAction`) inside its box |
| Field | hand-built | Label + control + helper + error, wiring ids and `aria-describedby`; an end slot on the label row; shown disabled with its control |
| Select / Combobox | shadcn | Area filter, amenity filter (multi-select) |
| Checkbox, RadioGroup, Switch | shadcn | |
| Badge | shadcn | neutral, primary, success, warning, info, destructive (subtle variants) |
| Card | shadcn | |
| Table + DataTable | shadcn | Sorting, empty state, loading rows; **stacked-card mode on phones** |
| Pagination | shadcn | Words as props |
| Dialog, AlertDialog | shadcn | Confirmations (check-out, deactivate member, hide space) |
| Sheet | shadcn | Mobile navigation, filter panel |
| DropdownMenu | shadcn | Row actions, account menu |
| Tabs | shadcn | |
| Tooltip | shadcn | |
| Toast | shadcn (Sonner) | Success and error feedback |
| Alert | shadcn | info, warning, destructive |
| Skeleton | shadcn | Loading states |
| Avatar | shadcn | Initials fallback |
| Separator | shadcn | |
| Calendar / DatePicker | shadcn | Membership start and end dates |
| Sidebar | shadcn | Dashboard shell |
| Breadcrumb | shadcn | Dashboard sub-pages |
| EmptyState | hand-built | Icon + title + text + action |
| StatCard | hand-built | Dashboard overview numbers |
| Spinner | hand-built | |

**Not in the layer (built by features from it):** SpaceCard, SpaceMap and markers, OccupancyIndicator, MemberRow, AnnouncementBanner, VerifiedBadge (a Badge usage).
**Not in the layer (app-level):** theme and language *policy*. The toggles' visual controls are ordinary layer components.

---

## 13. Screens to design (27)

Every screen: phone and desktop, light and dark. Key screens also in LTR (English). States: default, loading (skeleton), empty, error.

### Public site (8)
1. **Home** — hero with search, quick area filters, featured or nearby spaces
2. **Directory** — list + map; filters: area, price range, amenities, verified only, available now; sort
3. **Space details** — photos, prices (display only), amenities, hours, contact, announcements, live available seats (verified spaces), "last updated" notes, "Are you the owner? Contact us" (unverified), report wrong info
4. **About / Contact** — contact email and WhatsApp
5. **Sign in**
6. **Register**
7. **Forgot / reset password**
8. **404**

### My account (3)
9. **Profile & settings** — name, password, language, theme
10. **Favourites**
11. **My reports** — submitted reports and their status

### Owner dashboard (8)
12. **Overview** — present now / capacity, memberships ending this week, active announcements, new reports
13. **Space profile** — bilingual fields, map location, hours, capacity, amenities, prices, photos, contact
14. **Members** — list, search, add / edit / deactivate; status: active, ending soon, expired
15. **Attendance** — present now; check in a member or a daily visitor; check out; history with date filter
16. **Announcements** — create with type and duration
17. **Reports** — occupancy by hour and by day, peak times, average stay (charts)
18. **Data reports** — users' reports about the space's info
19. **Settings** — auto check-out rule, account

### Admin dashboard (8)
20. **Overview** — spaces verified / unverified, open reports, new users, data completeness
21. **Spaces** — all spaces, filters, add / edit / hide, link owner
22. **Space owners** — create an Owner account or upgrade a user; link to one or more spaces
23. **Data reports** — all reports and their status
24. **Users** — search, suspend, change role
25. **Lookups** — areas and amenities, in Arabic and English
26. **Audit log**
27. **Settings** — contact email and WhatsApp, default auto check-out, data-staleness threshold

---

## 14. Workflow with Claude Design

1. ✅ **Visual direction (Claude Design).** Use this document as the brief. Explore 2–3 directions on three anchor screens: *Home*, *Space details*, *Owner overview*, each in light and dark, RTL. Choose one direction. **Output:** the palette ramps, semantic role values for both themes, font choice, radius and shadow.
2. ✅ **Lock the tokens.** Write the chosen values into §4–§7 of this document. *(Done: direction 1a Sea, with contrast fixes and a stress test on Sign in, Owner › Members and Admin › Data reports.)*
3. **Build the layer in code (Claude Code).** Tokens, themes, pre-paint script, the shadcn components from §12 adapted per §11. Push to GitHub.
4. **Sync into Claude Design.** Import the repository's design system (`/design-sync` from Claude Code, or a GitHub import) so every screen is designed with the real components.
5. **Design the 27 screens** (§13) in Claude Design.
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
