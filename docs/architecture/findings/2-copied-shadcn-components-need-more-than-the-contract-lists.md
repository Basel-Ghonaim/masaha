# 2. Copied shadcn components need more than the contract lists

**Status:** Resolved · **Date:** 2026-09-27

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

**Resolution (2026-09-27):** settled with the first copies (Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch), and written into foundation §11 *Adapting the CLI's output*:
1. Each copy imports the layer's `lib/cn`; the `cn` package is not installed.
2. The four state variants in use (`data-checked`, `data-unchecked`, `data-open`, `data-closed`) are declared in `tokens/tailwind.css` over Radix's `data-state`; `shadcn/tailwind.css` is not loaded.
3. Default-scale classes are mapped to the text styles, shadows, radii, component tokens and named layers, by the table in §11.
4. Each copy lives in `components/<Name>/` with its own `index.ts`.
