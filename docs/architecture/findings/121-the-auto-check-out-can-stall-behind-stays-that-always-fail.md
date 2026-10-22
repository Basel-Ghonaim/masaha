# 121. The auto check-out can stall behind stays that always fail

**Status:** Open · **Date:** 2026-10-22

**Evidence:** the auto check-out (`visits.service.ts` and `subscriptions.service.ts`, `autoCheckOut`) takes the due stays earliest first and closes at most a batch of them (`AUTO_CHECKOUT_BATCH`, 500) per run. A stay whose close always fails stays due, so it is taken again at the head of the next run's batch. Since [finding 114](114-a-stay-that-always-fails-turns-every-cron-call-red.md) the run answers 200 with a `failed` count. So 500 or more stays that always fail would fill every batch: the job would close nothing for any other space while the cron sees 200. A space without its settings row is filtered out before the batch, and `remaining` counts only what lies beyond the batch, so neither shows it. **Plausible, not proven:** no path that makes a close fail on every run is known today (the review of #102, finding 5).

**Resolves when:** the stays that failed on the last run are left out of the next batch, or ordered after the others; or a run answers 500 when it closed nothing while its failures filled the batch.
