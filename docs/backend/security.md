# Security

> **Status:** Active · **Class:** Contract — rules to build against; not yet implemented · **Last Updated:** 2026-10-01 · **Owner:** Basel Ghoneim
> **Authority:** Tokens, passwords, cookies, authorization, rate limits and HTTP hardening. The session model's reasoning is in [ADR 0003](../architecture/decisions/0003-session-model.md); the authorization model's in [ADR 0002](../architecture/decisions/0002-authorization-model.md).

## Tokens and cookies

| Item | Rule |
|---|---|
| Access token | JWT, HS256 set explicitly on sign and verify, 15 min. Claims: `sub` (the user's id), `role` and `mustChangePassword` ([Passwords](#passwords)). Returned in the body, kept in memory by the client |
| Secret | ≥ 32 characters, validated at startup |
| Refresh token | Random opaque value (256 bits), stored as its SHA-256 hash, 7 days, rotated on each refresh in a transaction |
| Session | The tokens rotated from one sign-in form a **family**, named by the id of its first token. Logout ends the whole family, the device's session |
| Rotation grace | A token rotated less than 30 s ago is still honoured: its refresh gets a new token of the same family, so two tabs refreshing together, or a refresh retried after a lost answer, stay signed in |
| Reuse | A token rotated **more** than 30 s ago means a copy of it is in use: its family is deleted and the refresh answers 401. The user's other sessions, on other devices, are untouched. Ending only the family still cuts a stolen chain (OAuth 2.0 Security BCP), while a reception desk on another device keeps working |
| Refresh cookie | `masaha_refresh` · `HttpOnly` · `Secure` (production) · `SameSite=Strict` · `Path=/api/v1/auth` · 7 days; set and cleared from one shared options object |
| Session hint | `masaha_session=1`, readable by JS, `Path=/`, no secret |
| Revocation | Password change, password reset, role change, suspension and the deactivation of a reception link delete all the user's refresh tokens |

## Sign-in methods

- **Email and password.** Registration asks for name, email and password only. There is no phone login.
- **Google**, as an extra option beside the password. The client sends a Google OpenID Connect ID token, and the server verifies it with `jose` against Google's published keys: signature, issuer, audience (Masaha's client ID), expiry and `email_verified`. Scopes are `openid email profile`.
  - A first Google sign-in with an unknown email creates a `USER`.
  - A Google sign-in whose verified email matches an existing account links Google to that account automatically.
  - A Google-only account has no password, so a password sign-in fails with `INVALID_CREDENTIALS`. It may add a password later.
- Both methods issue the same session ([ADR 0003](../architecture/decisions/0003-session-model.md)).
- **Registering an email that has an account answers `EMAIL_TAKEN`.** That tells the caller the account exists, unlike the forgotten password's answer. It is an accepted trade-off, for usability: a person who already has an account learns to sign in instead. The sign-in limits count each refused registration as a failure.

## Passwords

- bcrypt, cost 12, hashed outside database transactions, by the `users` module ([ADR 0013](../architecture/decisions/0013-identity-modules.md)). A sign-in for an unknown email, or for an account with no password, still spends one comparison, so its timing does not reveal which accounts exist.
- Policy: 8–72 characters, at least one letter and one digit.
- The hash is excluded in the Prisma `select`, never only by the mapper.
- Wrong credentials: generic `INVALID_CREDENTIALS`.
- **Accounts created by someone else** get a temporary password, shown once to hand over, and `mustChangePassword = true`. This covers:
  - an owner account created by the admin;
  - a reception account the owner creates for a new email. An email that already has an account is linked instead: no temporary password ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md));
  - an admin recovery (below).

  Every endpoint except `/auth/password/change`, `/auth/logout` and `/me` returns `PASSWORD_CHANGE_REQUIRED` until the password is changed.
