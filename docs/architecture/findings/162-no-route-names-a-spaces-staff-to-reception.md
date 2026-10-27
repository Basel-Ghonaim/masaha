# 162. No route names a space's staff to reception

**Status:** Open · **Date:** 2026-10-25

**Evidence:** A subscription's statement (`GET …/subscriptions/:subscriptionId`) answers each payment with `recordedById` and a void's `byId`, never a name. The owner reads the reception accounts' names (`GET …/staff`, the owner's) and the payments list names who recorded each payment (`PaymentRow.recordedBy`), but reception reads no staff route, and its payments list is its own payments of today ([api-contract › `GET …/payments`](../../api/api-contract.md#get-managespacesspaceidpayments--)). The design's «سجّلها {name}» on a payment and «ألغاها {name}» on a void (DK-016, CP-009) cannot be shown to reception; the file's statement (#122) shows neither, for either role. #127: «دفعاتي اليوم» names who voided reception's own payment (`PaymentRow.voided.by`); the statement still names neither.

**Resolves when:** the statement names who recorded and who voided each payment (as the payments list's `PaymentRow` does), or a route gives the staff the space's staff names; and the statement shows them.
