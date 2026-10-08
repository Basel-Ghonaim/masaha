# 43. Two races around a space's facts

**Status:** Open · **Date:** 2026-10-07

**Evidence:** found by PR #48's review.
1. **A save can land on a space verified a moment before.** A save of a space's facts or profile locks the space's row, then lets `can()` decide from the links that the links loader read before the lock (`apps/api/src/modules/spaces/facts/groupEdit.ts`). Creating an owner link (step 4) does not take that lock, so an owner link committed between the links loader and the lock lets one admin save land on a space that is now verified.
2. **A read can mix two states of the hours.** The space's read (`space/space.service.ts`) reads the space and each fact group with separate statements, outside a transaction, while an hours save holds no lock against it: a read during that save can show the old week with the new shifts.

**Resolves when:** step 4's linking takes the space's lock, so `can()` decides on the links as they are under it; and the read is consistent, in one statement or in one snapshot.
