# 24. The status of each error type is written twice

**Status:** Resolved · **Date:** 2026-10-03

**Evidence:** the contract gives each error type its HTTP status ([api-contract §3](../../api/api-contract.md#3-error-types)). The API holds that table in `apps/api/src/shared/errors/appError.ts`. The web's normaliser (`apps/web/src/shared/errors/toAppError.ts`) needs it read backwards, to type a response that carries no envelope (a proxy's 502, say), and holds its own copy, because the shared package has none. A status changed in one place and not the other would type the same answer differently on each side.

**Resolves when:** the table moves into `packages/shared`, and both apps read it from there, in an item allowed to change the API.

**Resolution (2026-10-12, the deleted-spaces item):** the table is `ERROR_STATUSES` in `@masaha/shared/core`, with `errorTypeOfStatus`, the table read backwards. The API's `AppError` takes each type's status from it and its error handler types Express's own errors with the lookup; the web's normaliser types an answer without the envelope with the same lookup. A unit test in the shared package proves each status's type; the API lane still proves each type's status, and the web's unit test the normaliser's use of the table.
