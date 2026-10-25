# 171. A published price changed between the desk's read and the subscribe is charged silently

**Status:** Open · **Date:** 2026-10-25

**Evidence:** a subscription from a published price (`POST …/customers/:customerId/subscriptions` with `published`, [api-contract › Subscriptions (managed)](../../api/api-contract.md#subscriptions-managed)) takes its amount from the server, as the contract says: `desk.service.ts` `subscribe` reads `spaces.standardPrice` under the space's lock, which the prices' save holds too, so it reads one committed set of prices. If the owner deleted that price meanwhile, the answer is 422 `invalid_choice` on `published`; if the owner changed its amount, the customer is charged the **new** amount, and nothing tells the desk it differs from the one it showed (#118's review, point 6). With a `payment` sized for the old amount, a lower new price makes the ledger refuse the overpayment (`PAYMENT_EXCEEDS_DUE`) and the whole subscribe fails; a higher one leaves a balance without warning. This follows the spec; it is not a defect of #118.

**Resolves when:** the owner decides with DESK_SCREENS PR 4: an optional `published.amountAgorot` the server compares, answering 409 when it differs; or the screen reading the price again before confirming; or the silent charge accepted.
