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
