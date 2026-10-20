# 112. A key that closed a visit with no payment is not remembered

**Status:** Open · **Date:** 2026-10-20

**Evidence:** the desk's check-out (`desk.service.ts`, `checkOutVisit`) recognises a retried key only through the payment it recorded. A check-out with key K that records no payment (all of it left unpaid, or an unpriced close) leaves no trace of K. If K is then sent for another visit, that visit is checked out as a new request, and a real retry of the first request is answered `conflict` ("a key that paid another item") instead of its first result. It needs a client that reuses a key across two actions, which is a client fault (#95's review, nit 8).

**Resolves when:** a check-out's key is remembered whatever it recorded, so its retry always answers its first result, or the owner accepts the rule as it is.
