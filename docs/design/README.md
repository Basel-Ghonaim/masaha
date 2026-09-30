# Masaha — design archive

The final Masaha screen designs (made in Claude Design, 2026-09-29), kept as a self-contained, offline archive after the Claude Design project was deleted. The design system itself lives in the code (`apps/web/src/shared/design-system/`); the designs were built with a synced copy of it.

## What is here

| Path | What it is |
|---|---|
| `SCREENS.md` | **Start here.** The 32 screens (foundation §13) → prototype pages and board sections |
| `INDEX.md` | Every frame of the design board (483 frames in 52 sections), in order: label, prototype URL with its state parameters, viewport, screenshot |
| `screens/` | A full-page screenshot of every distinct frame (437 WebP images), one folder per board section. Sections whose frames all repeat earlier ones have no folder; `INDEX.md` links each frame to its file |
| `prototype/` | The clickable HTML prototypes: 39 pages, the board (`Flows - states.html`), sample data and copy. Fully offline (React, Babel, fonts and the design-system bundle are vendored) |
| `prototype/BRIEF.md` | The product brief the screens were designed against |

## How to open the prototypes

The pages load their `.jsx` files over HTTP, so opening them with `file://` does not work. Serve the folder:

```bash
cd prototype
npx serve .            # or: python -m http.server 8080
```

Then open `Flows - states.html` (the whole board) or any page directly. States are URL parameters, for example `Desk.html?role=reception&dialog=checkout&pid=pv0`, `Finance.html?theme=dark&tab=debts`, `Customers.html?lang=en`. `INDEX.md` lists every one.

## Rules for implementing from this archive (Claude Code)

1. **The prototype is a specification, not code to copy.** It is a single-file React prototype with inline Babel. Rebuild each screen with Masaha's design-system components, the four zones, TanStack Query and the typed copy catalogues, following the docs. Never import or paste prototype code or its CSS.
2. **Read the source, not only the pictures.** `prototype/masaha/*.jsx` holds the exact structure, states and conditions of each screen; the screenshots show the result.
   - `i18n.js`: the Arabic and English copy used on the screens; the starting point for catalogue lines (review wording against the glossary).
   - `data.js`, `details-data.js`, `desk-data.js`, `owner-data.js`, `admin-data.js`: sample data only; the real rules live in `docs/architecture/data-model.md`.
3. **Neither wins automatically.** The design owns behaviour and look; the docs (ADRs, data-model, foundation) own the rules. Every conflict between a screen and the docs is recorded and decided.
4. **Each slice links its screens.** A feature PR names the SCREENS.md rows it implements and compares its result with the matching screenshots (light, dark, English, phone where they exist).

## Known limits of the archive

- **Navigation icons are placeholders.** Claude Design only had part of the icon set; the final icons are chosen in code (F-6).
- **Sample data is illustrative.** Some admin frames reuse text from another space (for example Golden Hub's edit form shows Focus Hub's description).
- **The Google button loads the Roboto font from Google Fonts;** offline it falls back to the system font.
- **Three older frames render with an error** and are superseded by later ones:
  - `Desk.html?role=reception&override=30` and `Owner overview.html?override=120`: the old override format. Use `Desk.html?override=full:84` or `closed:30`.
  - `Announcements.html?tab=ended&edit=a4`: the later announcement frames cover it.
