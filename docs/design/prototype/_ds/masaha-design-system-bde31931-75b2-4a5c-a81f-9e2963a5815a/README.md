# Masaha design system — how to build with it

Masaha (مساحة) is a bilingual coworking-space platform for the Gaza Strip. **Arabic, right to left, is the primary language**; English is left to right. Calm, practical, no decoration.

## Setup (without it, nothing is styled)

The tokens resolve only under `data-theme`, and the font only under `lang`. Menus and dialogs render into `<body>`, so set all three on `<html>`, and wrap the React tree in `DirectionProvider` with the same direction:

```html
<html lang="ar" dir="rtl" data-theme="light">  <!-- dark: data-theme="dark"; English: lang="en" dir="ltr" -->
```

```jsx
const { DirectionProvider, Toaster } = window.MasahaDesignSystem;
<DirectionProvider dir="rtl">
  {page}
  <Toaster label="الإشعارات" closeLabel="إغلاق الإشعار" />  {/* only if you call toast() */}
</DirectionProvider>
```

## Styling: Tailwind utilities on semantic tokens only

Compose layout with Tailwind classes. The palette is reset: `bg-blue-500`, `text-sm` and `shadow-md` do not exist, and arbitrary values (`text-[13px]`, `bg-[#fff]`) are not used. Never add `dark:` classes: the tokens switch with `data-theme`.

| Family | Classes |
|---|---|
| Surfaces | `bg-background` (page) · `bg-card` · `bg-popover` · `bg-muted` · `bg-accent` (hover, selected row) · `bg-sidebar` |
| Text | `text-foreground` · `text-muted-foreground` (meta, captions) · `text-primary` (links, brand) · each surface's `text-*-foreground` |
| Actions | `bg-primary text-primary-foreground` · `bg-secondary text-secondary-foreground` · `bg-destructive text-destructive-foreground` |
| Status | fill + text pairs: `bg-success-subtle text-success-subtle-foreground` (also `warning-`, `info-`, `destructive-`); solid `bg-success` / `bg-warning` / `bg-info` for fills and icons. Warning is never text on its own |
| Edges | `border border-border` · `border-input` (controls) · `divide-y` |
| Text styles | `text-display` (hero) · `text-heading-1` (page) · `text-heading-2` (section) · `text-heading-3` (card) · `text-body` · `text-body-sm` (dense) · `text-label` · `text-caption`. Each sets size, line height and weight; don't add `font-*` or `leading-*` |
| Radius · elevation | `rounded-sm/md/lg/xl/full` · `shadow-raised` (cards) · `shadow-floating` (menus) · `shadow-overlay` (dialogs) |
| Charts | `bg-chart-1` … `bg-chart-5` |

**Logical sides only**, so a layout works in both directions: `ps-/pe-/ms-/me-`, `start-0/end-0`, `text-start/text-end`, `border-s/border-e`. Never `pl-`, `ml-`, `left-` or `text-left`. Spacing is Tailwind's 4px scale: page gutter `px-4 md:px-8`, grid gap `gap-4`/`gap-6`, section spacing `gap-14`. Breakpoints: `md` 768 (tablet), `lg` 1024 (desktop); design phone first.

## Content rules

- **Components hold no words.** Every visible or assistive string is a prop: `DialogContent closeLabel`, `SheetContent closeLabel` and `side` (`start`/`end`/`bottom`), `Pagination label`, `Breadcrumb label`, `Sidebar label`, `DataTable label`, `Spinner label`. Supply them in the page's language.
- Status is never colour alone: a `Badge` always carries its word («نشط», «منتهية»).
- Phone numbers, emails, prices and times render `dir="ltr"` inside Arabic text. Digits are Western (0–9).
- Icons are components on the same global (`SearchIcon`, `UsersIcon`, `CalendarIcon` …). Directional ones are named by reading direction and mirror by themselves: `ChevronStartIcon`/`ChevronEndIcon`, `ArrowStartIcon`/`ArrowEndIcon`, `LogInIcon`/`LogOutIcon`.
- Compound parts are exported flat: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` (the same pattern for `Dialog*`, `Sheet*`, `DropdownMenu*`, `Select*`, `Tabs*`, `Table*`, `Sidebar*`, `Pagination*`, `Breadcrumb*`). Each component's `.prompt.md` shows its parts composed.

## Where the truth is

`styles.css` imports `_ds_bundle.css`: the compiled tokens (`--background`, `--primary`, `--type-body-size` …) and every utility above. Before using a component, read `components/general/<Name>/<Name>.prompt.md` (its examples are the real usage) and `<Name>.d.ts`.

## Example

```jsx
const { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, Button, Badge, StatCard, UsersIcon } = window.MasahaDesignSystem;

