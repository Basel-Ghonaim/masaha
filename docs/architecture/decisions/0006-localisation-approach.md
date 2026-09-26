# ADR 0006 — Localisation: typed catalogues, language not in the URL

> **Status:** Accepted · **Date:** 2026-09-26

## Context
Masaha is Arabic-first and bilingual from day one. Quick Tweets built a localisation mechanism with typed catalogues (the Arabic catalogue is typed in the English catalogue's shape), a pre-paint script that stamps `lang` and `dir`, and `Intl` pinned to Western digits and the Gregorian calendar. Moving hardcoded strings into catalogues after the fact was that project's most expensive step.

## Decision
- **Reuse Quick Tweets' typed catalogues** (one catalogue per language, English shape as the type). A missing key or a wrong parameter fails the build.
- **Fallback:** if lifting the mechanism out cleanly takes more than two days, use react-i18next with typed resources, keeping the catalogue-parity test.
- **Language is not in the URL.** It is resolved from the reader's stored choice and browser, with **Arabic** as the default; the exact order is owned by [localisation.md](../../frontend/localisation.md).
- **Direction follows language** (`ar` → `rtl`, `en` → `ltr`) and is never chosen separately.
- **Pre-paint script** sets `lang`, `dir` and `data-theme` before first paint.
- **`Intl` pinned** to Western digits and the Gregorian calendar; Arabic plurals via `Intl.PluralRules`.
- **The server sends codes, never display text**; the client translates error codes and field-error codes.
- **Every string goes through the catalogue from the first component.**

## Alternatives
- **Language in the URL (`/ar/...`)** — rejected: its benefit is search-engine indexing per language, which is not a v1 goal; it complicates routing and links.
- **react-i18next from the start** — kept as the fallback; the reused mechanism is already built and gives stronger compile-time guarantees.

## Consequences
- Adding a string means adding it to both catalogues in the same PR.
- Arabic default: a first-time visitor with no Arabic or English browser language sees Arabic.
