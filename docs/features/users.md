# Users

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-18 · **Owner:** Basel Ghoneim
> **Authority:** The `users` capability: the account, its credentials, who may sign in, the password change and the forced change, the accounts the admin reads and creates, a temporary password's handover, the account menu and sign-out. Its endpoints are owned by the API contract: [*Me*](../api/api-contract.md#me) and [*Users (the admin)*](../api/api-contract.md#users-the-admin); the `User` entity by the [data model](../architecture/data-model.md#users-and-sessions); every password and sign-in rule by [security.md](../backend/security.md#passwords).
> **Scope:** the API module `users` (L1); `@masaha/shared/users`; the web feature `features/users`.

## What it does

- Holds the accounts: creates one at registration, at a first Google sign-in, or as an account the admin creates, with a temporary password, links Google to an existing one, hashes and verifies passwords, and refuses a suspended account.
- Changes a password, and settles a temporary one in the forced change. A temporary password expires 7 days after it is issued: a password sign-in with an expired one is refused. While one is pending, the account has no recovery by email and no Google link; the forced change confirms or corrects the email.
- Answers the account's view (`User`) for the session, and the names of a set of users for a list.
- Answers a page of the accounts for the admin's users list, filtered by name or email, role and state, each with how it signs in.
- Records how a temporary password was handed over, in the audit, for the admin.
- Suspends an account and restores it, for the admin: a suspension ends its sessions at once and keeps its links.
- Issues a temporary password for the admin, the recovery of a person who lost their email, again when the first was lost; and, through `space-links`, for an owner's reception account while its first is pending, with its handover.
- Reads the account for the guard on every signed-in request, so a suspension, a role change and a pending password change hold from the account's next request, and an access token signed before every session of the account last ended is refused.
- Changes the global role when `space-links` finds that a person's owner links give another, or the admin's role change allows it, ending every session of theirs.
- On the web: the account menu in the site's header, its section in the phone menu, the compact menu in the dashboard's top bar, the sign-out button, the forced password change's form, and the one-time password dialog with its handover.

The account's settings (`GET` and `PATCH /me`) are not built.

## Who uses it

- **Every signed-in user,** through the account menu and sign-out.
- **A user with a temporary password,** through the forced change.
- **The admin,** who suspends and restores accounts, changes their role through `space-links`, issues temporary passwords, and records how each was handed over.
- **[`auth`](auth.md),** which signs in, registers and links Google through it.
- **[`space-links`](space-links.md),** which names the owners in the admin's spaces list, composes the admin's users list from its page of accounts, and changes a person's role as their owner links give it.

## Responsibility boundary

