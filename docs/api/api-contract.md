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

**Exceptions**, lists a screen shows whole, so they are answered whole, without `page` or `meta`:
- the admin's lookup lists (`GET /admin/governorates`, `GET /admin/amenities`): bounded catalogues of tens of rows, shown grouped (§5, *Lookups*);
- the public catalogue of the lookups (`GET /lookups`), the same bounded lists, active rows only (§5, *Lookups (public)*);
- planned: the public directory's `GET /spaces`, the whole filtered set ([plan](../plans/v1-mvp.md#public-directory)).

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
    slug: string, nameAr: string | null, nameEn: string,   // English required, Arabic optional
    area: { nameAr: string, nameEn: string }
  }
  ```
- **Errors:** `unauthorized` (401) without a valid access token; `forbidden` (403) `PASSWORD_CHANGE_REQUIRED` while a temporary password is pending.

### Lookups (public)

#### `GET /lookups` · 🌐
- **200:** `LookupsCatalogue` (`@masaha/shared/lookups`): what a form or a filter may offer, in both languages. Not paginated (§4).

  ```ts
  LookupsCatalogue = {
    governorates: { id, nameAr, nameEn, areas: { id, nameAr, nameEn }[] }[],   // active only, each list in order
    amenities: { id, key, nameAr, nameEn, icon: AmenityIconKey, isFilterable: boolean }[]   // active only, in order
  }
  ```
  A hidden governorate is left out with all its areas, whatever their own flags; a hidden area and a retired amenity are left out.

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
  isActive: boolean,           // false: retired, its links to spaces kept
  isFilterable: boolean        // offered in the directory's filter
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
- **Body:** `{ nameAr, nameEn, icon, isFilterable }`; `icon` is one of the shared icon keys (`invalid_choice`).
- **201:** `AdminAmenity`, active and placed last. Its key is `nameEn` in snake_case: accents dropped, lowercased, every run of other characters than `a–z` and `0–9` one `_` ("Hot drinks" → `hot_drinks`). Audited `amenity.added`, with `key` in `after`.
- **Errors:** `validation` (422), with `errors.nameEn = ["invalid_format"]` for an English name that yields no key; `conflict` (409), with `errors.nameEn = ["not_unique"]`, when another amenity, a retired one included, has the key.

#### `PATCH /admin/amenities/:id` · 🛡
- **Body:** `{ nameAr?, nameEn?, icon?, isFilterable?, isActive? }`; what is absent is kept. The key never changes, whatever the new English name.
- **200:** `AdminAmenity`. Audited `amenity.edited` (names, `icon`, `isFilterable`), `amenity.hidden` or `amenity.restored`.
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

```ts
AdminSpace = {
  id: number, slug: string,
  nameEn: string, nameAr: string | null,
  descriptionAr: string | null, descriptionEn: string | null,
  areaId: number, addressAr: string, addressEn: string | null,
  landmarkAr: string | null, landmarkEn: string | null,
  location: { lat: number, lng: number },
  isHidden: boolean,
  isVerified: boolean,             // an active OWNER link: the owner edits it, the admin no longer does
  updatedAt: Record<FactGroup, string>,   // FactGroup: "profile" | "hours" | "prices" | "amenities" | "contacts"; ISO 8601
  staleGroups: FactGroup[]          // older than the platform's thresholds (data-model › Derived values)
}
```

#### `POST /admin/spaces` · 🛡
- **Body:** the profile.
- **201:** `AdminSpace`: a new space, unverified and shown, every fact group dated now. In one transaction, its settings are copied from the platform's new-space defaults ([conventions §9](../backend/conventions.md#new-space-defaults)); when they cannot be read, nothing is written. Audited `space.created`, with the profile and the slug in `after`.
- **Errors:** `validation` (422), with `errors.nameEn = ["invalid_format"]` for an English name that yields no slug; `conflict` (409), with no code, when creations of the same name at once took the slug it chose three times over.

## 6. Domain error codes (initial)

A new code is added in the order of [backend conventions §4](../backend/conventions.md#4-errors).

`EMAIL_TAKEN` · `PHONE_TAKEN` · `INVALID_CREDENTIALS` · `ACCOUNT_SUSPENDED` · `PASSWORD_CHANGE_REQUIRED` · `SPACE_NOT_MANAGED` · `MEMBER_ALREADY_CHECKED_IN` · `CHECK_IN_ALREADY_CLOSED` · `SPACE_CAPACITY_NOT_SET` · `OUTSIDE_OPENING_HOURS` (warning only; the check-in succeeds with `meta.warnings`) · `OWNER_ALREADY_LINKED` · `CURRENT_PASSWORD_INCORRECT` · `GOOGLE_TOKEN_INVALID` · `RESET_TOKEN_INVALID` · `GOOGLE_LINK_NOT_ALLOWED` · `PASSWORD_NOT_SET` · `RECOVERY_INVALID` · `RESEND_LIMIT_REACHED`.
