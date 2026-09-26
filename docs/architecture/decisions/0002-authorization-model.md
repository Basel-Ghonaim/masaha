# ADR 0002 — Authorization: three roles and space-scoped ownership

> **Status:** Accepted · **Date:** 2026-09-26

## Context
Masaha has three kinds of users. Owners must manage only their own spaces; the admin manages the platform but must not see members' personal data. A receptionist role was considered and deferred. Future roles (staff) and multi-manager spaces should not require a redesign.

## Decision
1. **Global role** on `User`: `USER | OWNER | ADMIN`.
2. **Space scope** through a join table `SpaceManager(spaceId, userId, role)`. In v1 `role` has one value, `OWNER`. A space is **verified** when it has at least one manager link.
3. **One permission function**, `can(actor, action, resource?)`, used by every service. Actions are named strings (`space.update`, `members.manage`, `attendance.record`, `platform.users.manage`, …) mapped to rules in one table. No role checks scattered in controllers.
4. Rules:
   - `ADMIN` may manage the platform and space profiles, but **not** members or attendance (privacy).
   - `OWNER` may manage a space's profile, members, attendance, announcements and reports **only** where a `SpaceManager` link exists.
   - `USER` may manage their own favourites, reports and profile.
5. **Enforcement is on the server only.** The client hides what a role cannot do for usability; that is never the protection.
6. The access token carries `userId` and `role` for the route guard (`requireRole`); space scope is always checked against the database.
7. The receptionist uses the owner's account; the audit log records every action.

## Alternatives
- **Role checks in each controller** — rejected: scattered, easy to miss, hard to extend.
- **`ownerId` column on `Space`** — rejected: blocks multi-manager spaces and staff roles later.
- **A policy library (CASL)** — rejected for v1: one small table suffices; revisit at the second instance.

## Consequences
- Adding a staff role later means a new `SpaceManager.role` value and new rows in the permission table — no schema redesign.
- Every protected endpoint is tested for each role and for an owner of a different space ([testing.md](../../development/testing.md)).
- A role change takes effect on the next token refresh (≤ 15 minutes); changing a role revokes the user's refresh tokens so it takes effect immediately.
