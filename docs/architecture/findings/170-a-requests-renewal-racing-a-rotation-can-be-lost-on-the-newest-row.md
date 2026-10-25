# 170. A request's renewal racing a rotation can be lost on the newest row

**Status:** Open · **Date:** 2026-10-25

**Evidence:** reception's idle clock ([security.md › Tokens and cookies](../../backend/security.md#tokens-and-cookies)) lives on the session's refresh-token rows. `requireAuth` renews it over the whole family (`sessions.repository.ts` `renewActivity`, one `UPDATE`), the idle check reads the **newest** row (`familyActivity`), and a refresh copies the presented row's value into the new one (`sessions.service.ts` `rotate`). Reasoned, not run (#118's review, point 5): a refresh in one tab inserts the new row inside its transaction and locks the old one; a request of another tab at the same moment runs its `UPDATE`, which under READ COMMITTED cannot see the uncommitted new row, waits on the old row's lock and renews only the old row. The newest row keeps the earlier time, so the session can end early, up to the time since that earlier renewal, if nothing renews it within a minute. It needs two tabs and a refresh within the same milliseconds; the cost is one sign-in sooner than due, never a session kept alive.

**Resolves when:** `familyActivity` reads `max(last_activity_at)` over the family and the rotation copies that maximum (or the renewal takes the session lock), with a test of the race; or the owner accepts the early sign-in.
