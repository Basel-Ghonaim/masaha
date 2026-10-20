# 98. The capability documents outgrow their size guide

**Status:** Open · **Date:** 2026-10-20

**Evidence:** [documentation §5](../documentation.md#5-capability-documents) says a capability document is "about 1,200 words at most, so it can be read whole before a change". Measured with `wc -w` on `main` at `7d48c9c3`, seven are over it: `spaces.md` ≈ 11,000, `space-links.md` ≈ 9,000, `users.md` ≈ 3,600, `lookups.md` ≈ 2,900, `directory.md` ≈ 1,700, `auth.md` ≈ 1,600 and `occupancy.md` ≈ 1,480; #95 brings `occupancy.md` to ≈ 1,700. A document is read whole before a change to its capability ([workflow, Reading before work](../../development/workflow.md#reading-before-work)): the larger it grows, the costlier that reading, and the likelier a decision in it is missed. No rule says what to do when a document passes the guide, so each PR adds its lines and the sizes only grow.

**Resolves when:** the owner decides between a documentation item that brings the documents back within the guide (by the template's own rules: decisions as they hold today, links rather than restatements) and a revision of the guide itself; this finding proposes neither as decided.
