# ADR 0003 — Session: in-memory access token, rotating refresh cookie

> **Status:** Accepted · **Date:** 2026-09-26

## Context
The SPA needs a session that survives reloads, resists XSS token theft, and lets the client know who the user is and their role. The model proven in Quick Tweets is reused. The open question was the extra request on every page load.

## Decision
- **Access token** — a short-lived JWT returned in the response body and kept **in memory only**.
- **Refresh token** — an opaque value, one database row per session, **rotated on every refresh**, sent only as an `HttpOnly` cookie scoped to the auth routes.
- **Session hint cookie** — readable by JS, no secret, so guests skip the refresh attempt entirely.
- **The refresh response carries the user** (with role and language), so restoring the session and learning "who am I" is **one** request.
- **A short rotation grace window**, so two tabs reloading together do not log the user out.
- **Non-blocking restore** — public pages render immediately; only protected routes wait.
- **Single-flight refresh** on the client — concurrent 401s wait for one refresh, then replay.

Lifetimes, cookie attributes, the grace window and revocation rules are owned by [security.md](../../backend/security.md).

## Alternatives
- **Access token in `localStorage`** — rejected: any XSS steals it.
- **Access token also in an HttpOnly cookie** — viable, but needs CSRF protection and still needs a `/me` request on load; no request is saved.
- **Server-side sessions** — rejected: the token model and its client code already exist and are tested.

## Consequences
- One small request per page load for signed-in users, which also returns the user; none for guests.
- Password change, role change and suspension revoke all of the user's refresh tokens.
