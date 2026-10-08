# 39. The users service takes a parameter only its unit test passes

**Status:** Open · **Date:** 2026-10-06

**Evidence:** no parameter exists only for tests ([testing §3](../../development/testing.md#3-rules-that-bind-every-test), rule 2; [conventions §2](../../backend/conventions.md#2-layers)). `createUsersService` (`apps/api/src/modules/users/users.service.ts`) takes `passwords`, the hashing and the verification, defaulting to bcrypt; the composition root never passes it, and only `users.service.unit.test.ts` does, with a fake. It is beside the repository parameter the older services still take ([finding 31](31-the-backend-documents-still-call-for-injecting-a-repository-only-tests-pass.md)), but it is not a repository, so the planned refactor of those services may not reach it.

**Resolves when:** the service hashes through its own module's helpers with no such parameter, its logic unit-tested in pure helpers and the rest in the API lane, in an item allowed to change the API; or the owner accepts it.
