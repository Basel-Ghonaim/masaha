# ADR 0017 — The recovery session: the server holds where a password recovery stands

> **Status:** Accepted · **Date:** 2026-10-05

## Context
A forgotten password is recovered in steps: ask for a link with an email, open the link, choose a new password. In the first design the web held each step. The reset page kept the link's token from the moment it checked it until the password was sent, and a reload, or a link opened on another device, lost the place. Asking for the link again meant typing the email again.

The web should hold no credential it does not need. And the place a person reached should survive a reload without the browser keeping a token that JavaScript can read.

## Decision
1. **A recovery is a session the server holds,** found by a random key in an `HttpOnly` cookie that only the password routes receive. The web asks where it stands and never decides it. The answer is a step (request a link, link sent, choose a password), and for a sent link, the email masked, when another link may be asked for, and whether one may.
2. **Asking for a link opens a recovery for every address alike.** The answer and the cookie are the same whether or not an account exists, so neither tells an account's existence. The window before another link may be asked for is the same for every address too.
3. **Checking a link binds it to the recovery,** and setting the new password reads it from there. A token sent with the new password is refused. From the check on, the web holds no credential. A link opened in a browser with no recovery opens one there, because most people open the email on another device.
4. **Another link is asked for through the recovery, without an email,** a bounded number of times, under the same limits as the first request.
5. **A recovery lives as long as its link,** and ends with it, when the password is set or a newer link replaces it. A recovery that holds no link is never ended by what happens to the account, so it reveals nothing about it.

The endpoints are owned by the [API contract](../../api/api-contract.md#the-forgotten-password); the cookie, the limits and the bound by [security.md](../../backend/security.md#passwords).

## Alternatives
- **The web holds the step and the token,** in memory or in storage. Rejected: a reload loses the place, and storage readable by JavaScript would hold a live credential.
- **One URL per step.** Rejected: a URL is a copy of the position that anyone can edit or share, and it would carry the credential again.
- **A recovery only for an address with an account.** Rejected: the cookie's presence alone would tell whether the account exists.

## Consequences
- A second credential, the recovery's key, exists beside the link. It is only ever in an `HttpOnly`, same-site cookie, and the flow ends with less exposure than it began with: the token leaves the web at the check.
- The recovery is stored by the module that owns the other tokens. It keeps only a masked address and a digest of the address, never the address itself.
- The reset email is still sent before the answer, because no work may run after a response ([ADR 0014](0014-deployment.md)). So the timing can still tell whether an account exists ([finding 16](../findings.md#16-the-forgotten-passwords-timing-can-tell-whether-an-account-exists)).
