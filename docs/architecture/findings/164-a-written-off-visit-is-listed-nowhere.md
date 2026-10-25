# 164. A written-off visit is listed nowhere

**Status:** Open · **Date:** 2026-10-25

**Evidence:** the owner's write-off takes a visit out of the uncollected visits (`GET …/uncollected-visits` lists only those not written off) and out of its customer's unpaid visits in the file, and no route lists the written-off ones. The desk's screen (#117) can offer its undo only in the write-off's toast, which stays until it is closed (DI-29); once closed, a written-off visit cannot be found on any screen to undo it, though the API's `DELETE …/write-off` still would.

**Resolves when:** a read lists a space's written-off visits (with their reason, who and when), and a screen offers their undo there; or the owner accepts the toast as the undo's only place.
