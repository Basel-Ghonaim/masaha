# Findings

> **Status:** Active · **Owner:** Basel Ghoneim
> **Authority:** Recorded divergences between the intended design and reality. A finding records a problem; it does not schedule work. An ADR records a decision; an Issue (when the owner creates one) tracks a task.

Each entry: number, title, status (`Open` / `Resolved` / `Accepted`), date, evidence, and what would resolve it. Numbers are never reused.

## 1. Overlays: the scrim has no token, and floating content shares the dropdown layer

**Status:** Resolved · **Date:** 2026-09-26

**Evidence:**
1. `tokens/tailwind.css` resets Tailwind's `--color-*` so only the semantic roles exist. That also removes `black`, so shadcn's overlay class `bg-black/50` generates nothing. No semantic role covers the Dialog and Sheet overlay, the dimming scrim behind a modal.
2. Foundation §5 gives the z-index layers values but does not say which components use them. Tooltip, Popover and Select are portalled to `<body>` like menus. They use the `dropdown` layer (`--z-dropdown`, above `modal`), so one opened from a dialog appears over it.

**Resolves when:**
1. When Dialog and Sheet are built, a component token for the scrim is added. For example, `--overlay-scrim`, resolved per theme in `semantic.css` and written into foundation §4 first. The overlays bind that token.
2. Tooltip, Popover and Select bind `--z-dropdown` when they are built. *Select and Tooltip do (2026-09-27); Popover remains.*

*Item 1 done (2026-09-27):* `--overlay-scrim` is a component token in foundation §4 (light `n-950` at 50%, dark at 70%), resolved per theme in `semantic.css`. Dialog and AlertDialog bind it on `--z-overlay`, with their content on `--z-modal`.

**Resolution (2026-09-27):** both items settled in WI-7.
1. Dialog, AlertDialog and Sheet bind `--overlay-scrim` on `--z-overlay`, and their content on `--z-modal`.
2. DropdownMenu, like Select and Tooltip, binds `--z-dropdown`. For Popover, which comes with WI-8, this is now a standing rule rather than open work: foundation §11 maps `z-50` to the named layer for each kind of overlay, and `bg-black/*` to the scrim token. *Popover, built in WI-8 (2026-09-28), binds `--z-dropdown`.*

## 2. Copied shadcn components need more than the contract lists

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

## 3. Classes used only by tests or the showcase reach the production CSS

**Status:** Resolved · **Date:** 2026-09-27

**Evidence:** `tokens/tailwind.css` scans all of `src/` (`source('../../..')`), including test files and `pages/showcase/`. Tailwind generates every class it finds there into the one stylesheet, in development and in the build alike. With the showcase, the built CSS grew from 32.24 kB to 34.62 kB (+0.5 kB gzip). Class strings in tests, such as `cn.unit.test.ts`, are generated too. `check:build` looks for the showcase's route path and text, not class names, so it does not catch this. The built JavaScript holds no showcase code.

**Resolves when:**
1. Test files are left out of scanning with `@source not` in `tailwind.css`.
2. For the showcase, one stylesheet serves both development and the build, so its utilities stay in the build unless the owner decides a different setup is worth it.

**Resolution (2026-09-27):** `tailwind.css` leaves `*.test.{ts,tsx}` out of the scan with `@source not`. The built CSS fell from 34.62 kB to 31.07 kB, and `shadow-none`, used only in `cn.unit.test.ts`, is no longer in it. The showcase's utilities stay in the build, as item 2 decides.

## 4. Showcase sample text can clash with the app's text in `check:build`

**Status:** Resolved · **Date:** 2026-09-27

