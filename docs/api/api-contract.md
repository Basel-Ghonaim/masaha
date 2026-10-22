# API Contract

> **Status:** Active · **Class:** Contract — conventions to build against; endpoints are added as they are built · **Last Updated:** 2026-10-22 · **Owner:** Basel Ghoneim
> **Authority:** The single source for endpoints, payloads, error shapes and pagination. Update it in the same PR as any endpoint change.

## 1. Conventions

- Base path: `/api/v1`. JSON only. `GET /health` sits outside it (`{ status, db, timestamp }`, 200 or 503).
- Auth: `Authorization: Bearer <accessToken>` on protected endpoints; the refresh token travels only as its cookie. A protected endpoint reads the account on every request: a token whose account does not exist or is suspended, or that was signed before every session of the account last ended (a password change, a reset, a suspension even once restored, a role change, a temporary password, a Google link), answers `unauthorized` (401), and the role it acts with is the account's now ([security.md](../backend/security.md#authorization)).
- The server **never sends display text** for the UI. It sends error `type`, an optional domain `code`, and field-error codes; the client translates ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)).
- **Request id:** every response carries an `X-Request-Id` header, a UUID the server generates for each request, and an error repeats it in the envelope (§2). It matches the request's log lines ([backend conventions §10](../backend/conventions.md#10-logging)). The server ignores any id the client sends.
- **Idempotency key:** every create the front desk performs sends an `Idempotency-Key` header, a UUID the client generates once per user action and repeats on every retry of it. A retry returns the first result, with the same status and body, never a conflict ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)). It is not the request id ([backend conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). Built for a visit's check-in and check-out, and a visit's payment after its check-out (2026-10-20, #100) ([Front desk (managed)](#front-desk-managed)), a customer's creation (2026-10-21, #102, [Customers (managed)](#customers-managed)), and a subscription's (2026-10-22, #106, [Subscriptions (managed)](#subscriptions-managed)); a key missing or not a UUID answers `validation` (422) on `idempotencyKey`, before the body is read. 2026-10-20, #95.

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
| `payload_too_large` | 413 | Upload too large. Online, a request over 4.5 MB is refused by the platform itself with a 413 that carries no envelope ([ADR 0014](../architecture/decisions/0014-deployment.md)) |
| `unsupported_media_type` | 415 | Upload type not allowed: its content, never its name or declared type, decides |
| `validation` | 422 | Field validation failed (`errors` present) |
| `rate_limit` | 429 | Too many requests |
| `server` | 500 | Unexpected error |
| `service_unavailable` | 503 | A dependency is unavailable or not configured: the database, Google sign-in, or the photos' store |

In code, the statuses are `ERROR_STATUSES` (`@masaha/shared/core`), which both apps read.

**Field-error codes:** `required`, `too_short`, `too_long`, `invalid_format`, `out_of_range`, `not_unique`, `invalid_choice`.

## 4. Pagination

Offset pagination for all lists: `?page=1&limit=20` (default 20, max 50).

```ts
meta: { currentPage, limit, totalPages, totalRecords, hasNextPage, hasPreviousPage }
```

**Exceptions**, lists a screen shows whole, so they are answered whole, without `page` or `meta`:
- the admin's lookup lists (`GET /admin/governorates`, `GET /admin/amenities`) (§5, *Lookups*; why: [lookups › Decisions](../features/lookups.md#decisions));
- the public catalogue of the lookups (`GET /lookups`), the same bounded lists, active rows only (§5, *Lookups (public)*);
- the map's pins (`GET /map/spaces`), the whole filtered set up to a ceiling of 1,000 (§5, *Directory (public)*);
- a space's packages (`GET /manage/spaces/:spaceId/packages`), retired ones included: a space keeps tens at most, typed by hand, and the owner's list and the front desk's picker both read them whole (§5, *Packages (managed)*; why: [packages › Decisions](../features/packages.md#api-decisions)).
- a space's staff (`GET /manage/spaces/:spaceId/staff`), every reception link, active or not: a space has few, and the owner's page reads them whole (§5, *Staff (managed)*; why: [space-links › Decisions](../features/space-links.md#api-decisions)).
- the people present at a space (`GET /manage/spaces/:spaceId/occupancy`), bounded by who is there: the desk's main view reads its state in one request on a weak connection (§5, *Occupancy (managed)*; why: [occupancy › Decisions](../features/occupancy.md#api-decisions)).
- a customer's subscriptions and unpaid visits in their file (`GET /manage/spaces/:spaceId/customers/:customerId`), bounded by one customer (§5, *Customers (managed)*; 2026-10-21, #102).

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
  spaces: { spaceId: number, role: "OWNER" | "RECEPTION" }[]   // the active links, oldest first; none to a soft-deleted space
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
- **Errors:** `validation` (422); `unauthorized` (401) `INVALID_CREDENTIALS` for an unknown email, a wrong password or a Google-only account alike; `forbidden` (403) `ACCOUNT_SUSPENDED`, only once the password matches; `forbidden` (403) `TEMPORARY_PASSWORD_EXPIRED`, only once the password matches, for a temporary password past its expiry ([security.md](../backend/security.md#passwords)); `rate_limit` (429) under the sign-in limits.

#### `POST /auth/google` · 🌐
- **Body:** `{ idToken, language? }`: a Google OpenID Connect ID token from Google's sign-in on the web, and the interface language for an account this creates.
- **200:** `Session & { linked }`. The account linked to this Google account; else the account with its email, linked now where security allows it (`linked: true`); else a new `USER` without a password ([security.md](../backend/security.md#sign-in-methods)).
- **Errors:** `validation` (422); `unauthorized` (401) `GOOGLE_TOKEN_INVALID` for a token that fails verification, or whose email's account is linked to another Google account; `conflict` (409) `GOOGLE_LINK_NOT_ALLOWED` when the email has an account and Google is not the authority for the address, or the account has a temporary password pending ([security.md](../backend/security.md#passwords)); `forbidden` (403) `ACCOUNT_SUSPENDED`; `service_unavailable` (503) while the API has no Google client id, or cannot load Google's keys; a 503 counts no failure.

#### `POST /auth/refresh` · the refresh cookie
- **Body:** none.
- **200:** `Session`, with the token rotated ([security.md](../backend/security.md#tokens-and-cookies)).
- **Errors:** `unauthorized` (401) without a valid token, or for a token reused after the grace window, which ends its session; `forbidden` (403) `ACCOUNT_SUSPENDED`, which ends every session of the user. Both clear the cookies. `rate_limit` (429) keeps them, as does `forbidden` (403) for a cross-site request ([security.md](../backend/security.md#tokens-and-cookies)).

#### `POST /auth/logout` · the refresh cookie
- **204:** the device's session is ended, and the cookies cleared. Without a session, the same.
- **Errors:** `forbidden` (403) for a cross-site request, which keeps the cookies.

### The forgotten password

The reset link, its email and the recovery session are described in [security.md](../backend/security.md#passwords) ([ADR 0017](../architecture/decisions/0017-recovery-session.md)). These endpoints share the password limits ([security.md](../backend/security.md#rate-limits-fixed-window)).

They act on the browser's **recovery**, found by the recovery cookie (`masaha_reset`, [security.md](../backend/security.md#tokens-and-cookies); [the flow](../features/auth.md#behaviour-and-flows)). The endpoints that read or set that cookie refuse a cross-site request with `forbidden` (403), as refresh and logout do. They answer with where the caller stands (`@masaha/shared/auth`):

```ts
RecoveryPosition =
  | { step: "request" }                         // no recovery in this browser
  | { step: "sent", email: string,              // a link was asked for; the email is masked: "s•••@example.com"
      resendInSeconds: number,                  // until another link may be asked for
      canResend: boolean }                      // false once its resends are spent
  | { step: "password", email: string }         // a link was checked in this browser; the account's email, masked
```

#### `POST /auth/password/forgot` · 🌐 · sets the recovery cookie
- **Body:** `{ email }`.
- **202:** `RecoveryPosition` at `sent`, and the recovery cookie, the same for every address, whether or not it has an account. A recovery the browser held is ended. When the address has an account that may sign in and has no temporary password pending, the reset email is sent.
- **Errors:** `validation` (422); `forbidden` (403) for a cross-site request; `rate_limit` (429).

#### `POST /auth/password/resend` · the recovery cookie
- **Body:** none. The address is the recovery's: any field is refused.
- **202:** `RecoveryPosition` at `sent`, with the window started again, and the recovery cookie renewed for the new link's life. When the recovery's address has an account that may sign in and has no temporary password pending, another reset email is sent. The answer is the same either way.
- **Errors:** `validation` (422) for a field in the body; `bad_request` (400) `RECOVERY_INVALID` without a recovery at `sent` (none, ended or expired); `bad_request` (400) `RESEND_LIMIT_REACHED` once its resends are spent; `rate_limit` (429) inside the window, with `Retry-After` the seconds left; `forbidden` (403) for a cross-site request.

#### `GET /auth/password/recovery` · the recovery cookie
- **200:** `RecoveryPosition`; `request` without a recovery, or with one that has ended or expired. Never `not_found`.
- **Errors:** `forbidden` (403) for a cross-site request.

#### `POST /auth/password/reset/check` · 🌐 · sets the recovery cookie
- **Body:** `{ token }`, read by the web from the link's fragment. It is the last time the web holds it.
- **200:** `RecoveryPosition` at `password`, and the recovery cookie, now lasting as long as the link. The link is bound to the browser's recovery, or to a new one when the browser holds none, and a recovery elsewhere that held it ends. The token is neither used nor extended.
- **Errors:** `validation` (422) for a missing or empty token; `bad_request` (400) `RESET_TOKEN_INVALID`, the same for an unknown, expired or used link, and for a link of an account whose temporary password became pending; `forbidden` (403) for a cross-site request; `rate_limit` (429).

#### `POST /auth/password/reset` · the recovery cookie
- **Body:** `{ password }`, following the policy. The link is the recovery's: a `token` in the body is refused.
- **204:** the password is set with the link the recovery holds, and every session, and every recovery bound to a link of the user, ended. The link is used, and the recovery cookie cleared.
- **Errors:** `validation` (422), with `errors.token = ["invalid_format"]` for a token in the body; `bad_request` (400) `RECOVERY_INVALID` without a recovery at `password`, or when its link was used, has expired or was replaced meanwhile, or its account's temporary password became pending; `forbidden` (403) for a cross-site request, which keeps the cookie; `rate_limit` (429).

### Me

The signed-in user's own account. Each endpoint needs the access token.

#### `POST /me/password` · 👤, also while a temporary password is pending
- **Body:** `{ currentPassword?, password, email? }`. The new password follows the policy. `currentPassword` is required unless a temporary password is pending (the forced change), as both the access token and the account say. `email` is taken only during the forced change: the address someone else typed, confirmed, or corrected, which is audited `user.emailChanged` ([security.md](../backend/security.md#passwords)); the same address changes nothing.
- **200:** `{ accessToken }`, and a new refresh cookie: this device's session goes on in a new one ([security.md](../backend/security.md#passwords)). The answer is the same with an `email`; the session's user reads the corrected address at its next refresh.
- **Errors:** `unauthorized` (401) without a valid access token, for a suspended account, or for a token signed before the account's sessions last ended (§1); `validation` (422), with `currentPassword: ["required"]` when it is missing, and `email: ["invalid_choice"]` for an `email` outside the forced change; `conflict` (409) `EMAIL_TAKEN`, with `errors.email = ["not_unique"]`, for an address another account holds, changing nothing; `bad_request` (400) `CURRENT_PASSWORD_INCORRECT`, which is not a 401, so it never looks like an expired session, also when a reset changed the password meanwhile; `bad_request` (400) `PASSWORD_NOT_SET` for an account without a password, which sets one through the reset email; `forbidden` (403) `ACCOUNT_SUSPENDED` for an account suspended while the change ran; `rate_limit` (429) under its failures limit.

### Managed spaces

The spaces a signed-in user works at, as owner or reception ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).

#### `GET /manage/spaces` · 👤
- **200:** `ManagedSpace[]` (`@masaha/shared/space-links`), the spaces the caller holds an active link to, oldest link first, as the session's links are. A hidden space is included ([why](../features/space-links.md#decisions)); a soft-deleted one is left out. Never another user's spaces; an account with no links, the admin included, gets `[]`.

  ```ts
  ManagedSpace = {
    spaceId: number, role: "OWNER" | "RECEPTION",   // the caller's role at this space
    slug: string, nameAr: string | null, nameEn: string,   // English required, Arabic optional
    area: { nameAr: string, nameEn: string }
  }
  ```
- **Errors:** `unauthorized` (401) without a valid access token; `forbidden` (403) `PASSWORD_CHANGE_REQUIRED` while a temporary password is pending.

Every route below needs an active `OWNER` or `RECEPTION` link at the named live space; without one, and for an unknown or soft-deleted space, it answers `not_found` (404) ([security › Authorization](../backend/security.md#authorization)). Reads reuse `AdminSpace` and the admin photo shapes; writes reuse the same services, validation, locks and audit action names as the admin routes.

#### `GET /manage/spaces/:spaceId` · 🧾
- **200:** `AdminSpace`, including all fact groups and active owners.
- **Errors:** `not_found` (404) for an unknown, deleted or unlinked space.

#### `PATCH /manage/spaces/:spaceId` · 🏢
- **Body / response / errors:** the same profile request and `AdminSpace` response as the admin
  route. Only an active owner may edit.

#### `PUT /manage/spaces/:spaceId/{hours|prices|amenities|contacts}` · 🏢
- **Body / response / errors:** the same group requests, `AdminSpace` response, service rules and
  audit actions as the corresponding admin routes. Reception is read-only.

#### `POST /manage/spaces/:spaceId/{profile|hours|prices|amenities|contacts}/confirm` · 🏢
- **Response / errors:** the same confirmation response, freshness update and audit action as the
  corresponding admin route. A reception link is refused.

#### Managed photos

- **`GET /manage/spaces/:spaceId/photos` · 🧾:** `SpacePhoto[]`, in gallery order.
- **`POST /manage/spaces/:spaceId/photos` · 🏢:** the same multipart limits, rate limit before file
  parsing, storage cleanup and `SpacePhoto` response as the admin upload.
- **`DELETE /manage/spaces/:spaceId/photos/:photoId` · 🏢:** the same removal and audit behavior.
- **`PUT /manage/spaces/:spaceId/photos/order` · 🏢:** the same ordering validation and audit
  behavior.
- Reception may list photos; its upload, removal or order answers `forbidden` (403) before the request is counted or its body read.

### Packages (managed)

A space's packages: the subscription templates its owner keeps, private to its staff ([data-model › Operations](../architecture/data-model.md#operations)); the public's packages are the space's published prices. The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). The list is the staff's (🧾); every write is the owner's (🏢), and reception's is refused with `forbidden` (403) before its body is read.

- **The terms**:
  - `name`, required, 1–60 characters, NFC-normalised and trimmed, with no bidirectional controls and no control characters or line separators (`invalid_format`): one name, in the language the owner types. Another package of the space, retired or not, may not hold it;
  - `validityDays`, required: a subscription made from the package ends this many days after it starts;
  - the limits, each optional (absent or `null`): `totalDays`, `daysPerWeek` (at most 7), `hoursPerDay` (at most 24) and `totalHours`; they combine freely;
  - every count is a whole number from 1 (`out_of_range`; `invalid_format` when not whole), at most 2,147,483,647;
  - `billing`: `FIXED`, `PER_HOUR` or `PER_DAY` (`SUBSCRIPTION_BILLINGS`, `@masaha/shared/packages`), from its list (`invalid_choice`);
  - `priceAgorot`: the whole price when `FIXED`, else the rate per hour or per day, in whole agorot from 1 to 10,000,000, as a space's prices: `out_of_range` outside it (no package is free), `invalid_format` when not whole;
  - `audience`: `GENERAL` or `STUDENT` (`PRICE_AUDIENCES`, `@masaha/shared/spaces`), from its list (`invalid_choice`);
  - `shiftId`, optional: one of the space's shifts.
- **Order:** a list's order is its array's: by place, then by name. A new package is placed after the last; no endpoint reorders them.
- **Retired, never deleted:** `isActive: false` retires a package, which stays listed; `true` offers it again. A subscription made from a package keeps its own copy of the terms ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)): an edit or a retirement changes none.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the package as the entity and its space as the entry's: `package.created` (`after`: its terms) and `package.edited` (`before` and `after`: only the fields that changed, `isActive` included); an edit that changes nothing writes nothing.

```ts
SpacePackage = {
  id: number,
  name: string,
  validityDays: number,
  totalDays: number | null, daysPerWeek: number | null,   // its limits; null: none
  hoursPerDay: number | null, totalHours: number | null,
  billing: "FIXED" | "PER_HOUR" | "PER_DAY",              // SUBSCRIPTION_BILLINGS
  priceAgorot: number,                                   // whole agorot: the price, or the rate per hour or day
  audience: "GENERAL" | "STUDENT",                       // PRICE_AUDIENCES
  shiftId: number | null,                                // one of the space's shifts
  isActive: boolean                                      // false: retired, no longer offered
}
```

#### `GET /manage/spaces/:spaceId/packages` · 🧾
- **200:** `SpacePackage[]` (`@masaha/shared/packages`): every package of the space, retired ones included, in order. Not paginated (§4).
- **Errors:** `not_found` (404).

#### `POST /manage/spaces/:spaceId/packages` · 🏢
- **Body:** `{ name, validityDays, totalDays?, daysPerWeek?, hoursPerDay?, totalHours?, billing, priceAgorot, audience, shiftId? }`.
- **201:** `SpacePackage`, active and placed last. Audited `package.created`.
- **Errors:** `validation` (422), with `invalid_choice` on `shiftId` for a shift that is not one of the space's; `conflict` (409), with `errors.name = ["not_unique"]`, when another package of the space, retired or not, has the name; `forbidden` (403) for reception, before the body is read, and for an owner whose link ended meanwhile; `not_found` (404).

#### `PATCH /manage/spaces/:spaceId/packages/:packageId` · 🏢
- **Body:** any of the terms, and `isActive`; what is absent is kept, and a limit or the shift is cleared with `null`.
- **200:** `SpacePackage`. Audited `package.edited`.
- **Errors:** as the create's; `not_found` (404) for a package that is not the space's.

### Staff (managed)

A space's staff: the reception accounts its owner creates ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md), revised). The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). Every route is the owner's (🏢): reception is refused with `forbidden` (403) before a body is read or the request counted. The creation and the re-issue count under the staff-accounts limit ([security.md](../backend/security.md#rate-limits-fixed-window)).

```ts
StaffMember = {
  userId: number, name: string, email: string,
  isActive: boolean,                                // false: the owner deactivated the link
  temporaryPassword: { expiresAt: string } | null   // pending, and when it expires (ISO 8601); null once changed
}
AddedStaff = { userId: number, temporaryPassword: string }   // shown once
```

#### `GET /manage/spaces/:spaceId/staff` · 🏢
- **200:** `StaffMember[]` (`@masaha/shared/space-links`): every `RECEPTION` link of the space, deactivated ones included, oldest first. An expired temporary password is still listed, with its past `expiresAt`. Not paginated (§4).
- **Errors:** `forbidden` (403) for reception; `not_found` (404).

#### `POST /manage/spaces/:spaceId/staff` · 🏢
- **Body:** `{ name, email }`: a name as a user's, and the email, trimmed and lowercased.
- **201:** `AddedStaff`, under `Cache-Control: no-store`: a new `USER` account with a temporary password ([security.md](../backend/security.md#passwords)), linked to the space as its `RECEPTION`. Audited `user.created` and `space.staffAdded` (`after: { userId }`).
- **Errors:** `conflict` (409) `EMAIL_HAS_ACCOUNT`, with `errors.email = ["not_unique"]`, for an email that already has an account, which is never linked, writing nothing; `validation` (422); `forbidden` (403) for reception, before the body is read, and for an owner whose link ended meanwhile; `rate_limit` (429); `not_found` (404).

#### `PATCH /manage/spaces/:spaceId/staff/:userId` · 🏢
- **Body:** `{ isActive }`.
- **200:** `StaffMember`, as it now is. `false` deactivates the person's reception link and ends every session they hold ([security.md](../backend/security.md#tokens-and-cookies)); `true` re-activates it, ending nothing. The same state as asked writes nothing. Audited `space.staffDeactivated` or `space.staffReactivated` (`before` and `after`: `{ userId, isActive }`).
- **Errors:** `not_found` (404) for a person without a reception link at the space, an owner's link included (a co-owner is never changed here); `conflict` (409) `ACCOUNT_SUSPENDED` or `ACCOUNT_IS_ADMIN` for a re-activation of a suspended account or an admin; `validation` (422); `forbidden` (403) for reception, before the body is read.

#### `POST /manage/spaces/:spaceId/staff/:userId/temporary-password` · 🏢
- **Body:** none.
- **200:** `IssuedTemporaryPassword` (`@masaha/shared/users`), under `Cache-Control: no-store`: a new temporary password, only while one is pending (lost, or expired), whoever issued it: the owner's own, or an admin's recovery. It replaces the pending one, with a new expiry, and ends every session and pending reset link, as the admin's does. Audited `user.temporaryPasswordIssued`, with the space. Counts under the staff-accounts limit.
- **Errors**, a refusal writing nothing: `not_found` (404) without an active reception link of the person at the space; `conflict` (409) `TEMPORARY_PASSWORD_NOT_PENDING` while none is pending (the person's recovery is then the email, or the admin); `conflict` (409) `ACCOUNT_SUSPENDED`; `conflict` (409) `ACCOUNT_HAS_LINKS` for an account that is not a `USER` or holds another active link; `forbidden` (403) for reception, before the request is counted; `rate_limit` (429).

#### `POST /manage/spaces/:spaceId/staff/:userId/temporary-password/handover` · 🏢
- **Body:** `{ channel }`, as the admin's handover's.
- **204:** how the temporary password just shown was handed over, audited `user.temporaryPasswordHandedOver` (`after: { channel }`), with the space.
- **Errors:** `validation` (422), with `invalid_choice` on `channel`; `conflict` (409) `TEMPORARY_PASSWORD_NOT_PENDING` once nothing is pending; `not_found` (404) without an active reception link of the person at the space; `forbidden` (403) for reception, before the body is read.

### Settings (managed)

A space's settings ([data-model › Spaces](../architecture/data-model.md#spaces)). The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404), so the admin never reaches them. Both routes are the owner's (🏢): reception is refused with `forbidden` (403) before a body is read. A change applies from then on ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money)).

- **The settings** (`@masaha/shared/space-settings`):
  - `autoCheckoutAtClosing`, `visitCapAtDayPrice`, `visitStudentPrices` and `receptionMayTypePrices`: switches, `true` or `false`, never `null` (`invalid_format`). `receptionMayTypePrices` is `false` for every new space;
  - `maxStayMinutes`: the stay limit, whole hours from 1 to 23 (60 to 1,380 minutes, a multiple of 60: `out_of_range` outside it or between hours, `invalid_format` when not whole), or `null` for none: stays then end at closing, or at 23:59 of their check-in's day (2026-10-20, #100);
  - `visitRounding`: `UP_AFTER_MINUTES`, `NEAREST_HALF_HOUR` or `PER_MINUTE` (`VISIT_ROUNDINGS`), from its list (`invalid_choice`); and `visitRoundingMinutes`, its N: a whole number from 1 to 59 for `UP_AFTER_MINUTES` (`out_of_range`), `null` for the two others. The two are one choice, sent together: one without the other answers `required` on the missing one; `null` minutes for `UP_AFTER_MINUTES` answer `required`, and minutes for another rule `invalid_format`;
  - `reminderTemplate`: the WhatsApp debt reminder, a paragraph of 1–500 characters, NFC-normalised and trimmed, its line breaks kept, with no bidirectional controls and no other control characters (`too_short`, `too_long`, `invalid_format`); or `null` for the copy catalogue's default text. It may hold three placeholders, typed as they are whatever the interface language, each any number of times: `{الاسم}` the customer's name, `{المبلغ}` the amount they owe, `{المساحة}` the space's name (`REMINDER_PLACEHOLDERS`). `{المبلغ}` is required (`invalid_format` without it); any other `{…}` is refused (`invalid_choice`), so a customer never receives one; a lone brace is text. The debt reminder (not built) fills them.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the space as the entity and the entry's space: `space.settingsEdited` (`before` and `after`: only the fields that changed); an edit that changes nothing writes nothing.

```ts
SpaceSettings = {
  autoCheckoutAtClosing: boolean,
  maxStayMinutes: number | null,                                      // null: at closing, or 23:59
  visitRounding: "UP_AFTER_MINUTES" | "NEAREST_HALF_HOUR" | "PER_MINUTE",   // VISIT_ROUNDINGS
  visitRoundingMinutes: number | null,                                // set exactly for UP_AFTER_MINUTES
  visitCapAtDayPrice: boolean,
  visitStudentPrices: boolean,
  receptionMayTypePrices: boolean,                                    // false for every new space
  reminderTemplate: string | null                                     // null: the copy catalogue's default text
}
```

#### `GET /manage/spaces/:spaceId/settings` · 🏢
- **200:** `SpaceSettings`: the space's eight settings.
- **Errors:** `forbidden` (403) for reception; `not_found` (404).

#### `PATCH /manage/spaces/:spaceId/settings` · 🏢
- **Body:** any of the eight; what is absent is kept, and `null` clears the stay limit or the reminder.
- **200:** `SpaceSettings`, as they now are. Audited `space.settingsEdited`.
- **Errors:** `validation` (422), each field with its codes; `forbidden` (403) for reception, before the body is read, and for an owner whose link ended meanwhile; `not_found` (404), also for a space deleted meanwhile.

### Capacity (managed)

A space's capacity: the most people it seats, private from the public and the admin ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)); the live status reads it (*Occupancy (managed)*), and so does the check-in's full warning (*Front desk (managed)*) ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money)). The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). Both routes are the owner's (🏢): reception is refused with `forbidden` (403) before a body is read. A change applies from then on.

- **`capacity`** (`@masaha/shared/occupancy`): a whole number from 1 to 1,000 (`CAPACITY_MAX`; `out_of_range` outside it, `invalid_format` when not whole), or `null` for none.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the space as the entity and the entry's space: `space.capacityEdited` (`before` and `after`: `{ capacity }`, `null` before a first one); the capacity the space already has writes nothing.

```ts
SpaceCapacity = { capacity: number | null }   // null: none set
```

#### `GET /manage/spaces/:spaceId/capacity` · 🏢
- **200:** `SpaceCapacity`; `null` before one is set.
- **Errors:** `forbidden` (403) for reception; `not_found` (404).

#### `PUT /manage/spaces/:spaceId/capacity` · 🏢
- **Body:** `{ capacity }`, required: the number, or `null` to clear it.
- **200:** `SpaceCapacity`, as it now is. The space's occupancy row is created on the first write; a later one changes the capacity only. Audited `space.capacityEdited`.
- **Errors:** `validation` (422), `required` when `capacity` is absent; `forbidden` (403) for reception, before the body is read, and for an owner whose link ended meanwhile; `not_found` (404), also for a space deleted meanwhile.

### Occupancy (managed)

A space's state now, as its staff see it: who is present (the open visits plus the open subscription check-ins), the capacity and the live status, with its manual override ([data-model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored); [ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)). The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). Every route is the staff's (🧾). Built 2026-10-19, #94.

- **The override** (`@masaha/shared/occupancy`): `state`, one of `LiveStatus`, and `duration`, one of `MINUTES_30`, `HOUR_1`, `HOURS_2`, `UNTIL_CLOSING` (`OVERRIDE_DURATIONS`); each `invalid_choice` when absent or not one of them. It ends at `min(now + duration, today's closing)`, `UNTIL_CLOSING` at today's closing, so it never outlives its day; it counts only while its end is after now.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the space as the entity and the entry's space: `space.statusOverridden` (`before`: the override in force, `{ state, until }`, or none; `after`: the new one), `space.statusOverrideCleared` (`before`: the override cleared); clearing with none in force writes nothing.

```ts
LiveStatus = 'AVAILABLE' | 'FULL' | 'CLOSED'
PresentPerson =
  | { kind: 'VISIT', id, name, since, chargeNowAgorot: number | null }  // name: the visitor's, or their customer's; the charge so far (up to its due time), null with no rate
  | { kind: 'CHECK_IN', id, customerId, name, since }  // name: the customer's; since: the check-in time
SpaceOccupancyNow = {
  status: LiveStatus | null,                    // null: unverified, no opening hours, or open with no capacity
  capacity: number | null,
  present: number,                              // the open visits plus the open subscription check-ins
  override: { state: LiveStatus, until } | null, // the manual override in force, while the status uses it
  people: PresentPerson[]                       // the earliest checked in first; a tie: visits first, then by id
}
```

#### `GET /manage/spaces/:spaceId/occupancy` · 🧾
- **200:** `SpaceOccupancyNow`, answered whole (§4's exceptions). Read without a lock: a check-in committed meanwhile may show only on the next read.
- **Errors:** `not_found` (404).

#### `PUT /manage/spaces/:spaceId/status-override` · 🧾
- **Body:** `{ state, duration }`, both required.
- **200:** `SpaceOccupancyNow`, with the new override. It replaces the one in force; the space's occupancy row is created, with no capacity, on the first write; a capacity is never touched. Audited `space.statusOverridden`.
- **Errors:** `validation` (422), before anything is read; `conflict` (409) `SPACE_NOT_OPEN` while the space is not open by its hours (before opening, from its closing minute, on a closed day) or has no hours at all, while a closure is in force, or while it is unverified (no active owner), when the status would ignore it; `forbidden` (403) for an owner or reception whose link ended meanwhile; `not_found` (404), also for a space deleted meanwhile.

#### `DELETE /manage/spaces/:spaceId/status-override` · 🧾
- **200:** `SpaceOccupancyNow`, with no override. Clears the override in force, audited `space.statusOverrideCleared`; with none in force, writes nothing.
- **Errors:** `forbidden` (403) for an owner or reception whose link ended meanwhile; `not_found` (404), also for a space deleted meanwhile.

### Customers (managed)

A space's customers: everyone it keeps on file, a subscriber or a visitor who left a debt ([data-model › Operations](../architecture/data-model.md#operations)), private to its staff. The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). The list, the file, the create and the edit are the staff's (🧾); the archive and the restore are the owner's (🏢). Each is refused with `forbidden` (403) before its body is read for whoever may not, and again for an owner or reception whose link ended meanwhile. Built 2026-10-21, #102.

- **The fields** (`@masaha/shared/customers`): `name`, 1–60 characters, NFC-normalised and trimmed, with no bidirectional controls and no control characters or line separators (`invalid_format`); `phone`, optional, normalised to E.164 (`invalid_format` otherwise), held by at most one customer of the space that is not archived: another one's is refused with `conflict` (409) `PHONE_TAKEN` and `errors.phone = ["not_unique"]`, writing nothing. An archived customer's phone is free.
- **Archived, never deleted** ([ADR 0007](../architecture/decisions/0007-soft-delete.md)): an archived customer keeps their records and debts, is not edited (`CUSTOMER_ARCHIVED`) until the owner restores them, and frees their phone for another customer.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the customer as the entity and its space as the entry's: `customer.created` (`after`: `{ name, phone }`), `customer.edited` (`before` and `after`: only the fields that changed), `customer.archived` (`after`: `{ archivedAt }`) and `customer.restored` (`before`: `{ archivedAt }`); an edit that changes nothing, and a repeated archive or restore, write nothing.

```ts
Customer = {
  id: number,
  name: string,
  phone: string | null,          // E.164
  archivedAt: string | null      // set while archived
}
```

#### `POST /manage/spaces/:spaceId/customers` · 🧾 · `Idempotency-Key`
- **Body:** `{ name, phone? }`.
- **201:** `Customer`; a retry with the same key answers the first customer as it is now, 201, and writes nothing.
- **Errors**, each writing nothing: `validation` (422) on `idempotencyKey` (§1), then on the body, before anything is read; `forbidden` (403); `conflict` (409) `PHONE_TAKEN`; `not_found` (404), also for a space deleted meanwhile.

#### `PATCH /manage/spaces/:spaceId/customers/:customerId` · 🧾
- **Body:** `{ name?, phone? }`: what is absent is kept; `phone: null` clears it.
- **200:** `Customer`.
- **Errors**, each writing nothing: `validation` (422) on the body, before anything is read; `forbidden` (403); `not_found` (404) for a customer that is not the space's; `conflict` (409) `CUSTOMER_ARCHIVED` for an archived customer, `PHONE_TAKEN` for a new phone another customer holds.

#### `POST /manage/spaces/:spaceId/customers/:customerId/archive` · 🏢
- **200:** `Customer`, archived now; one already archived is answered as it is. A customer who owes is archived (the web asks first, DK-014): the debt stays theirs.
- **Errors**, each writing nothing: `forbidden` (403) for reception, before anything is read, and for an owner whose link ended meanwhile; `not_found` (404) for a customer that is not the space's; `conflict` (409) `MEMBER_ALREADY_CHECKED_IN` for a customer present by an open check-in or an open visit.

#### `POST /manage/spaces/:spaceId/customers/:customerId/restore` · 🏢
- **200:** `Customer`, no longer archived; one not archived is answered as it is.
- **Errors**, each writing nothing: `forbidden` (403) for reception, before anything is read, and for an owner whose link ended meanwhile; `not_found` (404) for a customer that is not the space's; `conflict` (409) `PHONE_TAKEN` when another customer now holds their phone.

#### `GET /manage/spaces/:spaceId/customers` · 🧾
- **Query:** `?q=&status=&kind=&packageId=&payment=&page=&limit=` (`customersQuerySchema`, `@masaha/shared/desk`):
  - `q`, 1–60 characters: a whole phone number in any form the phone field takes matches that phone; else digits only, at least two once a phone's separators (spaces, `+`, `-`, `.`, parentheses) are removed, match the end of a phone; anything else matches a name, Arabic folded as the directory's search folds it (data model › Search);
  - `status`: `UPCOMING`, `ACTIVE`, `ENDING_SOON` or `EXPIRED`, the customer's current subscription's (the one running, else the next, else the last); `ARCHIVED` lists the archived customers only, the owner's (reception `forbidden`, 403);
  - `kind`: `PACKAGE`, `CUSTOM` (their current subscription from a package, or not) or `NONE` (no subscription); `packageId`: the current subscription's package, which implies `PACKAGE` (`invalid_choice` on `kind` with another);
  - `payment`: `OWES` (a debt above zero), `CREDIT` (credit above zero) or `SETTLED` (neither).
- **200:** `CustomerRow[]`, by name then id, with `meta` (§4). Every filter is applied **before** the page is cut, so every page is full and the total right; archived customers are left out unless `status=ARCHIVED`. Debt, credit and the payment filter are computed in the database ([data-model › Customer debt](../architecture/data-model.md#derived-values-computed-not-stored)). No export of customers or phones exists, for anyone. Read without a lock.
- **Errors:** `validation` (422) on the query; `forbidden` (403) for reception's `status=ARCHIVED`; `not_found` (404).

#### `GET /manage/spaces/:spaceId/customers/:customerId` · 🧾
- **200:** `CustomerFile`: the customer, their debt and credit, who of them is present (an open check-in or an open visit), every subscription with its status, progress, due, paid and balance (the latest started first, then by id), and their unpaid visits — closed, not written off, owing or unpriced — the oldest first, each with its payments, voided ones marked. Its lists are answered whole (§4). Read without a lock.
- **An archived customer's file** is answered to the owner and reception alike: their debts are still collected at the desk (the owner's decision, 2026-10-22, #106).
- **Errors:** `not_found` (404), also for a customer that is not the space's.

```ts
CustomerBalance = { debtAgorot: number, creditAgorot: number }   // debt: the positive balances; credit: a usage-based subscription's paid ahead
SubscriptionState = {
  id, customerId, packageId: number | null, renewalOfId: number | null, name,
  startsOn: string | null, endsOn: string | null,                 // Gaza dates, YYYY-MM-DD
  totalDays, daysPerWeek, hoursPerDay, totalHours: number | null,
  billing: "FIXED" | "PER_HOUR" | "PER_DAY", priceAgorot, audience, shiftId: number | null,
  priceTyped: { byId, reason } | null,                            // a price typed at the desk
  ended: { at, byId } | null,
  status: "UPCOMING" | "ACTIVE" | "ENDING_SOON" | "EXPIRED",
  progress: { daysUsed, daysThisWeek, minutesUsed, minutesToday },   // days with a check-in; closed stays' whole minutes
  dueAgorot: number
}
ItemPayment = VisitPayment & { voided: { at, byId, reason } | null }
CustomerRow = Customer & CustomerBalance & {
  current: { id, name, packageId: number | null, endsOn: string | null, status } | null
}
CustomerFile = { customer: Customer } & CustomerBalance & {
  present: { kind: "CHECK_IN", id, subscriptionId, since } | { kind: "VISIT", id, since } | null,
  subscriptions: (SubscriptionState & { paidAgorot, balanceAgorot })[],
  unpaidVisits: { visit: DeskVisit, payments: ItemPayment[], paidAgorot, balanceAgorot: number | null }[]
}
```

### Subscriptions (managed)

A customer's subscriptions, at the desk: made from a package of the space or typed there ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money)). The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). Subscribing is the staff's (🧾), refused with `forbidden` (403) before its body is read for whoever may not, and again for an owner or reception whose link ended meanwhile. Built 2026-10-22, #106.

- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the subscription as the entity and its space as the entry's: `subscription.created` (`after`: its customer, its terms and dates, `packageId`, `renewalOfId`, and a typed price's `reason`, else `null`).

```ts
NewSubscription = {
  subscription: SubscriptionState & { paidAgorot, balanceAgorot },   // as of the answer
  payments: { item: { visitId } | { subscriptionId }, payment: VisitPayment }[],
  debtAgorot: number                                                 // the customer's, as of the answer
}
```

#### `POST /manage/spaces/:spaceId/customers/:customerId/subscriptions` · 🧾 · `Idempotency-Key`
- **Body:** exactly one of `packageId` and `custom` (both or neither: `invalid_choice` on `packageId`), and `startsOn?`, a Gaza date.
  - `packageId`: a package of the space that is offered; the subscription copies its name, limits, billing, price, audience and shift, and ends `validityDays` after its start, both days included.
  - `custom`: typed at the desk, by the owner always and by reception only where the space's settings allow it — `{ name, endsOn?, totalDays?, daysPerWeek?, hoursPerDay?, totalHours?, billing, priceAgorot, audience, shiftId?, reason }`, a package's fields and bounds with an optional end instead of a validity, and the price's reason, 1–200 characters, recorded with who typed it ([data-model › Hand-typed prices](../architecture/data-model.md#front-desk-and-money)).
  - **The start date:** the one sent, else today (Gaza).
- **201:** `NewSubscription`; a retry with the same key answers the first subscription as it is now, 201, and writes nothing.
- **Errors**, in this order, each writing nothing: `validation` (422) on `idempotencyKey` (§1), then on the body, before anything is read; `forbidden` (403) for an owner or reception whose link ended meanwhile; `not_found` (404) for a customer that is not the space's, also for a space deleted meanwhile; `conflict` (409) `CUSTOMER_ARCHIVED` for an archived customer; `validation` (422) `invalid_choice` on `packageId` for a package that is not the space's or is retired; `forbidden` (403) `PRICE_TYPING_NOT_ALLOWED` for custom terms reception may not type; `validation` (422) `out_of_range` on `custom.endsOn` for an end before the start, `invalid_choice` on `custom.shiftId` for a shift that is not the space's.

### Front desk (managed)

The desk's day: a visitor checked in by name, and checked out with the charge and its payment; once closed, what a visit still owes, which the owner may write off ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money)), 2026-10-20, #100. The endpoints sit under `/manage/spaces/:spaceId` and answer as *Managed spaces* says: without an active `OWNER` or `RECEPTION` link at the live space, `not_found` (404). Every route is the staff's (🧾), except the write-off's, the owner's (🏢). The check-in, the check-out and the payment send an `Idempotency-Key` (§1), read before the body; a retry with the same key answers the first result. Built 2026-10-20, #95.

- **The check-in** (`@masaha/shared/visits`): `visitorName`, 1–60 characters, required; `audience`, `GENERAL` or `STUDENT` (`invalid_choice` otherwise), `GENERAL` when absent; `shiftId`, one of the space's shifts, or absent or `null` for none.
- **The rates** are copied at check-in from the space's prices as they are then ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money), *Visit charge*); a later price change never touches an open visit.
- **The warnings** (`DESK_WARNINGS`, `@masaha/shared/desk`), in `meta.warnings`, in this order, never a refusal: `SPACE_FULL` when as many are present as the space seats (none without a capacity); `OUTSIDE_OPENING_HOURS` when the space has hours and is not open by them. Without a warning, no `meta`. A retry answers them as of the retry, the visit counted present.
- **The check-out** (`@masaha/shared/desk`): `checkedOutAt`, an ISO time, the `quote.at` of the visit's quote the desk showed, at most 5 minutes old and not in the future (`out_of_range` otherwise), absent for now; `payment`, `{ amountAgorot, method, note? }` (`@masaha/shared/payments`: whole agorot from 1 to 10,000,000, `CASH` or `TRANSFER`, a note of 1–200 characters), absent or `null` for none; `phone` (normalised, `invalid_format` otherwise) and `customerName` (1–60 characters), for a part left unpaid; `charge`, `{ amountAgorot, reason }` (1–10,000,000 agorot; a reason of 1–200 characters, required), a price typed by hand.
- **The charge** is the stay's, up to the check-out's time, from the rates copied at check-in and the rounding and the cap in force at check-out ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money)). A visit with no rate has none: whoever may type a price (the owner always; reception where the space's settings allow it) must type it, with its reason; whoever may not closes it **unpriced**, with no charge and no payment, for the owner to price. A typed price where the visit has a rate is refused.
- **A part left unpaid,** the whole of an unpriced close included, needs a `phone` when the visit has no customer: the visit is then left to the space's customer with that phone among those not archived, or to a new one named `customerName` (else the visit's name), and counts in that customer's debt. A visit with a customer keeps it, and needs no phone; a phone that is not its customer's is refused (409 `VISIT_HAS_CUSTOMER`, 2026-10-20, #100). The payment is checked by the ledger against the charge.
- **A retry** with the same key answers the first result: the same visit and payment. A check-out of a visit already closed, with another key, answers it as it is and records nothing; with a `payment`, it is refused (409 `VISIT_ALREADY_CLOSED`), so the desk knows the cash it took is in no ledger (2026-10-20, #97). A key that paid another visit is `conflict` (409), no code.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the visit, the payment or the customer as the entity and the entry's space: `visit.checkedIn` (`after`: `{ visitorName, audience, shiftId, hourRateAgorot, dayRateAgorot }`); `visit.checkedOut` (`after`: `{ checkedOutAt, requestedAt, chargeAgorot, capApplied, typedById, reason, customerId }`: the quote's time it was priced at and the request's own time); `payment.recorded` (`after`: `{ visitId, amountAgorot, method }`); `customer.created` (`after`: `{ name, phone }`) when the phone is new.

```ts
VisitCharge = {
  amountAgorot: number,
  roundingRule: VisitRounding | null,   // the rounding in force at the check-out; null when typed, or when the charge is the day price alone
  roundingMinutes: number | null,
  capApplied: boolean | null,
  typedById: number | null,             // who typed it at the desk, with why
  reason: string | null
}
DeskVisit = {
  id, visitorName: string | null,
  customer: { id, name, phone: string | null } | null,   // the visit's customer, or the one it was left unpaid to
  audience: 'GENERAL' | 'STUDENT', shiftId: number | null,
  hourRateAgorot: number | null, dayRateAgorot: number | null,   // copied at check-in; null: no such price
  checkedInAt, checkedOutAt: string | null,
  checkoutMethod: 'MANUAL' | 'AUTO' | null,
  charge: VisitCharge | null,           // null while open, and once closed unpriced
  writeOff: { at, byId, reason } | null // set while written off
}
VisitPayment = { id, amountAgorot, method: 'CASH' | 'TRANSFER', note: string | null, receivedAt, recordedById }
VisitCheckOut = { visit: DeskVisit, payment: VisitPayment | null }
VisitQuote = {
  at,                                   // when it was quoted: the check-out's checkedOutAt that charges this
  chargeAgorot: number | null,          // null: no rate, so the price is typed or the close unpriced
  billedMinutes: number,
  capApplied: boolean | null
}
QuotedVisit = DeskVisit & { quote: VisitQuote | null }   // null once closed
Rates = { hourAgorot: number | null, dayAgorot: number | null }
VisitTerms = {
  rounding: { rule: VisitRounding, minutes: number | null },
  capAtDayPrice: boolean,
  mayTypePrice: boolean,                // the caller, where a visit has no rate
  rates: { shiftId: number | null, general: Rates, student: Rates | null }[]   // no shift first, then each shift in its order
}
```

#### `POST /manage/spaces/:spaceId/visits` · 🧾 · `Idempotency-Key`
- **Body:** `{ visitorName, audience?, shiftId? }`.
- **201:** `DeskVisit`, open, with `meta: { warnings }` when there are some; a retry with the same key answers the same visit, 201, and writes nothing.
- **Errors:** `validation` (422): on `idempotencyKey` (§1); on the body, before anything is read; `invalid_choice` on `audience` for `STUDENT` where the space turns student prices off; `invalid_choice` on `shiftId` for a shift that is not the space's, writing nothing; `forbidden` (403) for an owner or reception whose link ended meanwhile; `not_found` (404), also for a space deleted meanwhile.

#### `POST /manage/spaces/:spaceId/visits/:visitId/check-out` · 🧾 · `Idempotency-Key`
- **Body:** `{ checkedOutAt?, payment?, phone?, customerName?, charge? }`.
- **200:** `VisitCheckOut`: the visit closed, its charge or none, and the payment taken, if any. A stay past its due time ([data-model](../architecture/data-model.md#front-desk-and-money), *Auto check-out*) is closed at that due time, its `checkedOutAt`, and charged up to it; the audit keeps the request's own time (2026-10-21, #102).
- **Errors:** `validation` (422), each writing nothing: on `idempotencyKey` (§1); on the body, before anything is read; `out_of_range` on `checkedOutAt`, also for a time before the visit's check-in; `required` on `phone` when any part is left unpaid on a visit with no customer; `required` on `charge` when the visit has no rate and the caller may type a price; `invalid_choice` on `charge` when the visit has a rate; `forbidden` (403) `PRICE_TYPING_NOT_ALLOWED` for a typed price reception may not type, and no code for an owner or reception whose link ended meanwhile; `conflict` (409) `PAYMENT_EXCEEDS_DUE` for a payment above the charge, `VISIT_NOT_PRICED` for a payment on an unpriced close, both from the ledger, `VISIT_ALREADY_CLOSED` for a payment on a visit another key already closed, `VISIT_HAS_CUSTOMER` for a phone that is not the visit's customer's, and no code for a key that paid another visit; `not_found` (404) for a visit that is not the space's, also for a space deleted meanwhile.

#### `POST /manage/spaces/:spaceId/payments` · 🧾 · `Idempotency-Key`
- **Body** (`receivePaymentSchema`, `@masaha/shared/desk`): `{ visitId, amountAgorot, method, note?, phone?, customerName? }`: the visit it pays, and a payment as at the check-out. Step 8 adds `subscriptionId`, one of the two.
- **201:** `ReceivedPayment`: the visit, the payment recorded with the caller as who took it, and what the visit was paid and still owes. A **retry** with the same key answers 201 with the first payment and records nothing; the visit and the two sums are as of the retry, as the warnings of a check-in are (ADR 0015's "same body", weakened for them). Built 2026-10-20, #100.
- **Only a closed visit:** an open one is paid at its check-out. The ledger checks the payment first, so its refusals come before any phone is asked for. **If part stays unpaid,** the check-out's rule applies: a visit with a customer keeps it; one with none needs a `phone`, whose customer is found or created.
- **Errors**, in this order, each writing nothing: `validation` (422) on `idempotencyKey` (§1), then on the body, before anything is read; `forbidden` (403) for a reception or owner whose link ended meanwhile; `not_found` (404) for a visit that is not the space's; `conflict` (409) with no code for a key that paid another item, and for a visit still open; from the ledger, `VISIT_WRITTEN_OFF` for a written-off visit, `VISIT_NOT_PRICED` for one with no charge, `PAYMENT_EXCEEDS_DUE` above what is owed; then `validation` (422) `required` on `phone` when part stays unpaid on a visit with no customer, and `conflict` (409) `VISIT_HAS_CUSTOMER` for a phone that is not the visit's customer's.
- **Audit:** `payment.recorded`; `customer.created` for a new customer; `visit.leftToCustomer` (`after`: `{ customerId }`) when the visit gains its customer, each in the change's own transaction.

```ts
ReceivedPayment = { visit: DeskVisit, payment: VisitPayment, paidAgorot: number, balanceAgorot: number }
```

#### `GET /manage/spaces/:spaceId/visits/:visitId` · 🧾
- **200:** `QuotedVisit`: the visit, with its quote while it is open, its charge now by the rates it copied and the rounding and cap in force — a stay past its due time charged up to it, as its check-out will be (2026-10-21, #102); the desk sends the quote's `at` back as the check-out's `checkedOutAt`. Read without a lock.
- **Errors:** `not_found` (404), also for a visit that is not the space's.

#### `GET /manage/spaces/:spaceId/visit-terms` · 🧾
- **200:** `VisitTerms`: the rounding and the cap in force; whether the caller may type a price; the rates a visit would copy now, with no shift and in each shift, the student rates only where the space allows student prices and they change a rate (DI-41).
- **Errors:** `not_found` (404).

#### `GET /manage/spaces/:spaceId/unpriced-visits` · 🧾
- **Query:** `page`, `limit` (§4).
- **200:** a page of `DeskVisit`: the space's closed visits with no charge — closed unpriced at the desk, or by the auto check-out with no rate — the latest closed first, then by id; `meta` the pagination. Built 2026-10-20, #97.
- **Errors:** `validation` (422) on the query; `not_found` (404).

#### `PUT /manage/spaces/:spaceId/visits/:visitId/charge` · 🧾
- **Body** (`priceVisitSchema`, `@masaha/shared/visits`): `amountAgorot`, whole agorot from 1 to 10,000,000; `reason`, 1–200 characters, required. The check-out's typed `charge` takes the same shape.
- **200:** `DeskVisit`, its charge typed: `typedById` the caller, its `reason`, no rounding. Whoever may type a price types it, by the space's settings (the owner always; reception where they allow it). Built 2026-10-20, #97.
- **Errors:** `validation` (422) on the body, before anything is read; `forbidden` (403) `PRICE_TYPING_NOT_ALLOWED` for reception where the space's settings do not allow it, and no code for an owner or reception whose link ended meanwhile; `conflict` (409) `VISIT_ALREADY_PRICED` for a visit with a charge, and no code for a visit still open (it is priced at its check-out); `not_found` (404), also for a visit that is not the space's.
- **Audit:** `visit.priced` (`after`: `{ chargeAgorot, reason }`), in the change's own transaction.

#### `GET /manage/spaces/:spaceId/uncollected-visits` · 🧾
- **Query:** `page`, `limit` (§4).
- **200:** a page of `UncollectedVisit` (`@masaha/shared/payments`): the space's visits closed by the auto check-out, not fully paid and not written off (2026-10-20, #100), the unpriced ones included, the latest closed first, then by id; a voided payment counts for nothing. A manual check-out's visit is never listed: its unpaid rest is a customer's debt. `meta` the pagination. Built 2026-10-20, #97.
- **Errors:** `validation` (422) on the query; `not_found` (404).

```ts
UncollectedVisit = {
  visit: DeskVisit,
  paidAgorot: number,             // what was paid on it, voided payments left out
  balanceAgorot: number | null    // what is still owed; null while it has no charge (unpriced)
}
```

#### `PUT /manage/spaces/:spaceId/visits/:visitId/customer` · 🧾
«تسجيل دينًا» (DK-012): a closed visit's unpaid rest left to a customer by phone, with no payment.
- **Body** (`leaveToCustomerSchema`, `@masaha/shared/desk`): `{ phone, customerName? }`; `phone` required.
- **200:** `DeskVisit`, its `customer` the space's customer with that phone among those not archived, or a new one named `customerName` (else the visit's name); it stays uncollected, now with its customer, and counts in that customer's debt. An unpriced visit may be left too: its debt has a customer before it is priced. The same phone again answers the visit as it is, writing nothing. Built 2026-10-20, #100.
- **Errors:** `validation` (422) on the body, before anything is read; `forbidden` (403) for a reception or owner whose link ended meanwhile; `conflict` (409) `VISIT_WRITTEN_OFF` for a written-off visit, `VISIT_ALREADY_PAID` for one with nothing owed, `VISIT_HAS_CUSTOMER` for a visit that is already another customer's, and no code for a visit still open; `not_found` (404), also for a visit that is not the space's.
- **Audit:** `customer.created` for a new customer; `visit.leftToCustomer` (`after`: `{ customerId }`), in the change's own transaction.

#### `POST /manage/spaces/:spaceId/visits/:visitId/write-off` · 🏢
- **Body** (`writeOffVisitSchema`, `@masaha/shared/visits`): `reason`, 1–200 characters, required.
- **200:** `DeskVisit`, its `writeOff` set: now, by the caller, with the reason. What the visit still owed is written off (K6); its payments stay, and the write-off is never a payment. A visit already written off is answered as it is, its first reason kept, writing nothing. Built 2026-10-20, #100.
- **Errors:** `forbidden` (403) for reception, at the route before the body is read, and for an owner whose link ended meanwhile; `validation` (422) on the body, before anything is read; `conflict` (409) `VISIT_NOT_PRICED` for a visit with no charge, `VISIT_ALREADY_PAID` for one with nothing owed, and no code for a visit still open (it is settled at its check-out); `not_found` (404), also for a visit that is not the space's.
- **Audit:** `visit.writtenOff` (`after`: `{ reason, balanceAgorot }`, the amount written off), in the change's own transaction.

#### `DELETE /manage/spaces/:spaceId/visits/:visitId/write-off` · 🏢
- **200:** `DeskVisit`, its `writeOff` cleared: it is uncollected again (or its customer's debt), and takes payments. A visit not written off is answered as it is, writing nothing. Built 2026-10-20, #100.
- **Errors:** `forbidden` (403) for reception, and for an owner whose link ended meanwhile; `not_found` (404), also for a visit that is not the space's.
- **Audit:** `visit.writeOffUndone` (`before`: `{ writtenOffAt, writtenOffById, reason }`), in the change's own transaction.

### Internal

The timed jobs ([ADR 0014](../architecture/decisions/0014-deployment.md); [conventions §12](../backend/conventions.md#12-environments)): online, an external cron calls this endpoint every 5 minutes; locally, the server runs the same jobs from a timer. It carries no access token, so the general limit counts it by address ([security › Rate limits](../backend/security.md#rate-limits-fixed-window)). Built 2026-10-20, #97.

#### `POST /internal/jobs/run`
- **Mounted only when `JOBS_SECRET` is set;** otherwise `not_found` (404), as any unknown path.
- **Auth:** `Authorization: Bearer <JOBS_SECRET>`, compared in constant time; a missing or wrong secret is `unauthorized` (401), no code, and runs nothing.
- **Runs** each job in turn, each at the run's time: `visits.autoCheckOut` and `subscriptions.autoCheckOut` close every open stay whose due time has passed, at that due time, never at the run's ([data-model › Front desk and money](../architecture/data-model.md#front-desk-and-money), *Auto check-out*), up to 500 a job a run; `remaining` counts the due stays left to the next run. A second run closes nothing more.
- **200:** `{ ranAt, jobs: [{ name, done }] }`, `done` each job's counts (`{ visits, remaining, failed }`, `{ checkIns, remaining, failed }`). `failed` counts the stays the job could not close: the stays after one are still closed, and each one not closed is logged with its id (`stay not closed`); the run still answers 200, so one bad stay never turns every call red (2026-10-21, #102).
- **Errors:** `server` (500) when a job itself threw, so it could not run: the others still ran, and the failure is logged with the job's name (`job failed`), so the cron service shows it.
- **Audit:** `visit.autoCheckedOut` (`after`: `{ checkedOutAt, chargeAgorot }`) and `checkIn.autoCheckedOut` (`after`: `{ checkedOutAt }`), each with no actor, in the closing's own transaction.

### Lookups (public)

#### `GET /lookups` · 🌐
- **200:** `LookupsCatalogue` (`@masaha/shared/lookups`): what a form or a filter may offer, in both languages. Not paginated (§4).

  ```ts
  LookupsCatalogue = {
    governorates: { id, nameAr, nameEn, areas: { id, nameAr, nameEn }[] }[],   // active only, each list in order
    amenities: { id, key, nameAr, nameEn, icon: AmenityIconKey }[]   // active only, in order
  }
  ```
  A hidden governorate is left out with all its areas, whatever their own flags; a hidden area and a retired amenity are left out.

### Directory (public)

What anyone reads without signing in, over the **publicly listed** spaces only ([data-model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)): not deleted, not hidden, in an active area of an active governorate. Why each rule: [directory › Decisions](../features/directory.md#decisions). No answer carries a capacity or a count; the card and the pin carry the live status ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md); the rule: [data-model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)), 2026-10-19, #94.

- **The filters** the list and the map share, each optional, every one applied before a page is cut:
  - `area`: a comma list of area ids, at most 50, each once (`invalid_format`, `too_long`); an id of an area that is not listed narrows to nothing;
  - `period` (`HOUR`, `DAY`, `WEEK` or `MONTH`), with `priceMin` and `priceMax`, whole agorot from 1 to 10,000,000, inclusive: a general price of that period within the bounds, whatever its shift or label. A bound needs `period` (`required` on `period`), and `priceMin` above `priceMax` is `out_of_range` on `priceMax`;
  - `studentPrices=true`: a student price;
  - both price filters leave out an unverified space whose prices are stale, which its page hides;
  - `openFriday=true`: Friday open in its hours; a space whose hours were never saved is left out;
  - `verified=true`: an active `OWNER` link;
  - `availableNow=true`: the live status `AVAILABLE` now, which only a verified space can have; `availableNow`, as each `true` filter, takes `true` or `false` (`invalid_choice` otherwise), and `false` filters nothing;
  - `q`, 1–80 characters: either name of the space, or either name of its area, matched forgivingly. Both sides are normalised (lowercased; tashkeel and tatweel removed; أ إ آ ٱ → ا, ة → ه, ى → ي), and a part of a name, or a near match (a typo), passes. A `q` with nothing but tashkeel or tatweel, spaces around them included, is `invalid_format`; one of spaces only is empty once trimmed, `too_short`, as every text is.
- **The location** travels in the `Masaha-Near: lat,lng` request header, never in the query, and only to sort by distance ([security › Location](../backend/security.md#location)): each coordinate with at most 3 decimals (`invalid_format` on `near` otherwise), inside the Gaza Strip's box (`out_of_range`).
- **Caching:** an answer carries `Cache-Control: public, max-age=30` and a validator (`ETag`): the same request with `If-None-Match` answers `304` while it is unchanged. Every answer to a request that carries the `Masaha-Near` header, a refusal or a failure included, carries `Cache-Control: no-store`.
- **Photos:** a card and a pin carry the cover's card-size URL, a space's page its photos; each URL is a space's photo's ([Photos](#photos)): it never changes for its file, so it is cached long, and it leaves the answers within their 30 seconds once the photo is removed.

```ts
DirectorySpace = {
  id: number, slug: string, nameEn: string, nameAr: string | null,
  area: { id: number, nameAr: string, nameEn: string },   // its governorate: the catalogue's
  isVerified: boolean,
  days: (OpeningRange | null)[] | null,    // the week, Sunday first; null while never saved
  distanceMeters?: number,                 // ordered by distance only: straight-line, to the nearest 100 m
  cover: string | null,                    // the first photo's card-size URL; null: the web draws the space's mark
  liveStatus: LiveStatus | null            // now; null: unverified, no opening hours, or open with no capacity
}

MapPin = {
  id: number, slug: string, nameEn: string, nameAr: string | null,
  areaId: number, location: { lat: number, lng: number },
  isVerified: boolean, days: (OpeningRange | null)[] | null,
  cover: string | null,                    // as the card's, for the selected card
  liveStatus: LiveStatus | null            // as the card's
}

PublicOccupancy = { status: LiveStatus | null }   // LiveStatus: Occupancy (managed)

PublicSpace = {
  id, slug, nameEn, nameAr, descriptionAr, descriptionEn,
  area: { id, nameAr, nameEn },
  addressAr, addressEn, landmarkAr, landmarkEn, location: { lat, lng },
  isVerified: boolean,
  hours: SpaceHours | null,                // null until first saved
  prices: Price[] | null,                  // null when hidden: an unverified space's stale prices
  amenities: PublicAmenity[],              // the platform's active ones in its order, then the space's own
  contacts: Contact[],
  updatedAt: Record<FactGroup, string | null>,   // ISO 8601; null while the group is missing
  staleGroups: FactGroup[],
  photos: PhotoUrls[]                      // in the gallery's order, the cover first; none: the page shows a caption
}

PublicAmenity = { nameAr: string, nameEn: string | null, icon: AmenityIconKey | null }   // null: the space's own
```

#### `GET /spaces` · 🌐
- **Query:** the filters, `sort`, `lang` and the page (§4): `?area=&period=&priceMin=&priceMax=&studentPrices=&openFriday=&verified=&availableNow=&q=&sort=&lang=&page=&limit=`.
  - `sort`: `updated`, the latest of the space's groups' dates first, the default without `q`; `name`, by the name in `lang` (`ar`, the default: the Arabic name, else the English one; `en`: the English name), in that language's collation; `relevance`, best match first, the default with `q` and refused without it (`invalid_choice` on `sort`); `distance`, nearest first, from the `Masaha-Near` header. Every order ends with the id, so ties keep their places across pages.
  - `sort=distance` without the header is `required` on `near`; the header with any other order is `invalid_choice` on `near`.
- **200:** `DirectorySpace[]` (`@masaha/shared/directory`), with `meta`.
- **Errors:** `validation` (422).

#### `GET /map/spaces` · 🌐
- **Query:** the filters, and `bounds=south,west,north,east`, the map's viewport (`invalid_format` unless south is below north and west before east). No page, no order.
- **200:** `{ pins: MapPin[], truncated: boolean }`: every space that passes, unpaged (§4), up to 1,000; past them, the first 1,000 by id, with `truncated: true`, and the map asks again within its viewport.
- **Errors:** `validation` (422).

#### `GET /spaces/:slug` · 🌐
- **200:** `PublicSpace`. Read whole, as the admin's read is, so a save in progress is never half shown.
- **Errors:** `not_found` (404) for an unknown slug, and for a space that is deleted, hidden, or in an area or a governorate that is not active.

#### `GET /spaces/:slug/occupancy` · 🌐
- **200:** `PublicOccupancy`: the space's live status now and nothing else, never a count or a capacity ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)), so the page refreshes the state alone; `null` when it has none. Cached as every answer is (30 seconds).
- **Errors:** `not_found` (404), as for the page.

### Lookups (the admin)

The bilingual lookup lists the admin keeps ([data-model › Lookups](../architecture/data-model.md#lookups)). Every endpoint needs an `ADMIN`'s access token (🛡): without a valid one, `unauthorized` (401); for another role, `forbidden` (403); while a temporary password is pending, `forbidden` (403) `PASSWORD_CHANGE_REQUIRED`.

- **Names:** both are required, each 1–60 characters, NFC-normalised, with no bidirectional controls and no control characters or line separators (`invalid_format`).
- **Nothing is deleted:** a row is hidden (`isActive: false`) and restored (`true`), and a hidden one is still listed here.
- **Order:** a list's order is its array's order. A new row is placed last; an order is set as a whole list.
- **Audit:** every change but an order writes its audit entries in its own transaction ([conventions §6](../backend/conventions.md#6-audit)), named `<entity>.<verb>`: the entity is `governorate`, `area` or `amenity`; the verb `added` (`after`: the fields it was created with), `edited` (`before` and `after`: only the fields that changed), `hidden` or `restored` (`before` and `after`: `isActive`). A `PATCH` that changes names and the flag writes two entries, `edited` first; one that changes nothing writes nothing.
- An unknown id answers `not_found` (404).

```ts
AdminGovernorate = { id: number, nameAr: string, nameEn: string, isActive: boolean }
AdminArea = { id: number, governorateId: number, nameAr: string, nameEn: string, isActive: boolean }
AdminGovernorateWithAreas = AdminGovernorate & { areas: AdminArea[] }

AdminAmenity = {
  id: number,
  key: string,                 // snake_case, derived from nameEn when it is added; never changes
  nameAr: string, nameEn: string,
  icon: AmenityIconKey,        // one of AMENITY_ICON_KEYS (@masaha/shared/lookups)
  isActive: boolean            // false: retired, its links to spaces kept
}
```

#### `GET /admin/governorates` · 🛡
- **200:** `AdminGovernorateWithAreas[]`: every governorate, hidden ones included, each with all its areas; both lists in order. Not paginated (§4).

#### `POST /admin/governorates` · 🛡
- **Body:** `{ nameAr, nameEn }`.
- **201:** `AdminGovernorate`, active and placed last. Audited `governorate.added`.
- **Errors:** `validation` (422); `conflict` (409), with `errors.nameAr = ["not_unique"]`, when another governorate, hidden or not, has the Arabic name.

#### `PATCH /admin/governorates/:id` · 🛡
- **Body:** `{ nameAr?, nameEn?, isActive? }`; what is absent is kept. Hiding a governorate leaves its areas' own flags alone: a space is listed publicly only while both are active ([data-model](../architecture/data-model.md#derived-values-computed-not-stored)).
- **200:** `AdminGovernorate`. Audited `governorate.edited`, `governorate.hidden` or `governorate.restored`.
- **Errors:** `validation` (422); `not_found` (404); `conflict` (409), with `errors.nameAr = ["not_unique"]`.

#### `PUT /admin/governorates/order` · 🛡
- **Body:** `{ ids: number[] }`: every governorate's id, each once, first to last.
- **204:** the order is applied in one transaction. Repeating it changes nothing. Not audited.
- **Errors:** `validation` (422); `conflict` (409), with no code, when the ids are not exactly the current governorates (one missing, extra or repeated): the list changed since it was read.

#### `PUT /admin/governorates/:id/areas/order` · 🛡
- **Body:** `{ ids: number[] }`: every id of the governorate's areas, each once, first to last.
- **204:** as for the governorates' order.
- **Errors:** `validation` (422); `not_found` (404) for an unknown governorate; `conflict` (409), with no code, when the ids are not exactly the governorate's current areas.

#### `POST /admin/areas` · 🛡
- **Body:** `{ governorateId, nameAr, nameEn }`. The governorate may be hidden. An area never moves to another governorate: no endpoint changes `governorateId`.
- **201:** `AdminArea`, active and placed last in its governorate. Audited `area.added`, with `governorateId` in `after`.
- **Errors:** `validation` (422); `not_found` (404) for an unknown governorate; `conflict` (409), with `errors.nameAr = ["not_unique"]`, when another area of the same governorate has the Arabic name.

#### `PATCH /admin/areas/:id` · 🛡
- **Body:** `{ nameAr?, nameEn?, isActive? }`; what is absent is kept.
- **200:** `AdminArea`. Audited `area.edited`, `area.hidden` or `area.restored`.
- **Errors:** `validation` (422); `not_found` (404); `conflict` (409), with `errors.nameAr = ["not_unique"]`.

#### `GET /admin/amenities` · 🛡
- **200:** `AdminAmenity[]`: every amenity, retired ones included, in order. Not paginated (§4).

#### `POST /admin/amenities` · 🛡
- **Body:** `{ nameAr, nameEn, icon }`; `icon` is one of the shared icon keys (`invalid_choice`).
- **201:** `AdminAmenity`, active and placed last. Its key is `nameEn` in snake_case: accents dropped, lowercased, every run of other characters than `a–z` and `0–9` one `_` ("Hot drinks" → `hot_drinks`). Audited `amenity.added`, with `key` in `after`.
- **Errors:** `validation` (422), with `errors.nameEn = ["invalid_format"]` for an English name that yields no key; `conflict` (409), with `errors.nameEn = ["not_unique"]`, when another amenity, a retired one included, has the key.

#### `PATCH /admin/amenities/:id` · 🛡
- **Body:** `{ nameAr?, nameEn?, icon?, isActive? }`; what is absent is kept. The key never changes, whatever the new English name.
- **200:** `AdminAmenity`. Audited `amenity.edited` (names, `icon`), `amenity.hidden` or `amenity.restored`.
- **Errors:** `validation` (422); `not_found` (404).

#### `PUT /admin/amenities/order` · 🛡
- **Body:** `{ ids: number[] }`: every amenity's id, retired ones included, each once, first to last.
- **204:** as for the governorates' order.
- **Errors:** `validation` (422); `conflict` (409), with no code, when the ids are not exactly the current amenities.

### Spaces (the admin)

The spaces the admin enters and keeps ([data-model › Spaces](../architecture/data-model.md#spaces)). Every endpoint needs an `ADMIN`'s access token (🛡), refused as for the lookups: without a valid one, `unauthorized` (401); for any other role, a space's owner included, `forbidden` (403); while a temporary password is pending, `forbidden` (403) `PASSWORD_CHANGE_REQUIRED`.

- **The profile** is a space's basics and location. Its texts are NFC-normalised, with no bidirectional controls and no control characters or line separators (`invalid_format`), except that a description keeps line breaks:
  - `nameEn`, required, 1–80 characters; `nameAr`, optional, 1–80 ([data-model › Conventions](../architecture/data-model.md#conventions));
  - `descriptionAr`, `descriptionEn`, optional, 1–1000, line breaks allowed;
  - `areaId`: an area that is active, in a governorate that is active (`invalid_choice` otherwise, an unknown one included);
  - `addressAr`, required, and `addressEn`, optional, 1–200; `landmarkAr`, `landmarkEn`, optional, 1–120;
  - `location: { lat, lng }`, required: the map pin, inside the Gaza Strip's box (`GAZA_STRIP_BOUNDS`, `@masaha/shared/spaces`), else `errors.location = ["out_of_range"]`.

  An optional text is absent or `null` when there is none; an empty one is `too_short`.
- **The slug** is derived from `nameEn` when the space is created, and never changes: accents dropped, lowercased, every run of other characters than `a–z` and `0–9` one `-`: the base, at most 60 characters, then any suffix ("Focus Hub" → `focus-hub`). A slug any space holds, a soft-deleted one included, takes the smallest free suffix from 2 (`focus-hub-2`).
- **Audit:** every change writes its entry in its own transaction ([conventions §6](../backend/conventions.md#6-audit)), named `space.<verb>`, with the space as both the entity and the entry's space.
- **Freshness:** each fact group (`FactGroup`: `"profile" | "hours" | "prices" | "amenities" | "contacts"`) has its date, renewed when the group is saved or confirmed unchanged. The profile is dated when the space is created; any other group has no date, **missing**, until it is first saved ([data-model › Conventions](../architecture/data-model.md#conventions)).
- **The facts** are saved one group at a time, each by a `PUT` that replaces the group whole and answers `AdminSpace`, only while the space is unverified ([security › Authorization](../backend/security.md#authorization)). A save dates its group now, leaves the other groups' dates alone, and is audited `space.<group>Edited`, with the whole group in `before` and `after`; hours never saved are recorded as `{ days: [], shifts }`. A save that changes nothing writes nothing, its date included, unless the group is missing: its first save always dates it, even empty. A list's order is the order it is shown in. A row that repeats an earlier one is refused with `not_unique` on that row's field (`errors["shifts.1.nameAr"]`). Each answers `forbidden` (403), with no code, on a verified space, and `not_found` (404) for a soft-deleted space too.

```ts
AdminSpace = {
  id: number, slug: string,
  nameEn: string, nameAr: string | null,
  descriptionAr: string | null, descriptionEn: string | null,
  areaId: number, addressAr: string, addressEn: string | null,
  landmarkAr: string | null, landmarkEn: string | null,
  location: { lat: number, lng: number },
  isHidden: boolean,
  isVerified: boolean,             // an active OWNER link (data-model › Derived values)
  owners: { id: number, name: string }[],  // active OWNER links, oldest first
  updatedAt: Record<FactGroup, string | null>,   // ISO 8601; null while the group is missing (never the profile)
  staleGroups: FactGroup[],         // older than the platform's thresholds (data-model › Derived values)
  missingGroups: FactGroup[],       // never saved
  hours: SpaceHours | null,         // null until first saved
  prices: Price[],
  amenityIds: number[],             // by id; retired amenities included
  ownAmenities: OwnAmenity[],       // its own, beyond the platform's list, in order
  contacts: Contact[]
}

OwnAmenity = { nameAr: string, nameEn: string | null }   // typed by the space

OpeningRange = { opensMinute: number, closesMinute: number }   // minutes after midnight, Asia/Gaza
Shift = { id: number, nameAr: string, nameEn: string | null, startsMinute: number, endsMinute: number }
SpaceHours = {
  days: (OpeningRange | null)[],   // 7: Sunday (0) … Saturday (6); null = closed
  shifts: Shift[]
}
Price = {
  period: "HOUR" | "DAY" | "WEEK" | "MONTH",    // PRICE_PERIODS
  audience: "GENERAL" | "STUDENT",              // PRICE_AUDIENCES
  shiftId: number | null,
  labelAr: string | null, labelEn: string | null,   // a custom label
  amountAgorot: number                          // whole agorot, ILS; display only
}
Contact = {
  type: "WHATSAPP" | "PHONE" | "EMAIL" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "WEBSITE",   // CONTACT_TYPES
  value: string                                 // in its type's stored form
}
```

#### `POST /admin/spaces` · 🛡
- **Body:** the profile.
- **201:** `AdminSpace`: a new space, unverified and shown, its profile dated now and its other fact groups missing. Its settings are copied from the platform's new-space defaults ([spaces › Behaviour and flows](../features/spaces.md#behaviour-and-flows)). Audited `space.created`, with the profile and the slug in `after`.
- **Errors:** `validation` (422), with `errors.nameEn = ["invalid_format"]` for an English name that yields no slug; `conflict` (409), with no code, when creations of the same name at once took the slug it chose three times over.

#### `GET /admin/spaces` · 🛡
- **Query:** `?q=&status=&governorateId=&areaId=&stale=&page=&limit=` (§4), each optional:
  - `q`: part of either name, whatever the case (1–80 characters);
  - `status`: `verified` or `unverified`, both leaving hidden spaces out; `hidden`, verified or not; or `deleted`, the soft-deleted spaces only, hidden or not, verified or not;
  - `governorateId`, `areaId`: the spaces of the governorate's areas, hidden ones included, or of one area; both together narrow to that area when it is one of the governorate's, else to none;
  - `stale`: `true` keeps the spaces with at least one stale or missing fact group.
- **200:** `AdminSpaceRow[]` (`@masaha/shared/space-links`), by English name, with `meta`. A soft-deleted space is listed under `status=deleted` only, with its owners, whose links count there though nowhere else ([space-links › Decisions](../features/space-links.md#decisions)). Every filter applies before the page is cut, so every page is full and the total right ([conventions §5](../backend/conventions.md#5-pagination)).

  ```ts
  AdminSpaceRow = {
    id: number, slug: string, nameEn: string, nameAr: string | null,
    area: { id: number, nameAr: string, nameEn: string },
    isVerified: boolean,                            // an active OWNER link (data-model › Derived values)
    isHidden: boolean,
    deletedAt: string | null,                       // when it was soft-deleted; null for a live space
    owners: { id: number, name: string }[],         // its active OWNER links, oldest first
    staleGroups: FactGroup[],
    missingGroups: FactGroup[],
    lastUpdatedAt: string                           // the latest of its fact groups' dates
  }
  ```
- **Errors:** `validation` (422), for an unknown `status` (`invalid_choice`) or a page out of range.

The endpoints on one space put its links on the request first, without refusing anyone ([conventions §8](../backend/conventions.md#space-access)); a `:spaceId` that names no space answers `not_found` (404).

#### `GET /admin/spaces/:spaceId` · 🛡
- **200:** `AdminSpace`, with `isVerified` and active `owners` (oldest first; reception and deactivated links excluded) from its links: what the edit screen shows, editable or read-only.
- **Errors:** `not_found` (404), for a soft-deleted space too.

#### `PATCH /admin/spaces/:spaceId` · 🛡
- **Body:** any part of the profile; what is absent is kept, and an optional field is cleared with `null`. The slug never changes.
- **200:** `AdminSpace`. Only while the space is unverified ([security › Authorization](../backend/security.md#authorization)). An edit that changes something dates the profile group now and is audited `space.profileEdited`, with `before` and `after` holding only the fields that changed (the pin as `lat` and `lng`). One that changes nothing writes nothing, its date included: it confirms nothing.
- **Errors:** `validation` (422); `forbidden` (403), with no code, on a verified space; `not_found` (404), for a soft-deleted space too.

#### `PUT /admin/spaces/:spaceId/hidden` · 🛡
- **Body:** `{ isHidden: boolean }`.
- **204:** the space is hidden from the public, or shown again, verified or not. Audited `space.hidden` or `space.unhidden` (`before` and `after`: `isHidden`); setting what it already is writes nothing.
- **Errors:** `validation` (422); `not_found` (404), for a soft-deleted space too.

#### `DELETE /admin/spaces/:spaceId` · 🛡
- **204:** the space is soft-deleted, verified or not ([ADR 0007](../architecture/decisions/0007-soft-delete.md)): it leaves the public and every list but the admin's deleted spaces (`GET /admin/spaces?status=deleted`), and every link to it counts for nothing for access and in the other lists, kept as it is; a person's global role still counts it ([Owners (the admin)](#owners-the-admin)) ([finding 18](../architecture/findings/18-whether-a-link-to-a-deleted-space-still-counts.md)). Audited `space.deleted` (`after`: `deletedAt`). Deleting a deleted space changes nothing.
- **Errors:** `not_found` (404).

#### `POST /admin/spaces/:spaceId/restore` · 🛡
- **204:** a soft-deleted space comes back as it was, hidden or not, with its links. Audited `space.restored` (`before`: `deletedAt`). Restoring a space that is not deleted changes nothing.
- **Errors:** `not_found` (404).

#### `PUT /admin/spaces/:spaceId/hours` · 🛡
- **Body:** `{ days, shifts }`, the hours and the shifts, saved together:
  - `days`: exactly 7, Sunday first; each `null` (closed) or `{ opensMinute, closesMinute }`, integers with `0 ≤ opensMinute < closesMinute ≤ 1440` (`out_of_range` on `closesMinute`). A day open around the clock is `0`–`1440`; no range runs past midnight;
  - `shifts`: at most 10, each `{ id?, nameAr, nameEn?, startsMinute, endsMinute }`: `nameAr` required and `nameEn` optional, 1–40 characters each, as the profile's texts; `startsMinute < endsMinute` within the day (`out_of_range` on `endsMinute`); inside the range of at least one open day (`errors["shifts.<i>"] = ["out_of_range"]`); an Arabic name or an `id` repeated is `not_unique`.
- **200:** `AdminSpace`. A shift with an `id` is that shift, updated and keeping its id; one without is new; a shift left out is removed. Audited `space.hoursEdited` (`before` and `after`: `{ days, shifts }`).
- **Errors:** `validation` (422), with `invalid_choice` on `shifts.<i>.id` for an id that is not one of the space's shifts; `conflict` (409), with no code, when a shift left out is still used by a price, a package, a subscription or a visit: nothing is written, and the price is changed first; `forbidden` (403); `not_found` (404).

#### `PUT /admin/spaces/:spaceId/prices` · 🛡
- **Body:** `{ prices }`, at most 40, each a `Price`: `period` and `audience` from their lists (`invalid_choice`); `shiftId` optional; `labelAr` and `labelEn` optional, 1–60 characters each, as the profile's texts, `labelEn` only with `labelAr` (`required` on `labelAr`); `amountAgorot` an integer from 1 to 10,000,000: `out_of_range` outside the range (no price is free), `invalid_format` when not an integer.
- **One price per period, audience, shift and label**, a missing shift or label counting as one value ([data-model › Constraints](../architecture/data-model.md#constraints-worth-stating)): a repeat is `not_unique` on the field that would tell it apart, `labelAr` when it has a label, else `shiftId` when it has a shift, else `period`.
- **200:** `AdminSpace`. Audited `space.pricesEdited` (`before` and `after`: `{ prices }`).
- **Errors:** `validation` (422), with `invalid_choice` on `prices.<i>.shiftId` for a shift that is not one of the space's, as they are when the space's lock is taken; `forbidden` (403); `not_found` (404).

#### `PUT /admin/spaces/:spaceId/amenities` · 🛡
- **Body:** `{ amenityIds, ownAmenities }`, the group whole, both required (`required`):
  - `amenityIds`: the platform's amenities, at most 100 ids, a set: an id repeated is `not_unique` (`errors["amenityIds.<i>"]`);
  - `ownAmenities`: the space's own, beyond the platform's list, at most 20, in the order they are shown in, each `{ nameAr, nameEn? }`, 1–60 characters each, as the profile's texts; an Arabic name repeated is `not_unique` (`errors["ownAmenities.<i>.nameAr"]`).
- **200:** `AdminSpace`, its amenities exactly these, its own in their order. An amenity added must be active; one the space already has stays, retired or not, until it is left out ([data-model › Conventions](../architecture/data-model.md#conventions)). A new order of its own amenities is a change. Audited `space.amenitiesEdited` (`before` and `after`: `{ amenityIds, ownAmenities }`, the ids in order of id). Entries written before 2026-10-12 hold `{ amenityIds }` only.
- **Errors:** `validation` (422), with `invalid_choice` on `amenityIds.<i>` for an amenity added that is retired or does not exist; `forbidden` (403); `not_found` (404).

#### `PUT /admin/spaces/:spaceId/contacts` · 🛡
- **Body:** `{ contacts }`, at most 20, each `{ type, value }`: `type` from its list (`invalid_choice`); `value` at most 200 characters, valid for its type and stored in its one form ([data-model › Conventions](../architecture/data-model.md#conventions)), else `invalid_format` on `contacts.<i>.value`. A contact that repeats an earlier one once both are in their stored form is `not_unique`.
- **200:** `AdminSpace`, the contacts in their stored form. Audited `space.contactsEdited` (`before` and `after`: `{ contacts }`).
- **Errors:** `validation` (422); `forbidden` (403); `not_found` (404).

#### `POST /admin/spaces/:spaceId/{profile|hours|prices|amenities|contacts}/confirm` · 🛡
- «المعلومات ما زالت صحيحة»: the group is confirmed unchanged. One path per group; any other answers `not_found` (404).
- **200:** `AdminSpace`, the group dated now and nothing else changed. Only while the space is unverified ([security › Authorization](../backend/security.md#authorization)). Audited `space.<group>Confirmed` (`profileConfirmed`, `hoursConfirmed`, …), with the group's date in `before` and `after` (`{ hoursUpdatedAt }`).
- **Errors:** `conflict` (409), with no code, for a missing group: there is nothing to confirm until it is saved, even empty; `forbidden` (403), with no code, on a verified space; `not_found` (404), for a soft-deleted space too.

#### Photos

A space's gallery: at most 10 photos (`PHOTO_LIMIT`, `@masaha/shared/spaces`), in an order whose first is the **cover**. Each photo is stored in two sizes (`PHOTO_SIZES`), re-encoded on the server as WebP with no metadata ([security › HTTP hardening](../backend/security.md#http-hardening)): `card`, 640×360, a 16:9 crop around the centre; `page`, at most 1600 on its longest side, never enlarged. Photos are no fact group: a change dates nothing and is never confirmed. They change while the space is unverified, as its facts do ([security › Authorization](../backend/security.md#authorization)); a hidden space's included.

```ts
PhotoUrls = { card: string, page: string }   // absolute online, root-relative locally: used as given
SpacePhoto = { id: number, urls: PhotoUrls }  // a list's order is the gallery's; the first is the cover
```

- **Audit:** each change, with the gallery's ids in order before and after (`{ photoIds }`), never a URL or a file: `space.photoAdded`, `space.photoRemoved`, `space.photosReordered`.

#### `GET /admin/spaces/:spaceId/photos` · 🛡
- **200:** `SpacePhoto[]`, in order. A verified space's too: the admin reads them, and cannot change them.
- **Errors:** `not_found` (404), for a soft-deleted space too.

#### `POST /admin/spaces/:spaceId/photos` · 🛡
- **Body:** `multipart/form-data`, one part, `photo`: a JPEG, a PNG or a WebP, at most 4 MiB (`PHOTO_MAX_BYTES`) and 50 megapixels. The web shrinks a photo before sending it. Its name and declared type are ignored.
- **201:** `SpacePhoto`, placed last. Audited `space.photoAdded`.
- **Errors**, a refusal storing nothing: `validation` (422), with `errors.photo = ["required"]` without the part; `bad_request` (400) for any other part, a second file, or a body that cannot be read; `payload_too_large` (413) over 4 MiB or 50 megapixels; `unsupported_media_type` (415) for anything that does not decode as a JPEG, a PNG or a WebP; `conflict` (409), with no code, when the space already has 10 photos; `forbidden` (403), with no code, on a verified space; `not_found` (404), for a soft-deleted space too; `service_unavailable` (503) when the store fails; `rate_limit` (429) past 30 uploads in 15 minutes ([security › Rate limits](../backend/security.md#rate-limits-fixed-window)).

#### `DELETE /admin/spaces/:spaceId/photos/:photoId` · 🛡
- **204:** the photo is removed, the ones after it move up, and its files are deleted before the answer. Audited `space.photoRemoved`. A photo the space does not have writes nothing and answers the same, so a removal retried after a lost answer succeeds.
- **Errors:** `forbidden` (403), with no code, on a verified space; `not_found` (404), for a soft-deleted space too.

#### `PUT /admin/spaces/:spaceId/photos/order` · 🛡
- **Body:** `{ ids: number[] }`: every id of the space's photos, each once, first to last, at most 10 (`too_long`).
- **204:** the order is applied in one transaction; the first is the cover. Audited `space.photosReordered`; the order the gallery already has writes nothing.
- **Errors:** `validation` (422); `conflict` (409), with no code, when the ids are not exactly the space's photos (one missing, extra, repeated or another space's): the gallery changed since it was read; `forbidden` (403), with no code, on a verified space; `not_found` (404), for a soft-deleted space too.

### Owners (the admin)

A space's owners, as the admin links them ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)): a space with an active owner link is verified ([data-model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)). Every endpoint needs an `ADMIN`'s access token (🛡), refused as for the lookups: without a valid one, `unauthorized` (401); for any other role, `forbidden` (403); while a temporary password is pending, `forbidden` (403) `PASSWORD_CHANGE_REQUIRED`.

- **One space at a time.** A link is made, or ended, for one person at one space; the admin links owners only, never reception.
- **The global role follows the links.** A person's first active owner link makes them an `OWNER`, and the end of their last one a `USER` again; a soft-deleted space's link still counts here, as deleting a space writes nothing in its links. Each such change ends every session of the person ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). A link or an end that leaves the role as it is ends no session.
- **Ending is deactivating:** the link is kept, deactivated, and linking again reactivates that same row.
- **Audit**, in the change's own transaction ([conventions §6](../backend/conventions.md#6-audit)): `user.created` for an account the admin creates (`after`: `{ name, email, role, mustChangePassword }`, never the password); `space.ownerLinked` (`after: { userId }`; a deactivated reception row that becomes an owner's has `before: { role: "RECEPTION" }` and `after: { userId, role: "OWNER" }`) and `space.ownerUnlinked` (`before: { userId }`), with the space as both the entity and the entry's space; a change of role, `user.roleChanged` (`before` and `after`: `{ role }`), with the person as the entity.

#### `POST /admin/owners` · 🛡
- **Body:** `{ name, email, spaceId, upgradeExisting? }`. The name as at registration (1–100 characters); the email trimmed and lowercased; `spaceId` the one space it is linked to.
- **201:** `AddedOwner` (`@masaha/shared/space-links`), with `Cache-Control: no-store`; all of it is written, or nothing:
  - **an email with no account:** a new account, an `OWNER` with a temporary password to change at its first sign-in ([security › Passwords](../backend/security.md#passwords)), linked to the space, which is verified;
  - **an email with an account, and `upgradeExisting: true`:** that account is linked as above, keeping its name and its password, with no temporary password. The flag allows an upgrade; it does not require one.

  ```ts
  AddedOwner = {
    userId: number,
    temporaryPassword: string | null   // the new account's, in this answer only, never again; null for an upgrade
  }
  ```
- **Errors**, a refusal writing nothing: `validation` (422), with `errors.spaceId = ["invalid_choice"]` for a soft-deleted or unknown space; for an email with an account, in this order: `conflict` (409) `ACCOUNT_IS_ADMIN`, `conflict` (409) `ACCOUNT_SUSPENDED`, `conflict` (409) `ALREADY_OWNER` for an owner, who is linked instead, `conflict` (409) `EMAIL_HAS_ACCOUNT` without `upgradeExisting` (also when another creation took the email meanwhile), `conflict` (409) `RECEPTION_LINK_ACTIVE`, and `conflict` (409) `ACCOUNT_PASSWORD_PENDING` for an account whose temporary password is pending, which the person changes first ([security.md](../backend/security.md#passwords)).

#### `POST /admin/spaces/:spaceId/owners` · 🛡
- **Body:** `{ userId }`: a user, who becomes an owner, or an owner, who owns one more space.
- **204:** the person is the space's owner; the space is verified. A person already the space's active owner: nothing is written.
- **Errors:** `validation` (422), with `errors.userId = ["invalid_choice"]` for an unknown person; `conflict` (409) `ACCOUNT_IS_ADMIN` for an admin; `conflict` (409) `ACCOUNT_SUSPENDED` for a suspended account; `conflict` (409) `RECEPTION_LINK_ACTIVE` for a person with an active reception link at this space, which its owner deactivates first; `conflict` (409) `ACCOUNT_PASSWORD_PENDING` for an account whose temporary password is pending, which the person changes first ([security.md](../backend/security.md#passwords)); `not_found` (404) for a soft-deleted or unknown space. A refusal writes nothing.

#### `DELETE /admin/spaces/:spaceId/owners/:userId` · 🛡
- **204:** the person's owner link to the space is ended; the last one leaves the space unverified, its facts the admin's again ([security › Authorization](../backend/security.md#authorization)). Without an active owner link of the person there, nothing is written: a reception link is never ended here.
- **Errors:** `not_found` (404) for a soft-deleted or unknown space.

### Users (the admin)

The accounts, as the admin reads and changes them ([data-model › Users and sessions](../architecture/data-model.md#users-and-sessions)). Every endpoint needs an `ADMIN`'s access token (🛡), refused as for the lookups: without a valid one, `unauthorized` (401); for any other role, `forbidden` (403); while a temporary password is pending, `forbidden` (403) `PASSWORD_CHANGE_REQUIRED`.

#### `GET /admin/users` · 🛡
- **Query:** `?q=&role=&state=&page=&limit=` (§4), each optional:
  - `q`: part of the name or the email, whatever the case (1–100 characters);
  - `role`: `user`, `owner` or `admin`, the global role; `role=owner` is the owners page;
  - `state`: `active` or `suspended`.
- **200:** `AdminUserRow[]` (`@masaha/shared/space-links`), newest first, with `meta`. Every filter applies before the page is cut ([conventions §5](../backend/conventions.md#5-pagination)).

  ```ts
  AdminUserRow = {
    id: number, name: string, email: string,
    role: "USER" | "OWNER" | "ADMIN",             // OWNER follows the person's active owner links (ADR 0009)
    isSuspended: boolean,
    signIn: { password: boolean, google: boolean },
    joinedAt: string,                             // when the account was created
    spaces: { id: number, nameEn: string, nameAr: string | null }[]   // its active OWNER links, oldest first;
                                                  // none to a soft-deleted space
    receptionSpaces: { id: number, nameEn: string, nameAr: string | null }[]   // its active RECEPTION links, the same way
  }
  ```
- **Errors:** `validation` (422), for an unknown `role` or `state` (`invalid_choice`) or a page out of range.

#### `POST /admin/users/:userId/temporary-password` · 🛡
- **Body:** none. The recovery of a person who lost their email ([security.md](../backend/security.md#passwords)).
- **200:** `IssuedTemporaryPassword` (`@masaha/shared/users`), with `Cache-Control: no-store`: the account's password is replaced by a temporary one, to change at its next sign-in, and every session of the account and every pending reset link end. Issued again, it replaces the pending one. Audited `user.temporaryPasswordIssued` (`after: { mustChangePassword: true }`), with the account as the entity, never with the password; its handover follows, below.

  ```ts
  IssuedTemporaryPassword = {
    temporaryPassword: string   // in this answer only, never again
  }
  ```
- **Errors**, a refusal writing nothing: `conflict` (409) `OWN_ACCOUNT` for the admin's own account; `conflict` (409) `ACCOUNT_SUSPENDED` for a suspended account, restored first; `conflict` (409) `GOOGLE_ONLY_ACCOUNT` for an account without a password, whose way in is Google; `not_found` (404) for an unknown account.

#### `POST /admin/users/:userId/temporary-password/handover` · 🛡
- **Body:** `{ channel }`: how the temporary password just shown was handed over, `"WHATSAPP"`, `"IN_PERSON"` or `"OTHER"` (`HANDOVER_CHANNELS`, `@masaha/shared/users`). The web asks it after the password is shown, for an account the admin created or a temporary password the admin issued.
- **204:** audited `user.temporaryPasswordHandedOver` (`after: { channel }`), with the account as the entity, as the entry of the password it follows. Only while that temporary password is still pending; a second handover is a second entry.
- **Errors:** `validation` (422), with `invalid_choice` on `channel`; `conflict` (409) `TEMPORARY_PASSWORD_NOT_PENDING` once the account has no temporary password to change; `not_found` (404) for an unknown account.

#### `PUT /admin/users/:userId/role` · 🛡
- **Body:** `{ role }`: `"USER"` or `"ADMIN"` (`ADMIN_ROLE_CHOICES`, `@masaha/shared/space-links`). `OWNER` is never given: it follows the person's active owner links ([Owners (the admin)](#owners-the-admin)).
- **204:** the person's global role is the one asked, every session of theirs ended: their access tokens are refused from their next request, and they sign in again with the new role ([security.md](../backend/security.md#authorization)). Audited `user.roleChanged` (`before` and `after`: `{ role }`), with the person as the entity. Asking the role they already have writes nothing and ends no session.
- **Errors**, a refusal writing nothing: `validation` (422), with `invalid_choice` on `role`; `conflict` (409) `OWN_ACCOUNT` for the admin's own account, whatever the role asked; `conflict` (409) `ACCOUNT_HAS_LINKS` for a person with any active link, owner or reception, a soft-deleted space's included: an owner is not made a user, and no linked person an admin, until the links end; `conflict` (409) `ACCOUNT_PASSWORD_PENDING` for making an admin of an account whose temporary password is pending; `conflict` (409) `LAST_ADMIN` when it would leave the platform with no active admin, which only a change made meanwhile by another admin can cause; `not_found` (404) for an unknown account.

#### `PUT /admin/users/:userId/suspended` · 🛡
- **Body:** `{ isSuspended: boolean }`.
- **204:** the account is suspended, or restored. A suspension ends every session of the account and every pending reset link, and its unexpired access tokens are refused from its next request, and still once it is restored ([security.md](../backend/security.md#authorization)); its links to spaces are kept, so a suspended owner's space stays verified. A restore ends nothing. Audited `user.suspended` or `user.unsuspended` (`before` and `after`: `{ isSuspended }`), with the account as the entity; setting what it already is writes nothing.
- **Errors**, a refusal writing nothing: `validation` (422); `conflict` (409) `OWN_ACCOUNT` for the admin's own account; `conflict` (409) `LAST_ADMIN` when it would leave the platform with no active admin, which only a change made meanwhile by another admin can cause; `not_found` (404) for an unknown account.

## 6. Domain error codes (initial)

A new code is added in the order of [backend conventions §4](../backend/conventions.md#4-errors).

`EMAIL_TAKEN` · `PHONE_TAKEN` (a phone another customer of the space holds, not archived, 2026-10-21, #102) · `INVALID_CREDENTIALS` · `ACCOUNT_SUSPENDED` · `PASSWORD_CHANGE_REQUIRED` · `SPACE_NOT_MANAGED` · `MEMBER_ALREADY_CHECKED_IN` (archiving a customer who is present, 2026-10-21, #102) · `CHECK_IN_ALREADY_CLOSED` · `SPACE_CAPACITY_NOT_SET` · `OUTSIDE_OPENING_HOURS` (warning only; the check-in succeeds with `meta.warnings`) · `CURRENT_PASSWORD_INCORRECT` · `GOOGLE_TOKEN_INVALID` · `RESET_TOKEN_INVALID` · `GOOGLE_LINK_NOT_ALLOWED` · `PASSWORD_NOT_SET` · `RECOVERY_INVALID` · `RESEND_LIMIT_REACHED` · `ACCOUNT_IS_ADMIN` · `RECEPTION_LINK_ACTIVE` · `EMAIL_HAS_ACCOUNT` · `ALREADY_OWNER` · `TEMPORARY_PASSWORD_NOT_PENDING` · `OWN_ACCOUNT` · `LAST_ADMIN` · `ACCOUNT_HAS_LINKS` · `GOOGLE_ONLY_ACCOUNT` · `TEMPORARY_PASSWORD_EXPIRED` · `ACCOUNT_PASSWORD_PENDING` · `SPACE_NOT_OPEN` (an override set while the space is not open by its hours, is under a closure, or is unverified) · `SPACE_FULL` (warning only; the check-in succeeds with `meta.warnings`) · `PRICE_TYPING_NOT_ALLOWED` (reception typing a price where the space's settings do not allow it) · `PAYMENT_EXCEEDS_DUE` (a payment above what is due, from the ledger) · `VISIT_NOT_PRICED` (a payment on, or a write-off of, a visit with no charge; the payment's from the ledger) · `VISIT_ALREADY_CLOSED` (a payment on a visit another check-out already closed: not recorded) · `VISIT_ALREADY_PRICED` (pricing a visit that already has a charge) · `VISIT_ALREADY_PAID` (writing off, or leaving to a customer, a visit with nothing owed, 2026-10-20, #100) · `VISIT_WRITTEN_OFF` (a payment on a written-off visit, from the ledger, or leaving it to a customer, 2026-10-20, #100) · `VISIT_HAS_CUSTOMER` (a phone that is not the customer's of a visit that has one, 2026-10-20, #100) · `CUSTOMER_ARCHIVED` (editing an archived customer, 2026-10-21, #102).
