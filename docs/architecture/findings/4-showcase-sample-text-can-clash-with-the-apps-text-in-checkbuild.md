# 4. Showcase sample text can clash with the app's text in `check:build`

**Status:** Resolved · **Date:** 2026-09-27

**Evidence:** `check:build` fails when `dist/` contains any string from the showcase's `fixtures.json`, and relies on fixture strings being phrases that occur nowhere else by chance. The copy catalogues are not built yet. Once they are, a catalogue entry equal to a fixture string will fail `check:build` although no showcase code reached the build. The toolbar's `Light theme` and `Dark theme` are likely catalogue entries for the theme setting. WI-5's samples avoid the app's likely words (the language toggle's sample is "English version", not "English"), but nothing enforces it. It has fired already: WI-7's first Tabs fixtures used values such as `all`, `active` and `details`, and `check:build` found them in the build's CSS and JavaScript, where they occur by chance. The values were renamed (`members-all-tab`).

**Resolves when:** the catalogue mechanism is built, and `check:build` either skips fixture strings that are also catalogue strings, or finds the showcase by what only it carries (its route path, which it already checks) rather than by its text.

*Reviewed (2026-09-28, WI-9):* still open. It is owned by F-4, the localisation mechanism in the [foundation plan](../../plans/foundation.md), which builds the catalogues.

**Resolution (2026-09-29, F-4):** the first catalogue strings in the build fired it: glossary terms such as `Expired`, `نشط` and `تسجيل حضور` occur in the fixtures too, and `المساحة` inside `صاحب المساحة`. `check:build` now leaves out any fixture string that the catalogues' source (`src/shared/copy`, tests excluded) also contains, whole or inside a longer line. The route path and every other fixture string still catch a leaked showcase.
