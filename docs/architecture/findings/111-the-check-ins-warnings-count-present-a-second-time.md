# 111. The check-in's warnings count *present* a second time

**Status:** Resolved · **Date:** 2026-10-20

**Evidence:** `occupancy.service.ts`'s `checkInWarnings` adds `visits.openIn(…).length + subscriptions.openCheckInsIn(…).length` itself, while the live read (`peopleIn`) and the directory (`liveStatusFor`) have their own forms of *present*. The three agree today, but [occupancy](../../features/occupancy.md) calls *present* one definition, and the warnings load every open row only to count them (#95's review, nit 7).

**Resolves when:** one `occupancy` helper answers *present* for a space, and the live read and the check-in's warnings both use it.

**Resolution (2026-10-22, #109):** `occupancy/present.ts` writes *present* once — `presentIn`, `presentCountsIn` and `isPresent`, from the open visits and the open check-ins — and the staff's read, the check-in's warnings, the directory's live status, the desk's archive and the customer's file all use it; `present.api.test.ts` proves the read, the warning and the directory count the same people.
