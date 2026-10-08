# 11. Nested writes in an interactive transaction trigger a `pg` deprecation warning

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** during F-3, a script that validated the schema against the owner's six reference spaces ran `prisma.$transaction(async (tx) => …)` with nested creates (`space.create` with `hours`, `prices`, `amenities` and `contacts`). Node printed:

> `DeprecationWarning: Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0.`

The writes succeeded and rolled back correctly. The warning comes from Prisma's PostgreSQL adapter (`@prisma/adapter-pg` 7.10 on `pg` 8.23): inside an interactive transaction, all queries share one `pg` client, and the nested creates reach it while another query is still running. The API lane, which uses no interactive transactions yet, prints no such warning.

**Resolves when:** before `pg` is upgraded to 9, either a Prisma release serialises the queries of an interactive transaction, or the features that write nested data in a transaction are proven to work with `pg` 9 (for example, the admin's space creation, the first such feature). Until then, a `pg` major upgrade is not taken without checking this.

*Resolved (2026-10-06, S2b-1):* the admin's space creation, the first such feature, writes no nested data. In one transaction it writes the space, then its settings row through `space-settings`, then its audit entry, one statement after another. `createWithoutNestedWrites.api.test.ts` proves that this creation emits no such warning: `pg` warns once per process, so the test has a file of its own and watches the process's first creation. It proves nothing about nested writes themselves. On the versions in use (`@prisma/adapter-pg` 7.10, `pg` 8.23), a manual probe with the finding's own shape did not reproduce the warning either: a space created with its settings, hours, prices, amenities and contacts nested, in rolled-back interactive transactions, three in turn and two at once. The rule now lives in [conventions §8](../../backend/conventions.md#transactions).
