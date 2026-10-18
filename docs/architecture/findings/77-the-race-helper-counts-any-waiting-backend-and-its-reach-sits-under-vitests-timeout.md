# 77. The race helper counts any waiting backend, and its reach sits under Vitest's timeout

**Status:** Open · **Date:** 2026-10-18

**Evidence:** `waitingOnLock` (`apps/api/test/locks.ts:19-41`), called without `on`, counts every backend of the test database whose `wait_event_type` is `Lock` (line 30), not the request the race started: a race whose own request never reached its lock still passes once any other backend of that database waits, as `whileHeld` calls it (line 65). Its reach, `REACH_MS` (line 10), is 4 seconds, under Vitest's default test timeout of 5 seconds (`apps/api/vitest.config.ts` sets none): on a slow machine a request that hashes a password first can take longer than the reach, and the test fails though the race is sound. Found by #86's review; one test file runs at a time against its own database, so no unrelated waiter has appeared yet.

**Resolves when:** every race names the table its request waits on (`on`), `whileHeld` included, or the helper follows the request's own backend; and the reach and the race tests' timeout are set together, the reach well under the test's own limit.