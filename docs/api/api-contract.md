# API Contract

> **Status:** Active · **Class:** Contract — conventions to build against; endpoints are added as they are built · **Last Updated:** 2026-10-01 · **Owner:** Basel Ghoneim
> **Authority:** The single source for endpoints, payloads, error shapes and pagination. Update it in the same PR as any endpoint change.

## 1. Conventions

- Base path: `/api/v1`. JSON only. `GET /health` sits outside it (`{ status, db, timestamp }`, 200 or 503).
- Auth: `Authorization: Bearer <accessToken>` on protected endpoints; the refresh token travels only as its cookie.
- The server **never sends display text** for the UI. It sends error `type`, an optional domain `code`, and field-error codes; the client translates ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)).
- **Request id:** every response carries an `X-Request-Id` header, a UUID the server generates for each request, and an error repeats it in the envelope (§2). It matches the request's log lines ([backend conventions §10](../backend/conventions.md#10-logging)). Not built yet: F-5 builds the request id.
- **Idempotency key:** every create the front desk performs sends an `Idempotency-Key` header, a UUID the client generates once per user action and repeats on every retry of it. A retry returns the first result, with the same status and body, never a conflict ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)). It is not the request id ([backend conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). Not built yet: the desk slices build the idempotency key.

## 2. Response envelope

```ts
// success (204 has no body)
{ success: true, data: T, meta?: PaginationMeta }

// error
{
  success: false,
  error: {
    type: ErrorType,                    // see §3
    code?: string,                      // domain code, UPPER_SNAKE_CASE, e.g. "MEMBER_ALREADY_CHECKED_IN"
    message: string,                    // English, for developers and logs only — never shown to users
    errors?: Record<string, string[]>,  // field → error codes, e.g. { "phone": ["invalid_format"] }
    requestId: string                   // the X-Request-Id of this response (§1); not built yet: F-5
  }
}
```

## 3. Error types

| `type` | HTTP | When |
|---|---|---|
| `bad_request` | 400 | Malformed request |
| `unauthorized` | 401 | Missing or invalid token; wrong credentials (generic, no account enumeration) |
| `forbidden` | 403 | Authenticated but not permitted (role or space scope) |
| `not_found` | 404 | Resource does not exist or is not visible to the caller |
| `conflict` | 409 | Unique violation; state conflict (e.g. already checked in) |
| `payload_too_large` | 413 | Upload too large |
| `unsupported_media_type` | 415 | Upload type not allowed |
| `validation` | 422 | Field validation failed (`errors` present) |
| `rate_limit` | 429 | Too many requests |
| `server` | 500 | Unexpected error |
| `service_unavailable` | 503 | Database unreachable |

**Field-error codes:** `required`, `too_short`, `too_long`, `invalid_format`, `out_of_range`, `not_unique`, `invalid_choice`.

## 4. Pagination

Offset pagination for all lists: `?page=1&limit=20` (default 20, max 50).

```ts
meta: { currentPage, limit, totalPages, totalRecords, hasNextPage, hasPreviousPage }
```

## 5. Endpoints

**None built yet.** The planned endpoint surface lives in [plans/v1-mvp.md](../plans/v1-mvp.md#planned-api-surface). Each endpoint is added here, with its request and response, in the PR that builds it.

## 6. Domain error codes (initial)

A new code is added in the order of [backend conventions §4](../backend/conventions.md#4-errors).

`EMAIL_TAKEN` · `PHONE_TAKEN` · `INVALID_CREDENTIALS` · `ACCOUNT_SUSPENDED` · `PASSWORD_CHANGE_REQUIRED` · `SPACE_NOT_MANAGED` · `MEMBER_ALREADY_CHECKED_IN` · `CHECK_IN_ALREADY_CLOSED` · `SPACE_CAPACITY_NOT_SET` · `OUTSIDE_OPENING_HOURS` (warning only; the check-in succeeds with `meta.warnings`) · `OWNER_ALREADY_LINKED`.
