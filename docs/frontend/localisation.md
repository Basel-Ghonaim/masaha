# Localisation

> **Status:** Active · **Class:** Contract — rules to build against; the pre-paint script is built, the catalogue mechanism is not yet implemented · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
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

### Before first paint

An inline script in `apps/web/index.html` runs before the stylesheet and sets three attributes on `<html>`:

- `data-theme`: the stored choice, else the system preference (`prefers-color-scheme`).
- `lang`: the stored choice, else the first of `navigator.languages` whose base language is registered, else `ar`.
- `dir`: from the language.

The choices are stored in `localStorage` as plain strings: `masaha.theme` (`light` | `dark`) and `masaha.language` (`ar` | `en`). An unknown value, or storage that cannot be read, falls through to the next source. The preferences store ([architecture.md §4](architecture.md#4-session-and-preferences)) must write these keys in this form.

`<html>` also carries `lang="ar" dir="rtl" data-theme="light"` in the markup, the result when the script cannot run. Until catalogues exist, the script lists the registered languages by hand. `apps/web/src/app/prePaint.unit.test.ts` runs the shipped script against a stand-in browser.

### Catalogues

**Deferred.** Written when the catalogue mechanism is lifted from Quick Tweets (build step 1). It will cover how catalogues are registered and read (`useCopy`, non-component access), and the test that keeps the pre-paint script's languages and storage keys in agreement with the app.
