# Localisation

> **Status:** Active · **Class:** Contract — rules to build against; the pre-paint script and the catalogue mechanism are built, no formatter is yet · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
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

- `Intl` pinned to Western digits and the Gregorian calendar, in both languages. Every `Intl` formatter is given the locale `ar-u-nu-latn` for Arabic, never plain `ar`, which can produce Arabic-Indic digits.
- Plurals via `Intl.PluralRules`. An Arabic counted line provides all six categories: `zero`, `one`, `two`, `few`, `many`, `other`. The first counted line brings Quick Tweets' Arabic plural test with it, which checks each form against sample counts.
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

`<html>` also carries `lang="ar" dir="rtl" data-theme="light"` in the markup, the result when the script cannot run. The script runs before the bundle exists, so it lists the registered languages by hand. `apps/web/src/app/prePaint.unit.test.ts` runs the shipped script against a stand-in browser, and holds it to the app's decisions ([below](#agreement-with-the-pre-paint-script)).

### Catalogues

The mechanism (`shared/localisation`) and the content (`shared/copy`) are separate modules. The mechanism never imports a catalogue: the composition root hands the catalogues in, so it knows one only as an object keyed by language. The pattern is lifted from Quick Tweets ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)).

**Layout.** `shared/copy/english/` and `shared/copy/arabic/` hold one file per section (`terms.ts` …), assembled by each folder's `index.ts`. `catalogues.ts` registers them as `CATALOGUES = { ar, en }`; a language is registered by being a key there.

**Shape and parity.**
- `Catalogue` is English's shape with its words widened (`shape.ts`): the same keys at every depth, a string wherever English has one, and a line that takes values takes the same parameters. A translation may leave a value unused; it cannot ask for another.
- Each Arabic section is written `satisfies Catalogue['<section>']`, and the Arabic catalogue `satisfies Catalogue`, so a missing line, an extra line or different parameters fails the typecheck.
- `catalogues.unit.test.ts` walks both catalogues and requires the same key paths and the same kind of line (words or a function) at each, which catches an extra line however a catalogue is assembled. It also refuses an empty line.

**Server codes.** `errors` has a line for every error type and domain code, and `validation` one for every field-error code. English types both sections against the codes in `@masaha/shared`, so a code added to the contract without its line, or a line for no code, fails the typecheck. A screen reads `copy.errors[error.code ?? error.type]` unless it has something more specific to say.

**Writing a line.** A key addresses a whole line, never a fragment. A varying value comes in through a function's named parameters, never by concatenation. No markup travels with text.

**Registration.** `app/bootstrap.ts` runs before the first render and calls `setupLocalisation({ catalogues: CATALOGUES, language })`. The fallback language, `ar`, must have a catalogue, or setup throws. Reading the language or a catalogue before setup throws.

**Reading the words.**
- In a component, `useCopy()` returns the active catalogue, and the component renders again when the language changes.
- In code that is not a component, `currentCopy()` returns it. Read it when the words are needed, never while a module loads, or it holds one language's words for the life of the page.
- Lookup is typed property access, not a key string: `copy.terms.space`.
- The design system never reads a catalogue. Its components take their words as props ([design-system foundation](design-system/foundation.md)).

**The language source.**
- The mechanism reads the active language from a source the composition root hands in: its value now, and a way to hear it change.
- Until the preferences store exists ([architecture.md §4](architecture.md#4-session-and-preferences)), the source is `documentLanguage`: `lang` on `<html>`, as the pre-paint script resolved it, watched for changes. It only reads, so it competes with no writer. The preferences store replaces it at bootstrap.
- A language without a catalogue resolves to `ar`.
- `App` feeds the `DirectionProvider` with `directionOf(useLanguage())`, so the direction follows the language.

#### Agreement with the pre-paint script

The script and the app share no code. `prePaint.unit.test.ts` holds them together:
- the script lists exactly the registered languages;
- it stamps each with the direction the app gives it;
- it falls back to the language the app falls back to.

The app writes no storage key yet. When the preferences store starts writing `masaha.language` and `masaha.theme`, the same test holds those keys equal.
