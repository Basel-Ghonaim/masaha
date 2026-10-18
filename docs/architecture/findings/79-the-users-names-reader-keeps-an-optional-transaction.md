# 79. The users' names reader keeps an optional transaction

**Status:** Open · **Date:** 2026-10-18

**Evidence:** `users.namesFor(ids, tx?)` (`apps/api/src/modules/users/users.service.ts:372`) and its repository's `findNames(ids, tx = db)` (`users.repository.ts:78`) take the transaction as optional. `ownersFor(spaceId, tx)` (`apps/api/src/modules/space-links/admin-spaces/adminSpaces.service.ts:31-34`) requires its own and passes it on, so the rule that a read inside a transaction never waits on a second connection ([conventions › Transactions](../../backend/conventions.md#transactions)) is held by `ownersFor`'s callers, not by the reader: a new caller inside a transaction can leave `tx` out and still compile. Its one caller without a transaction is the admin's spaces list (`adminSpaces.service.ts:61`). Found by #86's review.

**Resolves when:** `namesFor` takes its `tx` as a required `Tx | undefined`, so each caller says which it means (the list passing `undefined`), or a check refuses a read without `tx` inside `runInTransaction`.