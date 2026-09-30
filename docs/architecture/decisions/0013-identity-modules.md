# ADR 0013 — Identity: sessions, users and auth as three modules

> **Status:** Accepted · **Date:** 2026-09-30

## Context
Identity touches three different kinds of work. First, the token mechanics of [ADR 0003](0003-session-model.md): issuing, rotating and revoking refresh and reset tokens. Second, the account itself: its credentials, the temporary password and the forced change ([ADR 0009](0009-space-scoped-reception-role.md)), suspension and the role, managed by the user and by the admin. Third, the sign-in flows that combine them: register, email and password, Google, refresh, sign-out, and the forgotten password.

The earlier plan put most of this in one `auth` module, with the account split between a "me" and an "admin" area. Under the modular monolith ([ADR 0012](0012-modular-monolith-backend.md)), that module would own unrelated tables and change for unrelated reasons, and the admin's user management would need to reach into it.

## Decision
Identity is three modules, each depending only on the ones before it:
1. **Sessions**: the refresh and reset tokens, and nothing else. Pure mechanics: issue, rotate with the grace window, revoke all. It knows only a user's id.
2. **Users**: the whole account. Identity, hashing and verifying credentials, the temporary password and the forced change, suspension and the role. The user manages their own account through it, and the admin manages everyone's.
3. **Auth**: no data of its own. It orchestrates the sign-in flows from sessions and users: register, sign in with a password or with Google, refresh, sign out, forgot and reset password.

The operative rules, including each module's level and routers, are owned by the [backend conventions](../../backend/conventions.md).

## Alternatives
- **One auth module owning the account and the tokens** (the earlier plan). Rejected: the account's own screens and the admin's user management would depend on the sign-in flows, and token mechanics would sit beside profile rules.
- **Users owning the tokens too.** Rejected: token rotation and its grace window are mechanics with no account rules. Keeping them apart lets users revoke sessions (on suspension or a password change) without owning them.
- **Auth owning the account table.** Rejected: suspension, the role and the temporary password are managed outside any sign-in flow, by the admin and by the user.

## Consequences
- Suspension, a password change and a temporary password revoke sessions through one call, as ADR 0003 requires.
- The sign-in flows hold no rules of their own about accounts. A rule about who may sign in lives in users.
- Three modules where the earlier plan had one. Each stays small and changes for one reason.
