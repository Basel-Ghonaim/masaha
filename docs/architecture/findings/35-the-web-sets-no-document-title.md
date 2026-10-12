# 35. The web sets no document title

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** `apps/web/index.html` has no `<title>`, and no page sets `document.title`, so every tab and every history entry shows the page's address. A page without a title fails WCAG 2.4.2 (Page Titled, level A); the [accessibility baseline](../../frontend/design-system/foundation.md#10-accessibility-baseline) does not list titles yet.

**Resolves when:** every page has a title, in both languages, following the interface's language, with a default in `index.html`.

**Resolution (2026-10-12, WEBBASE):** each route says its page's title, and one place sets the document's.
1. **The route.** Every page route of the site and the dashboard carries its title in its `handle`, a function of the catalogue, so a title is in both languages by the catalogues' parity. `pageTitles.unit.test.ts` fails if a page route has none in either language.
2. **One place.** `DocumentTitle`, mounted once in the root layout, sets "{page} · Masaha" / "{page} · مساحة" from the deepest titled route, or the name alone, and follows the language and every navigation. The dashboard's top bar reads the same title (`usePageTitle`), so the two never disagree. `index.html` holds `مساحة` until the app runs.
3. **The baseline.** [Foundation §10](../../frontend/design-system/foundation.md#10-accessibility-baseline) lists the title; [architecture §2](../../frontend/architecture.md#2-page-groups) owns how it is set, a record's name included.