- **Owns** the `users` table, the credential rules (hashing, verifying, the password change), who may sign in, and the account's view. Every rule about who may sign in lives here ([ADR 0013](../architecture/decisions/0013-identity-modules.md)).
- **Leaves** the sign-in flows and the session's assembly to `auth`, and the refresh tokens to `sessions`, which `users` asks to end a user's sessions.
- **Leaves** the password-change gate and its guard to the routing ([frontend architecture › Landing and guards](../frontend/architecture.md#landing-and-guards)); this capability's flow ends at the form.
- **Leaves** every security rule it applies (the policy, the change's limit, the forced change's double check, a Google-only account's first password, Google linking) to [security.md](../backend/security.md).

## How it composes the platform

- The `me` router at `/me` is guarded by `requireAuth`, which lets a pending change through only on `/me/password` ([security › Passwords](../backend/security.md#passwords)).
- A change takes the user's session lock and writes as a compare-and-set ([conventions › Concurrency](../backend/conventions.md#concurrency)).
- On the web, a change hands its new token to the session's `passwordChanged`, and sign-out is the session's `useSignOut` ([architecture §4](../frontend/architecture.md#4-session-and-preferences)). The form follows `shared/forms`, with its password input and its rules checklist ([architecture › Forms](../frontend/architecture.md#forms)); the toast is the design system's.

## Behaviour and flows

**The account menu** shows the name's first word, an initial as the avatar, and the email. It leads the admin, and anyone with an active space link, to the dashboard, by a path the page passes. The phone menu shows the same account as a section; the dashboard's top bar shows the avatar alone.

**Sign-out** is one action, offered by every menu and by `SignOutButton`: it shows its pending state, and a failure says why, so the user tries again.

**The forced change.** The gate sends a user with a temporary password to the change page, whose header shows the wordmark and sign-out only. The form asks for the new password alone, with the policy as a checklist that ticks as the user types. On success the hook, in its own callback, hands the new token to the session of the user who started the change, so it never reaches another user signed in meanwhile, and says the password is saved. Where the user goes next is the guard's.

**The one-time password.** When the admin creates an account, its temporary password shows once, in a dialog that names the person («{name} · {email}», the email left to right) and offers no way to dismiss it by accident: no close button, and neither Escape nor a click outside closes it. The password reads left to right, selectable whole, with «نسخ».
- **«تم» waits for the copy:** it is disabled until «نسخ» is pressed, and says why («انسخها أولًا — لن تظهر مرة أخرى»). A copy the browser refuses still enables «تم», with «تعذّر النسخ — حدّدها وانسخها يدويًا».
- **The handover is asked, then recorded:** «طريقة التسليم» — واتساب · شفهيًا · أخرى. «تم» with no choice says «اختر طريقة التسليم» and moves the focus to the choices, sending nothing. Once recorded (`POST /admin/users/:userId/temporary-password/handover`), a toast names the person and the way, and the dialog closes.
- **Its failures:** a password no longer pending, or an account not found, closes the dialog with «لم تُسجَّل طريقة التسليم»: there is nothing left to record. Any other failure keeps it open with its reason, «تم» trying again; a 429 blocks «تم» while its wait counts down.

## Decisions

### API decisions

- **`users` owns `User`;** the session's user extends it. *Why:* a lower level must not read a higher one's types. 2026-10-04, #34.
- **An account created by someone else gets its temporary password here,** generated and hashed before the transaction that stores it, and is audited `user.created` without it. *Why:* the temporary password and the hashing are this module's; bcrypt stays outside every transaction ([security › Passwords](../backend/security.md#passwords)). 2026-10-11, #60.
- **A temporary password's handover is a small call of its own, after the password is shown,** audited on the account, and only while that password is pending (the owner's D3 and S7). *Why:* the admin's dialog asks the channel once the password has been copied (A5), and the admin's own temporary password (the users item) reuses it as it is. 2026-10-11, #60.
- **A role change is made here, under the session lock its caller took,** ending every session of the person and audited `user.roleChanged`. *Why:* the role and the sessions' end are this module's; `space-links` only decides that the links give another role ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). 2026-10-11, #60.
- **The admin's users list filters and pages the accounts here,** newest first, whatever the case of the search; whether an account has a password is read without its hash. *Why:* every filter is the account's own ([conventions §5](../backend/conventions.md#5-pagination)), and the hash is selected only to check a password ([security › Passwords](../backend/security.md#passwords)). 2026-10-11, #60.
- **The guard reads the account here on every signed-in request,** by its primary key: its role, its pending change and its suspension now (D5). *Why:* a suspension, a role change or a temporary password holds from the next request, not when the access token expires ([ADR 0003](../architecture/decisions/0003-session-model.md), revised). 2026-10-11, the users item.
- **A suspension is a state route, `PUT …/suspended`, idempotent,** and keeps the account's links (D1, D4). *Why:* the style of a space's `hidden`; restoring brings everything back, so a suspended owner's space stays verified. 2026-10-11, the users item.
- **A change that may remove an admin takes the person's lock with every active admin's row, by id, in one statement,** and refuses the last active admin (`LAST_ADMIN`) and the admin's own account (`OWN_ACCOUNT`) (D2). *Why:* two admins acting on each other at once must not both succeed ([conventions › Concurrency](../backend/conventions.md#concurrency)). 2026-10-11, the users item.
- **A suspension also ends the pending reset links, and a password change checks the suspension under the session lock** (the owner's S4, S5). *Why:* no way back in outlives a suspension. 2026-10-11, the users item.
- **The admin's temporary password is generated before its transaction and set under the account's session lock,** which keeps its refusals (a suspended or a Google-only account) true until the write; it ends every session and reset link, as a reset does, and is answered once, as an added owner's is (D6). *Why:* bcrypt stays outside every transaction, and issuing it again resolves a lost answer ([finding 49](../architecture/findings/49-a-lost-answer-to-adding-an-owner-loses-its-temporary-password.md)). 2026-10-11, the users item.

- **Every session of an account ends through one function, `endSessions`,** which raises the account's session version and deletes its refresh tokens, in the caller's transaction, under the session lock it took; nothing else revokes them, and the guard refuses an access token signed under another version. A password change signs its device's new token after the raise; a Google link ends every session too. *Why:* an access token outlived the end of its session ([finding 51](../architecture/findings/51-an-access-token-outlives-the-end-of-its-session.md)); a version is exact where a time has a same-second window, and needs no clock shared between instances. 2026-10-13, #78.
- **A temporary password's expiry is stored on the account, not its issue time,** set by every write that makes one pending and cleared by every write that settles one, with a database `CHECK` tying the two; it is checked at the password sign-in only, once the password matches. *Why:* the rule is one comparison, a later change of the lifetime changes the next issues only, and a session or a Google sign-in that proved the person before keeps working ([security › Passwords](../backend/security.md#passwords)). 2026-10-18, #90.
- **No recovery by email and no Google link while a temporary password is pending,** both decided here (`mayRecoverByEmail`, and the refusal in `accountForGoogle`, again in `linkGoogle` under the lock). *Why:* the email was typed by someone else; a mailbox at a mistyped address must not take the account ([security › Passwords](../backend/security.md#passwords)). 2026-10-18, #90.
- **The forced change takes an optional `email`, refused (422) outside it,** set in the change's own transaction after the password, so a taken address (`EMAIL_TAKEN`) changes nothing, and audited `user.emailChanged` only when it differs. *Why:* the holder of the temporary password is the proof; a field silently dropped elsewhere would let a client believe an address changed. 2026-10-18, #90.
- **An issue's writes (`replaceWithTemporaryPassword`) and a handover's (`recordHandoverLocked`) are one implementation each, under the lock their caller took,** shared by the admin and the owner's staff, the owner's carrying the space. *Why:* one place sets the expiry, ends the sessions and the reset links, and audits; the owner's routes take the space's lock first. 2026-10-18, #90.
- **An account whose temporary password is pending gains no power (`assertNoPasswordPending`, S6),** asked by the admin's owner links and role change under the account's lock. *Why:* its creator knows the password ([security › Passwords](../backend/security.md#passwords)); the rule is the account's, so it lives here. 2026-10-18, #90.

### Web decisions

- **The account menu belongs to `users`,** prepared by one hook. *Why:* the account is this capability's. 2026-10-05, #35.
- **The forced change's form is `users`',** because `/me/password` is. *Why:* the endpoint's owner owns the form. 2026-10-05, #38.
- **Sign-out is one action, also offered alone;** the change page's header shows the wordmark and sign-out only. *Why:* the design's screen 18. 2026-10-05, #38.
- **A compact account menu sits in the dashboard's top bar.** *Why:* the design draws it. 2026-10-05, #39.
- **The menus lead to the dashboard** for the admin or a user with active links. 2026-10-05, #39.
- **A "password saved" toast follows the forced change.** 2026-10-06, #42.
- **The change keeps no password in the cache.** *Why:* passwords never stay in memory after the form ([finding 34](../architecture/findings/34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change.md)). 2026-10-06, #45.
- **The one-time password dialog lives in `users`, and a page shows it through another feature's slot** (the plan's D1.3). *Why:* the temporary password and its handover are this capability's, and the users page's issued password will show the same dialog; `space-links`, whose add sheet answers the password, cannot import `users`, so the owners page puts the dialog in the sheet's slot. 2026-10-18, #89.
- **No close button, no Escape, no click outside; «تم» only after «نسخ»** (the owner's A5). *Why:* the password is shown once and never again; a dialog closed by a stray key loses it. 2026-10-18, #89.
- **A refused copy still enables «تم», saying to copy by hand** (design issue 5). *Why:* the clipboard can be refused by the browser; the admin can still select the password, and a dialog that could never finish would trap them. 2026-10-18, #89.
- **A password no longer pending closes the dialog with «لم تُسجَّل طريقة التسليم»; any other failure keeps it open** (design issue 6). *Why:* once the password is no longer pending there is nothing to record and no reason to hold the admin; any other failure can still be recorded by trying again. 2026-10-18, #89.
- **The handover keeps nothing in the cache.** *Why:* the dialog's password stays in the page's state alone, and the handover's mutation (`gcTime: 0`) holds only the person and the way ([finding 34](../architecture/findings/34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change.md)). 2026-10-18, #89.

Owned by security.md and linked: the change's limit and its double check of a pending change, and a Google-only account's first password through the reset email ([security › Passwords](../backend/security.md#passwords)); Google's linking rule ([security › Sign-in methods](../backend/security.md#sign-in-methods)). Owned by the session and linked: sign-out ends the session only once the server agrees ([architecture §4](../frontend/architecture.md#4-session-and-preferences)).

## Code map

- **API:** `apps/api/src/modules/users/`, entry `index.ts`: the service, its `me` and `admin` routers, the password hashing and its limits, and the temporary password's pure rule.
- **Shared:** `packages/shared/src/users/`: the account, the change's request and answer, the password policy, and the handover's request.
- **Web:** `apps/web/src/features/users/`, entry `index.ts`: `AccountMenu`, `AccountMenuSection`, `CompactAccountMenu`, `SignOutButton`, `ForcedPasswordChangeForm`, and `TemporaryPasswordDialog` in `components/temporary-password/`, with its hook in `hooks/temporary-password/`. Mounted by `pages/site/shell/`, `pages/site/auth/` and `pages/dashboard/shell/`; the dialog is handed to a page through a slot.

## Open findings

- [82. The users feature keeps several operations flat](../architecture/findings/82-the-users-feature-keeps-several-operations-flat.md) — the new dialog takes `temporary-password/` folders; the older files are left alone.

## History

### API history

- #25 — the module: identity, credentials, the password change and the forced change.
- #31 — two racing first Google sign-ins make one account.
- #34 — `User` in `@masaha/shared/users`.
- #35 — the password policy's rules for a checklist.
- #60 — the page of accounts for the admin's users list; the role change that follows an owner's links; the accounts the admin creates with a temporary password, and its handover.
- The users item — the account read by the guard on every signed-in request; suspension and restore; the role change's lock and its write, for `space-links`; the admin's temporary password.
- #78 — the session version: every access token ends with its session; the service hashes through its own helpers, with no parameter for them ([finding 39](../architecture/findings/39-the-users-service-takes-a-parameter-only-its-unit-test-passes.md)).
- #90 — the temporary password's expiry; no recovery by email or Google while one is pending; the email confirmed at the forced change; the owner's re-issue and handover.

### Web history

- #35 — the account menu and sign-out on the site.
- #38 — the forced password change's page and form.
- #39 — the compact menu in the dashboard.
- #42 — the "password saved" toast.
- #45 — no password kept in the cache.
- #89 — the one-time password dialog: shown once, no close button, no Escape and no click outside; «تم» only after «نسخ»; the handover recorded, with a toast; nothing kept in the cache.
