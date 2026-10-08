# 24. The status of each error type is written twice

**Status:** Open · **Date:** 2026-10-03

**Evidence:** the contract gives each error type its HTTP status ([api-contract §3](../../api/api-contract.md#3-error-types)). The API holds that table in `apps/api/src/shared/errors/appError.ts`. The web's normaliser (`apps/web/src/shared/errors/toAppError.ts`) needs it read backwards, to type a response that carries no envelope (a proxy's 502, say), and holds its own copy, because the shared package has none. A status changed in one place and not the other would type the same answer differently on each side.

**Resolves when:** the table moves into `packages/shared`, and both apps read it from there, in an item allowed to change the API.
