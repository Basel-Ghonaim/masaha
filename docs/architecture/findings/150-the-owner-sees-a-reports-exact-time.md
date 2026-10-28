# 150. The owner sees a report's exact time

**Status:** Accepted · **Date:** 2026-10-25 · **Accepted:** 2026-10-25

**Evidence:** the owner's list of a space's data reports (`GET /manage/spaces/:spaceId/data-reports`, [api-contract › Data reports](../../api/api-contract.md#data-reports)) never names the reporter (O12, [data-reports](../../features/data-reports.md)), but it answers each report's `createdAt` to the millisecond, and is ordered by it. The same owner reads the desk's check-ins and visits, with names and times. In a small space with few people present, a report that appears minutes after one person's check-in can narrow the reporter to one or two people, which works against O12: a reporter must not fear the space (#120's review, point 1). This is the approved shape (`SpaceReport.createdAt`), not a defect of #120. #129: the owner's screen shows a report's day only.

**Resolves when:** the owner's `createdAt` is coarsened (to the Gaza day, or the hour) and the list ordered by it, the reporter and the admin keeping the exact time; or the exact time is accepted.

**Resolution (2026-10-25, #120's review):** the owner accepted the exact time as built (the approved shape). The option not taken: coarsening the owner's `createdAt` to the Gaza day or the hour. No code changes.
