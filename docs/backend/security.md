# Security

> **Status:** Active · **Class:** Contract — rules to build against; not yet implemented · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
> **Authority:** Tokens, passwords, cookies, authorization, rate limits and HTTP hardening. The session model's reasoning is in [ADR 0003](../architecture/decisions/0003-session-model.md); the authorization model's in [ADR 0002](../architecture/decisions/0002-authorization-model.md).

## Tokens and cookies

| Item | Rule |
|---|---|
| Access token | JWT, HS256 set explicitly on sign and verify, 15 min, `{ userId, role }`, returned in the body, kept in memory by the client |
| Secret | ≥ 32 characters, validated at startup |
| Refresh token | Random opaque value, stored **hashed**, 7 days, rotated on each refresh in a transaction, 30 s reuse grace |
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

## Passwords

- bcrypt, cost 12, hashed outside database transactions.
- Policy: 8–72 characters, at least one letter and one digit.
- The hash is excluded in the Prisma `select`, never only by the mapper.
- Wrong credentials: generic `INVALID_CREDENTIALS`.
- **Accounts created by someone else** get a temporary password, shown once to hand over, and `mustChangePassword = true`. This covers:
  - an owner account created by the admin;
  - a reception account the owner creates for a new email. An email that already has an account is linked instead: no temporary password ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md));
  - an admin recovery (below).

  Every endpoint except `/auth/password/change`, `/auth/logout` and `/me` returns `PASSWORD_CHANGE_REQUIRED` until the password is changed.
- **Password reset** is a link sent by email: a single-use token stored as a SHA-256 hash, valid for 1 hour. The request always returns 202, and success revokes all sessions. It is a transactional email, not a notification, and the only email Masaha sends; the provider is chosen in F-5.
- **Recovery without the email:** the person contacts Masaha on WhatsApp, and the admin issues a temporary password (`mustChangePassword`). The action is audited.

## Authorization

The model (roles, space scope, what each role may do) is owned by [ADR 0002](../architecture/decisions/0002-authorization-model.md). Mechanisms:

- `requireAuth` → 401 without a valid token. `requireRole(...roles)` → 403.
- Services call `can(actor, action, resource)`; the space scope and the role at the space (`OWNER` or `RECEPTION`) come from the user's active `SpaceManager` link, never from the global role or the client ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).
- Suspended users cannot log in or refresh.

## Rate limits (per IP, fixed window)

| Scope | Limit |
|---|---|
| Login (password or Google), register | 10 / 15 min |
| Refresh | 30 / 15 min |
| Password forgot / reset | 5 / 15 min |
| Data reports | 10 / hour |
| General API | 300 / 15 min |

## HTTP hardening

- `helmet` defaults; CORS allows one origin from the environment with credentials; `trust proxy` set.
- JSON body limit 16 kB; upload limit 5 MB per photo, JPEG/PNG/WebP only, content checked, re-encoded with sharp.
- The server refuses to start without a reachable database; graceful shutdown on SIGTERM/SIGINT.
