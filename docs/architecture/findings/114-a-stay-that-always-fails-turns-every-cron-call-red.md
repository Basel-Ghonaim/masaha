# 114. A stay that always fails turns every cron call red

**Status:** Resolved · **Date:** 2026-10-21

**Evidence:** since #100, each job of the timed jobs' endpoint closes its stays one by one, logging one that cannot be closed and going on; but the job then threw when any stay had failed (`visits.service.ts` and `subscriptions.service.ts`, `if (failed > 0) throw`), and the endpoint answered 500 for any failed job (`shared/jobs/jobs.routes.ts`). A stay that cannot be closed stays due on every run — a space without its settings row, or a row the update refuses — so every run answered 500 until someone fixed the data. A free cron service, as the setup's runbook suggests, may switch a job off after a run of failed calls; one bad stay would then end the auto check-out for every space (#100's review, finding 1).

**Resolves when:** a stay that cannot be closed no longer fails the run, while a job that cannot run still does, and the runbook says where the failed stays are read.

**Resolution (2026-10-21, #102):** each job counts the stays it could not close in `failed` and answers its counts; the endpoint answers 200 then, and 500 only when a job itself threw. The setup's runbook sends the owner to the logs' `stay not closed` lines.
