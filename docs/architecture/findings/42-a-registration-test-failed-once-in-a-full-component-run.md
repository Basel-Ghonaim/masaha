# 42. A registration test failed once in a full component run

**Status:** Resolved · **Date:** 2026-10-07

**Evidence:** in one full `test:component` run on S2b-2's head, "welcomes the new account by its name" (`apps/web/src/features/auth/hooks/register/useRegister.component.test.tsx`) failed after 761 ms; the lane took 241 s. Its message was not kept. The file passed alone, and the whole lane passed when run again (599 tests). S2b-2 changed no web file. The failure came well inside the lane's 3 s wait for an element ([finding 28](28-the-tests-that-wait-for-a-lazy-page-can-time-out-under-load.md)), so it was not that wait running out.

**Resolves when:** the failure is reproduced (for example, the lane run repeatedly or under load) and its cause found and fixed; or repeated full runs show it does not recur.

**Resolution (2026-10-12, WEBBASE):** the test checked a toast before the toast library had shown it.
1. **Cause.** Sonner adds a toast inside a timer, outside React's `act`, and draws it at opacity 0 (`data-mounted="false"`). It shows it on a later render, scheduled from an effect. `findByText` finds the text as soon as it is in the page, and resolves after a zero-delay timer, which normally runs after that render. On a busy machine the order can flip, and `toBeVisible()` then fails at once, well inside the 3 s wait. That matches the failure after 761 ms.
2. **Reproduced.** The test file alone passed 50 of 50 runs unloaded. A probe repeating its pattern found the toast at opacity 0, unmounted, the moment its text first appeared, in 20 of 20 toasts. After `findByText` resolved it was visible in 80 of 80 unloaded, and invisible in 2 of 200 with 24 busy loops on 12 cores.
3. **Fix.** The test waits until the toast shows: `findToast` (`src/test/findToast.ts`) finds the toast's text and waits until it is visible. Every test that checked a toast's visibility right after finding it takes it: the registration's, Google sign-in's (two), the password change's, the providers', and the three of `spaces` that read a toast's title.
4. **Proof.** Under the same load, the toast was visible when `findToast` returned in 200 of 200. In 9 full `test:component` runs on a machine that two other folders' lanes shared (2 of `main`, 7 of the branch, each 400–570 s), no toast test failed.