- **Password reset** is a link sent by email: a single-use token stored as a SHA-256 hash, valid for 1 hour. The request always returns 202, and success revokes all sessions. It is a transactional email, not a notification, and the only email Masaha sends. The provider is chosen in F-5, within [ADR 0014](../architecture/decisions/0014-deployment.md)'s constraint: without a domain of its own, no domain-verified provider is possible, so the email goes from a single verified sender, or Gmail SMTP. In development, the email port logs the link instead of sending it.
- **Recovery without the email:** the person contacts Masaha on WhatsApp, and the admin issues a temporary password (`mustChangePassword`). The action is audited.

## Authorization

The model (roles, space scope, what each role may do) is owned by [ADR 0002](../architecture/decisions/0002-authorization-model.md). Mechanisms:

- `requireAuth` → 401 without a valid token. `requireRole(...roles)` → 403.
- Services call `can(actor, action, resource)`; the space scope and the role at the space (`OWNER` or `RECEPTION`) come from the user's active `SpaceManager` link, never from the global role or the client ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).
- Suspended users cannot log in or refresh.

## Rate limits (fixed window)

The counters are stored in PostgreSQL, in the `rate_limits` table, so every instance of the API shares them: online, the API runs as functions that share no memory ([ADR 0014](../architecture/decisions/0014-deployment.md)).

**What each limit counts by.** Masaha's users sit in coworking spaces, where everyone shares one network address. A limit keyed only by the address would lock a whole space out, so each limit counts by what it protects:

| Scope | Counts | Limit |
|---|---|---|
| Sign-in (password or Google) and register | **Failed** attempts only, by address and email: brute force against one account | 10 / 15 min |
| | **Failed** attempts only, by address: one address trying many accounts. A failed Google sign-in has no email, so it counts here only | 50 / 15 min |
| Refresh | Every refresh, by the user its cookie belongs to. The token is random and cannot be guessed, so an unknown cookie is simply refused | 30 / 15 min |
| Password forgot | Every request, by address and email, beside the reset email's own caps ([Passwords](#passwords)) | 5 / 15 min |
| Password reset and its check | Every request, by address and token | 5 / 15 min |
| Password forgot, reset and check together | Every request, by address | 50 / 15 min |
| Data reports | Every report, by the user | 10 / hour |
| General API, signed in | Every request, by the user | 300 / 15 min |
| General API, guest | Every request, by address: live-status polling from one space's shared address | 1,200 / 15 min |

**The mechanism** is `shared/rate-limit`, a small limiter over the counter:
- Every count is one atomic statement on its key, and every count is written **before the response is sent** (ADR 0014).
- A limit on failures is checked before the attempt, and the failure is counted where it is decided, before it is answered. A success counts nothing.
- A key is the policy's name and a SHA-256 digest of what it counts by, so the table holds no address, email or token.
- The address is `req.ip`, which depends on `TRUST_PROXY` (the proxies Express trusts). An IPv6 address counts by its /64 network.
- A 429 carries the error envelope, `Retry-After` and the `RateLimit-Policy` and `RateLimit` header fields.
- `express-rate-limit`, approved in the foundation plan, is **not used**. It counts failures-only limits by adding every request and subtracting the successes after the response is sent: work after the response, which ADR 0014 forbids.

## HTTP hardening

- `helmet` defaults; CORS allows one origin from the environment with credentials; `trust proxy` set.
- JSON body limit 16 kB; upload limit 5 MB per photo, JPEG/PNG/WebP only, content checked, re-encoded with sharp.
- Online, a request or a response is limited to 4.5 MB ([ADR 0014](../architecture/decisions/0014-deployment.md)), below the photo limit. Photos are therefore resized on the client or uploaded directly to storage; the space-management slice settles which.
- The server refuses to start without a reachable database; graceful shutdown on SIGTERM/SIGINT.
- **The HTTP logger redacts** the `cookie`, `authorization` and `set-cookie` headers, and any field named like a password or a token, and **never logs request bodies**. It is built in `shared/http`, in the same Work Item as the first token (F-5a). The other logging rules are in [backend conventions §10](conventions.md#10-logging).
