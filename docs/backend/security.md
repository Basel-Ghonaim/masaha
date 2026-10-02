# Security

> **Status:** Active · **Class:** Contract — rules to build against. Built: tokens and cookies, both sign-in methods, passwords and the reset email, the rate limits of the sign-in flows and the general API, and the log redaction. Not yet built: suspension and role changes (the admin's user screens), the upload limits, and the data-report limit · **Last Updated:** 2026-10-01 · **Owner:** Basel Ghoneim
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
| Revocation | Password change, password reset, role change, suspension and the deactivation of a reception link delete all the user's refresh tokens. A password change then opens a new session for its own device |

## Sign-in methods

- **Email and password.** Registration asks for name, email and password only. There is no phone login.
- **Google**, as an extra option beside the password. The client sends a Google OpenID Connect ID token, and the server verifies it with `jose` against Google's published keys: signature, issuer, audience (Masaha's client ID), expiry and `email_verified`. Scopes are `openid email profile`.
  - A first Google sign-in with an unknown email creates a `USER`.
  - A Google sign-in whose verified email matches an existing account links Google to it automatically **only where Google is the authority for the address**: a `@gmail.com` address, or one in the Google Workspace domain the token's `hd` claim names. Elsewhere, Google's `email_verified` does not prove who holds the address today: a Google account may belong to its former holder (a shared mailbox, an ex-employee).
    - **Where it links,** it does so in one transaction under the session lock: Google is linked only if none is yet, the account's password is removed (its forced change with it), and every session of the account ends. Registration proves no inbox, so a password set before the link may be an attacker's who registered the address first (a pre-account takeover); only Google proved the address, so only Google opens the account. The person sets a password again through the reset email. The answer says `linked: true`, and the web says the password was removed.
    - **Where it does not,** the sign-in is refused with `GOOGLE_LINK_NOT_ALLOWED`. The person signs in with the password, or resets it.
    - An account already linked to **another** Google account is never relinked: the sign-in is refused with `GOOGLE_TOKEN_INVALID`.
    - Two first sign-ins that race create one account: the second reads the first's again.
  - A new account takes Google's name when it is valid user text, else the email's local part.
  - The client ID is `GOOGLE_CLIENT_ID`. Without it, Google sign-in answers `service_unavailable`; production refuses to start without it.
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

  Every endpoint except `/me/password`, `/auth/logout` and `/me` returns `PASSWORD_CHANGE_REQUIRED` until the password is changed. The access token carries `mustChangePassword`, and `requireAuth` refuses it unless the route allows a pending change; the session's refresh still works, so the web can restore the session and show the change.
