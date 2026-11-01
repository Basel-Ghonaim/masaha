# Auth

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `auth` capability: the sign-in flows, as an orchestrator with no data of its own: registration, sign-in with a password or with Google, refresh, sign-out, and the forgotten password's recovery. Its endpoints are owned by the [API contract](../api/api-contract.md#session); every rule whose reason is security by [security.md](../backend/security.md); the recovery session's design by [ADR 0017](../architecture/decisions/0017-recovery-session.md).
> **Scope:** the API module `auth` (L3), with its email and Google ports; `@masaha/shared/auth`; the web feature `features/auth`.

## What it does

- **Registers** an account with a name, an email and a password, and **signs in** with an email and a password, or with Google.
- **Refreshes** a session and **signs it out**, for the session the web holds ([architecture §4](../frontend/architecture.md#4-session-and-preferences)).
- **Recovers a forgotten password:** asks for a reset link by email, asks for another, checks a link, and sets the new password.
- On the web: the sign-in and register forms, Google's button, the forgotten password's and the reset's cards, and the link a signed-in account sets a first password by (screen 9).

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

**Google.** The web's client id is `VITE_GOOGLE_CLIENT_ID` ([setup › The web](../development/setup.md#the-web)); without the API's `GOOGLE_CLIENT_ID`, the API answers 503, and production refuses to start. A new account takes Google's name when it is valid user text, else the email's local part. An account whose temporary password is pending is never linked ([security › Sign-in methods](../backend/security.md#sign-in-methods)).

**Refresh.** The cookie's token names its session. The account is read from `users`, a suspended one refused, and the token rotated by `sessions`, which refuses a session past its 30 days ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies), [conventions › Concurrency](../backend/conventions.md#concurrency)). The `Session` is the user's view, their active links and a new access token.

**The forgotten password.** A request for a link opens a recovery in the browser, held by the server and found by its cookie, and answers where it stands ([the contract](../api/api-contract.md#the-forgotten-password)). The page then offers another link without the email. Opening the link checks it: the reset page takes the token from the address's fragment, removes it, and sends it once; the answer names the account before the form is sent. Setting the password ends the recovery. An answer that sends no email waits about as long as a send would ([security › Passwords](../backend/security.md#passwords)). An account whose temporary password is pending gets no email, and its links are refused ([security › Passwords](../backend/security.md#passwords)).

**The reset email** is bilingual, Arabic then English, as designed ([SCREENS.md](../design/SCREENS.md) row 7), except the greeting by name ([security › Passwords](../backend/security.md#passwords)). Its words live with the module, in both languages held to one shape, since the API has no copy catalogue ([localisation › Catalogues](../frontend/localisation.md#catalogues)). Under the button, «إن لم يعمل الزر، انسخ هذا الرابط:» / "If the button doesn't work, copy this link:" and the link as text, left to right and breaking anywhere, in the HTML and the text parts: a mail client may strip the button (AC-021, 2026-10-29, #132).

## Decisions

### API decisions

- **Two racing first Google sign-ins make one account:** the second reads the first's again. *Why:* a CI race answered 401. 2026-10-03, #31.
- **The recovery is a session the server holds,** behind an `HttpOnly` cookie, its row in `sessions` ([ADR 0017](../architecture/decisions/0017-recovery-session.md)). *Why:* the browser holds no credential, and a reload keeps the step. 2026-10-05, #38.
- **Checking a link in a browser with no recovery opens one there.** *Why:* most people open the email on another device. 2026-10-05, #38.
- **The check names the account, masked.** *Why:* the person sees whose password they set before sending it. 2026-10-03, #25; masked since 2026-10-05, #38.
- **The email goes from a single Gmail account with an app password,** through `nodemailer` and any SMTP relay. *Why:* without a domain of its own, no domain-verified provider is possible ([ADR 0014](../architecture/decisions/0014-deployment.md)), and Gmail's own mail passes DMARC; another account or relay changes configuration, not code. 2026-10-03, #25.
- **A session ends 30 days after its sign-in,** its deadline carried by each of its tokens and copied on rotation, not capped into the token's own expiry, so a refresh past it reaches the lock and deletes the family, even with a token past its own 7 days; the families alive at the migration got 30 days from it. *Why:* a session refreshed weekly never ended ([finding 20](../architecture/findings/20-a-session-has-no-absolute-lifetime.md)); its sign-in time is unknown once its first token is gone. 2026-10-13, #78.
- **Reception's session ends after 15 minutes with no request, on the server; the request is refused `SESSION_IDLE` and the refresh ends the session.** The access token names its session (`sid`), the family carries its last use, renewed at most once a minute, and the desk's polled state renews nothing. Idle-bound is read from the links on each request: an owner who is reception elsewhere never is, and an owner who loses their last owner link becomes so at once — a session unused while it was an owner's then ends at its next request. *Why:* a shared desk left open must not stay signed in (the owner's revision, 2026-10-24); the refresh, not the guard, ends the session, so the web's refresh sees the code and the sign-in page can say why. 2026-10-25, #118.
- **An answer that sends no email waits as a send would, and only then:** a request for a link or a resend that delivers nothing waits a time drawn anew within one constant's bounds, `NO_SEND_WAIT`, through the timer port; a delivered email adds no wait. *Why:* the send cannot move after the answer ([ADR 0014](../architecture/decisions/0014-deployment.md)), so the answers that send nothing are made as slow; padding the real sends too would push them later than the padded ones ([finding 16](../architecture/findings/16-the-forgotten-passwords-timing-can-tell-whether-an-account-exists.md)). 2026-10-13, #78.
- **A token presented again within the grace gets the same successor,** an HMAC of it under a key `sessions` is handed, derived at start-up from `JWT_SECRET` ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). *Why:* a copy replayed within the window gained a branch of its own that reuse detection never saw ([finding 21](../architecture/findings/21-a-token-replayed-within-the-grace-window-starts-its-own-branch.md)); a key of its own from the one secret adds no setting (S7). 2026-10-29, #132.
- **Registration and a first Google sign-in free an address held by an expired pending account that someone else created, that never acted and owns no space,** in the new account's transaction ([security › Passwords](../backend/security.md#passwords)). `auth` orchestrates it: `users` judges the account by its own rule and retires it, `space-links` ends its reception link by the system, and whether someone else created it and it never acted is the audit reader's, a level above, passed in as a port. *Why:* the owner's 91 (a), narrowed by S1 so a real account is never taken by a stranger; the audit reader is the one read model that already reads the actor of every entry. 2026-10-29, #132.
- **Whether the reset email may open an account is asked of `users` (`mayRecoverByEmail`), at the request and the resend, and again under the session lock at the check and the reset.** *Why:* a link asked before a temporary password was issued could be inserted after the issue ended the links; the guard under the lock refuses it, writing nothing ([ADR 0013](../architecture/decisions/0013-identity-modules.md): the rule is the account's). 2026-10-18, #90.

### Web decisions

- **The recovery pages read their step from the server;** nothing in storage; a failed read offers a retry. *Why:* a reload or another tab keeps the step. 2026-10-05, #40.
- **Only the check holds the reset token,** in memory, dropped on any answer. *Why:* no copy after a verdict. 2026-10-05, #40.
- **After a reset, this browser's session is refreshed once;** a 401 ends it. *Why:* the reset may have been this account's, or another's. 2026-10-05, #40.
- **The resend countdown is an m:ss clock.** *Why:* no plural mechanism needed. 2026-10-05, #40.
- **Sign-in and register hold the session in the mutation's own callback.** *Why:* the page may be gone before the answer. 2026-10-05, #35.
- **Google's official button and script,** only on sign-in and register, in the interface's language, drawn again on a change of theme, language or width. *Why:* Google ignores the button's locale. 2026-10-06, #42.
- **No Google client id: no button, no divider, no script.** 2026-10-06, #42.
- **Google's failures show in their own area above the button;** closing its window shows nothing. *Why:* both failure areas read alike. 2026-10-06, #42.
- **A "linked" toast and a welcome toast,** each fired by its hook after the session changes. 2026-10-06, #42.
- **A first Google sign-in is welcomed as registration is** («أهلًا {name}، تم إنشاء حسابك», from the answer's `created`), **and the "linked" toast stays until closed** (C5). *Why:* the account was just made, as a registration makes one ([finding 32](../architecture/findings/32-the-google-sign-in-answer-does-not-say-whether-it-created-the-account.md)); the linked toast says more than a line and must be read. 2026-10-29, #132.
- **Mutations that carry a credential keep nothing in the cache.** *Why:* passwords never stay in memory ([finding 34](../architecture/findings/34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change.md)). 2026-10-06, #45.
- **A session the server ended for idleness says so on sign-in:** a refresh refused 401 `SESSION_IDLE` ends the session as ended for idleness (`endedBy`, [architecture §4](../frontend/architecture.md#4-session-and-preferences)), and the sign-in page shows the error's catalogue line above its form until the next sign-in. *Why:* a receptionist back at the shared desk learns why they must sign in again. 2026-10-25, #122.
- **The sign-in and register cards offer a way back, not a way on:** with a safe `next`, «العودة إلى {space}» when it is a space's page whose read the tab already holds (`directory`'s `useCachedSpaceName`, never a request), else «العودة إلى الصفحة السابقة»; without one, «العودة إلى الرئيسية» (C4, DI33). *Why:* the guest came from somewhere; «تصفّح المساحات بدون حساب» ignored it. `next` travels to the forgotten password and back. 2026-10-29, #132. It travels on through the reset link — the forgotten password's «متابعة», and the reset card's way back, its sign-in once the password is set and its new link — and only as `returnUrlOf` accepts it, a page off the site dropped. 2026-11-01, #132.
- **A password sign-in says «أهلًا بعودتك»** under one toast id (`RETURN_TOAST_ID`, `shared/routing`), which a held action's own toast reuses, taking its place (C4). *Why:* one toast says what happened on the return, not two. 2026-10-29, #132.
- **The link sent always offers «استخدم بريدًا آخر» under the resend,** which opens the empty form with the focus in it (C3); **the reset card offers «العودة إلى تسجيل الدخول» at its foot until the password is set**; register's owner note leads to the about page's owners. 2026-10-29, #132.

Owned by security.md and linked: Google's linking rule ([Sign-in methods](../backend/security.md#sign-in-methods)); the registration and Google limits ([Rate limits](../backend/security.md#rate-limits-fixed-window)); the same answer to every request for a link, another link without an email, the reset's refusal of a token in its body, what a reset ends, the email's caps and no greeting by name ([Passwords](../backend/security.md#passwords)). Owned by the routing and linked: the guards of `/forgot-password` and `/reset-password`, and `RequireGuest` as the landing's one owner ([architecture › Landing and guards](../frontend/architecture.md#landing-and-guards)).

## Code map

- **API:** `apps/api/src/modules/auth/`, entry `index.ts`: the orchestrating service, its router and its limits; the wait of an answer that sends no email (`noSendWait.ts`); the Google port; `email/`, the email port, its senders, the caps and the reset email.
- **Shared:** `packages/shared/src/auth/`: the session's and the recovery's shapes, and the requests.
- **Web:** `apps/web/src/features/auth/`, entry `index.ts`: `SignInForm`, `RegisterForm`, `ContinueWithGoogle` (which takes the page's divider), `ForgotPasswordCard`, `ResetPasswordCard` (which tells the page the password was set, `onPasswordSet`), `SetPasswordByEmail` (a signed-in account's first password by email, the forgotten password's link sent and resend, set by `pages/site/account/settings/` in `users`' card). Two repositories, the sign-in's and the recovery's. Mounted by `pages/site/auth/`.

## Open findings

- [22](../architecture/findings/22-the-reset-emails-words-live-outside-the-webs-copy-catalogue.md): the email's words outside the copy catalogue.
- [33](../architecture/findings/33-the-deployments-headers-must-let-googles-sign-in-work.md): the deployment's headers and Google's sign-in.
- [65](../architecture/findings/65-the-forgotten-passwords-wait-is-an-estimate-not-a-measurement.md): the forgotten password's wait is an estimate, not a measurement.

## History

### API history

- #25 — the authentication API: register, sign-in, Google, refresh, sign-out, the reset by email.
- #31 — a racing first Google sign-in.
- #34 — the shared package split by capability.
- #38 — the recovery session.
- #78 — a session's 30 days; the access tokens end with the session, through `users`' `endSessions`, after a reset and a refused refresh; the forgotten password's wait when it sends nothing.
- #90 — no reset email, no reset with an older link and no Google link while a temporary password is pending.
- #118 — the access token names its session (`sid`); reception's session ends after 15 minutes idle (`SESSION_IDLE`).
- #132 — a replay within the grace gets its token's one successor; the ended tokens and recoveries swept by a timed job; Google's answer says `created`; registration and a first Google sign-in free an expired pending account's address; the reset email prints its link.

### Web history

- #35 — the sign-in and register forms.
- #40 — the recovery pages.
- #42 — Google sign-in on the web.
- #45 — no credential kept in the cache.
- #122 — the sign-in page says a session ended for idleness.
- 2026-10-29, #132 — the auth cards' way back and `next` kept through the forgotten password; «أهلًا بعودتك»; another email at once; the reset card's way back.
- 2026-10-29, #132 — a first Google sign-in welcomed by name; the linked toast kept until closed.
