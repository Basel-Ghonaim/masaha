# 27. Two dashboard chunks import each other

**Status:** Open · **Date:** 2026-10-05

**Evidence:** the build gathers the dashboard's own modules into one `dashboard` chunk, leaving out what it shares with the site ([architecture §3](../../frontend/architecture.md#3-capabilities-features)). What only the dashboard uses besides, today TanStack Query's `useQuery` and `publicSpacePath`, has no chunk of its own, so the bundler places it in the chunk of the space shell's lazy import (`SpaceLayout`). That chunk imports the `dashboard` chunk, and the `dashboard` chunk imports it back. Nothing breaks today, because every use across the two chunks happens inside a function. A dashboard module that used one of those imports at load time (a module-level `queryOptions(…)`, for example) would fail with a reference error when the space shell is the first dashboard page opened. `check:build` still classifies both chunks as dashboard code.

**Resolves when:** the build gives what only the dashboard uses a place that does not import the dashboard's chunk back (a second chunk group, for example), proven by the manifest, or a dashboard module first needs such an import at load time.
