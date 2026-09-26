# Security

> **Status:** Active · **Class:** Contract — rules to build against; not yet implemented · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** Tokens, passwords, cookies, authorization, rate limits and HTTP hardening. The session model's reasoning is in [ADR 0003](../architecture/decisions/0003-session-model.md); the authorization model's in [ADR 0002](../architecture/decisions/0002-authorization-model.md).

## Tokens and cookies

| Item | Rule |
|---|---|
| Access token | JWT, HS256 set explicitly on sign and verify, 15 min, `{ userId, role }`, returned in the body, kept in memory by the client |
| Secret | ≥ 32 characters, validated at startup |
| Refresh token | Random opaque value, stored **hashed**, 7 days, rotated on each refresh in a transaction, 30 s reuse grace |
| Refresh cookie | `masaha_refresh` · `HttpOnly` · `Secure` (production) · `SameSite=Strict` · `Path=/api/v1/auth` · 7 days; set and cleared from one shared options object |
| Session hint | `masaha_session=1`, readable by JS, `Path=/`, no secret |
| Revocation | Password change, password reset, role change and suspension delete all the user's refresh tokens |

## Passwords

- bcrypt, cost 12, hashed outside database transactions.
- Policy: 8–72 characters, at least one letter and one digit.
- The hash is excluded in the Prisma `select`, never only by the mapper.
- Wrong credentials: generic `INVALID_CREDENTIALS`.
- New owner accounts get a temporary password and `mustChangePassword = true`; every endpoint except `/auth/password/change`, `/auth/logout` and `/me` returns `PASSWORD_CHANGE_REQUIRED` until it is changed.
- Password reset: a single-use token stored as a SHA-256 hash with an expiry; the request always returns 202; success revokes all sessions.

## Authorization

The model (roles, space scope, what each role may do) is owned by [ADR 0002](../architecture/decisions/0002-authorization-model.md). Mechanisms:

- `requireAuth` → 401 without a valid token. `requireRole(...roles)` → 403.
- Services call `can(actor, action, resource)`; space scope is checked against `SpaceManager` rows, never trusted from the client.
- Suspended users cannot log in or refresh.

## Rate limits (per IP, fixed window)

| Scope | Limit |
|---|---|
| Login, register | 10 / 15 min |
| Refresh | 30 / 15 min |
| Password forgot / reset | 5 / 15 min |
| Data reports | 10 / hour |
| General API | 300 / 15 min |

## HTTP hardening

- `helmet` defaults; CORS allows one origin from the environment with credentials; `trust proxy` set.
- JSON body limit 16 kB; upload limit 5 MB per photo, JPEG/PNG/WebP only, content checked, re-encoded with sharp.
- The server refuses to start without a reachable database; graceful shutdown on SIGTERM/SIGINT.
