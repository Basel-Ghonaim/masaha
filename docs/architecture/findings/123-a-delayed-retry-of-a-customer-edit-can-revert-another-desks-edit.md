# 123. A delayed retry of a customer edit can revert another desk's edit

**Status:** Open · **Date:** 2026-10-22

**Evidence:** `PATCH …/customers/:customerId` (`customers.service.ts`, `edit`) carries no key and no expected state, and applies every field it is sent (`customerChange`). Desk A saves the whole form, name and phone, and the answer is lost; desk B renames the customer; A's retry lands and writes the old name back. Both writes are audited, and the interleaving needs a retry that outlives another desk's edit, which is rare (the review of #102, finding 8). It is the class of [finding 115](115-a-write-off-and-its-undo-carry-no-key.md). **The customers' screen item** (step 8's web: screens 14 and 15) decides it.

**Resolves when:** the screen sends only the fields the user changed and never retries an edit automatically; or the edit sends the values it saw and is refused 409 when they differ.
