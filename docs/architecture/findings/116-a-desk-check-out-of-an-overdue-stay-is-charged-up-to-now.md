# 116. A desk check-out of an overdue stay is charged up to now

**Status:** Resolved · **Date:** 2026-10-21

**Evidence:** since #100, `autoCheckoutDue` bounds every stay by 23:59 of its check-in's Gaza day, and the data model says a stay never crosses into the next day. But the desk's check-out (`desk.service.ts`, `checkOutVisit`) charged a stay up to the quote's time, at most five minutes old, and never read the due time; the quote and the charges so far did the same. With the cron down, switched off, or not yet run since 23:59, a check-out the next morning closed and charged a visit across midnight, for every hour since check-in, capped only when the day-price cap is on: the bound held for the job alone (#100's review, finding 4).

**Resolves when:** every path that closes or prices a stay stops at its due time, or the data model says the bound is the job's alone; the owner's choice.

**Resolution (2026-10-21, #102):** the owner chose the first. A desk check-out charges a stay up to the earlier of the quote's time and its due time, and records that time as its `checkedOutAt`, as the auto check-out would have (the audit keeps the request's own time); the quote and the charges so far stop at the due time too.
