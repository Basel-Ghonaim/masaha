# API Contract

> **Status:** Active · **Class:** Contract — conventions to build against; endpoints are added as they are built · **Last Updated:** 2026-10-05 · **Owner:** Basel Ghoneim
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
| `service_unavailable` | 503 | A dependency is unavailable or not configured: the database, or Google sign-in |

**Field-error codes:** `required`, `too_short`, `too_long`, `invalid_format`, `out_of_range`, `not_unique`, `invalid_choice`.

## 4. Pagination

Offset pagination for all lists: `?page=1&limit=20` (default 20, max 50).

```ts
meta: { currentPage, limit, totalPages, totalRecords, hasNextPage, hasPreviousPage }
```

## 5. Endpoints

Each endpoint is added here, with its request and response, in the PR that builds it. The endpoints not yet built are planned in [plans/v1-mvp.md](../plans/v1-mvp.md#planned-api-surface). Its types live in code in `packages/shared` ([shared-package.md](../architecture/shared-package.md)); every error answers with the envelope of §2.

### Session

The shapes several endpoints answer with (`@masaha/shared/auth`):

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

Every endpoint with a body may answer `validation` (422), and every endpoint may answer `rate_limit` (429) under the limits of [security.md](../backend/security.md#rate-limits-fixed-window); the entries below name them where they say more. An answer that opens or renews a session also sets the refresh cookie and the session hint, and an answer that ends one clears them ([security.md](../backend/security.md#tokens-and-cookies)). The sign-in limits count failures only ([security.md](../backend/security.md#rate-limits-fixed-window)); a refused attempt answers `rate_limit` (429).

#### `POST /auth/register` · 🌐
- **Body:** `{ name, email, password, language? }`. The name is 1–100 characters, NFC-normalised, with no bidirectional controls and no control characters or line separators (`invalid_format`); the email is trimmed and lowercased; the password follows the policy ([security.md](../backend/security.md#passwords)); `language` is the interface's, `ar` when absent.
- **201:** `Session`, for a new `USER`.
- **Errors:** `validation` (422); `conflict` (409) `EMAIL_TAKEN`, with `errors.email = ["not_unique"]`.

#### `POST /auth/login` · 🌐
- **Body:** `{ email, password }`. The policy is not checked here.
- **200:** `Session`.
- **Errors:** `validation` (422); `unauthorized` (401) `INVALID_CREDENTIALS` for an unknown email, a wrong password or a Google-only account alike; `forbidden` (403) `ACCOUNT_SUSPENDED`, only once the password matches; `rate_limit` (429) after 10 failures for the address and email, or 50 for the address.

#### `POST /auth/google` · 🌐
- **Body:** `{ idToken, language? }`: a Google OpenID Connect ID token from Google's sign-in on the web, and the interface language for an account this creates.
- **200:** `Session & { linked }`. The account is the one linked to this Google account; else the account with its email, linked now where Google is the authority for the address, with its password removed and its other sessions ended (`linked: true`, so the web can say so); else a new `USER` without a password ([security.md](../backend/security.md#sign-in-methods)).
- **Errors:** `validation` (422); `unauthorized` (401) `GOOGLE_TOKEN_INVALID` for a token that fails verification, or whose email's account is linked to another Google account; `conflict` (409) `GOOGLE_LINK_NOT_ALLOWED` when the email has an account and Google is not the authority for the address; `forbidden` (403) `ACCOUNT_SUSPENDED`; `service_unavailable` (503) while the API has no Google client id, or cannot load Google's keys; a 503 counts no failure.

#### `POST /auth/refresh` · the refresh cookie
- **Body:** none.
- **200:** `Session`, with the token rotated ([security.md](../backend/security.md#tokens-and-cookies)).
- **Errors:** `unauthorized` (401) without a valid token, or for a token reused after the grace window, which ends its session; `forbidden` (403) `ACCOUNT_SUSPENDED`, which ends every session of the user. Both clear the cookies. `rate_limit` (429) keeps them, as does `forbidden` (403) for a cross-site request ([security.md](../backend/security.md#tokens-and-cookies)).

#### `POST /auth/logout` · the refresh cookie
- **204:** the device's session is ended, and the cookies cleared. Without a session, the same.
- **Errors:** `forbidden` (403) for a cross-site request, which keeps the cookies.

### The forgotten password

The reset link, its email and the recovery session are described in [security.md](../backend/security.md#passwords) ([ADR 0017](../architecture/decisions/0017-recovery-session.md)). These endpoints share the password limits ([security.md](../backend/security.md#rate-limits-fixed-window)).

A request for a link opens a **recovery** in the browser, held by the server and found by the recovery cookie (`masaha_reset`, [security.md](../backend/security.md#tokens-and-cookies)). The endpoints that read or set that cookie refuse a cross-site request with `forbidden` (403), as refresh and logout do. They answer with where the caller stands (`@masaha/shared/auth`):

```ts
RecoveryPosition =
  | { step: "request" }                         // no recovery in this browser
  | { step: "sent", email: string,              // a link was asked for; the email is masked: "s•••@example.com"
      resendInSeconds: number,                  // until another link may be asked for: 60 after each link
      canResend: boolean }                      // false once its 3 resends are spent
  | { step: "password", email: string }         // a link was checked in this browser; the account's email, masked
```

#### `POST /auth/password/forgot` · 🌐 · sets the recovery cookie
- **Body:** `{ email }`.
- **202:** `RecoveryPosition` at `sent`, and the recovery cookie, the same for every address, whether or not it has an account. A recovery the browser held is ended. When the address has an account that may sign in, the reset email is sent, with a link valid for one hour.
- **Errors:** `validation` (422); `forbidden` (403) for a cross-site request; `rate_limit` (429).

#### `POST /auth/password/resend` · the recovery cookie
- **Body:** none. The address is the recovery's: any field is refused.
- **202:** `RecoveryPosition` at `sent`, with the window started again, and the recovery cookie renewed for the new link's hour. When the recovery's address has an account that may sign in, another reset email is sent. The answer is the same either way.
- **Errors:** `validation` (422) for a field in the body; `bad_request` (400) `RECOVERY_INVALID` without a recovery at `sent` (none, ended or expired); `bad_request` (400) `RESEND_LIMIT_REACHED` once its 3 resends are spent; `rate_limit` (429) inside the window, with `Retry-After` the seconds left; `forbidden` (403) for a cross-site request.

#### `GET /auth/password/recovery` · the recovery cookie
- **200:** `RecoveryPosition`; `request` without a recovery, or with one that has ended or expired. Never `not_found`.
- **Errors:** `forbidden` (403) for a cross-site request.

#### `POST /auth/password/reset/check` · 🌐 · sets the recovery cookie
- **Body:** `{ token }`, read by the web from the link's fragment. It is the last time the web holds it.
- **200:** `RecoveryPosition` at `password`, and the recovery cookie, now lasting as long as the link. The link is bound to the browser's recovery, or to a new one when the browser holds none (a link opened on another device), and a recovery elsewhere that held it ends. The token is neither used nor extended.
- **Errors:** `validation` (422) for a missing or empty token; `bad_request` (400) `RESET_TOKEN_INVALID`, the same for an unknown, expired or used link; `forbidden` (403) for a cross-site request; `rate_limit` (429).

#### `POST /auth/password/reset` · the recovery cookie
- **Body:** `{ password }`, following the policy. The link is the recovery's: a `token` in the body is refused.
- **204:** the password is set with the link the recovery holds, a pending temporary one is settled, and every session, and every recovery bound to a link of the user, ended. The link is used, and the recovery cookie cleared.
- **Errors:** `validation` (422), with `errors.token = ["invalid_format"]` for a token in the body; `bad_request` (400) `RECOVERY_INVALID` without a recovery at `password`, or when its link was used, has expired or was replaced meanwhile; `forbidden` (403) for a cross-site request, which keeps the cookie; `rate_limit` (429).

### Me

The signed-in user's own account. Each endpoint needs the access token.

#### `POST /me/password` · 👤, also while a temporary password is pending
- **Body:** `{ currentPassword?, password }`. The new password follows the policy. `currentPassword` is required unless a temporary password is pending (the forced change), as both the access token and the account say.
- **200:** `{ accessToken }`, and a new refresh cookie: every session of the user and any pending reset link ended, and this device's session goes on in a new one, with `mustChangePassword` settled ([security.md](../backend/security.md#passwords)).
- **Errors:** `unauthorized` (401) without a valid access token; `validation` (422), with `currentPassword: ["required"]` when it is missing; `bad_request` (400) `CURRENT_PASSWORD_INCORRECT`, which is not a 401, so it never looks like an expired session, also when a reset changed the password meanwhile; `bad_request` (400) `PASSWORD_NOT_SET` for an account without a password, which sets one through the reset email; `forbidden` (403) `ACCOUNT_SUSPENDED`; `rate_limit` (429) after 10 wrong current passwords.

### Managed spaces

The spaces a signed-in user works at, as owner or reception ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).

#### `GET /manage/spaces` · 👤
- **200:** `ManagedSpace[]` (`@masaha/shared/space-links`), the spaces the caller holds an active link to, oldest link first, as the session's links are. A hidden space is included, since its owner still manages it; a soft-deleted one is left out. Never another user's spaces; an account with no links, the admin included, gets `[]`.

  ```ts
  ManagedSpace = {
    spaceId: number, role: "OWNER" | "RECEPTION",   // the caller's role at this space
    slug: string, nameAr: string, nameEn: string | null,
    area: { nameAr: string, nameEn: string }
  }
  ```
- **Errors:** `unauthorized` (401) without a valid access token; `forbidden` (403) `PASSWORD_CHANGE_REQUIRED` while a temporary password is pending.

## 6. Domain error codes (initial)

A new code is added in the order of [backend conventions §4](../backend/conventions.md#4-errors).

`EMAIL_TAKEN` · `PHONE_TAKEN` · `INVALID_CREDENTIALS` · `ACCOUNT_SUSPENDED` · `PASSWORD_CHANGE_REQUIRED` · `SPACE_NOT_MANAGED` · `MEMBER_ALREADY_CHECKED_IN` · `CHECK_IN_ALREADY_CLOSED` · `SPACE_CAPACITY_NOT_SET` · `OUTSIDE_OPENING_HOURS` (warning only; the check-in succeeds with `meta.warnings`) · `OWNER_ALREADY_LINKED` · `CURRENT_PASSWORD_INCORRECT` · `GOOGLE_TOKEN_INVALID` · `RESET_TOKEN_INVALID` · `GOOGLE_LINK_NOT_ALLOWED` · `PASSWORD_NOT_SET` · `RECOVERY_INVALID` · `RESEND_LIMIT_REACHED`.
