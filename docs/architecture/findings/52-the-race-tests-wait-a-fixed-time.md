# 52. The race tests wait a fixed time

**Status:** Resolved · **Date:** 2026-10-12

**Evidence:** the API tests of a race hold a row in a test transaction, start a request, wait a fixed 2 seconds for it to reach the lock, then write and commit ([conventions › Concurrency](../../backend/conventions.md#concurrency)): `apps/api/test/locks.ts` and `sessionLock.api.test.ts`'s own helper. Nothing checks that the request is waiting on the lock. On a slow run, the request may start only after the commit: a race whose answer is the same either way then passes with no interleaving, and one whose request reads the state first fails instead.

**Resolves when:** the race tests wait until the request is seen waiting on a lock (for example `pg_stat_activity.wait_event_type = 'Lock'` for its backend), with a timeout, through one helper for every race test.

**Resolution (2026-10-17, #86):** every race test acts once its request is seen waiting on a lock. `waitingOnLock` in `apps/api/test/locks.ts` polls `pg_stat_activity` for a backend of the test database waiting on a lock and fails after four seconds; `whileHeld` and the tests that hold their own transaction call it. A race whose request never reached its lock now fails instead of passing without interleaving: with a test's hold removed, the helper's error failed the run.
