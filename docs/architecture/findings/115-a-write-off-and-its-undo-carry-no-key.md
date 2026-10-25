# 115. A write-off and its undo carry no key

**Status:** Open · **Date:** 2026-10-21

**Evidence:** `POST` and `DELETE …/visits/:visitId/write-off` (`desk.service.ts`, `writeOffVisit`, `undoWriteOff`) are idempotent against a repeat of themselves only: a second write-off answers the visit as it is, and so does a second undo. Nothing ties a request to the state it saw. The owner writes a visit off on a weak connection, the answer is lost, and the owner undoes it; a client's or a proxy's retry of the first `POST` that lands after the undo writes the visit off again, with the first reason. The reverse order re-opens a written-off debt. Each flip is audited, and the interleaving needs a retry that outlives a later action, which is rare (#100's review, finding 3). **Accepted for v1** by the owner (2026-10-21), on one condition: **the desk's screen item must not retry these two routes automatically.**

**Resolves when:** the write-off becomes a create with an `Idempotency-Key` (ADR 0015's "every create the desk performs"), or each request sends the state it expects (`writtenOffAt` or `null`) and is refused 409 when it differs; or the screen is built with no automatic retry on either route, and the owner moves this to *Accepted*.

**Evidence (2026-10-25, #117):** the desk never re-sends the write-off or its undo by itself: both are sent with no key, which the transport never retries, and a lost answer is the owner's to retry (test 41, `useWriteOffDialog.component.test.tsx`).
