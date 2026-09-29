# ADR 0010 — Payments: a manual, append-only ledger

> **Status:** Accepted · **Date:** 2026-09-29

## Context
The scope change of 2026-09-29 brings money into v1. Spaces charge visits and subscriptions, collect in cash or by transfer, often in parts, and owners want to see their income and who owes them. No money moves through Masaha: the platform records what the desk received. Reception staff record most payments ([ADR 0009](0009-space-scoped-reception-role.md)), so the owner must be able to trust the totals.

## Decision
1. **Manual recording.** Staff enter each payment: amount, method (cash or transfer), date received and who recorded it. Online payment is not in v1.
2. **One payment settles one item**, a visit or a subscription. An item may have several payments (partial payments). An amount spread over several items is recorded as one payment per item, oldest item first by default.
3. **Append-only.** A payment is never edited or deleted. A mistake is corrected by voiding the payment: only the owner can void, with a reason. The ledger keeps who recorded it, who voided it and when. A voided payment counts nowhere.
4. **Balance** = amount due − the payments that are not voided. Each item has a payment status: paid, partly paid or unpaid. A payment may exceed what remains due only on a usage-based subscription, as a prepayment; the balance then shows as credit («له رصيد»). Credit stays on that subscription and cannot be transferred. There are no refunds in v1.
5. **Cash basis.** Income is the money received: payments that are not voided, counted by the date received. What is owed and not yet received is debt, shown separately.
6. **Prices are snapshots.** Amounts are integers in agorot. A visit's or subscription's prices are copied into it when it is created, so a later price change never rewrites what someone owes. A price typed at the desk records who set it.
7. **Warnings, not blocks.** Renewing a customer who has a balance shows a warning.

The rules that derive due amounts, balances, debt and income are owned by [data-model.md › Derived values](../data-model.md#derived-values-computed-not-stored).

## Alternatives
- **Editable or deletable payments** — rejected: a total that no one can trust, and a correction that leaves no trace. A void keeps both the trace and the reason.
- **Accrual income** (income when charged) — rejected: owners count the cash they received; debt is shown on its own.
- **Live prices, no snapshots** — rejected: raising a price would change what past customers owe.
- **A general ledger** (accounts, transfers, credit across items) — rejected for v1: more than the desk needs. Credit on a usage-based subscription covers prepayment.

## Consequences
- Every total (balances, debt, income, collections per staff member) is derived, never stored.
- Recording and voiding a payment are audit-log entries, visible to the space's owner and never to the admin (ADR 0009).
- Payments join check-ins and audit entries as records that are never deleted ([ADR 0007](0007-soft-delete.md)).
