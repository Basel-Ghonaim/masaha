# 100. An unpaid check-out moves a visit's customer to the phone's

**Status:** Open · **Date:** 2026-10-20

**Evidence:** the desk's check-out (`apps/api/src/modules/desk/desk.service.ts`, `checkOutVisit`) leaves any unpaid part to the customer found or created by the request's `phone`, and writes that customer on the visit even when the visit already has one. Its name falls back to an empty one when the visit has no `visitorName`. Neither can happen today: every visit is checked in by name, with no customer ([desk](../../features/desk.md)). Once step 8 checks a customer in as a visit (DK-020), an unpaid check-out sent with another phone would move that customer's debt to someone else (#95's review).

**Resolves when:** a visit that already has a customer keeps it at its check-out — the phone is not asked for it, or must be that customer's — proven by a test, when the customer's check-in is built.
