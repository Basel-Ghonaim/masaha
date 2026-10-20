# 110. The desk prototype's uncollected visits disagree with the owner's decisions

**Status:** Open · **Date:** 2026-10-20

**Evidence:** the desk prototype (`desk-core.jsx`, `desk-data.js` in the design archive) disagrees with the decisions the API builds (#100) in three places:
- its `WriteOffDialog` says the write-off cannot be undone; the owner made it reversible (K6);
- its `PayDialog` with `remainder="uncollected"` leaves a partial payment's rest uncollected with no phone; the owner requires a phone, so the rest is a customer's debt ([data model › Unpaid visit](../data-model.md#front-desk-and-money));
- its `unpaid` list holds visits checked out by hand and left unpaid («خرج بدون دفع»), which the contract keeps out of the uncollected visits: their rest is a customer's debt.

**Resolves when:** the desk's screen item builds the «غير محصّلة» tab and its dialogs to the contract, or the prototype is corrected first.
