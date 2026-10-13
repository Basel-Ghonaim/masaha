# 51. An access token outlives the end of its session

**Status:** Resolved · **Date:** 2026-10-11

**Evidence:** a password change, a reset, a role change, a suspension and a temporary password end every session of the account by deleting its refresh tokens ([security › Tokens and cookies](../../backend/security.md#tokens-and-cookies)). An access token already handed out is not a refresh token: it stays valid until it expires, 15 minutes at most. `requireAuth` reads the account on every request ([ADR 0003](../decisions/0003-session-model.md), revised), so a suspension, a role change and a temporary password reach that token at once. Nothing tells the guard that the sessions ended, though:

- after a password change or a reset, another device's access token, a stolen one included, keeps working until it expires;
- a suspension holds only while it lasts: once the account is restored, a token signed before the suspension works again until it expires;
- after a role change, the old token goes on with the new role. On the web, a demoted admin's open dashboard shows refusals (403) until the token expires and its refresh, refused, ends the session; the server's answer is right, only the web's view lags.

**Resolves when:** the guard refuses a token signed before the account's sessions last ended (a time stored on the account, compared with the token's `iat`), or the owner accepts it.

**Resolution (2026-10-13, #78):** by a session version on the account rather than a time, so there is no same-second window between a token's `iat` and the end, and no clock shared between function instances. Each path that ends every session (a password change, a reset, a suspension, a role change, the admin's temporary password, a Google link) raises it, in the transaction and under the session lock that delete the refresh tokens; every access token carries the version it was signed under, and `requireAuth` refuses one that is not the account's ([security › Tokens and cookies](../../backend/security.md#tokens-and-cookies)). A sign-out ends only its own session and raises nothing.
