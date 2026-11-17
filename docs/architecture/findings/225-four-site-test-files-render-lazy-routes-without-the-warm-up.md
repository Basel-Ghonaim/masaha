# 225. Four site test files render lazy routes without the warm-up

**Status:** Resolved · **Date:** 2026-11-12

**Evidence:** [testing §3](../../development/testing.md#3-rules-that-bind-every-test) rule 8 has a file that renders lazily loaded routes pay their first load in a `beforeAll` before any wait. `apps/web/src/pages/site/shell/SiteAccount.component.test.tsx` and `apps/web/src/pages/site/auth/changePasswordPage.component.test.tsx`, `forgotPasswordPage.component.test.tsx` and `resetPasswordPage.component.test.tsx` render the site's routes with none. On 2026-11-12, in a run of nine component files, SiteAccount's first test missed its 3 s wait for the header (3057 ms, the body still empty) and passed alone, 5 of 5: [finding 55](55-a-files-first-wait-for-a-lazy-shell-outlasts-three-seconds-on-a-busy-machine.md)'s family. Lane B of the identity item noted the three auth files.

**Resolves when:** each of the four warms the modules it opens in a `beforeAll`, as rule 8 says.

**Resolution (2026-11-15, #149):** each of the four files warms the modules its tests open in a `beforeAll` with a 60 s timeout (`warm(...)`), as [testing §3](../../development/testing.md#3-rules-that-bind-every-test) rule 8 says.
