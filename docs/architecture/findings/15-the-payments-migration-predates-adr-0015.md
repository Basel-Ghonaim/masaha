# 15. The payments migration predates ADR 0015

**Status:** Open · **Date:** 2026-10-01

**Evidence:** the payments migration (`apps/api/prisma/migrations/20260929120300_payments/migration.sql`) was written before [ADR 0015](../decisions/0015-idempotency-and-concurrency.md):
1. **Its comment** says "The services check the same rules first, to answer with a domain error; these are the backstop". Under ADR 0015 the services do not repeat the ledger's rules: the database owns them, and a violation is translated into a domain code ([conventions §13](../../backend/conventions.md#13-idempotency-and-concurrency)). No service exists yet, so nothing behaves differently. Migrations are never edited, so the comment stays. **Accepted:** ADR 0015 and data-model.md govern.
2. **One constraint name, two causes.** The insert trigger raises `payments_within_due` both when a payment would exceed the amount due, and when a visit is paid before its charge is set. The translation table of [conventions §4](../../backend/conventions.md#4-errors) maps a constraint's name to one code, so an uncharged visit would read as `PAYMENT_EXCEEDS_DUE`. **Open.**

**Resolves when:** item 2 is settled by the slice that builds the payments endpoint, before the translation table gains `payments_within_due`: a new migration gives the uncharged visit its own constraint name and code, or the payments flow makes that case unreachable and a test proves it.
