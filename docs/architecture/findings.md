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
- **When:** it is built at the start of the data-reports feature slice, step 10 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build).
- **Until then:** the finding stays open, and nothing is built now.

## 9. Every Vitest lane fails when the working directory's drive letter is lowercase

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** during WI-9, `test:unit` and `test:component` twice failed every file before any test ran. The unit lane reported `TypeError: Cannot read properties of undefined (reading 'config')` at the file's first `describe`. The component lane reported `Vitest failed to find the current suite`.

The cause is the case of the drive letter in the working directory:
- From `c:\Users\…\masaha` (lowercase), `npm run test:unit -w @masaha/api` fails every file. `test:component` fails all 38 files.
- From `C:\Users\…\masaha`, the same commands pass.
- `lint` and `typecheck` pass either way.

Vitest itself prints the root as `C:/…`, while npm reports the working directory as `c:\…`. The likely mechanism is that the runner and the test files load `vitest` through the two spellings of the path. They then get two module instances, and the test file's `describe` finds no runner state. That mechanism is inferred, not traced.

Shells opened by an editor can start in a lowercase `c:\`, as this session's did at times. So a red lane there may not mean a regression, the harm finding 6 described. CI runs on Linux and is not affected.

**Resolves when:** the lanes pass whatever the drive letter's case. For example, the Vitest configs could normalise the root, or a Vitest release could fix it upstream. Until then, [setup.md](../development/setup.md#commands) says to run the test lanes from a path with an uppercase drive letter.

**Resolution (2026-10-01, `fix/vitest-drive-letter`):**
- The mechanism, traced: the working directory does not matter; the path Vitest is started from does. npm puts `<cwd>\node_modules\.bin` on `PATH`, so from `c:\…` the worker loads Vitest's runtime from `file:///c:/…`. Vite resolves the test files' `vitest` import through the native realpath, which writes the drive letter in upper case: `file:///C:/…`. Node caches modules by URL, so the worker holds two Vitests, and the test files' `describe` finds no runner. Vitest's own guard against a second instance compares the paths case-sensitively, so it misses this. Normalising the root could not have fixed it.
- Each workspace's Vitest config loads a resolve hook into its test workers. The hook uppercases the drive letter of every `file:` URL, so both spellings are one module: [`apps/web/test/driveLetterHook.ts`](../../apps/web/test/driveLetterHook.ts) and its twin [`apps/api/test/drive-letter-hook.ts`](../../apps/api/test/drive-letter-hook.ts). On Linux no URL has a drive letter, so in CI the hook loads and changes nothing.
- All the lanes of both workspaces pass from `c:\…` and from `C:\…`, and the *Windows* note is gone from setup.md. No CI guard is possible, because CI runs on Linux; a regression makes every file fail, which shows on the first run.
- **Remove the hooks** when Vitest's guard compares paths case-insensitively, or Vitest loads one instance whatever the spelling it was started from. Vitest 5.0.3, the latest when checked, does neither.

## 10. The seeded amenity icon keys have no icons in the design system yet

**Status:** Open · **Date:** 2026-09-28

**Evidence:** F-3 seeds eight amenities, each with an `icon` key that the web maps to an icon ([`apps/api/src/db/seed/lookups.ts`](../../apps/api/src/db/seed/lookups.ts)): `wifi`, `zap`, `sun`, `plug-zap`, `coffee`, `users`, `presentation`, `graduation-cap`. They are Lucide names, and Lucide is imported only inside the design-system layer. The layer's icon set (`shared/design-system/icons/iconSet.tsx`) includes none of them yet, so the web has nothing to map these keys to.

**Resolves when:** the lookups and admin spaces slice (step 2 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build)) adds these eight keys to the design-system icon set, with the map from key to icon, and the admin's amenity form offers that set.

