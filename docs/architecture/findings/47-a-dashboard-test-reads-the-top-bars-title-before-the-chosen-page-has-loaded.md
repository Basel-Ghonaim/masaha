# 47. A dashboard test reads the top bar's title before the chosen page has loaded

**Status:** Resolved · **Date:** 2026-10-10

**Evidence:** "opens the drawer with the pages and the language, and closes it when a page is chosen" (`apps/web/src/pages/dashboard/routes.component.test.tsx`, *the dashboard on a phone*) failed in two of three full `test:component` runs on S2b-3b's review fixes, each time after about 1.1 s, and passed alone. After choosing "Customers" in the drawer, it reads the title with `topBarTitle()`, which finds the top bar's current heading at once, still the overview's, and asserts its text with no wait. The chosen page loads lazily, so under a full run's load it arrives after the assertion. The test is older than S2b-3b, and S2b-3b's code does not touch it. Its other uses of `topBarTitle()` read a page opened by the address, whose title is the first one shown.

**Resolves when:** the test waits for the chosen page's title (`findByRole('heading', { level: 1, name })` in the top bar, as the add-space page's test does), proven by repeated full runs.

**Resolution (2026-10-12, WEBBASE):** the test waits for the page it chose.
1. **Reproduced.** With 12 busy loops on 12 cores, the test as it was read "Overview" where it expected "Customers" in 4 of 5 runs of the file's phone tests: the overview's title, still in the top bar while the chosen page loaded.
2. **Fix.** `topBarTitle(name)` finds the top bar's heading by its name, so it waits until the chosen page's title is shown, and every use passes the title it expects. "Closes the drawer when another space is chosen in it" read the bar the same way after a move to another space, and takes the same wait. Seen failing: with "Customers" pointed at the front desk, the test fails with `Unable to find role="heading" and name "Customers"`.
3. **Proof.** Under the same load, the fixed test passed in 5 of 5 runs. In full `test:component` runs on a machine that two other folders' lanes shared (each run 400–570 s, about twice the lane's usual time), `main` failed the test in 2 of 2 runs, reading "Overview" again, and the fixed test passed in all 7 of the branch's. The same runs met another wait, the file's first wait for a lazy shell, recorded as [finding 55](55-a-files-first-wait-for-a-lazy-shell-outlasts-three-seconds-on-a-busy-machine.md).
