# 45. The data table's library reaches the site's first download

**Status:** Open · **Date:** 2026-10-07 · **Corrected:** 2026-10-08

**Evidence:** the admin's spaces page (S2b-3a) is the first screen built on the design system's `DataTable`, so TanStack Table enters the build. The site's entry imports the design system through its one entry (`shared/design-system/index.ts`), which re-exports `DataTable`, and the web package declares no `sideEffects`, so the bundler keeps the table as a static import of the entry: it lands in the chunk of the platform modules the entry imports (`api-*.js`), which grew from 440,110 to 509,718 bytes (minified) with the page. Every visitor of the public site downloads it, though only the dashboard draws a table. This PR triggers it; the entry and the missing `sideEffects` were already there. `check:build` passes, since it refuses only the dashboard group's and the dashboard-only capabilities' modules in the first download ([architecture §3](../../frontend/architecture.md#3-capabilities-features)), and the design system is neither.

**Resolves when:** a `sideEffects` declaration in the web package, or a separate entry for the design system's data components, keeps the table out of the site's first download, proven by the manifest. The fix waits for S2b-3b, which brings Leaflet into the build too.
