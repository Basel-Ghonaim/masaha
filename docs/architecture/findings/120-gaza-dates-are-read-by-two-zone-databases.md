# 120. Gaza dates are read by two zone databases

**Status:** Open · **Date:** 2026-10-21

**Evidence:** the database function `subscription_usage` (migration `subscription_usage`) dates each check-in with PostgreSQL's zone data (`AT TIME ZONE 'Asia/Gaza'`), while the rest of the API reads Gaza dates with Node's (`gazaClockOf`, conventions §11), and passes the function its today and its week's Saturday from them. Both lag Palestine's decrees alike, but they can lag differently: a check-in in the hour around midnight on a daylight-saving night could count on one day in a subscription's progress and on another in a visit's or the desk's reads. No test pins a transition in PostgreSQL, as `gazaTime.unit.test.ts` does in Node (step 8's plan, §6).

**Resolves when:** both read one source of zone data, or a test pins one transition in PostgreSQL as the shared calendar's test does in Node.
