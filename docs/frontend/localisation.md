# Localisation

> **Status:** Active · **Class:** Contract — rules to build against; the mechanism is not yet implemented · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** Languages, resolution, catalogues and formatting rules in `apps/web`. The reasoning is in [ADR 0006](../architecture/decisions/0006-localisation-approach.md); direction rules for components are in [design-system/foundation.md §8](design-system/foundation.md).

## Languages and resolution

- Registered languages: `ar` (RTL), `en` (LTR). A language is registered by having a catalogue.
- Resolution order: the stored choice → the browser's languages, matched on base language (`ar-EG` → `ar`) → `ar`.
- Signed-in users: the account's language wins once the session restores.
- **Not in the URL.** Direction follows language and is never set separately.
- `lang`, `dir` and `data-theme` are set on `<html>` **before first paint**.
- The language switcher lists each language in its own words: «العربية», «English».

## Catalogues

- One catalogue per language; the English catalogue defines the shape and the Arabic one is typed against it. A missing key or wrong parameter fails the build.
- Every user-facing string is in both catalogues from the first component. Nothing is hardcoded.
- Keys: dot.separated camelCase by area: `spaces.filters.availableNow`, `attendance.checkIn.success`, `errors.MEMBER_ALREADY_CHECKED_IN`, `validation.too_short`.
- Every server error code and field-error code has an entry in both catalogues.
- The owner approves Arabic copy.

## Formatting

- `Intl` pinned to Western digits and the Gregorian calendar.
- Plurals via `Intl.PluralRules` (Arabic has six forms).
- Prices with currency `ILS`, rendered LTR inside RTL text.
- Dates and times in the active language; time zone `Asia/Gaza`.

## Content in two languages

Space content has Arabic (required) and English (optional) fields. When English is missing, the English interface shows the Arabic text with `lang="ar" dir="rtl"` on that element.

## Mechanism

**Deferred.** Written when the catalogue mechanism is lifted from Quick Tweets (build step 1): how catalogues are registered and read (`useCopy`, non-component access), the pre-paint script and the test that keeps it in agreement with the app, and where the choice is stored.
