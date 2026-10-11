# 43. Two races around a space's facts

**Status:** Resolved · **Date:** 2026-10-07

**Evidence:** found by PR #48's review.
1. **A save can land on a space verified a moment before.** A save of a space's facts or profile locks the space's row, then lets `can()` decide from the links that the links loader read before the lock (`apps/api/src/modules/spaces/facts/groupEdit.ts`). Creating an owner link (step 4) does not take that lock, so an owner link committed between the links loader and the lock lets one admin save land on a space that is now verified.
2. **A read can mix two states of the hours.** The space's read (`space/space.service.ts`) reads the space and each fact group with separate statements, outside a transaction, while an hours save holds no lock against it: a read during that save can show the old week with the new shifts.

**Resolves when:** step 4's linking takes the space's lock, so `can()` decides on the links as they are under it; and the read is consistent, in one statement or in one snapshot.

**Resolution (2026-10-11, #60):** every link change takes the space's lock, and a save reads the space's links again under it (`linksUnder`), so `can()` decides on the links as they are. The space's read takes the same lock in share mode and reads the space, its facts and its links under it, so it waits for a save in progress (the owner's choice of a lock over a snapshot). API tests hold the lock while each runs: a save refused once an owner joined while it waited, a link that waits, and a read that answers a save whole. Each failed with its lock or its second read removed.
