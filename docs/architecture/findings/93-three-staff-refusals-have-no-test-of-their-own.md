# 93. Three staff refusals have no test of their own

**Status:** Open · **Date:** 2026-10-18

**Evidence:** in `apps/api/src/modules/space-links/staff/staff.service.ts` (#90): the `role !== 'USER'` half of the re-issue's S5 check (the test uses a `USER` with an owner link; the clause is defensive, since an admin's role change refuses an account with links); the 404 for a **deactivated** reception link on the re-issue and the handover (the test covers another space's receptionist only); and `ACCOUNT_IS_ADMIN` on a re-activation. The expiry's second check, in the sign-in's `confirm` under the lock, has no break of its own either, as the plan accepted. Found in #90's review.

**Resolves when:** each has a test that its removal turns red.
