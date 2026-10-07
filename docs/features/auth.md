# Auth

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The `auth` capability: the sign-in flows, as an orchestrator with no data of its own: registration, sign-in with a password or with Google, refresh, sign-out, and the forgotten password's recovery. Its endpoints are owned by the [API contract](../api/api-contract.md#session); every rule whose reason is security by [security.md](../backend/security.md); the recovery session's design by [ADR 0017](../architecture/decisions/0017-recovery-session.md).
> **Scope:** the API module `auth` (L3), with its email and Google ports; `@masaha/shared/auth`; the web feature `features/auth`.

## What it does

- **Registers** an account with a name, an email and a password, and **signs in** with an email and a password, or with Google.
- **Refreshes** a session and **signs it out**, for the session the web holds ([architecture §4](../frontend/architecture.md#4-session-and-preferences)).
- **Recovers a forgotten password:** asks for a reset link by email, asks for another, checks a link, and sets the new password.
- On the web: the sign-in and register forms, Google's button, and the forgotten password's and the reset's cards.

## Who uses it

- **Guests,** on the sign-in, register and forgotten-password pages.
- **Anyone holding a reset link,** signed in or not, on the reset page.
- **The web's session,** which refreshes and signs out through it.

## Responsibility boundary

- **Owns** no table. It combines `users` (accounts and credentials), `sessions` (refresh tokens and recoveries) and [`space-links`](space-links.md) (the session's links) ([ADR 0013](../architecture/decisions/0013-identity-modules.md)). Every rule about who may sign in is [`users`](users.md)'.
- **Owns** the reset email: its port, its senders, its caps' decorator and its words.
- **Leaves** every security rule it applies (tokens and cookies, the linking rule, the limits, the email caps, the identical answer, the reset link's binding) to [security.md](../backend/security.md), and the landing after sign-in and the guards to [frontend architecture §2](../frontend/architecture.md#landing-and-guards).

## How it composes the platform

- Its router is public, at `/auth`. Refresh, logout and the password routes that read or set the recovery cookie refuse a cross-site request ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). Each transaction that writes a user's tokens takes the session lock ([conventions › Concurrency](../backend/conventions.md#concurrency)).
- Its two ports, email and Google identity, are wired by the composition root from the environment ([conventions §12](../backend/conventions.md#12-environments)).
- On the web, its hooks hand a new session to the session's `establishSession` ([architecture › React Query in a feature](../frontend/architecture.md#react-query-in-a-feature)); its forms follow `shared/forms`; the recovery's position is a TanStack Query read under the public key scope ([architecture › Where state lives](../frontend/architecture.md#where-state-lives)).

## Behaviour and flows

**Sign-in and register.** Register sends the interface's language, which the new account takes. Where the user lands is the guard's.

**Google.** The web's client id is `VITE_GOOGLE_CLIENT_ID` ([setup › The web](../development/setup.md#the-web)); without the API's `GOOGLE_CLIENT_ID`, the API answers 503, and production refuses to start. A new account takes Google's name when it is valid user text, else the email's local part.

**Refresh.** The cookie's token names its session. The account is read from `users`, a suspended one refused, and the token rotated by `sessions` ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies), [conventions › Concurrency](../backend/conventions.md#concurrency)). The `Session` is the user's view, their active links and a new access token.

**The forgotten password.** A request for a link opens a recovery in the browser, held by the server and found by its cookie, and answers where it stands ([the contract](../api/api-contract.md#the-forgotten-password)). The page then offers another link without the email. Opening the link checks it: the reset page takes the token from the address's fragment, removes it, and sends it once; the answer names the account before the form is sent. Setting the password ends the recovery.

**The reset email** is bilingual, Arabic then English, as designed ([SCREENS.md](../design/SCREENS.md) row 7), except the greeting by name ([security › Passwords](../backend/security.md#passwords)). Its words live with the module, in both languages held to one shape, since the API has no copy catalogue.

## Decisions

- **Two racing first Google sign-ins make one account:** the second reads the first's again. *Why:* a CI race answered 401. 2026-10-03, #31.
- **The recovery is a session the server holds,** behind an `HttpOnly` cookie, its row in `sessions` ([ADR 0017](../architecture/decisions/0017-recovery-session.md)). *Why:* the browser holds no credential, and a reload keeps the step. 2026-10-05, #38.
- **Checking a link in a browser with no recovery opens one there.** *Why:* most people open the email on another device. 2026-10-05, #38.
- **The check names the account, masked.** *Why:* the person sees whose password they set before sending it. 2026-10-03, #25; masked since 2026-10-05, #38.
- **The email goes from a single Gmail account with an app password,** through `nodemailer` and any SMTP relay. *Why:* without a domain of its own, no domain-verified provider is possible ([ADR 0014](../architecture/decisions/0014-deployment.md)), and Gmail's own mail passes DMARC; another account or relay changes configuration, not code. 2026-10-03, #25.
- **The recovery pages read their step from the server;** nothing in storage; a failed read offers a retry. *Why:* a reload or another tab keeps the step. 2026-10-05, #40.
- **Only the check holds the reset token,** in memory, dropped on any answer. *Why:* no copy after a verdict. 2026-10-05, #40.
- **After a reset, this browser's session is refreshed once;** a 401 ends it. *Why:* the reset may have been this account's, or another's. 2026-10-05, #40.
- **The resend countdown is an m:ss clock.** *Why:* no plural mechanism needed. 2026-10-05, #40.
- **Sign-in and register hold the session in the mutation's own callback.** *Why:* the page may be gone before the answer. 2026-10-05, #35.
- **Google's official button and script,** only on sign-in and register, in the interface's language, drawn again on a change of theme, language or width. *Why:* Google ignores the button's locale. 2026-10-06, #42.
- **No Google client id: no button, no divider, no script.** 2026-10-06, #42.
- **Google's failures show in their own area above the button;** closing its window shows nothing. *Why:* both failure areas read alike. 2026-10-06, #42.
- **A "linked" toast and a welcome toast,** each fired by its hook after the session changes. 2026-10-06, #42.
- **Mutations that carry a credential keep nothing in the cache.** *Why:* passwords never stay in memory ([finding 34](../architecture/findings.md#34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change)). 2026-10-06, #45.

Owned by security.md and linked: Google's linking rule ([Sign-in methods](../backend/security.md#sign-in-methods)); the registration and Google limits ([Rate limits](../backend/security.md#rate-limits-fixed-window)); the same answer to every request for a link, another link without an email, the reset's refusal of a token in its body, what a reset ends, the email's caps and no greeting by name ([Passwords](../backend/security.md#passwords)). Owned by the routing and linked: the guards of `/forgot-password` and `/reset-password`, and `RequireGuest` as the landing's one owner ([architecture › Landing and guards](../frontend/architecture.md#landing-and-guards)).

## Code map

- **API:** `apps/api/src/modules/auth/`, entry `index.ts`: the orchestrating service, its router and its limits; the Google port; `email/`, the email port, its senders, the caps and the reset email.
- **Shared:** `packages/shared/src/auth/`: the session's and the recovery's shapes, and the requests.
- **Web:** `apps/web/src/features/auth/`, entry `index.ts`: `SignInForm`, `RegisterForm`, `ContinueWithGoogle` (which takes the page's divider), `ForgotPasswordCard`, `ResetPasswordCard`. Two repositories, the sign-in's and the recovery's. Mounted by `pages/site/auth/`.

## Open findings

- [16](../architecture/findings.md#16-the-forgotten-passwords-timing-can-tell-whether-an-account-exists): the forgotten password's timing.
- [22](../architecture/findings.md#22-the-reset-emails-words-live-outside-the-webs-copy-catalogue): the email's words outside the copy catalogue.
- [32](../architecture/findings.md#32-the-google-sign-in-answer-does-not-say-whether-it-created-the-account): no welcome after a first Google sign-in.
- [33](../architecture/findings.md#33-the-deployments-headers-must-let-googles-sign-in-work): the deployment's headers and Google's sign-in.

## History

- #25 — the authentication API: register, sign-in, Google, refresh, sign-out, the reset by email.
- #31 — a racing first Google sign-in.
- #34 — the shared package split by capability.
- #35 — the sign-in and register forms.
- #38 — the recovery session.
- #40 — the recovery pages.
- #42 — Google sign-in on the web.
- #45 — no credential kept in the cache.
