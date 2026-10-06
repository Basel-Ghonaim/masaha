# System Overview

> **Status:** Active · **Class:** Overview — how the parts fit together, with one request traced end to end; every rule it mentions is owned elsewhere and linked · **Last Updated:** 2026-10-04 · **Owner:** Basel Ghoneim
> **Authority:** The map of the running system: its parts, how a request crosses them, and which document owns each. It owns no rule. The stack's choice is in [ADR 0001](decisions/0001-monorepo-and-stack.md).

## 1. The parts

```
Browser ── apps/web (React SPA) ──► /api/v1 on the same origin ──► apps/api (Express) ──► PostgreSQL
            zones: app · pages ·      Vite's proxy locally;          modules in levels,     Prisma; the
            features · shared         one origin online (ADR 0014)   layers in each         schema owns fields
                                   ▲
                    packages/shared: the request schemas and the contract's types, used by both sides
```

| Part | What it is | Owned by |
|---|---|---|
| **The web** (`apps/web`) | One single-page application for the public site and the dashboard, in four zones (`app → pages → features → shared`) | [frontend/architecture.md](../frontend/architecture.md), [ADR 0011](decisions/0011-one-web-app.md) |
| **The transport** (`shared/api`) | One Axios client at `/api/v1`: the access token from a getter, retries, single-flight refresh on 401, every failure as an `AppError`; helpers that unwrap the envelope; TanStack Query for the server state | [frontend/architecture.md §5, §7](../frontend/architecture.md#7-server-state), [ADR 0004](decisions/0004-frontend-data-and-state.md) |
| **The session** (`shared/session`) | Who is signed in: the user and the access token in memory, the status, restore, refresh and sign-out; the route guards read it | [frontend/architecture.md §4](../frontend/architecture.md#4-session-and-preferences), [ADR 0003](decisions/0003-session-model.md) |
| **The origin** | The web and the API on one origin, so the cookies travel by themselves: Vite's dev server forwards `/api` to the API locally; online, one origin on Vercel, planned by F-7 | [ADR 0014](decisions/0014-deployment.md), [development/setup.md](../development/setup.md) |
| **The API** (`apps/api`) | An Express modular monolith: modules in levels, each built from routes → controller → service → repository; the composition root (`app.ts`) builds them and mounts their routers | [backend/conventions.md](../backend/conventions.md), [ADR 0012](decisions/0012-modular-monolith-backend.md) |
| **Security** | Tokens, cookies, passwords, rate limits and hardening | [backend/security.md](../backend/security.md) |
| **The contract** | The envelope, the error types, pagination and every endpoint | [api/api-contract.md](../api/api-contract.md) |
| **The database** | PostgreSQL through Prisma; each module writes only its own tables | [data-model.md](data-model.md), the Prisma schema |

## 2. One request, end to end: restoring the session

The first request every signed-in visit makes, and the first that crosses every part. A guest makes none: without the session hint the web knows there is nothing to restore.

1. **Bootstrap** (`app/bootstrap.ts`) starts the preferences and the copy, hands the transport the session's token getter and refresh, makes the QueryClient, and starts the restore without waiting for it: public pages render at once, and only a guarded route waits, with a spinner.
2. **The session** reads the hint cookie (`masaha_session`). With it, it calls `refresh`, shared with any refresh the transport needs at the same moment, so one request is made.
3. **The transport** sends `POST /api/v1/auth/refresh`, relative to the page. The browser adds the `HttpOnly` refresh cookie itself, because the request is same-origin and the cookie is scoped to `/api/v1/auth`.
4. **The proxy or the origin** delivers it to the API: Vite's dev server forwards `/api` to the API's port locally.
5. **The API's application** gives the request its id and log line, applies the HTTP hardening and parses the cookies, then the general rate limit. The `auth` router's chain refuses a cross-site request before it touches a cookie, and hands the request to the controller.
6. **The `auth` module** (the orchestrator) asks `sessions` whose token it is, counts the refresh against its limit, and in one transaction under the user's session lock reads the account from `users`, refuses a suspended one, and has `sessions` rotate the token, within its grace window. It then builds the `Session`: the user's view from `users`, their active space links from [`space-links`](../features/space-links.md#behaviour-and-flows), and a new access token.
7. **The database** holds what those modules read and write: the refresh tokens (`sessions`), the users (`users`) and the space links (`space-links`), each written only by its owner.
8. **The answer** is the envelope with the `Session`, beside a new refresh cookie and the hint. A failure is the error envelope, with the request id in its body and its header.
9. **Back in the web,** the transport unwraps the envelope, or turns the failure into an `AppError`. The session holds the user and the token, and the guards let the page through. A 401, or a 403 for a suspended account, ends the session; no answer, a timeout, a 5xx or another 403 (such as the refusal of a cross-site request, which keeps the cookies) leaves it `unreachable`, with a retry, so a cut connection never signs the user out.

## 3. Where to go next

- A rule about a part: the document that owns it, in the table above; every document is listed in the [documentation map](../README.md).
- Why a part is shaped as it is: the [decisions](decisions/).
