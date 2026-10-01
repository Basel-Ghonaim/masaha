# API Contract

> **Status:** Active · **Class:** Contract — conventions to build against; endpoints are added as they are built · **Last Updated:** 2026-10-01 · **Owner:** Basel Ghoneim
> **Authority:** The single source for endpoints, payloads, error shapes and pagination. Update it in the same PR as any endpoint change.

## 1. Conventions

- Base path: `/api/v1`. JSON only. `GET /health` sits outside it (`{ status, db, timestamp }`, 200 or 503).
- Auth: `Authorization: Bearer <accessToken>` on protected endpoints; the refresh token travels only as its cookie.
- The server **never sends display text** for the UI. It sends error `type`, an optional domain `code`, and field-error codes; the client translates ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)).
- **Request id:** every response carries an `X-Request-Id` header, a UUID the server generates for each request, and an error repeats it in the envelope (§2). It matches the request's log lines ([backend conventions §10](../backend/conventions.md#10-logging)). The server ignores any id the client sends.
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
    requestId: string                   // the X-Request-Id of this response (§1)
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

Each endpoint is added here, with its request and response, in the PR that builds it. The endpoints not yet built are planned in [plans/v1-mvp.md](../plans/v1-mvp.md#planned-api-surface). Request schemas are in `packages/shared`; every error answers with the envelope of §2.

### Session

The shapes several endpoints answer with (`packages/shared`, `auth.ts`):

```ts
Session = { user: SessionUser, accessToken: string }   // the access token is kept in memory only

SessionUser = {
  id: number, email: string, name: string,
  role: "USER" | "OWNER" | "ADMIN",                    // the global role (ADR 0002)
  language: "ar" | "en",
  mustChangePassword: boolean,                         // a temporary password must be changed first
  hasPassword: boolean,                                // false for a Google-only account
  spaces: { spaceId: number, role: "OWNER" | "RECEPTION" }[]   // the active links, oldest first
}
```

An answer that opens or renews a session also sets the refresh cookie and the session hint, and an answer that ends one clears them ([security.md](../backend/security.md#tokens-and-cookies)). The sign-in limits count failures only ([security.md](../backend/security.md#rate-limits-fixed-window)); a refused attempt answers `rate_limit` (429).

#### `POST /auth/register` · 🌐
- **Body:** `{ name, email, password, language? }`. The name is 1–100 characters, NFC-normalised, with no bidirectional controls; the email is trimmed and lowercased; the password follows the policy ([security.md](../backend/security.md#passwords)); `language` is the interface's, `ar` when absent.
- **201:** `Session`, for a new `USER`.
- **Errors:** `validation` (422); `conflict` (409) `EMAIL_TAKEN`, with `errors.email = ["not_unique"]`.

#### `POST /auth/login` · 🌐
- **Body:** `{ email, password }`. The policy is not checked here.
- **200:** `Session`.
- **Errors:** `unauthorized` (401) `INVALID_CREDENTIALS` for an unknown email, a wrong password or a Google-only account alike; `forbidden` (403) `ACCOUNT_SUSPENDED`, only once the password matches.

#### `POST /auth/refresh` · the refresh cookie
- **Body:** none.
- **200:** `Session`, with the token rotated ([security.md](../backend/security.md#tokens-and-cookies)).
- **Errors:** `unauthorized` (401) without a valid token, or for a token reused after the grace window, which ends its session; `forbidden` (403) `ACCOUNT_SUSPENDED`, which ends every session of the user. Both clear the cookies. `rate_limit` (429) keeps them.

#### `POST /auth/logout` · the refresh cookie
- **204:** the device's session is ended, and the cookies cleared. Without a session, the same.

## 6. Domain error codes (initial)

A new code is added in the order of [backend conventions §4](../backend/conventions.md#4-errors).

`EMAIL_TAKEN` · `PHONE_TAKEN` · `INVALID_CREDENTIALS` · `ACCOUNT_SUSPENDED` · `PASSWORD_CHANGE_REQUIRED` · `SPACE_NOT_MANAGED` · `MEMBER_ALREADY_CHECKED_IN` · `CHECK_IN_ALREADY_CLOSED` · `SPACE_CAPACITY_NOT_SET` · `OUTSIDE_OPENING_HOURS` (warning only; the check-in succeeds with `meta.warnings`) · `OWNER_ALREADY_LINKED`.
