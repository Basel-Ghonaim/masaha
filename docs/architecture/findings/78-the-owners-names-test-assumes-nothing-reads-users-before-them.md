# 78. The owners' names test assumes nothing reads `users` before them

**Status:** Open · **Date:** 2026-10-18

**Evidence:** the test "reads the owners' names on the read's own connection, inside its transaction" (`apps/api/src/modules/spaces/space/space.api.test.ts:404-449`) compares the backend that waits on the space's lock (`readWaiter`, line 419) with the one that waits on the `users` table (`namesWaiter`, line 437). It proves what its title says only because nothing the read does between the lock and the names touches `users`: `get` (`apps/api/src/modules/spaces/space/space.service.ts:92-105`) takes the share lock (line 97), then reads the links (line 99), the facts (line 101) and the owners (line 102). A read of `users` added before the owners, on the transaction's connection, would be the one found waiting, so the test would pass whichever connection then read the names. Found by #86's review.

**Resolves when:** the test identifies the names' own query (by its statement, not only its backend), or a guard fails when the read touches `users` before `ownersFor`.