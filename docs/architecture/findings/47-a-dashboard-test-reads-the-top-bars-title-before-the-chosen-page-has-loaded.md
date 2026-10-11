# 47. A dashboard test reads the top bar's title before the chosen page has loaded

**Status:** Open · **Date:** 2026-10-10

**Evidence:** "opens the drawer with the pages and the language, and closes it when a page is chosen" (`apps/web/src/pages/dashboard/routes.component.test.tsx`, *the dashboard on a phone*) failed in two of three full `test:component` runs on S2b-3b's review fixes, each time after about 1.1 s, and passed alone. After choosing "Customers" in the drawer, it reads the title with `topBarTitle()`, which finds the top bar's current heading at once, still the overview's, and asserts its text with no wait. The chosen page loads lazily, so under a full run's load it arrives after the assertion. The test is older than S2b-3b, and S2b-3b's code does not touch it. Its other uses of `topBarTitle()` read a page opened by the address, whose title is the first one shown.

**Resolves when:** the test waits for the chosen page's title (`findByRole('heading', { level: 1, name })` in the top bar, as the add-space page's test does), proven by repeated full runs.
