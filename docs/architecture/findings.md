# Findings

> **Status:** Active · **Owner:** Basel Ghoneim
> **Authority:** Recorded divergences between the intended design and reality. A finding records a problem; it does not schedule work. An ADR records a decision; an Issue (when the owner creates one) tracks a task.

Each entry: number, title, status (`Open` / `Resolved` / `Accepted`), date, evidence, and what would resolve it. Numbers are never reused.

## 1. Overlays: the scrim has no token, and floating content shares the dropdown layer

**Status:** Open · **Date:** 2026-09-26

**Evidence:**
1. `tokens/tailwind.css` resets Tailwind's `--color-*` so only the semantic roles exist. That also removes `black`, so shadcn's overlay class `bg-black/50` generates nothing. No semantic role covers the Dialog and Sheet overlay, the dimming scrim behind a modal.
2. Foundation §5 gives the z-index layers values but does not say which components use them. Tooltip, Popover and Select are portalled to `<body>` like menus. They use the `dropdown` layer (`--z-dropdown`, above `modal`), so one opened from a dialog appears over it.

**Resolves when:**
1. When Dialog and Sheet are built, a component token for the scrim is added. For example, `--overlay-scrim`, resolved per theme in `semantic.css` and written into foundation §4 first. The overlays bind that token.
2. Tooltip, Popover and Select bind `--z-dropdown` when they are built.

## 2. Copied shadcn components need more than the contract lists

**Status:** Open · **Date:** 2026-09-27

**Evidence:** `npx shadcn@4.21.0 add dialog --dry-run` (and `breadcrumb`), run with the layer's `components.json` (style `radix-vega`, `rtl: true`). The RTL transform works: physical classes arrive logical (`start-1/2`, `end-4`, `rtl:translate-x-1/2`). Beyond the steps of foundation §11, the output also:
1. Imports `cn` from the `cn` package, ignoring the `utils` alias, and the CLI would install that package. The package's `cn` lacks the layer's text-style and shadow configuration (foundation §3), so it drops `text-body` next to a colour.
2. Uses custom variants (`data-open:`, `data-closed:`) that shadcn defines in `shadcn/tailwind.css`. The layer does not load that file, so these classes generate nothing.
3. Uses classes from Tailwind's default scales, which the layer resets: `text-sm` generates nothing, and `bg-black/10` is finding 1's scrim.
4. Writes flat files (`components/dialog.tsx`), not the `components/<Name>/` folders of foundation §3.

**Resolves when:** the first copied components (WI-5) settle each point:
1. imports rewritten to the layer's `cn`, without installing the `cn` package;
2. the variants defined for the layer, by importing `shadcn/tailwind.css` (the `shadcn` package as a dev dependency) or by declaring the few in use;
3. default-scale classes mapped to the layer's roles and text styles;
4. each file moved into its folder.

Whatever becomes a standing step is added to foundation §11.