- **Changing the password** (`/me/password`) asks for the current one, except during the forced change. The change counts as forced only when **both** the access token's claim and the account say a change is pending, so neither a stale token nor a flag set after the token was issued skips the check.
  - A wrong current password counts under a per-user failures limit ([Rate limits](#rate-limits-fixed-window)): a stolen 15-minute access token must not become unlimited guesses.
  - An account without a password (Google only) sets its first one through the reset email, which proves the inbox, never here: a stolen access token alone must not give a lasting password. It answers `PASSWORD_NOT_SET`.
  - It writes only if the account still has the password it checked (a compare-and-set), ends every session of the user and any pending reset link, then opens a new session for the device that changed it: a new access token without `mustChangePassword`, and a new refresh cookie.
- **Password reset** is a link sent by email, following the OWASP Forgot Password Cheat Sheet. It is a transactional email, not a notification, and the only email Masaha sends.
  - **The token** is random (256 bits) and stored only as its SHA-256 hash. It is valid for 1 hour, and used once, by one atomic statement, so two concurrent resets cannot both succeed. A delivered link ends the earlier one: one live link per account. A link that is not sent (a cap, the relay) is withdrawn, so the one already in the inbox stays live.
  - **The request** always answers 202 with no body, whether or not the email has an account. An unknown or suspended account gets no email, and a failed send is only logged.
  - **The link** is `<web origin>/reset-password#token=…`. The token rides in the URL fragment, which no server ever receives, so it reaches no hosting log and no `Referer` header. The web reads it there and removes it from the address bar.
  - **The check** (`POST /auth/password/reset/check`) tells the reset page which account a link is for, before the form is sent. It neither uses the token nor extends it, and answers the same `RESET_TOKEN_INVALID` for an unknown, expired or used link.
  - **Success** sets the password, settles a pending temporary one, and ends every session of the user.
  - **The token is never logged** outside development. The request logger never logs bodies, and the log mode below is refused anywhere else.
- **The reset email's delivery** is the email port of the `auth` module ([conventions R5](conventions.md#8-module-rules)), in one of two modes, chosen by `EMAIL_MODE`:
  - `log`, the default, sends nothing and writes the message, with its link, to the log. It is allowed in development only;
  - `smtp` sends through any SMTP relay with `nodemailer`. Without a domain of its own, no domain-verified provider is possible ([ADR 0014](../architecture/decisions/0014-deployment.md)), so the email goes from a single Gmail account with an app password, which passes DMARC because the mail really comes from Gmail. Moving to a project account, or another relay, changes the configuration and no code. The address and the app password live only in `apps/api/.env`.
  - **Production refuses to start** unless the mode can deliver: `log` is refused there, and `smtp` needs every setting.
  - **The caps**, a decorator over either mode, so development exercises them too: at most 3 emails an hour to one inbox, at most 10 delivered a day asked for from one address (only a delivered email keeps its count), and at most 100 a day in all, which protects Gmail's daily quota and the sender's reputation. They count in the rate-limit table, by digests, so no address is stored. When a cap cannot be checked, nothing is sent. Reaching the daily ceiling writes a `[email:ceiling]` line to the log.
  - **The email** is bilingual, Arabic then English, as designed ([SCREENS.md](../design/SCREENS.md) row 7), except that it greets no one by name: registration proves no inbox, so the name is anyone's words, and would reach any address through Masaha's genuine sender. Its words live with the `auth` module, in both languages held to one shape, since the API has no copy catalogue.
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
| Password sign-in and register | **Failed** attempts only, by address and email: brute force against one account | 10 / 15 min |
| | **Failed** attempts only, by address: one address trying many accounts | 50 / 15 min |
| Register | **Every** registration, by address, counted before the password is hashed: each costs a bcrypt hash and an account row | 20 / hour |
| Google sign-in | **Failed** attempts only, by address, under its own key: junk tokens fail in microseconds, so they lock only Google sign-in out, never the password sign-ins of a shared address | 50 / 15 min |
| Refresh | Every refresh, by the user its cookie belongs to. The token is random and cannot be guessed, so an unknown cookie is simply refused | 30 / 15 min |
| Password forgot | Every request, by address and email, beside the reset email's own caps ([Passwords](#passwords)) | 5 / 15 min |
| Password reset and its check | Every request, by address and token | 5 / 15 min |
| Password forgot, reset and check together | Every request, by address | 50 / 15 min |
| Data reports | Every report, by the user | 10 / hour |
| Password change | **Failed** attempts only (a wrong current password), by the user: a thief can change address | 10 / 15 min |
| General API, signed in | Every request, by the user | 300 / 15 min |
| General API, guest | Every request, by address: live-status polling from one space's shared address | 1,200 / 15 min |

**The mechanism** is `shared/rate-limit`, a small limiter over the counter:
- Every count is one atomic statement on its key, and every count is written **before the response is sent** (ADR 0014).
- A limit on failures reserves each attempt, atomically, before it runs, and returns the slot on a success or a server failure (a 5xx), before answering: a refused attempt keeps its slot as the failure. A concurrent burst therefore cannot pass the limit, and while a slot is held a burst larger than the limit is refused beyond it, even when its passwords are right.
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
