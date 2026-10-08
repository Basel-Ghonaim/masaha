# 28. The tests that wait for a lazy page can time out under load

**Status:** Resolved · **Date:** 2026-10-05

**Evidence:** in one full `test:component` run on F-6c2, "lists the owner’s eleven pages, the overview marked as the page shown" (`apps/web/src/pages/dashboard/routes.component.test.tsx`) failed after about 1.1 s with `Unable to find role="navigation" and name "Space dashboard"`: the lazily loaded space shell was not on screen within the default wait. The file passed three times alone, and the whole lane passed when run again.

On S2a-2 (2026-10-06) it is no longer the one file, nor only under a full run: with `apps/web` as on `main`, running `routes.component.test.tsx` and `apps/web/src/pages/site/auth/authPages.component.test.tsx` together failed twice out of two, each time in the first test that waits for a lazy page, after about 1.1 s: "shows its page to a guest, in the focus shell" (`Unable to find role="main"`), with "lists the owner’s eleven pages" or "opens the drawer with the pages". The item's branch failed the same tests in the same way.

**Resolves when:** the tests that wait for a lazy page or shell wait in a way that holds under load, proven by repeated full runs.

**Resolution (2026-10-06, H-1):** the wait, not the page.
1. **Cause.** Testing Library waits 1 s by default for what a test finds, and Vite's first transform of a lazily imported page or shell can take longer under a full run. Reproduced on `main` with the two files together: "shows its page to a guest" failed after 1057 ms.
2. **Fix.** `componentSetup.ts` raises the wait once, for the component lane, to 3 s. It stays below Vitest's 5 s test timeout, so an element that never appears still fails with Testing Library's message and the screen it searched. No test sets its own timeout, and production is unchanged.
3. **Proof.** The two files together passed 35/35. In a full run on a busy machine (598/598, 246 s), the slowest test that waits for a lazy page took 2003 ms in all, its wait included. Then two consecutive full runs of `test:component` passed, 598/598 each (249 s and 265 s).