**Evidence:** `check:build` fails when `dist/` contains any string from the showcase's `fixtures.json`, and relies on fixture strings being phrases that occur nowhere else by chance. The copy catalogues are not built yet. Once they are, a catalogue entry equal to a fixture string will fail `check:build` although no showcase code reached the build. The toolbar's `Light theme` and `Dark theme` are likely catalogue entries for the theme setting. WI-5's samples avoid the app's likely words (the language toggle's sample is "English version", not "English"), but nothing enforces it. It has fired already: WI-7's first Tabs fixtures used values such as `all`, `active` and `details`, and `check:build` found them in the build's CSS and JavaScript, where they occur by chance. The values were renamed (`members-all-tab`).

**Resolves when:** the catalogue mechanism is built, and `check:build` either skips fixture strings that are also catalogue strings, or finds the showcase by what only it carries (its route path, which it already checks) rather than by its text.

*Reviewed (2026-09-28, WI-9):* still open. It is owned by F-4, the localisation mechanism in the [foundation plan](../plans/foundation.md), which builds the catalogues.

**Resolution (2026-09-29, F-4):** the first catalogue strings in the build fired it: glossary terms such as `Expired`, `نشط` and `تسجيل حضور` occur in the fixtures too, and `المساحة` inside `صاحب المساحة`. `check:build` now leaves out any fixture string that the catalogues' source (`src/shared/copy`, tests excluded) also contains, whole or inside a longer line. The route path and every other fixture string still catch a leaked showcase.

## 5. In dark, the destructive badge reads louder than the other status badges

**Status:** Accepted · **Date:** 2026-09-27

**Evidence:** In the dark stress test (Owner › Members), the «منتهية» (expired) badge looks brighter than «نشط» (active) and «ينتهي خلال 3 أيام» (ending in 3 days). The built Badge shows the same thing in the showcase. The values are not the cause:
1. **Values match.** The stress test's fills, sampled from `0-overview.jpg`, match foundation §5's dark subtle surfaces:
   - about `#300000`–`#380000` against `red-950` `#370003`;
   - about `#001808`–`#002008` against `green-950` `#001F0A`;
   - about `#201000`–`#281000` against `amber-950` `#261400`.
   The Badge binds exactly those pairs.
2. **Chroma differs.** The 950 surfaces share one lightness (OKLCH L 0.209–0.212), but `red-950` has much more chroma: C 0.086, against 0.056 (green), 0.046 (amber) and 0.062 (blue). Each fill is barely distinct from the dark page (1.04–1.07:1), so the eye reads the badge by its hue, and red's shows most.
3. **Contrast is not the issue.** Every dark subtle pair is about 12.7:1.

**Resolves when:** the owner chooses one of:
1. **Accept.** Expired is the status that needs action, so the extra salience is acceptable. The finding becomes *Accepted*.
2. **Calm the red.** Give dark `destructive-subtle` a lower-chroma surface: `red-950` with its chroma cut to blue's level (0.062) is `#300A09`; red-200 on it is 12.63:1. That is a new value in foundation §4–§5 first, then in `semantic.css`, where the contrast test re-checks it. Badge, Alert and Toast all bind the role, so all three change.

**Resolution (2026-09-27):** accepted as is, with no token change (option 1). *The status read Resolved until WI-9 (2026-09-28) corrected it to Accepted, as option 1 says.* The badge matches foundation and the stress test; expired is the status that should draw attention; and `#300A09` would be a value outside the red ramp.

## 6. Radix component tests failed once under load

**Status:** Resolved · **Date:** 2026-09-27

**Evidence:** while the checks for the F-1 PR were running, the Switch and RadioGroup component tests failed once and passed on a rerun with no change. Both components are built on Radix and exercised with user-event. The failure was not reproduced, so the cause is unknown; a timing dependence that shows only on a busy machine is the likely kind. A test that can fail without a code change weakens the CI gate: a red run no longer means a regression.

**Resolves when:** WI-7, which adds more Radix components and their tests, investigates the failure: it reproduces it (for example, running the component lane repeatedly or under CPU load), finds the cause, and fixes the tests or the components so the lane is stable. Not fixed in WI-6.

**Resolution (2026-09-27):** a timeout, not a race, and not specific to Radix.
1. **Reproduced.** With 24 busy loops on 12 cores, `Switch › turns on and off when its label is clicked` failed with `Test timed out in 5000ms` (5144 ms); RadioGroup's first test took 5032 ms. No assertion failed and no `act()` warning appeared.
2. **Always the first test in its file.** Unloaded, each file's first test took 2–5× its later ones (Switch 839 ms, then 173, 154, 283 ms), whatever it did.
3. **Cause, from a CPU profile of the test.** jsdom parses its whole default stylesheet the first time `getComputedStyle` runs, and every test file gets a fresh jsdom. `getByRole` with a `name` reaches `getComputedStyle` through each accessible-name check, so the parse, and a cold selector engine, landed inside the file's first test: 214 ms of Switch's 271 ms, which CPU starvation stretched past 5 s.
4. **Fix.** `componentSetup.ts` calls `getComputedStyle` once, so the environment's start-up is paid in setup, before any test. The timeout, retries and the tests are unchanged.
5. **Proof.** Unloaded, the first tests fell to 338 ms (Switch), 330 ms (RadioGroup) and 213 ms (Card, from 1132 ms). Under the same load, 10 consecutive runs of `test:component` passed, the slowest test taking at most 2808 ms.
6. **Second cause, once WI-7's overlays arrived: throughput.** The lane grew from 108 to 167 tests, and the new Dialog, Sheet and DropdownMenu tests are the heaviest in it: focus management, floating-ui positioning and portals, all in jsdom. With one worker per core and 24 busy loops on 12 cores, run 7 of 10 failed: `Dialog › keeps the focus inside while open` took 5173 ms. The profile showed no single hot spot, only dev-mode React rendering, jsdom's computed styles and selector matching. The slow tests were no longer the first in their files. The machine had no headroom left.
7. **Second fix, the owner's choice.** The component project runs on at most half the cores (`maxWorkers: '50%'` in `vite.config.ts`). Isolation stays on, and the timeout and the tests are unchanged. Under the same load, 10 consecutive runs passed 167/167, the slowest test taking at most 3466 ms. With lint, typecheck, build and `test:unit` running beside it, as when the failure was first seen, 3 of 3 runs passed, the slowest test taking at most 1133 ms. Unloaded, the lane takes 37 s. 24 busy loops on 12 cores (about 3× oversubscription) is far harsher than CI, where a runner does one job on its own cores.

## 7. The stress test's filter chips have no component

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** the Admin › Data reports phone stress test (`0-overview.jpg`, the filter bottom sheet) chooses statuses with toggle chips: pill-shaped, several selectable at once, a check and the `accent` pair when selected. Foundation §4 names "filter chips" as a user of `radius-pill`, but §12 lists no component for them, and none of WI-5 to WI-8 builds one. WI-7's showcase shows the filter sheet with checkboxes in their place.

**Resolves when:** WI-8 builds the ToggleGroup (filter chips).

*Decided (2026-09-28):* the owner put a ToggleGroup, on Radix's ToggleGroup from the approved `radix-ui` package, into the layer. It has a foundation §12 row and is in WI-8's scope in the [design-system plan](../plans/historical/design-system-layer.md). The finding stays open until WI-8 builds it.

**Resolution (2026-09-28):** WI-8 built the ToggleGroup, and the showcase's filter sheet chooses statuses with its chips in place of checkboxes. The edges were sampled from `0-overview.jpg` by lightness, since the JPEG blurs a 1px line into its neighbours: `input` off and `primary` on, in both themes. The chips are 36px tall, as in the stress test, and `--control-height` on touch.

## 8. The stress test's applied-filter tag has no component

**Status:** Open · **Date:** 2026-09-28

**Evidence:** Under the filter row, the Admin › Data reports stress test (`5-data-reports-desktop.png`, and the phone screens of `0-overview.jpg`) shows the filters in force as a tag: «الحالة: جديد، قيد المراجعة ×». It is a grey pill with a remove button, beside a «مسح الفلاتر» link. Foundation §12 lists no removable tag. A Badge has no button, and a ToggleGroup chip toggles rather than removes. WI-8 builds the filter row without it: the showcase shows the search, the Combobox triggers and the DatePicker.

**Resolves when:** the owner decides whether the layer gets a removable tag (for example, a Badge with a remove button whose label is a prop, which would take a §12 row), or whether the Data reports page composes one when it is built. The «مسح الفلاتر» link is an ordinary `Button variant="link"` either way.

*Decided (2026-09-28, WI-9):*
- **The component:** the layer gets a removable filter tag, as a layer component with a §12 row.
- **When:** it is built at the start of the data-reports feature slice, step 8 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build).
- **Until then:** the finding stays open, and nothing is built now.