*Progress (2026-10-02, F-10):* the design-system icon set has an icon for each of the eight keys, and `packages/shared` owns the list of valid keys ([`lookups/amenityIcons.ts`](../../packages/shared/src/lookups/amenityIcons.ts)), which types the seed. The map from key to icon and the admin's amenity form remain for step 2.

## 11. Nested writes in an interactive transaction trigger a `pg` deprecation warning

**Status:** Open · **Date:** 2026-09-28

**Evidence:** during F-3, a script that validated the schema against the owner's six reference spaces ran `prisma.$transaction(async (tx) => …)` with nested creates (`space.create` with `hours`, `prices`, `amenities` and `contacts`). Node printed:

> `DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0.`

The writes succeeded and rolled back correctly. The warning comes from Prisma's PostgreSQL adapter (`@prisma/adapter-pg` 7.10 on `pg` 8.23): inside an interactive transaction, all queries share one `pg` client, and the nested creates reach it while another query is still running. The API lane, which uses no interactive transactions yet, prints no such warning.

**Resolves when:** before `pg` is upgraded to 9, either a Prisma release serialises the queries of an interactive transaction, or the features that write nested data in a transaction are proven to work with `pg` 9 (for example, the admin's space creation, the first such feature). Until then, a `pg` major upgrade is not taken without checking this.

## 12. The admin's settings list a "default auto check-out" that the model has no place for

**Status:** Resolved · **Date:** 2026-09-29

**Evidence:** foundation §13, screen 32 (admin *Settings*), lists "default auto check-out" beside the contact and the staleness threshold. F-3b follows the reviewed owner screens: auto check-out at closing and `maxStayMinutes` are settings of each space, with column defaults ([data-model.md](data-model.md#entities)). No platform setting holds a default, and nothing says what it would set: the closing-time switch, the stay limit, or the starting values of a new space.

**Resolves when:** the owner decides whether a platform default exists and what it governs. Either the admin screen drops the item, or a `Setting` key is added in the settings slice (step 11 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build)).

*Decided (2026-09-30, A-1):*
- `platform-settings` holds the defaults for a new space: auto check-out at closing, the visit rounding rule and its minutes, and the cap at the day price.
- They are copied into a space's settings when the space is created. Changing them never affects existing spaces ([conventions §9](../backend/conventions.md#new-space-defaults)).
- The finding stays open until A-2 in the [foundation plan](../plans/foundation.md) builds it.

**Resolution (2026-09-30, A-2):**
- The seed stores the defaults as one platform setting, `newSpaceDefaults` ([data-model.md](data-model.md#operations)), with the values the space columns had as defaults, so no behaviour changes.
- The demo space's settings are copied from it. Copying it when an admin creates a space is built by the slice that creates spaces.
- The admin's *Settings* screen edits these defaults. They govern only a new space's starting values, never an existing space.

## 13. Two documents still say "member" for the renamed customer

**Status:** Resolved · **Date:** 2026-09-29

**Evidence:** F-3b renamed `Member` to `Customer` and moved daily visitors to `Visit`. Two documents outside its scope still use the old terms:
- [conventions.md](../backend/conventions.md) lists a `members` module and audits "member create/edit/deactivate";
- [testing.md](../development/testing.md) names the E2E flow "owner checks a member in".

**Resolves when:** those documents use the glossary's terms (customers, visits, check-ins), for example when the front-desk slice creates its modules.

**Resolution (2026-09-30, A-1):**
- A-1 rewrote conventions.md around the new module list: `customers`, `visits`, and `subscriptions` with its check-ins. Its audit list uses the glossary's terms.
- testing.md's E2E flow is now "reception checks a visitor in".
- workflow.md's commit scopes no longer name `members` and `attendance`. They point to the module list.

## 14. The owner's audit screen has no design

**Status:** Open · **Date:** 2026-09-30

**Evidence:** The owner's audit log is in v1 scope, but no screen for it was designed:
- The scope includes it: [overview.md](../project/overview.md) lists "Audit log" in the owner and reception dashboard. `can()` has `space.auditLog.read` for the owner, and the planned API has `GET /manage/spaces/:spaceId/audit-log`.
- A reader exists for it: [conventions §6](../backend/conventions.md#6-audit) gives the `audit` module a `manage` router.
- No design covers it:
  - [foundation §13](../frontend/design-system/foundation.md#13-screens-to-design-32) lists owner screens 12–24, none of them an audit log. Screen 31, *Audit log*, is the admin's.
  - The [design archive](../design/SCREENS.md) has only `Admin audit.html`.
  - The owner's navigation in the [design brief](../design/prototype/BRIEF.md) has no audit entry.

**Resolves when:** the audit slice (step 11 of the build sequence in [v1-mvp.md](../plans/v1-mvp.md#sequence-inside-the-build)) designs the owner's audit screen, with its place in the owner's navigation, and builds it.

## 15. The payments migration predates ADR 0015

**Status:** Open · **Date:** 2026-10-01

**Evidence:** the payments migration (`apps/api/prisma/migrations/20260929120300_payments/migration.sql`) was written before [ADR 0015](decisions/0015-idempotency-and-concurrency.md):
1. **Its comment** says "The services check the same rules first, to answer with a domain error; these are the backstop". Under ADR 0015 the services do not repeat the ledger's rules: the database owns them, and a violation is translated into a domain code ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). No service exists yet, so nothing behaves differently. Migrations are never edited, so the comment stays. **Accepted:** ADR 0015 and data-model.md govern.
2. **One constraint name, two causes.** The insert trigger raises `payments_within_due` both when a payment would exceed the amount due, and when a visit is paid before its charge is set. The translation table of [conventions §4](../backend/conventions.md#4-errors) maps a constraint's name to one code, so an uncharged visit would read as `PAYMENT_EXCEEDS_DUE`. **Open.**

**Resolves when:** item 2 is settled by the slice that builds the payments endpoint, before the translation table gains `payments_within_due`: a new migration gives the uncharged visit its own constraint name and code, or the payments flow makes that case unreachable and a test proves it.

## 16. The forgotten password's timing can tell whether an account exists

**Status:** Open · **Date:** 2026-10-01

**Evidence:** `POST /auth/password/forgot` answers the same 202, with no body, for every email ([security.md](../backend/security.md#passwords)). For an account that may sign in, though, it first stores a token and sends the email, which over SMTP takes seconds, and against a slow relay up to the sum of its phase timeouts (DNS, connection, greeting, and each quiet spell, 10 s each), while an unknown email answers at once. No work may run after a response is sent ([ADR 0014](decisions/0014-deployment.md)), so the send cannot move after the answer, which is how the OWASP Forgot Password Cheat Sheet keeps the timing uniform. The rate limits (5 per address and email, 50 per address, every 15 minutes) slow a probe down, but do not stop it.

**Resolves when:** the timing is made uniform, for example by padding every answer to a fixed minimum, or the leak is accepted in security.md as a trade-off, as `EMAIL_TAKEN` on registration is.

## 17. Expired rate-limit counters and abandoned sessions are never swept

**Status:** Open · **Date:** 2026-10-01 · **Corrected:** 2026-10-02

**Evidence:**
- **Rate limits.** The `rate_limits` table ([security.md](../backend/security.md#rate-limits-fixed-window)) keeps a row per key, and a key's window starts over on its next hit. A key never hit again keeps its expired row for good. The rows are small, but the table grows with every address and account that ever made a request, against Neon's 0.5 GB free tier ([ADR 0014](decisions/0014-deployment.md)).
- **Refresh tokens.** Every rotation inserts a row, and the rotated one stays until it expires, 7 days later, because reuse detection needs it. A user's expired rows are deleted when they sign in, change their password, or refresh, so a live session keeps about its last 7 days of rows. The rows of a session nobody uses again stay until that user signs in or refreshes again, possibly never.
- **Reset tokens.** A reset deletes the user's reset tokens in its transaction, and a delivered link deletes the older ones. A link never used and never replaced stays after it expires.
- **Recovery sessions.** One is opened by every request for a reset link, whether or not the address has an account, and a new request in the same browser ends the last. A recovery whose browser never comes back stays after it expires, unless its link ends first and takes it along.

**Resolves when:** a timed job (the scheduler port, [conventions §12](../backend/conventions.md#12-environments)) deletes expired counters and expired tokens, or a measurement shows the growth does not matter within v1.

## 18. Whether a link to a deleted space still counts

**Status:** Open · **Date:** 2026-10-01

**Evidence:** the session lists the user's active links: those not deactivated ([api-contract §5](../api/api-contract.md#session)). A space is soft-deleted (`deletedAt`), and its links are not touched, so a link to a deleted space still appears and would still open the dashboard. `space-links`' repository queries only its own table ([conventions §2](../backend/conventions.md#2-layers)); nothing deletes spaces yet.

The two lists of a user's spaces now disagree. `GET /manage/spaces` (`mySpaces`) asks `spaces`, and leaves a soft-deleted space out. The session's links do not, and they feed `RequireSpaceRole` and the landing's fallback to the oldest link ([architecture.md › Landing and guards](../frontend/architecture.md#landing-and-guards)). The dashboard reads both: its guards and its navigation read the session's links, and its switcher reads `mySpaces`. So a user can land on, and open, a space their switcher does not list.

**Resolves when:** the slice that soft-deletes spaces decides it, for example by deactivating the space's links in the same transaction, with a test.

## 19. The reset email's colours, fonts and styles are written outside the design system

**Status:** Accepted · **Date:** 2026-10-01 · **Corrected:** 2026-10-02 · **Accepted:** 2026-10-03

**Evidence:** the reset email (`apps/api/src/modules/auth/email/resetEmail.ts`) writes its styles inline, copied from its design (`docs/design/prototype/Reset email.html`): seven colours as literal values, two font stacks, and every layout rule (sizes, spacing, borders, radii). The design system is the one place for colours, fonts and CSS, as semantic tokens ([foundation](../frontend/design-system/foundation.md)), but an email client reads no stylesheet and no custom property, and the API cannot import the web's tokens.

**Resolves when:** the owner accepts the deviation (the email is the only one Masaha sends, and its colours and fonts are named in one place), with design-system changes of the brand, neutral colours or fonts carried to it by hand; or the email is generated from the tokens at build time.

**Resolution (2026-10-03):** the owner accepted the deviation as widened: the email is the only one Masaha sends, and its colours and fonts are named in one place in `resetEmail.ts`. A design-system change of the brand or neutral colours, or of the fonts, is carried to it by hand.

## 20. A session has no absolute lifetime

**Status:** Open · **Date:** 2026-10-02

**Evidence:** every rotation gives the new refresh token 7 more days ([security.md](../backend/security.md#tokens-and-cookies)). A session refreshed at least once a week therefore never ends by itself: only a logout, a password change, a reset or a suspension ends it. A stolen session that is used regularly lasts as long.

**Resolves when:** a family carries an absolute deadline (for example 30 days from sign-in, after which the person signs in again), or the open-ended session is accepted in security.md.

## 21. A token replayed within the grace window starts its own branch

**Status:** Open · **Date:** 2026-10-02

**Evidence:** within 30 s of a rotation, each presentation of the rotated token gets a new token of the same family ([security.md](../backend/security.md#tokens-and-cookies)), so two tabs refreshing together stay signed in. A copy presented within that window, say by an infostealer that replays the cookie at once, gets its own successor. From then on the thief and the owner each rotate their own branch and never present a token rotated more than 30 s ago, so reuse detection never fires; the family ends only by a logout, a password change or a reset. The owner decided to keep this for now (decision D5 of F-5a's review).

**Resolves when:** every presentation within the grace returns the same successor, derived deterministically from the presented token (for example an HMAC of it under a server key), so a replay within the window gains nothing (option B of that review).

## 22. The reset email's words live outside the web's copy catalogue

**Status:** Open · **Date:** 2026-10-02

**Evidence:** every user-facing string goes through the copy catalogue, in both languages (CLAUDE.md). The reset email is sent by the API, which has no catalogue, so its words live in `apps/api/src/modules/auth/email/resetEmail.copy.ts`, in both languages held to one shape and checked by a unit test. A change to the product's wording can miss them, and the catalogue's own parity test does not see them.

**Resolves when:** the email's words move into a catalogue both apps read (for example in `packages/shared`), or this second place is accepted in localisation.md.

## 23. No per-address ceiling for signed-in requests

**Status:** Open · **Date:** 2026-10-02

**Evidence:** a request with a valid access token counts by its user, 300 every 15 minutes ([security.md](../backend/security.md#rate-limits-fixed-window)). Registrations are bounded (20 an hour per address), but each account still brings its own bucket, so one address holding many accounts multiplies its allowance. Online, that spends the free tier's CPU and database hours ([ADR 0014](decisions/0014-deployment.md)).

**Resolves when:** F-7 sizes a per-address ceiling for signed-in requests against the deployment's real limits, or records why it is not needed.

## 24. The status of each error type is written twice

**Status:** Open · **Date:** 2026-10-03

**Evidence:** the contract gives each error type its HTTP status ([api-contract §3](../api/api-contract.md#3-error-types)). The API holds that table in `apps/api/src/shared/errors/appError.ts`. The web's normaliser (`apps/web/src/shared/errors/toAppError.ts`) needs it read backwards, to type a response that carries no envelope (a proxy's 502, say), and holds its own copy, because the shared package has none. A status changed in one place and not the other would type the same answer differently on each side.

**Resolves when:** the table moves into `packages/shared`, and both apps read it from there, in an item allowed to change the API.

## 25. The signed-in claims are read by a helper written twice

**Status:** Open · **Date:** 2026-10-04

**Evidence:** a controller behind `requireAuth` reads the user's claims from `req.auth` through a small `signedIn(req)` helper, which throws 401 when they are missing. It is written in `apps/api/src/modules/users/users.controller.ts` and again in `apps/api/src/modules/space-links/space-links.controller.ts`, and each new module with a `me` router would add another copy.

**Resolves when:** the helper moves to `shared/auth`, beside `requireAuth`, and both controllers use it, in an item allowed to touch both modules.

*Progress (2026-10-05, S2a-1):* the helper exists in `shared/auth` (`signedIn`), and the `lookups` controllers use it. The two old copies remain.

## 26. `npm run format -- --check` rewrites files

**Status:** Open · **Date:** 2026-10-04

**Evidence:** the root `format` script runs Prettier with `--write`, so `npm run format -- --check` passes both flags and rewrites every file it would only have reported. On F-5b3a it rewrote `apps/web/src/shared/preferences/preferences.unit.test.ts`, which is not Prettier-formatted on `main`, outside the item's scope; the file was restored by hand. A check that writes is a trap: it changes files the author never meant to touch.

**Resolves when:** a separate script checks without writing (for example `format:check`, `prettier --check .`), and the documents point to it.

## 27. Two dashboard chunks import each other

**Status:** Open · **Date:** 2026-10-05

**Evidence:** the build gathers the dashboard's own modules into one `dashboard` chunk, leaving out what it shares with the site ([architecture §3](../frontend/architecture.md#3-capabilities-features)). What only the dashboard uses besides, today TanStack Query's `useQuery` and `publicSpacePath`, has no chunk of its own, so the bundler places it in the chunk of the space shell's lazy import (`SpaceLayout`). That chunk imports the `dashboard` chunk, and the `dashboard` chunk imports it back. Nothing breaks today, because every use across the two chunks happens inside a function. A dashboard module that used one of those imports at load time (a module-level `queryOptions(…)`, for example) would fail with a reference error when the space shell is the first dashboard page opened. `check:build` still classifies both chunks as dashboard code.

**Resolves when:** the build gives what only the dashboard uses a place that does not import the dashboard's chunk back (a second chunk group, for example), proven by the manifest, or a dashboard module first needs such an import at load time.

## 28. The tests that wait for a lazy page can time out under load

**Status:** Open · **Date:** 2026-10-05

**Evidence:** in one full `test:component` run on F-6c2, "lists the owner’s eleven pages, the overview marked as the page shown" (`apps/web/src/pages/dashboard/routes.component.test.tsx`) failed after about 1.1 s with `Unable to find role="navigation" and name "Space dashboard"`: the lazily loaded space shell was not on screen within the default wait. The file passed three times alone, and the whole lane passed when run again.

On S2a-2 (2026-10-06) it is no longer the one file, nor only under a full run: with `apps/web` as on `main`, running `routes.component.test.tsx` and `apps/web/src/pages/site/auth/authPages.component.test.tsx` together failed twice out of two, each time in the first test that waits for a lazy page, after about 1.1 s: "shows its page to a guest, in the focus shell" (`Unable to find role="main"`), with "lists the owner’s eleven pages" or "opens the drawer with the pages". The item's branch failed the same tests in the same way.

**Resolves when:** the tests that wait for a lazy page or shell wait in a way that holds under load, proven by repeated full runs.

## 29. Two folders cannot each run the web against their own API

**Status:** Open · **Date:** 2026-10-05

**Evidence:** the web's dev server listens on port 5320 and forwards `/api` to `http://localhost:3320`, both fixed in `apps/web/vite.config.ts` ([setup › Commands](../development/setup.md#commands)). Each folder's API reads its own `apps/api/.env`, whose `CORS_ORIGIN` names `http://localhost:5320`, and the password routes, refresh and logout refuse a request whose `Origin` is not that one ([security.md](../backend/security.md#tokens-and-cookies)). So a second folder, such as the `masaha-b` worktree, cannot run its web and its API beside the first: its API on another port is never reached by its web's proxy, and its web on another port is refused by its API. On F-5b3c2, port 5320 was already taken by another dev server; the recovery pages were checked by hand with Vite on 5330 and the API started with a one-off `CORS_ORIGIN=http://localhost:5330`, both outside any script or document. On 2026-10-06 (F-5b3b), dev servers left over from earlier runs kept the ports: a `tsx watch` API that survived Ctrl+C on Windows, and a Vite started for screenshots, held 3320 and 5320, so a fresh `npm run dev` failed on its port or reached a stale API still running with an old environment.

**Resolves when:** a folder can run its web and its API on ports of its own, set in its own environment, and setup.md says how.

## 30. A lookup's English name is not unique

**Status:** Open · **Date:** 2026-10-05

**Evidence:** the admin's lookups answer a duplicate name with 409 `not_unique` only where the database holds a unique key: a governorate's Arabic name, an area's Arabic name within its governorate, and an amenity's key, derived from its English name ([api-contract §5](../api/api-contract.md#5-endpoints), S2a-1). A governorate's or an area's English name, and an amenity's Arabic name, may repeat another's. So may an amenity's English name once it is edited, since only the key it yielded when the amenity was added is unique. A check in the service alone would race without a constraint, and the item changed no schema.

**Resolves when:** a migration adds the missing unique keys (each English name as its Arabic one is keyed, and an amenity's Arabic name), and the endpoints answer them with `not_unique`; or the owner accepts the repeats.

## 31. The backend documents still call for injecting a repository only tests pass

**Status:** Open · **Date:** 2026-10-05

**Evidence:** [conventions §2](../backend/conventions.md#2-layers) wires dependencies by factory functions with defaults, `createService(repo = createRepository(), …)`, so that "tests pass plain-object fakes"; [R8](../backend/conventions.md#8-module-rules) unit-tests service logic with such fakes; and [testing §3](../development/testing.md#3-rules-that-bind-every-test), rule 3, says "inject the repository". The owner's rule is that no parameter exists only for tests ([testing §3](../development/testing.md#3-rules-that-bind-every-test), rule 2): a repository parameter that only tests pass breaks it. The older services (`users`, `sessions`, `space-links`, `spaces`, `lookups`' `areaNamesFor`) still follow §2. The admin's lookups services (S2a-1) no longer do: each creates its repository, its logic is unit-tested in pure helpers, and the services are proven by the API lane on the real database.

**Resolves when:** a docs item aligns conventions §2 and R8 and testing §3 with the rule; the older services follow in the planned refactor.

## 32. The Google sign-in answer does not say whether it created the account

**Status:** Open · **Date:** 2026-10-06

**Evidence:** `POST /auth/google` answers `Session & { linked }` ([api-contract §5](../api/api-contract.md#5-endpoints)): `linked` says it has just joined Google to an existing account, but nothing says it has just created one. So the web welcomes an account registered by email ("Welcome Sara, your account is ready", [design 05-auth-flow](../design/SCREENS.md)) and cannot welcome one Google creates; F-5b3b changed no API and shows no welcome there.

**Resolves when:** the answer says the account was created (a `created` flag beside `linked`) and the Google sign-in welcomes it as registration does; or the owner accepts no welcome after a first Google sign-in.

## 33. The deployment's headers must let Google's sign-in work

**Status:** Open · **Date:** 2026-10-06

**Evidence:** Google sign-in on the web (F-5b3b) loads Google Identity Services' script from `https://accounts.google.com/gsi/client`, which draws its button in a frame from `accounts.google.com`, adds its own styles, and opens Google's window as a popup that answers the page. No header restricts this today: the web's pages carry no Content-Security-Policy and no Cross-Origin-Opener-Policy (the API's Helmet headers cover only the API's answers). A future CSP that does not allow Google's script, frames, styles and connections, or a `Cross-Origin-Opener-Policy: same-origin` on the web's pages, would break the sign-in without any test failing.

**Resolves when:** the deployment's headers are written ([ADR 0014](decisions/0014-deployment.md)) with a CSP that allows `https://accounts.google.com/gsi/client` (script), `https://accounts.google.com/gsi/` (frame, connect, style), and a COOP of `same-origin-allow-popups` or none on the web's pages, as Google's own guidance lists them.

## 34. Passwords stay in the mutation cache after a sign-in, a registration or a password change

**Status:** Open · **Date:** 2026-10-06

**Evidence:** TanStack Query keeps a mutation's variables, and a refusal's error keeps the request that carried them (its cause's `config.data`), for the mutation's `gcTime`, five minutes by default, after it has no observer. `useSignIn` and `useRegister` (`features/auth`) and `useChangePassword` (`features/users`) send a password as their variables and set no `gcTime`, so the password stays in the page's memory for five minutes after the form has gone, and a sign-in clears no cache ([architecture §3](../frontend/architecture.md#react-query-in-a-feature)). `useCheckResetLink` and, since F-5b3b, `useGoogleSignIn` set `gcTime: 0` for the same reason.

**Resolves when:** each of the three sets `gcTime: 0`, with a test that the cache holds no password once the mutation is answered and its page has gone.

## 35. The web sets no document title

**Status:** Open · **Date:** 2026-10-06

**Evidence:** `apps/web/index.html` has no `<title>`, and no page sets `document.title`, so every tab and every history entry shows the page's address. A page without a title fails WCAG 2.4.2 (Page Titled, level A); the [accessibility baseline](../frontend/design-system/foundation.md#10-accessibility-baseline) does not list titles yet.

**Resolves when:** every page has a title, in both languages, following the interface's language, with a default in `index.html`.
