# Plan — Repository scaffold and design-system layer

> **Status:** Active · **Last Updated:** 2026-09-27 · **Owner:** Basel Ghoneim
> **Authority:** The work items that take Masaha from "documents only" to "a built design-system layer synced into Claude Design" (phases 2–3 of [v1-mvp.md](v1-mvp.md)). *What* the layer is, and its values, is owned by [foundation.md](../frontend/design-system/foundation.md); *how* work is executed by [workflow.md](../development/workflow.md). This plan only orders the work and drafts each Work Item's contract.

## 1. Goal and finish line

**Goal:** a working monorepo, and the design-system layer (`apps/web/src/shared/design-system/`) built from the locked *Sea* values, with all 26 components of [foundation §12](../frontend/design-system/foundation.md#12-component-inventory), so the 27 screens are designed in Claude Design with the real components.

**Finished when:**
- Every Work Item below is merged.
- The showcase page shows every component in light and dark, RTL and LTR, phone and desktop.
- The repository is on GitHub and imported into Claude Design.

**Not in this plan:** the API, the database, Prisma, the catalogue mechanism, authentication, any feature or real page. The API skeleton is the first item of the next plan, and runs in parallel with screen design (phase 4).

## 2. How each Work Item is run (Claude Code in VS Code)

One Work Item = one fresh Claude Code conversation = one branch = one PR.

1. **Start clean.** On `main`, pull. Open a **new** Claude Code conversation (fresh context per item).
2. **Plan first.** Switch Claude Code to *plan mode* and send the prompt in §3. It reads `CLAUDE.md` and this plan, then proposes: the branch name, the PR contract (scope, acceptance criteria, out of scope), the planned commits, the files it will touch, and any dependency not listed in §4.
3. **Approve or correct the plan.** Nothing is written before this.
4. **Implement.** Claude Code works on the branch and commits each complete unit of change ([workflow §3](../development/workflow.md#commits)). Before every commit it runs lint, typecheck and tests. It then self-reviews against the Definition of Done.
5. **Push and open the PR.** Claude Code pushes and opens the PR with the description format from [workflow §3](../development/workflow.md#pr-description), assigned to you and labelled ([workflow §3](../development/workflow.md#pr-assignee-and-labels)). This needs the GitHub CLI signed in. If it isn't, Claude Code gives you the text and you open the PR in the browser.
6. **Review.** Look at the diff and the screenshots, and run the showcase yourself (§6). For a second opinion, send the PR description and screenshots for review.
7. **Merge** on GitHub with a merge commit or rebase, not squash, so the atomic commits survive. Then delete the branch.

**Stop rules apply** ([workflow §8](../development/workflow.md#8-stop-rules)). In particular, when Claude Code meets a real choice not settled here, it stops and asks.

## 3. The prompt (same for every item)

```
Implement WI-<n> from docs/plans/design-system-layer.md.
Read CLAUDE.md, docs/development/workflow.md and the documents WI-<n> links to first.
Start in plan mode: propose the branch, the PR contract (scope, acceptance criteria,
out of scope) based on the WI's draft, the planned commits (workflow §3), the files
you will touch, and any dependency not approved in §4 of the plan. Wait for my
approval before writing anything.
```

## 4. Approved dependencies

Approving this plan approves these. Anything else is proposed in the item's plan step.

| Area | Packages |
|---|---|
| Workspace and tooling | `typescript`, `eslint` (flat config) + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-boundaries`, `prettier` |
| Web app | `react` 19, `react-dom`, `vite`, `@vitejs/plugin-react`, `react-router` |
| Styling | `tailwindcss` v4 + `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` (shadcn's animation utilities) |
| Components | shadcn CLI (dev-time only), `radix-ui` (the unified Radix package shadcn now imports; approved in WI-4 in place of the separate `@radix-ui/*` packages), `lucide-react`, `sonner`, `cmdk` (Combobox), `react-day-picker` + `date-fns` (Calendar), `@tanstack/react-table` (DataTable) |
| Font | `@fontsource/ibm-plex-sans-arabic` (self-hosted, weights 400/500/600) |
| Tests | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `vitest-axe` (accessibility check in component tests) |

## 5. Work Items

Sizes: **S** ≈ half a day · **M** ≈ 1 day · **L** ≈ 2 days. Target: finished by **17 October 2026** (end of week 3), with buffer for outages.

```
WI-1 monorepo ─► WI-2 zones ─► WI-3 tokens ─► WI-4 layer base ─► WI-5 … WI-8 components ─► WI-9 sync
```

WI-5 to WI-8 each depend only on WI-4. They are done in order, but none blocks another.

---

### WI-1 — Monorepo and tooling · `chore/scaffold-monorepo` · M

**Scope**
- Root `package.json` with npm workspaces: `apps/web`, `apps/api` (empty placeholder with a README only), `packages/shared` (empty package, builds).
- Node 24 pinned strictly (`.nvmrc`, `engines`, `engine-strict`); `.editorconfig`, `.gitignore`.
- Shared `tsconfig.base.json` (strict); ESLint flat config; Prettier.
- `apps/web`: Vite + React 19 + TypeScript, rendering one placeholder element with no visible text.
- Vitest configured for the unit and component lanes (jsdom for component).
- Root scripts: `dev`, `build`, `lint`, `typecheck`, `test:unit`, `test:component`, `format`.
- GitHub Actions: `lint` · `typecheck` · `test:unit` · `test:component` on every PR. `test:api` is added with the API skeleton.
- `.claude/settings.json` turning off Claude Code's commit and PR attribution, per the current Claude Code settings.

**Acceptance criteria**
- [ ] Fresh clone → `npm ci` → `npm run dev` shows the app; `build`, `lint`, `typecheck` and both test scripts pass (one trivial test each).
- [ ] CI runs and passes on the PR.

**Out of scope:** Tailwind, routing, zones, anything in `apps/api` beyond the placeholder.

**Documents (deferred, now owed):**
- write `docs/development/setup.md` (prerequisites, install, run, test);
- fill *Commands* in `CLAUDE.md`;
- remove both rows from the deferred table in `docs/README.md`.

---

### WI-2 — Frontend zones and boundaries · `chore/web-zones` · S

**Scope**
- The four zones of [frontend/architecture.md §1](../frontend/architecture.md#1-four-zones): `app/`, `pages/`, `features/`, `shared/`. Each zone holds only what exists; no empty placeholder folders.
- Path aliases (`@app/*`, `@pages/*`, `@features/*`, `@shared/*`) in TypeScript and Vite.
- `eslint-plugin-boundaries`:
  - the one-way dependency rule;
  - no sibling imports;
  - barrel-only imports.
- `app/`: the root component and React Router, with a single placeholder route.
- A class check script (`check:classes`, run in CI) that fails on physical direction classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l`, `rounded-r` …) anywhere in `apps/web/src`.

**Acceptance criteria**
- [ ] A deliberate forbidden import (feature → page, feature → feature, deep import into a barrel) fails lint. Shown in the PR evidence, then removed.
- [ ] A deliberate `ml-2` fails `check:classes`.

**Out of scope:** providers, the design system, session, i18n.

**Documents:** none, unless the implementation differs from `frontend/architecture.md`. In that case, stop and propose.

---

### WI-3 — Tokens, themes and fonts · `feat/design-system-tokens` · L

Builds [foundation §3–§7](../frontend/design-system/foundation.md) exactly as locked.

**Scope**
- `tokens/primitives.css`: the six ramps, `white`, radius scale, shadow scale, motion, z-index layers.
- `tokens/semantic.css`: every role from foundation §5 *Values*, for `[data-theme="light"]` and `[data-theme="dark"]`, plus the component tokens from §4.
- `tokens/typography.css`: IBM Plex Sans Arabic self-hosted (400/500/600, `font-display: swap`), the eight composite text styles, and the phone sizes for `display` and `heading-1`. Font stacks are set per `:lang()`.
- `tokens/tailwind.css`:
  - an `@theme` mapping that exposes the semantic roles, text styles, radii and shadows as utilities;
  - the Tailwind default palette disabled, so `bg-blue-500` does not exist;
  - the `dark` variant redefined to `[data-theme="dark"]`.
- `check:classes` extended to fail on arbitrary-value classes (e.g. `text-[13px]`, `bg-[#fff]`) outside `shared/design-system/`.
- **Pre-paint script** in `index.html`:
  - sets `data-theme` (stored choice → system preference);
  - sets `lang` and `dir` (stored choice → browser language → `ar`), per [localisation.md](../frontend/localisation.md#languages-and-resolution).
- **Unit tests:**
  - **key parity:** both themes define the same keys, and every key foundation §5 lists;
  - **contrast:** every pair listed under *Verified* in foundation §5, resolved from the CSS files, meets its threshold.

**Acceptance criteria**
- [ ] The placeholder page switches theme and direction with no flash on reload.
- [ ] Changing any value in `semantic.css` so it breaks a pair makes the contrast test fail. Shown in the evidence, then reverted.
- [ ] Every value matches foundation.md. Any difference is a stop-and-propose, not a silent change.

**Out of scope:**
- the theme and language *toggles*, which come with the components;
- the catalogue mechanism.

**Documents:**
- `localisation.md` *Mechanism*: write only the part this item builds (the pre-paint script, storage keys, the resolution in code), and leave the catalogue part marked as still deferred;
- foundation.md status line: "tokens built".

---

### WI-4 — Layer base and showcase · `feat/design-system-base` · M

**Scope**
- `lib/cn.ts`.
- `icons/`: one wrapper over `lucide-react` with a `mirror` flag. Directional icons (chevrons, arrows, log-in/out) mirror in RTL. Non-directional icons never mirror.
- The Radix `DirectionProvider`, exported by the layer and mounted in `app/`.
- `components.json` for the shadcn CLI, pointing into `shared/design-system/components/`.
- The layer's `index.ts` public surface.
- A lint rule forbidding imports of `@radix-ui/*`, `lucide-react` and `class-variance-authority` outside `shared/design-system/`.
- **Showcase**, a development-only route (`/__showcase`) in a `pages/showcase/` group:
  - excluded from production builds;
  - toolbar to switch theme, direction and width (360 / 768 / 1280);
  - a section per component, filled as components arrive;
  - sample text from a local fixtures file, since this page is not user-facing.

**Acceptance criteria**
- [ ] `npm run build` output contains no showcase code.
- [ ] The icon wrapper test proves a chevron mirrors in RTL and a search icon does not.
- [ ] The layer imports nothing from outside itself. Lint proves it.

**Out of scope:** any component from §12.

**Documents:**
- `frontend/architecture.md` §2: add the dev-only `showcase` group, which this plan approves;
- foundation §3: the showcase location.

---

### Component items (WI-5 to WI-8)

Every component in these items follows the [component contract](../frontend/design-system/foundation.md#11-component-contract-applies-to-every-component-including-copied-shadcn-ones):

- no built-in words;
- logical properties only;
- icons through the wrapper;
- semantic roles only;
- `cva` variants;
- its own `index.ts`;
- a showcase section showing every variant and state.

Each item also meets the same bar:

- **Component tests** cover behaviour the component decides (keyboard, disabled, open/close, `aria-*` wiring), plus one `vitest-axe` check per component.
- **Screenshots in the PR:** the showcase section in light and dark, RTL and LTR, at 360 and 1280.
- **Visual reference:** the Claude Design stress-test screens (Sign in, Owner › Members, Admin › Data reports). A visible difference from them is raised, not silently kept.

### WI-5 — Actions and form controls · `feat/ds-forms` · L

- **Components:** Button · Input · Textarea · Field · Select · Checkbox · RadioGroup · Switch.
- **Button:**
  - variants primary, secondary, outline, ghost, destructive, link;
  - sizes sm / md / lg / icon;
  - `loading` state.
- **Controls:**
  - 40px, and 44px on `pointer: coarse`;
  - error state from `aria-invalid`;
  - a `dir` prop on Input for LTR values (email, phone).
- **Field** wires the label, helper and error ids, including `aria-describedby`.
- **Theme and language toggles:** built here from Button, as plain controls with no policy logic.

### WI-6 — Display and feedback · `feat/ds-display` · M

- **Components:** Badge · Card · Avatar · Separator · Skeleton · Spinner · Alert · Toast (Sonner) · Tooltip · EmptyState · StatCard.
- **Badge:** neutral, primary, success, warning, info and destructive variants, using the subtle pairs. Warning text uses `warning-subtle-foreground` only.
- **Card:** uses `card-border` and `shadow-raised`.
- **Toast:** positioned on the logical side and respects direction.

### WI-7 — Overlays and navigation · `feat/ds-navigation` · L

- **Components:** Dialog · AlertDialog · Sheet · DropdownMenu · Tabs · Breadcrumb · Pagination · Sidebar.
- **Sheet:** opens from the logical start on navigation (where the sidebar sits), and from the bottom for filters.
- **Pagination:** takes its words as props, and its chevrons mirror.
- **Sidebar:**
  - expanded on desktop;
  - icons only on tablet;
  - a Sheet (drawer) on phone, per foundation §9.
- Focus trap and return are checked in tests for Dialog, Sheet and DropdownMenu.

### WI-8 — Data and dates · `feat/ds-data` · L

- **Components:** Table · DataTable · Combobox (single and multi) · Calendar · DatePicker · ToggleGroup (filter chips).
- **ToggleGroup** (added by the owner in WI-7, [finding 7](../architecture/findings.md#7-the-stress-tests-filter-chips-have-no-component)):
  - on Radix's ToggleGroup, from the approved `radix-ui` package;
  - chips as in the Admin › Data reports phone filter sheet: `radius-pill`, several selectable at once, a check and the `accent` pair when selected;
  - arrow keys follow the direction.
- **DataTable:**
  - built on `@tanstack/react-table`;
  - sorting, empty state and loading rows;
  - **stacked-card mode below 768px**, as in the Owner › Members stress test.
- **Calendar:**
  - Gregorian with Western digits;
  - Arabic and English month names;
  - week starts on Saturday in Arabic;
  - navigation mirrors in RTL.

---

### WI-9 — Verify, publish and sync · `docs/design-system-built` · S

**Scope**
- A full manual pass of the showcase in the 4 × 3 grid (light/dark × RTL/LTR × 360/768/1280). Findings are fixed or recorded.
- foundation.md status: "built"; §14 step 3 marked done.
- `v1-mvp.md` phase 3 marked done.

**After merge** (owner, outside the PR)
1. In Claude Design, **detach the Oyoun Academy design system** from the Masaha project.
2. Import the repository's design system into Claude Design, from GitHub or with the design-sync command where available.
3. Check one screen in Claude Design uses the real Button, Field and DataTable.

→ Phase 4, screen design, starts.

## 6. What to look at when reviewing (owner checklist)

- **Scope:** do the files changed match the item? Anything extra gets a question.
- **Showcase:**
  - flip theme and direction;
  - shrink to 360;
  - tab through with the keyboard: the focus ring must always be visible.
- **No raw values:**
  - search the diff for `#`, `px` or `rgb` outside `tokens/`;
  - check there are no palette classes (`bg-teal-600`) and no arbitrary values (`text-[13px]`).
- **No words** inside components: every visible string arrives as a prop.
- **Evidence:** the PR says what was run and what was *not*.

## 7. Risks

| Risk | Mitigation |
|---|---|
| A shadcn component resists RTL (Radix portal, animation direction) | Stop rule: record it, propose a fix. Never patch around it with physical classes |
| Tailwind v4 or shadcn changes since these docs were written | Claude Code checks current docs in the plan step and proposes any difference |
| The layer grows domain components | Admission test (foundation §2.8): SpaceCard, MemberRow and others wait for their features |
| Outages break a long item mid-way | Commit and push each unit as it is finished; items are sized ≤ 2 days |
