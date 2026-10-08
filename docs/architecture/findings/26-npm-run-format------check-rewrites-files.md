# 26. `npm run format -- --check` rewrites files

**Status:** Resolved · **Date:** 2026-10-04

**Evidence:** the root `format` script runs Prettier with `--write`, so `npm run format -- --check` passes both flags and rewrites every file it would only have reported. On F-5b3a it rewrote `apps/web/src/shared/preferences/preferences.unit.test.ts`, which is not Prettier-formatted on `main`, outside the item's scope; the file was restored by hand. A check that writes is a trap: it changes files the author never meant to touch.

**Resolves when:** a separate script checks without writing (for example `format:check`, `prettier --check .`), and the documents point to it.

**Resolution (2026-10-06, H-1):** `npm run format:check` runs `prettier --check .`, over the same files and ignores as `format`, and writes nothing. [Setup › Commands](../../development/setup.md#commands) and CLAUDE.md point to it. On `main` it failed on one file, `preferences.unit.test.ts`, which H-1 formatted with Prettier and changed in no other way. CI runs it as a check of its own, so the repository cannot drift again.
