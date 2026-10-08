# 42. A registration test failed once in a full component run

**Status:** Open · **Date:** 2026-10-07

**Evidence:** in one full `test:component` run on S2b-2's head, "welcomes the new account by its name" (`apps/web/src/features/auth/hooks/register/useRegister.component.test.tsx`) failed after 761 ms; the lane took 241 s. Its message was not kept. The file passed alone, and the whole lane passed when run again (599 tests). S2b-2 changed no web file. The failure came well inside the lane's 3 s wait for an element ([finding 28](28-the-tests-that-wait-for-a-lazy-page-can-time-out-under-load.md)), so it was not that wait running out.

**Resolves when:** the failure is reproduced (for example, the lane run repeatedly or under load) and its cause found and fixed; or repeated full runs show it does not recur.
