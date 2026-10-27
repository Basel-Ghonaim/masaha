# 125. The allocation's order is not exposed to the client

**Status:** Resolved · **Date:** 2026-10-22

**Evidence:** a subscribe's amount is allocated over the customer's items in `itemBalances`' order (`payments.repository.ts`: `created_at`, a visit first, then id), and no answer carries that key: `SubscriptionState` has no `createdAt`, the file lists subscriptions the latest started first and unpaid visits by their own order. So the desk cannot show which debts an amount will settle before it sends it; it learns it only after, from `NewSubscription.payments`. A renewal made today that starts next month sorts after a visit from yesterday, though its `startsOn` suggests the opposite. The server decides, as planned (the review of #106, finding 5). **The subscriber desk's screen item** decides it.

**Resolves when:** the screen shows the allocation only after the request; or the API answers each item's `createdAt`, or a quote of the allocation for an amount.

**Resolution (2026-10-26, #124):** the first. The sheet shows the prior debts and their total, and the allocation after the request, from the answer: the toast lists each part `NewSubscription.payments` allocated ([desk › Web decisions](../../features/desk.md#web-decisions)).
