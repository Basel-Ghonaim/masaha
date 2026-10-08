# 35. The web sets no document title

**Status:** Open · **Date:** 2026-10-06

**Evidence:** `apps/web/index.html` has no `<title>`, and no page sets `document.title`, so every tab and every history entry shows the page's address. A page without a title fails WCAG 2.4.2 (Page Titled, level A); the [accessibility baseline](../../frontend/design-system/foundation.md#10-accessibility-baseline) does not list titles yet.

**Resolves when:** every page has a title, in both languages, following the interface's language, with a default in `index.html`.