<main className="flex flex-col gap-6 px-4 py-6 md:px-8">
  <h1 className="text-heading-1">نظرة على المساحة</h1>
  <div className="grid gap-4 md:grid-cols-3">
    <StatCard label="حاضرون الآن" value="7 / 40" helper="من المقاعد المتاحة" icon={<UsersIcon />} />
  </div>
  <Card>
    <CardHeader>
      <CardTitle>ساعات العمل</CardTitle>
      <CardDescription>تظهر في صفحة المساحة العامة</CardDescription>
      <CardAction><Button variant="outline" size="sm">تعديل</Button></CardAction>
    </CardHeader>
    <CardContent className="flex items-center gap-3">
      من السبت إلى الخميس <Badge variant="success">مفتوحة الآن</Badge>
    </CardContent>
  </Card>
</main>
```

# MasahaDesignSystem (@masaha/design-system@0.0.0)

This design system is the published @masaha/design-system React library, bundled as a single
browser global. All 36 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.MasahaDesignSystem`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.MasahaDesignSystem.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Alert } = window.MasahaDesignSystem;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Alert />);
```

Wrap the tree in the provider — most components read theme/i18n from context:

```jsx
<DirectionProvider dir={"rtl"}>{children}</DirectionProvider>
```

## Tokens

262 CSS custom properties from @masaha/design-system. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (9): `--control-text-size`, `--tw-border-style`, `--tw-shadow-color`, …
- **spacing** (9): `--tw-space-y-reverse`, `--tw-space-x-reverse`, `--button-padding-inline`, …
- **typography** (26): `--font-sans`, `--font-mono`, `--font-weight-normal`, …
- **radius** (10): `--radius-md`, `--cell-radius`, `--radius-scale-sm`, …
- **shadow** (16): `--tw-shadow`, `--tw-ring-shadow`, `--shadow-scale-none`, …
- **other** (192): `--spacing`, `--container-xs`, `--container-sm`, …

## Components

### general
- `Alert` — A notice inside the page: information, a warning, or an error. A destructive alert interrupts
- `AlertDialog` — A confirmation that must be answered: check a member out, deactivate a member, hide a space. Unlike
- `Avatar` — A person's picture, or their initials until it loads or when there is none. Compose it from
- `Badge` — A short label for a state or a category, such as a membership's status.
- `Breadcrumb` — The path to a dashboard sub-page: each ancestor is a link, and the current page ends the trail.
- `Button`
- `Calendar` — A month of days to choose from: one date (modesingle) or a range (moderange). The
- `Card` — A raised surface for one piece of content. Compose it from the parts below.
- `Checkbox` — A checkbox. In a horizontal Field its label follows it and toggles it, and the row is the touch
- `Combobox` — A choice from a list that can be searched, such as the area or amenity filters. Compose it from
- `DataTable` — A list of records: a table from 768px, framed as a card with its toolbar and pagination, and a
- `DatePicker` — A date or a range chosen from a Calendar in a Popover: membership dates, report filters. Compose
- `Dialog` — A modal window for a short task that needs the user's attention before they go on. It traps the
- `DropdownMenu` — A menu of actions opened from a button: row actions, the account menu. Arrow keys move through
- `EmptyState` — What a list or page shows when it has nothing to show: an icon, a title, a line of text and the
- `Field` — A label, its control, and the helper and error text that describe the control. The Field owns the
- `Input` — A single-line text control. Inside a Field it takes the Field's label, descriptions and error.
- `LanguageToggle` — A button that offers the other language by its own name. The name is marked with its language
- `Pagination` — Moves between the pages of a list. From the tablet up it shows the page numbers, as in the
- `Popover` — A small floating panel opened from a button: the base of Combobox and DatePicker, and of any
- `RadioGroup` — A set of options with one chosen. Arrow keys move the choice, following the reading direction.
- `Select` — A choice of one value from a list. Compose it from the parts below.
- `Separator` — A line between content. It is decorative by default, so assistive technology skips it with
- `Sheet` — A panel that slides over the page: from the start side for navigation (where the dashboard
- `Sidebar`
- `Skeleton` — A placeholder in the shape of content that is loading. It is hidden from assistive technology:
- `Spinner` — Shows that something is loading. It turns only when motion is allowed.
- `StatCard` — One number on a dashboard overview, with its label. The label and value are a term and its
- `Switch` — An on/off setting that applies at once. The thumb starts at the start side and slides toward the
- `Table` — A table of records, as in the Owner  Members stress test: a muted header row, dense rows with a
- `Tabs` — Switches between views of one place: a status filter over a list, or the sections of a page. The
- `Textarea` — A multi-line text control that grows with its content. Inside a Field it takes the Field's label,
- `ThemeToggle` — An icon button that switches between the light and dark themes, showing the one it switches to.
- `ToggleGroup` — A set of filter chips, as in the Admin  Data reports filter sheet. With typemultiple any
- `Tooltip` — A short hint shown when its trigger is hovered or focused. It only supplements: touch screens

### toast
- `Toaster` — Where toasts appear. Mount one per page shell and raise toasts with toast(),
