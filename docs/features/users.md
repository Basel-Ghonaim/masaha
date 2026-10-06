# Users

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The `users` capability: the account, its credentials, who may sign in, the password change and the forced change, the account menu and sign-out. Its endpoints are owned by the [API contract](../api/api-contract.md#me); the `User` entity by the [data model](../architecture/data-model.md#users-and-sessions); every password and sign-in rule by [security.md](../backend/security.md#passwords).
> **Scope:** the API module `users` (L1); `@masaha/shared/users`; the web feature `features/users`.

## What it does

- Holds the accounts: creates one at registration or at a first Google sign-in, links Google to an existing one, hashes and verifies passwords, and refuses a suspended account.
- Changes a password, and settles a temporary one in the forced change.
- Answers the account's view (`User`) for the session, and the names of a set of users for a list.
- On the web: the account menu in the site's header, its section in the phone menu, the compact menu in the dashboard's top bar, the sign-out button, and the forced password change's form.

The account's settings (`GET` and `PATCH /me`), suspension, role changes and the temporary passwords that an owner or the admin creates are not built.

## Who uses it

- **Every signed-in user,** through the account menu and sign-out.
- **A user with a temporary password,** through the forced change.
- **`auth`,** which signs in, registers and links Google through it.
- **[`space-links`](space-links.md),** which names the owners in the admin's spaces list.

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

## Decisions

- **`users` owns `User`;** the session's user extends it. *Why:* a lower level must not read a higher one's types. 2026-10-04, #34.
- **The account menu belongs to `users`,** prepared by one hook. *Why:* the account is this capability's. 2026-10-05, #35.
- **The forced change's form is `users`',** because `/me/password` is. *Why:* the endpoint's owner owns the form. 2026-10-05, #38.
- **Sign-out is one action, also offered alone;** the change page's header shows the wordmark and sign-out only. *Why:* the design's screen 18. 2026-10-05, #38.
- **A compact account menu sits in the dashboard's top bar.** *Why:* the design draws it. 2026-10-05, #39.
- **The menus lead to the dashboard** for the admin or a user with active links. 2026-10-05, #39.
- **A "password saved" toast follows the forced change.** 2026-10-06, #42.
- **The change keeps no password in the cache.** *Why:* passwords never stay in memory after the form ([finding 34](../architecture/findings.md#34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change)). 2026-10-06, #45.

Owned by security.md and linked: the change's limit and its double check of a pending change, and a Google-only account's first password through the reset email ([security › Passwords](../backend/security.md#passwords)); Google's linking rule ([security › Sign-in methods](../backend/security.md#sign-in-methods)). Owned by the session and linked: sign-out ends the session only once the server agrees ([architecture §4](../frontend/architecture.md#4-session-and-preferences)).

## Code map

- **API:** `apps/api/src/modules/users/`, entry `index.ts`: the service, its `me` router, the password hashing and its limits.
- **Shared:** `packages/shared/src/users/`: the account, the change's request and answer, and the password policy.
- **Web:** `apps/web/src/features/users/`, entry `index.ts`: `AccountMenu`, `AccountMenuSection`, `CompactAccountMenu`, `SignOutButton`, `ForcedPasswordChangeForm`. Mounted by `pages/site/shell/`, `pages/site/auth/` and `pages/dashboard/shell/`.

## Open findings

- [25](../architecture/findings.md#25-the-signed-in-claims-are-read-by-a-helper-written-twice): its controller keeps its own copy of the signed-in helper.
- [39](../architecture/findings.md#39-the-users-service-takes-a-parameter-only-its-unit-test-passes): the service takes its password hashing as a parameter only its unit test passes.

## History

- #25 — the module: identity, credentials, the password change and the forced change.
- #31 — two racing first Google sign-ins make one account.
- #34 — `User` in `@masaha/shared/users`.
- #35 — the account menu and sign-out on the site.
- #38 — the forced password change's page and form.
- #39 — the compact menu in the dashboard.
- #42 — the "password saved" toast.
- #45 — no password kept in the cache.
