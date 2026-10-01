# Design sync notes

Repo-specific knowledge for syncing Masaha's design-system layer (`apps/web/src/shared/design-system/`) into Claude Design with `/design-sync`. Read before every re-sync.

## How the build works here

- **The layer is not a package.** It is source inside the web app: no `dist/`, no `.d.ts` tree, no compiled stylesheet. `node .design-sync/build-pkg.mjs` (the config's `buildCmd`) stages one in `.ds-pkg/` (gitignored): `dist/index.js` re-exports the layer's `index.ts`, `types/` is emitted by `tsc` with the app's own compiler options (`include: []`, so only the public surface's import graph; without it tsc pulls in all of `src/`, fails on `rootDir`, and scatters `.d.ts` files beside the app's sources), `styles.css` is compiled by the Tailwind CLI, and `fonts/` holds the IBM Plex Sans Arabic files it references.
- **Setup order on a fresh clone:** `npm ci` at the root → stage the converter in `.ds-sync/` (skill step 7) and install its deps there: `esbuild ts-morph @types/react @tailwindcss/cli@<repo tailwindcss version> playwright@<version pinning the cached chromium>` → `node .design-sync/build-pkg.mjs` → the converter with `--node-modules ./node_modules --entry .ds-pkg/dist/index.js --out ./ds-bundle`.
- **Stylesheet:** `.design-sync/tailwind-sync.css` imports the app's own `tokens/tailwind.css` unchanged and adds `@source inline(...)` for a fixed utility vocabulary (layout, semantic roles, text styles, radius, elevation), plus `@source './previews'`. The app's build only emits the classes its source uses; designs compose their own layout from the same utilities. It adds no values: every class resolves to the layer's tokens or Tailwind's spacing scale.
- **Document attributes:** the tokens resolve only under `[data-theme]` (`semantic.css`), the font stacks only under `[lang]` (`typography.css`), and menus/dialogs portal to `<body>`. So every preview imports `.design-sync/previews/_document.ts`, which sets `lang="ar" dir="rtl" data-theme="light"` on `<html>` as the app's pre-paint script does. Without it a preview renders unstyled in the browser-default font.
- **Provider:** `DirectionProvider dir="rtl"` (a real layer export) wraps every preview, as `App.tsx` wraps the app.
- **Cards:** the layer exports every compound part flat (`CardHeader`, `DialogContent`, ...). Those, the 30 icons and `DirectionProvider` are excluded from cards with `componentSrcMap: null`; they stay in the bundle and on `window.MasahaDesignSystem`, and the parent's preview examples show them in use. Consequence: parts have no `.d.ts` of their own; their props (`closeLabel`, `side`, `variant` on `TabsList` ...) reach the design agent only through the parent's examples and the conventions header.
- **Groups:** at the first sync every component landed in `general` (the layer had no category folders and no `@category` JSDoc), except `Toaster`, in `toast`: it lived in `components/Toast/`, and its `componentSrcMap` pin (which brings its JSDoc on `toast()` usage into the `.prompt.md`) derived the group from that folder. Since DS-1 the layer groups its components in category folders, `components/<category>/<Name>/` (foundation §3), and the Toaster pin points at `components/feedback/Toast/Toast.tsx`. The next sync is expected to group the cards by those folders; that is unverified until it runs, so check the groups it produces. The grade key is the name, so regrouping orphans nothing.

## Authoring previews

- One `.design-sync/previews/<Name>.tsx` per component; first line `import './_document';`; import from `'@masaha/design-system'` (shimmed to the bundle global).
- Port the showcase section (`apps/web/src/pages/showcase/sections/<Name>Section.tsx`) with the Arabic sample text from `fixtures.json` (`samples.ar`), inlined. Each named export is one card cell; 2-6 per component.
- Overlays render open (`defaultOpen` / `open`) and use `cardMode: "single"`; wide components use `"column"` (config `overrides`). **A single or column card shows `primaryStory` first, else the alphabetically first export** — not the first one in the file. Every multi-export single card sets `primaryStory` to its open state; without it Select's card showed a closed, disabled field.
- Layout glue uses the app's utilities (`flex`, `gap-3`, `max-w-96` ...); `@source './previews'` compiles whatever the previews use. Checking a class with `grep -F` on `_ds_bundle.css`: escape `:` and `/` (`.md\:flex`, `.w-3\/5`).
- `useState` from `'react'` works in previews. A dark cell is a wrapper `<div data-theme="dark">`: the tokens match `[data-theme]` on any element.
- Hold-open tricks that are capture-only (app code should not copy them): `onOpenAutoFocus={(e) => e.preventDefault()}` on Dialog, Sheet and DatePicker content, so the capture shows no focus ring or selected input text (AlertDialog keeps its real focus on Cancel); `SelectContent position="popper"` in the open Select, because the default item-aligned list covers its trigger; a controlled `<DropdownMenuSub open>`, because `defaultOpen` closes when the parent menu takes focus.
- Toaster: `sonner` renders in place, not portalled, and the single-card root has `transform: translateZ(0)`, so fixed toasts position against a zero-height root. The preview wraps it in `<div className="min-h-svh">` and fires the toasts from a `useEffect` with `duration: Infinity`, so the capture catches them.
- Deterministic dates: Calendar and DatePicker pass `today={new Date(2026, 8, 28)}` and a fixed `defaultMonth`; otherwise the "today" marker moves every day and re-grades.
- DataTable `Members` shows 5 of the 8 fixture rows (one per status) with the summary «عرض 1–5 من 38», so the footer fits the 900x700 card. All 8 rows would need `overrides.DataTable.viewport` ≈ `900x900`.
- Not capturable: states driven by the viewport width (Sidebar's tablet rail and phone drawer, DataTable's phone card list, Pagination's phone summary) and animation (Skeleton pulse, Spinner spin); the cards show the desktop form, still.
- Content beyond `fixtures.json`: «مساحة» as a header brand label (ThemeToggle, LanguageToggle), «مجموع المشتركين» (Table footer), two extra member names in Badge (`محمد عوض`, `ليلى النجار`).
- Tooling: long Bash heredocs holding Arabic TSX fail to parse in Git Bash; write preview files with an editor tool instead.
- Windows: stop any `http-serve.mjs` serving `ds-bundle/` before a full build; the open handle makes the build's `rm` of `ds-bundle/` fail with `EPERM`.
- The contact sheets crop each card to its left part; RTL content sits on the right, so a sparse-looking thumbnail is not evidence of a broken card. Screenshot the card itself at its viewport (900x700; Sidebar 1280x800) to judge.

## Known render warns

(none: the first sync's final validate was clean. `[GRID_OVERFLOW]` on Pagination and Tabs was fixed with `cardMode: "column"`.)

## Re-sync risks

- `.design-sync/tailwind-sync.css` imports `tokens/tailwind.css` by path; moving it breaks the build.
- The `Toaster` pin in `config.json` names its source file by path; moving `Toast/` to another category breaks it.
- `@tailwindcss/cli` in `.ds-sync/` must match the repo's `tailwindcss` version; `playwright` must match the cached chromium build (1.60.0 ↔ chromium-1223 on the first sync's machine).
- The preview text is copied from `fixtures.json`; a fixture edit does not update the previews.
- A new component in the layer's `index.ts` becomes a new card automatically, but a new compound part or icon also becomes a (floor) card until it is added to `componentSrcMap` as `null`.
- `.design-sync/conventions.md` names classes, tokens, props and components; rerun its validation (every name against `_ds_bundle.css` and `_ds_bundle.js`) on every sync. A renamed prop (`closeLabel`, `side` …) silently misleads the design agent.
- Graded only in Arabic, RTL, light. Dark and LTR were exercised by one cell each (ThemeToggle `InDarkTheme`, LanguageToggle's English label), not per component.
- The utility vocabulary in `tailwind-sync.css` is fixed; a class a design needs that is not in it (or in the app's source) renders unstyled in Claude Design.
