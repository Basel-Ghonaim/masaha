# Plan — Application foundation

> **Status:** Active · **Last Updated:** 2026-09-28 · **Owner:** Basel Ghoneim
> **Authority:** The work items that give Masaha a running API, a database, the technical design, localisation, authentication and the app shells — everything the features need before the first feature is built. What each area *is* stays owned by its document (`backend/conventions.md`, `backend/security.md`, `api/api-contract.md`, `architecture/data-model.md`, `frontend/localisation.md`, `frontend/architecture.md`); *how* work runs is owned by [workflow.md](../development/workflow.md). This plan only orders the work and drafts each Work Item's contract.

## 1. Goal and finish line

**Goal:** the web app talks to a real API backed by PostgreSQL. A user can register, sign in, stay signed in across reloads, and land in the right shell for their role, in Arabic or English, light or dark.

**Finished when:**
- F-1 to F-6 are merged;
- CI runs every lane, including `test:api` against a real PostgreSQL;
- the *Entities* section of `data-model.md`, `architecture/system-overview.md` and the catalogue part of `localisation.md` *Mechanism* are written (deferred documents).

**Not in this plan:** any feature (spaces, members, attendance …). Those are the next plan.

## 2. Running in parallel with the design-system plan

F-1, F-2 and F-3 touch only `apps/api`, `packages/shared`, the database and docs, so they run **at the same time** as [design-system-layer.md](historical/design-system-layer.md) WI-6 → WI-9, in a **separate git worktree**.

**Rules while two conversations run:**
- **Where each one works:**
  - the design-system conversation works in the main folder (`masaha`);
  - the foundation conversation works in the worktree (`masaha-api`).
  - Never both in one folder.
- **Shared files:** both sides may touch
  - `package-lock.json`,
  - `.github/workflows/ci.yml`,
  - `docs/README.md`,
  - `docs/development/setup.md`,
  - `CLAUDE.md` *Commands*.
- **Before opening a PR:** rebase on the latest `main`. Resolve any conflict in those files by keeping both sides. For the lockfile, run `npm install` after the rebase, never hand-edit it.
- **Order:** merge order does not matter. Whoever merges second rebases.
- **F-4 to F-6 wait** until WI-9 is merged: they use the design-system components and the showcase patterns.

## 3. How each Work Item is run

