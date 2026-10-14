# Masaha — the design

The Masaha screen designs: made in Claude Design (2026-09-29), and **maintained here by hand**
since that project was deleted. The design system itself lives in the code
(`apps/web/src/shared/design-system/`); the designs were built with a synced copy of it, vendored
under `prototype/_ds/`.

**The prototype is the living design.** It is no longer a frozen archive: design reviews take it
apart, the owner decides, and the decisions are applied to `prototype/` — so the prototype, not the
screenshots, is what a feature is built from. Two things follow:

- **The design as delivered** is at the tag `design-2026-09-29`, and nothing here is expected to
  match it any more. [CHANGES.md](CHANGES.md) lists every decision applied since, with its date.
- **The screenshots in `screens/` are from before the fix phase.** They are regenerated once, at
  the end of it. Until then they show the design as delivered, and `prototype/` shows it as it is;
  where they disagree, the prototype is right.

## What is here

| Path | What it is |
|---|---|
| `SCREENS.md` | **Start here.** The 32 screens (foundation §13) → prototype pages and board sections |
| `INDEX.md` | Every frame of the design board (570 frames in 56 sections), in order: label, prototype URL with its state parameters, viewport, screenshot |
| `screens/` | A full-page screenshot of every distinct frame (437 WebP images), one folder per board section. Sections whose frames all repeat earlier ones have no folder; `INDEX.md` links each frame to its file |
| `prototype/` | The clickable HTML prototypes: 41 pages, the board (`Flows - states.html`), sample data and copy. Fully offline (React, Babel, fonts and the design-system bundle are vendored) |
| `prototype/BRIEF.md` | The product brief the screens were designed against — a record, so it is not updated as the design changes |
| `CHANGES.md` | Every decision applied to the living design: what changed, where, and when |
| `scripts/` | The two checks run on the prototype before each commit (below) |

## How to open the prototypes

The pages load their `.jsx` files over HTTP, so opening them with `file://` does not work. Serve the folder:

```bash
cd prototype
npx serve .            # or: python -m http.server 8080
```

Then open `Flows - states.html` (the whole board) or any page directly. States are URL parameters, for example `Desk.html?role=reception&dialog=checkout&pid=pv0`, `Finance.html?theme=dark&tab=debts`, `Customers.html?lang=en`. `INDEX.md` lists every one.

## Checking the prototype

`docs/design/` is outside ESLint and Prettier and no test lane owns it, so two scripts stand in,
run from the repository's root with Node alone: `node docs/design/scripts/check-parse.mjs` parses
every `.jsx` module and every page's inline script with the vendored Babel, and fails on a syntax
error, which would blank the page; `node docs/design/scripts/check-classes.mjs` fails on a class
that no stylesheet defines, which the prebuilt `_ds_bundle.css` makes silently dead (the few
already dead are listed in the script by file, so the same class anywhere else still fails). The
class check reads only class names written literally in `class="…"` or `className="…"`: a class
chosen in a condition, built by `cn(…)`, passed in another prop or named as an object key is not
seen. **What they cannot see:** anything that happens once the page runs, a block drawn twice, a
missing gap, a section in the wrong place — the
Directory's filters were drawn twice and passed both, and a 420-page load matrix too. Those need
the pages opened in a browser, at 390, 768 and 1440, and looked at.

**One scope for every script.** Each page's modules and inline scripts compile apart but share the
page's global scope, so a top-level name in one is everyone's. Two rules follow: no module or page
script uses object rest (`const { a, ...rest } = props`) — Babel compiles it with a helper list,
`_excluded`, that the next script using rest overwrites, so held-back props leak (DI-27; pick them by
hand, as `shared.jsx`'s `without` does); and no top-level name that the browser already owns, such as
`name`.

## Rules for implementing from this archive (Claude Code)

1. **The prototype is a specification, not code to copy.** It is a single-file React prototype with inline Babel. Rebuild each screen with Masaha's design-system components, the four zones, TanStack Query and the typed copy catalogues, following the docs. Never import or paste prototype code or its CSS.
2. **Read the source, not only the pictures.** `prototype/masaha/*.jsx` holds the exact structure, states and conditions of each screen; the screenshots show the result **as it was delivered**, which the fix phase has moved on from ([CHANGES.md](CHANGES.md)).
   - `i18n.js`: the Arabic and English copy used on the screens; the starting point for catalogue lines (review wording against the glossary).
   - `data.js`, `details-data.js`, `desk-data.js`, `owner-data.js`, `admin-data.js`: sample data only; the real rules live in `docs/architecture/data-model.md`.
3. **Neither wins automatically.** The design owns behaviour and look; the docs (ADRs, data-model, foundation) own the rules. Every conflict between a screen and the docs is recorded and decided.
4. **Each slice links its screens.** A feature PR names the SCREENS.md rows it implements and compares its result with the matching screenshots (light, dark, English, phone where they exist).

## Known limits of the archive

- **Navigation icons are placeholders.** Claude Design only had part of the icon set; the final icons are chosen in code (F-6).
- **Sample data is illustrative.** Some admin frames reuse text from another space (for example Golden Hub's edit form shows Focus Hub's description).
- **The Google button loads the Roboto font from Google Fonts;** offline it falls back to the system font.
