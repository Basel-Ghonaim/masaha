# 213. A cron every 5 minutes keeps Neon's free database awake all month

**Status:** Resolved · **Date:** 2026-11-01 · **Resolved:** 2026-11-01

**Evidence:** online, an external cron calls the timed jobs' endpoint ([api-contract › Internal](../../api/api-contract.md#internal)), and the documents said every 5 minutes, the local timer's interval. Neon's free tier suspends the database after 5 idle minutes and allows 100 compute-hours a month, beyond which the database is suspended until the next month ([ADR 0014](../decisions/0014-deployment.md)). A call every 5 minutes never leaves it idle for 5: at the smallest compute, 0.25 CU, it runs the whole month, about 730 hours, or about 180 CU-hours, so the database would stop mid-month for every visitor (the owner's evidence, 2026-11-01, `0_OWNER_DECISIONS.md` item 2).

**Resolves when:** the online cron runs rarely enough that the database sleeps between calls, within the free hours, and every document that names the online interval says so.

**Resolution (#133):** The online cron runs every 15 minutes; the local server's timer stays at 5 ([conventions §12](../../backend/conventions.md#12-environments)). Each call wakes the database for about the 5 idle minutes that follow it, about a third of the month at 0.25 CU: about 60 CU-hours, leaving the rest of the 100 to the visitors' own use, to be watched on Neon's usage page once the site is live ([setup › Timed jobs](../../development/setup.md#timed-jobs)). A later run never corrupts data: an auto check-out records the cut-off it was due at, never the time the job ran.