Exactly as [design-system-layer.md §2–§3](historical/design-system-layer.md#2-how-each-work-item-is-run-claude-code-in-vs-code):

- **The session:** a fresh conversation per item, started in plan mode;
- **Commits and PR:** the commit and PR rules of workflow §3;
- **Review:** owner review, then merge.

The prompt is the same, with `docs/plans/foundation.md` and the item's id.

## 4. Approved dependencies

Approving this plan approves these. Anything else is proposed in the item's plan step. Before installing, check the current major version. If it differs from what the docs assume, say so in the plan step.

| Area | Packages |
|---|---|
| API runtime | `express` 5, `helmet`, `cors`, `cookie-parser`, `express-rate-limit`, `pino` + `pino-http` |
| Validation (shared) | `zod` (in `packages/shared`, also used by `apps/api`) |
| Database | `prisma`, `@prisma/client`, plus the PostgreSQL driver adapter (`@prisma/adapter-pg` + `pg`) if the current Prisma major requires one |
| Auth (F-5) | `bcrypt` (or `bcryptjs` if the native build fails on Windows; same algorithm and cost), `jsonwebtoken` (or `jose`) |
| API dev and test | `tsx` (dev runner), `supertest`, and the `@types/*` packages these need |
| Environment | none. Node 24's `--env-file` loads `.env`; `config/env.ts` validates it with Zod |
| Local database | PostgreSQL via **Docker Compose** (image version per ADR 0001; propose a newer major in the plan step if it is current) |

**Prerequisite for the owner:** Docker Desktop installed and running (Windows, WSL 2 backend). If Docker is not possible on this machine, F-2 stops and proposes a native PostgreSQL install instead.

## 5. Work Items

```
F-1 api skeleton ─► F-2 database ─► F-3 technical design        (parallel with WI-6 … WI-9)
                                         │
WI-9 merged ─────────────────────────────┴─► F-4 localisation ─► F-5 auth ─► F-6 shells
```

---

### F-1 — API skeleton · `feat/api-skeleton`

**Scope**
- `apps/api` becomes a real workspace (`@masaha/api`): TypeScript strict, extends `tsconfig.base.json`, and is in the root `lint`/`typecheck` scripts.
- The layout from [conventions.md §1](../backend/conventions.md#1-layout), **only what exists** (no empty module folders):
  - `app.ts` (middleware order: helmet → cors → json limit 16 kB → cookie-parser → pino-http → routes → 404 → error handler);
  - `server.ts` (start, graceful shutdown on SIGTERM/SIGINT);
  - `config/env.ts` (Zod-validated, fails fast).
- `shared/errors/`: `AppError` with the factories for every type in [api-contract §3](../api/api-contract.md#3-error-types), and the one error handler that shapes the envelope.
- `shared/http/`: `sendSuccess` and the pagination helpers ([api-contract §4](../api/api-contract.md#4-pagination)).
- `shared/validation/`: `validate(schema, source)`, which maps Zod issues to the seven field-error codes.
- `packages/shared`: `zod`, the `ErrorType` enum, the field-error codes and the domain error codes from api-contract §6, exported for both apps.
- `GET /health` → `{ status, timestamp }`. The `db` field arrives with F-2.
- Scripts: `dev` (tsx watch), `build` (tsc), `start`, `test:api` (Vitest + Supertest).
- `setup.md` and `CLAUDE.md` *Commands*: how to run the API.

**Acceptance criteria**
- [ ] `npm run dev -w @masaha/api` serves `/health`, and `/api/v1/anything` returns the 404 envelope.
- [ ] Integration tests (Supertest) prove:
  - the success envelope;
  - each error type's status and shape;
  - a validation failure with field-error codes;
  - an unknown thrown error becomes `server` with no stack in the body.
- [ ] Unit tests cover `validate()`'s mapping of Zod issues to codes.
- [ ] A missing or invalid env variable stops startup with a clear message.
- [ ] Lint, typecheck and the new `test:api` pass in CI (no database yet).

**Out of scope:** Prisma, any module, auth, rate limits (they come with the routes that need them).

---

### F-2 — Database and the API test lane · `feat/database`

**Scope**
- `docker-compose.yml` at the root: one PostgreSQL service with two databases, `masaha_dev` and `masaha_test`, a named volume and a healthcheck.
- Prisma initialised in `apps/api/prisma/`:
  - datasource from `DATABASE_URL`;
  - `db/prisma.ts` singleton;
  - no models yet. If the current Prisma needs at least one model or migration to run, the smallest one is proposed in the plan step. The real schema is F-3.
- `/health` gains `db: "up" | "down"` and returns 503 when the database is unreachable. `server.ts` refuses to start without a reachable database ([security.md](../backend/security.md#http-hardening)).
- Test lane:
  - `test:api` runs against `masaha_test`: migrate on start, truncate between test files;
  - CI gets a PostgreSQL service container and runs `test:api` with it.
- `.env.example` with every variable and a comment; `.env` stays ignored.
- Scripts: `db:up`, `db:down`, `db:migrate`, `db:reset`, `db:studio`.

**Acceptance criteria**
- [ ] Fresh clone → `npm ci` → `npm run db:up` → `npm run db:migrate` → `npm run dev -w @masaha/api` → `/health` reports `db: "up"`.
- [ ] Stopping the database turns `/health` into 503 with `db: "down"`.
- [ ] An integration test proves the database is reached, and that the test database is cleaned between files.
- [ ] CI runs `test:api` against its PostgreSQL service and passes.
- [ ] `setup.md` explains Docker, the scripts and the two databases.

**Out of scope:** the real schema, seed data.

---

### F-3 — Technical design: schema, permissions, seed · `feat/schema`

This item turns the planned model into the real one. It is the largest design step of the project, so its plan step must list every entity and every decision before writing.

**Scope**
- **The full Prisma schema** from [v1-mvp.md *Planned data model*](v1-mvp.md#data-model), following every rule in [data-model.md](../architecture/data-model.md):
  - IDs, snake_case mapping, timestamps and soft delete;
  - agorot prices and bilingual pairs;
  - the freshness fields and the partial unique indexes (via SQL in the migration where Prisma cannot express them).
- **One migration** that creates it.
- **The permission table:**
  - `shared/auth/can.ts` implements `can(actor, action, resource)` for every action in [ADR 0002](../architecture/decisions/0002-authorization-model.md), with the space-scope check against `SpaceManager`;
  - unit tests cover every row: USER, OWNER of another space, OWNER of this space, ADMIN.
  - `can()` has no routes yet; the features call it.
- **Seed:**
  - lookups: the areas of the Gaza Strip and the amenity list, in Arabic and English;
  - one ADMIN account, with its password from an env variable;
  - the default settings.
  - `db:seed` script.
  - The owner's real space data is entered in the first feature item, not here.
- **Documents:**
  - write the *Entities* section of `data-model.md` (deferred) and remove its row from the deferred table;
  - `data-model.md` states the schema file is now the source of truth;
  - the plan's *Planned data model* section is replaced by a link.

**Acceptance criteria**
- [ ] `db:reset` (migrate + seed) runs clean on an empty database.
- [ ] Integration tests prove the two partial unique indexes:
  - a second open check-in for the same member fails;
  - a duplicate phone among non-deleted members of one space fails, while the same phone in another space, or after a soft delete, succeeds.
- [ ] `can()` unit tests cover every action × the four actor kinds.
- [ ] Every entity and field in the plan exists, or its absence is stated and approved in the plan step.

**Out of scope:** endpoints, services, repositories (the features build them).

---

### F-4, F-5, F-6 — after WI-9

Drafted briefly here; each gets its full contract in its plan step, once the design-system layer is complete.

- **F-4 — Localisation mechanism** (`feat/localisation`):
  - lift the typed-catalogue mechanism from Quick Tweets (the owner gives Claude Code the local path to that repository);
  - `useCopy`, and non-component access;
  - the catalogue parity test;
  - the error-code and field-error-code entries.
  - **Fallback:** react-i18next per [ADR 0006](../architecture/decisions/0006-localisation-approach.md) if lifting takes more than two days.
  - Writes the catalogue part of `localisation.md` *Mechanism*.
- **F-5 — Authentication and session** (`feat/auth`):
  - the auth endpoints from the plan's API surface;
  - tokens, cookies, rotation and rate limits exactly as [security.md](../backend/security.md);
  - on the web: the Axios client with single-flight refresh, the `AppError` normaliser, `shared/session`, `RequireRole` guards, and the sign-in, register, forgot and reset screens.
  - Writes `architecture/system-overview.md` (the first end-to-end request).
- **F-6 — Shells and preferences** (`feat/shells`):
  - `shared/preferences` (language and theme, writing the pre-paint keys);
  - the public shell (header, footer) and the dashboard shell (sidebar per role, top bar, space switcher);
  - the placeholder pages each route group needs to be navigable.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Docker Desktop is heavy or unavailable on the machine | F-2 stops and proposes a native PostgreSQL install; nothing else changes |
| The two parallel conversations conflict | Separate worktrees; rebase before PR; shared files listed in §2 |
| Prisma cannot express the partial unique indexes | Raw SQL in the migration, with integration tests proving them (F-3) |
| Lifting localisation from Quick Tweets takes longer than expected | The two-day cap and the react-i18next fallback in ADR 0006 |
| Power and internet outages | Commit and push at every complete unit; each item stays small |
