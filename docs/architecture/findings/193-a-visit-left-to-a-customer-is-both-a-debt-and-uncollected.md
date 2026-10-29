# 193. A visit left to a customer is both a debt and uncollected

**Status:** Open · **Date:** 2026-10-29

**Evidence:** Finance's debts (`GET …/finance/debts`, #131) answer in one `meta.totals` what is owed (`owed`, the ledger's balance rule, `balancesOf`) and the uncollected visits (`uncollected`, the desk's list, `payments`' one rule `uncollectedOf`). The desk's list keeps every visit closed by the auto check-out that still owes, with or without a customer; «تسجيل دينًا» sets the visit's customer and leaves it closed by the auto check-out, so it stays on the list (`desk/debt.api.test.ts`), and its rest is also in that customer's debt. Such a visit's agorot are in both `owed.agorot` and `uncollected.owedAgorot`, and its customer in `owed.customers`: a screen adding the two would show the owner twice what is owed. As built, the contract (*Finance*) and [finance](../../features/finance.md) say the two figures overlap and are never added, and `finance/debts.api.test.ts` pins it (the review of #131, R2-F1). The owner's Q2 speaks of "a walk-in's uncollected visit" only, so it does not say which was meant.

The choice is the owner's: (a) keep it as built, the uncollected count equal to the desk's list; or (b) finance's `uncollected` leaves out the visits that have a customer, so the two figures are disjoint and may be added. (b) cannot change the shared `uncollectedTotals`, since AC-O2 asks that the overview's uncollected count equal the desk's list: finance would read a narrower count of its own, a second rule beside the desk's.

**Resolves when:** the owner chooses: (a) and this finding is *Accepted*; or (b), and finance's `uncollected` leaves out a visit with a customer, its test and documents changed with it.