## 9. Every Vitest lane fails when the working directory's drive letter is lowercase

**Status:** Open · **Date:** 2026-09-28

**Evidence:** during WI-9, `test:unit` and `test:component` twice failed every file before any test ran. The unit lane reported `TypeError: Cannot read properties of undefined (reading 'config')` at the file's first `describe`. The component lane reported `Vitest failed to find the current suite`.

The cause is the case of the drive letter in the working directory:
- From `c:\Users\…\masaha` (lowercase), `npm run test:unit -w @masaha/api` fails every file. `test:component` fails all 38 files.
- From `C:\Users\…\masaha`, the same commands pass.
- `lint` and `typecheck` pass either way.

Vitest itself prints the root as `C:/…`, while npm reports the working directory as `c:\…`. The likely mechanism is that the runner and the test files load `vitest` through the two spellings of the path. They then get two module instances, and the test file's `describe` finds no runner state. That mechanism is inferred, not traced.

Shells opened by an editor can start in a lowercase `c:\`, as this session's did at times. So a red lane there may not mean a regression, the harm finding 6 described. CI runs on Linux and is not affected.

**Resolves when:** the lanes pass whatever the drive letter's case. For example, the Vitest configs could normalise the root, or a Vitest release could fix it upstream. Until then, [setup.md](../development/setup.md#commands) says to run the test lanes from a path with an uppercase drive letter.

## 10. The seeded amenity icon keys have no icons in the design system yet

**Status:** Open · **Date:** 2026-09-28

**Evidence:** F-3 seeds eight amenities, each with an `icon` key that the web maps to an icon ([`apps/api/src/db/seed/lookups.ts`](../../apps/api/src/db/seed/lookups.ts)): `wifi`, `zap`, `sun`, `plug-zap`, `coffee`, `users`, `presentation`, `graduation-cap`. They are Lucide names, and Lucide is imported only inside the design-system layer. The layer's icon set (`shared/design-system/icons/iconSet.tsx`) includes none of them yet, so the web has nothing to map these keys to.

**Resolves when:** the directory slice (step 3 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build)) adds these eight keys to the design-system icon set, with the map from key to icon, and the admin's amenity form offers that set.

## 11. Nested writes in an interactive transaction trigger a `pg` deprecation warning

**Status:** Open · **Date:** 2026-09-28

**Evidence:** during F-3, a script that validated the schema against the owner's six reference spaces ran `prisma.$transaction(async (tx) => …)` with nested creates (`space.create` with `hours`, `prices`, `amenities` and `contacts`). Node printed:

> `DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0.`

The writes succeeded and rolled back correctly. The warning comes from Prisma's PostgreSQL adapter (`@prisma/adapter-pg` 7.10 on `pg` 8.23): inside an interactive transaction, all queries share one `pg` client, and the nested creates reach it while another query is still running. The API lane, which uses no interactive transactions yet, prints no such warning.

**Resolves when:** before `pg` is upgraded to 9, either a Prisma release serialises the queries of an interactive transaction, or the features that write nested data in a transaction are proven to work with `pg` 9 (for example, the admin's space creation, the first such feature). Until then, a `pg` major upgrade is not taken without checking this.
