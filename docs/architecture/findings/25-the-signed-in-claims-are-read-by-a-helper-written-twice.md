# 25. The signed-in claims are read by a helper written twice

**Status:** Open · **Date:** 2026-10-04

**Evidence:** a controller behind `requireAuth` reads the user's claims from `req.auth` through a small `signedIn(req)` helper, which throws 401 when they are missing. It is written in `apps/api/src/modules/users/users.controller.ts` and again in `apps/api/src/modules/space-links/space-links.controller.ts`, and each new module with a `me` router would add another copy.

**Resolves when:** the helper moves to `shared/auth`, beside `requireAuth`, and both controllers use it, in an item allowed to touch both modules.

*Progress (2026-10-05, S2a-1):* the helper exists in `shared/auth` (`signedIn`), and the `lookups` controllers use it. The two old copies remain.
