# 124. A statement's sums and its payments come from different snapshots

**Status:** Resolved · **Date:** 2026-10-22

**Evidence:** `GET …/subscriptions/:subscriptionId` (`desk.service.ts`, `statement`) reads the paid and the balance (`itemBalances`), the payments, the check-ins and the renewal as separate queries on the pool, with no transaction. A payment or a check-out committed between them answers a statement whose `paidAgorot` is not the sum of the payments it lists not voided, or whose `progress.minutesUsed` is not the sum of its check-ins' minutes; to an accountant, a broken statement. The window is milliseconds and a reload fixes it. The customer's file (`customerFile`) has the same shape, also read without a lock (the review of #106, finding 4). **The statement's screen item** (step 8's web) decides it.

**Resolves when:** the statement and the file are each read in one `REPEATABLE READ` transaction (their reads already take a `tx`); or the screen item accepts the lag and says so.

**Resolution (2026-10-25, #118):** the first. The statement and the file are each read in one read-only `REPEATABLE READ` transaction, every read on its `tx`; an API test holds the visits' table while a check-in and a payment commit, and the answer's sums still match its lists ([conventions › Composed reads](../../backend/conventions.md#composed-reads)).
