# 113. The uncollected read grows with every auto-closed visit

**Status:** Resolved · **Date:** 2026-10-20

**Evidence:** `payments.service.ts`'s `uncollectedIn` reads every visit of the space ever closed by the auto check-out (`visits.repository.ts`, `autoClosedIn`), sums all their payments, and sends every settled id back as bound parameters (`autoClosedPage`, `id: { notIn: [...] }`). The list only grows. At some tens of thousands of settled auto-closed visits in one space, the statement nears PostgreSQL's 65,535 bound parameters and the read answers 500; long before that, it is slow. The plan held it fine at v1's scale (#97's review, nit 7).

**Resolves when:** the settled visits are filtered in SQL (one query over the non-voided payments, owned by `payments`) or by a stored flag, so a read costs what its page holds; an architecture choice for the owner.

**Resolution (2026-10-21, #102):** `payments` pages the uncollected visits in one query and its count, over the space's auto-closed visits not written off and their non-voided payments, the settled ones left out in SQL; `visits` answers only the page's visits. No id list is sent back; `autoClosedIn` and `autoClosedPage` are gone. The existing tests prove it unchanged.
