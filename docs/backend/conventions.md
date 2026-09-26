# Backend Conventions

> **Status:** Active · **Class:** Contract — rules to build against; not yet implemented · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** Module layering, dependency injection, validation, errors and pagination in `apps/api`. Payload shapes are owned by the [API contract](../api/api-contract.md); security mechanisms by [security.md](security.md).

## 1. Layout

```
apps/api/src/
  app.ts               builds the Express app (middleware order, routes, error handler)
  server.ts            starts it (env check, DB check, graceful shutdown)
  config/env.ts        Zod-validated environment; fails fast
  modules/<feature>/   auth, me, spaces, manage, members, attendance, announcements,
                       occupancy, reports, admin, lookups, settings, audit
    <feature>.routes.ts
    <feature>.controller.ts
    <feature>.service.ts
    <feature>.repository.ts
    <feature>.mapper.ts
    index.ts
  shared/
    errors/            AppError + factories, error handler
    http/              sendSuccess, pagination helpers
    validation/        validate(schema, source) middleware, parseId, text normalisation
    auth/              requireAuth, optionalAuth, requireRole, can() permission table
    audit/             audit(actor, action, entity, before, after)
    storage/           storage port + local-disk adapter (photos)
    jobs/              auto check-out scheduler
  db/prisma.ts         Prisma singleton
```

## 2. Layers

Each layer calls only the one below it.

| Layer | Owns | Never |
|---|---|---|
| **Routes** | The per-endpoint chain: rate limiter → auth guard → role guard → `validate(schema)` → controller | Logic |
| **Controller** | HTTP only: read validated input, call the service, respond with `sendSuccess`, set cookies | Business rules, Prisma |
| **Service** | Business rules, permission checks via `can()`, mapping to DTOs, audit entries, transactions | Importing Prisma or Express |
| **Repository** | Prisma queries only; applies soft-delete filters by default | Rules |

**Dependency injection** by factory functions with defaults: `createController(service = createService())` → `createService(repo = createRepository())` → `createRepository(db = prisma)`. Tests pass plain-object fakes.

## 3. Validation

- **Zod**, with schemas imported from `packages/shared` where the client uses the same rules.
- `validate(schema, source = "body" | "query" | "params")` runs before the controller; on failure it throws `AppError.validation` with field-error **codes**.
- Query numbers (`page`, `limit`) are coerced and bounded in the schema.
- User text is NFC-normalised and bidi control characters are refused.

## 4. Errors

- Any layer throws `AppError.<type>(code?, message?, errors?)`: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`, `rateLimit`, …
- One error handler, registered last, shapes the envelope. Unknown errors are logged and returned as a generic `server` error.
- Prisma `P2002` → `conflict` with `NOT_UNIQUE` field errors.

## 5. Pagination

Offset only: the service computes `skip = (page − 1) × limit` and runs `findMany` and `count` in parallel.

## 6. Audit

Services call `audit()` for sensitive actions: space profile changes, member create/edit/deactivate, check-in/out, owner linking, role changes, suspensions, settings changes.
