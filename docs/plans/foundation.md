# Plan — Application foundation

> **Status:** Active · **Last Updated:** 2026-10-02 · **Owner:** Basel Ghoneim
> **Authority:** The work items that give Masaha a running API, a database, the technical design, localisation, authentication and the app shells — everything the features need before the first feature is built, the backend architecture they are built on, and the first public deployment. What each area *is* stays owned by its document (`backend/conventions.md`, `backend/security.md`, `api/api-contract.md`, `architecture/data-model.md`, `frontend/localisation.md`, `frontend/architecture.md`); *how* work runs is owned by [workflow.md](../development/workflow.md). This plan only orders the work and drafts each Work Item's contract.

## 1. Goal and finish line

**Goal:** the web app talks to a real API backed by PostgreSQL. A user can register, sign in, stay signed in across reloads, and land in the right shell for their role, in Arabic or English, light or dark, locally and at the public address.

**Finished when:**
- F-1 to F-7 (F-5 as F-5a and F-5b), F-3b and A-1 to A-3 are merged;
- CI runs every lane, including `test:api` against a real PostgreSQL;
- the *Entities* section of `data-model.md`, `architecture/system-overview.md` and the catalogue part of `localisation.md` *Mechanism* are written (deferred documents).

**Not in this plan:** any feature (the directory, spaces, the front desk …). Those are the next plan.

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
WI-9 merged ─────────────────────────────┴─► F-4 localisation ─► F-5a auth API ─► F-5b auth web ─► F-6 shells ─► F-7 deployment
                                                                 ▲
F-3 merged + dashboard screens reviewed ─► F-3b update ──────────┘
```

```
A-1 architecture ─┬─► A-3 cross-cutting decisions ─► F-5a auth API ─► F-5b auth web ─► F-6 shells ─► F-7 deployment
                  └─► A-2 space tables ─► the space-management and front-desk slices
```

F-3b waits until the dashboard screens (Owner and Reception, [foundation §13](../frontend/design-system/foundation.md#13-screens-to-design-32)) are reviewed, so the model follows the reviewed designs. F-5 waits for F-3b, because it needs the account changes.

The backend architecture was settled before F-5 (2026-09-30), as three items:
- **A-1** records it.
- **A-2 and A-3** then run in parallel.
- **F-5 waits for A-3**, whose decisions it builds on, but **not for A-2**: authentication touches none of the tables A-2 moves.
- **A-2 must land before** the first feature slice that creates or edits a space or runs the front desk.

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

### F-3b — Technical design update · `feat/schema-update`

Brings the schema and the permission table to the scope change of 2026-09-29. Like F-3, its plan step lists every entity change and every decision before writing.

**Scope**
- **Schema:** the [pending entity changes](../architecture/data-model.md#entities), in new migrations (F-3's migration is never edited):
  - the renames `Member` → `Customer` and `Membership` → `Subscription`, in the models, tables, enums, code and tests;
  - the new models, fields and flags, and the [planned constraints](../architecture/data-model.md#constraints-worth-stating), with raw SQL where Prisma cannot express them.
- **The permission table:**
  - `can()` gains the `RECEPTION` rows and every action in [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md);
  - space checks read only the link's role, never the global role;
  - unit tests cover every action × six actors: USER, reception of this space, reception of another space, owner of another space, owner of this space, ADMIN.
- **Seed:**
  - the defaults the features need (for example, the visit rounding rule);
  - development-only demo data: one verified space with an owner and a reception account, packages, and the four [subscription scenarios](../architecture/data-model.md#subscription-scenarios). It never runs in production.
- **Documents:**
  - fold the pending section and the planned rules of `data-model.md` into its built sections;
  - remove the glossary's note on the old code names.

**Acceptance criteria**
- [ ] `db:reset` runs clean on an empty database, and the new migrations apply on top of F-3's.
- [ ] Integration tests prove each planned constraint the database enforces.
- [ ] Each subscription scenario is expressible, proven by a test.
- [ ] `can()` unit tests cover every action × the six actors.
- [ ] Every pending entity change exists, or its absence is stated and approved in the plan step.

**Out of scope:** endpoints, services and screens (the features build them).

---

### A-1 — Backend architecture and the design archive · `docs/architecture`

Documentation only. It records the approved backend architecture and adds the design archive:
- [ADR 0012](../architecture/decisions/0012-modular-monolith-backend.md) (a modular monolith) and [ADR 0013](../architecture/decisions/0013-identity-modules.md) (identity as three modules);
- the rewritten [backend conventions](../backend/conventions.md): modules, levels, rules and placements;
- the frontend capability names in [architecture.md §3](../frontend/architecture.md#3-capabilities-features);
- the [design archive](../design/README.md).

---

### A-2 — Space settings and occupancy tables · `feat/space-tables`

Its contract was settled in its plan step (2026-09-30) and built on `feat/space-tables`: the two tables, their data moved by two migrations, and the new-space defaults as one setting, `newSpaceDefaults`.

**Scope**
- **`space_settings`:** the 1:1 table owned by `space-settings` ([conventions §9](../backend/conventions.md#space-settings)). It takes over `autoCheckoutAtClosing`, `maxStayMinutes`, `visitRounding`, `visitRoundingMinutes`, `visitCapAtDayPrice`, `visitStudentPrices` and `reminderTemplate` from `Space`.
- **`space_occupancy`:** the 1:1 table owned by `occupancy`. It takes over capacity and the manual override. A space without a row has no capacity and no override ([conventions §9](../backend/conventions.md#occupancy-the-spaces-state-now)).
- **Migrations:** new ones, which move the existing data. Earlier migrations are never edited. The `CHECK` constraints move with their columns.
- **New-space defaults** ([conventions §9](../backend/conventions.md#new-space-defaults)):
  - the `platform-settings` keys for auto check-out at closing, the visit rounding rule and its minutes, and the cap at the day price, seeded;
  - the seed creates its demo space's settings by copying them.
- **Documents:** data-model.md's entities, constraints and `Setting` keys, and [finding 12](../architecture/findings.md#12-the-admins-settings-list-a-default-auto-check-out-that-the-model-has-no-place-for) resolved.

**Acceptance criteria**
- [ ] On a fresh empty database every migration applies and the seed runs clean, and the new migrations apply on top of F-3b's with the data moved.
- [ ] Integration tests prove the moved constraints and the 1:1 keys.
- [ ] The demo space's settings equal the seeded defaults.

**Out of scope:** modules, endpoints and services. The copy of the defaults at space creation is built by the slice that creates spaces.

**Dependencies:** after A-1, and in parallel with A-3. It must be merged before the space-management slices (the admin's, step 2 of the [build sequence](v1-mvp.md#sequence-inside-the-build), and the owner's, step 5) and the front desk (step 7).

---

### A-3 — Cross-cutting decisions · `docs/cross-cutting`

Documentation only. The owner and an analyst decided every open cross-cutting topic, and A-3 records them in their owning documents (2026-10-01):
- **Deployment:** [ADR 0014](../architecture/decisions/0014-deployment.md), with its rules in [conventions §12](../backend/conventions.md#12-environments) and [security.md](../backend/security.md); built by F-5 (the development ports and proxy) and F-7.
- **Idempotency and concurrency, and payments: database triggers or services:** [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md), with its rules in [conventions §13](../backend/conventions.md#13-idempotency-and-concurrency) and [finding 15](../architecture/findings.md#15-the-payments-migration-predates-adr-0015).
- **Dashboard routes and guards:** [ADR 0016](../architecture/decisions/0016-dashboard-urls.md), with the landing and the guards in [architecture.md §2](../frontend/architecture.md#landing-and-guards).
- **Time:** [conventions §11](../backend/conventions.md#11-time).
- **Errors and logging:** [conventions §4](../backend/conventions.md#4-errors) and [§10](../backend/conventions.md#10-logging), the redaction in [security.md](../backend/security.md#http-hardening).
- **Server state on the web:** [architecture.md §7](../frontend/architecture.md#7-server-state), and the revision of [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md).
- **The development ports:** recorded in ADR 0014 and F-5's contract.

**Where each deferred topic is decided**, recorded so none is lost:
- the auto check-out scheduling mechanism: the front-desk slice, within ADR 0014 (an internal endpoint called by an external cron online);
- photos: the space-management slice, within ADR 0014's 4.5 MB request limit (resized on the client, or uploaded directly);
- CSV exports: the finance slice, within ADR 0014's 4.5 MB response limit;
- the reset-email provider: F-5, within ADR 0014's email constraint;
- live-status delivery and caching: the directory slice;
- charts, the map and date inputs: their slices.

---

### F-4, F-5a, F-5b, F-6 — after WI-9

Drafted briefly here; each gets its full contract in its plan step, once the design-system layer is complete.

- **F-4 — Localisation mechanism** (`feat/localisation`):
  - lift the typed-catalogue mechanism from Quick Tweets (the owner gives Claude Code the local path to that repository);
  - `useCopy`, and non-component access;
  - the catalogue parity test;
  - the error-code and field-error-code entries.
  - **Fallback:** react-i18next per [ADR 0006](../architecture/decisions/0006-localisation-approach.md) if lifting takes more than two days.
  - Writes the catalogue part of `localisation.md` *Mechanism*.
- **F-5 — Authentication and session**, split in its plan step (2026-10-01) into two Work Items, each its own conversation and PR:
- **F-5a — Authentication API** (`feat/auth-api`):
  - after F-3b and A-3 (not A-2);
  - the identity modules of [ADR 0013](../architecture/decisions/0013-identity-modules.md), as the [conventions](../backend/conventions.md#7-modules) place them:
    - `sessions`, `users` and `auth`; password hashing moves into `users`;
    - the minimum of `space-links` that the session response needs, the user's active links, oldest first;
  - the ESLint level rule: an import of a module at the same or a higher level ([conventions §7](../backend/conventions.md#level-map)), or past a module's `index.ts`, fails `lint`;
  - the auth endpoints from the plan's API surface, plus `POST /auth/password/reset/check` (read-only: the reset page shows the account's email, or the invalid state, before the form is sent);
  - the password change and the forced change move to the `users` `me` router, at `/me/password`: F-5a updates the [planned surface](v1-mvp.md#planned-api-surface) and api-contract.md. The forced change is a claim in the access token; the change opens a fresh session for the current device;
  - Google sign-in: the ID token verified with `jose` (approved in §4), and the account created or linked as [security.md](../backend/security.md#sign-in-methods) says;
  - register and the first Google sign-in take the interface language, optionally;
  - the reset email, with `nodemailer` (approved in the plan step): a log mode in development and Gmail SMTP from a single sender, chosen by configuration only; production refuses to start without a mode that delivers; a per-recipient cap and a global ceiling over every mode; the link carries the token in the URL fragment;
  - staff sign-in: a reception account signs in like any user, changes its temporary password first, and the session response carries its space links;
  - no phone login;
  - tokens, cookies, rotation and rate limits as [security.md](../backend/security.md), with the rate-limit counters in a PostgreSQL table, and refresh tokens grouped in families so a reused token ends only its own session (schema changes; data-model.md updated);
  - logging ([conventions §10](../backend/conventions.md#10-logging)):
    - the log redaction of [security.md](../backend/security.md#http-hardening), shipped together with the first token (an acceptance criterion);
    - the request id: generated per request, in the logs, the `X-Request-Id` header and the error envelope;
  - the idempotency key's name ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)): the Prisma field `requestId` becomes `idempotencyKey`, still mapped to `request_id`, so no migration; the seed and the tests that use it follow.
  - Proven by the unit and API lanes. It has no screen.
- **F-5b — Authentication on the web** (`feat/auth-web`):
  - after F-5a, and after [finding 9](../architecture/findings.md#9-every-vitest-lane-fails-when-the-working-directorys-drive-letter-is-lowercase)'s fix, which changes the Vitest configuration;
  - the development ports and proxy ([ADR 0014](../architecture/decisions/0014-deployment.md)), with `setup.md`, `.env.example` and `CLAUDE.md` *Commands*:
    - the web on port 5320 and the API on 3320, with Vite's `strictPort`, and `CORS_ORIGIN` to match;
    - Vite's proxy for `/api`, and the web calling `/api/v1` relatively in every environment;
  - the Axios client with single-flight refresh, and the `AppError` normaliser, which carries the request id;
  - `shared/session` and the `RequireRole` guards ([architecture.md §2](../frontend/architecture.md#landing-and-guards));
  - the screens of [SCREENS.md](../design/SCREENS.md) rows 5–7 and the forced password change of row 9:
    - sign in, with Google, the "accounts linked" toast (the Google response's `linked`), which also says the account's password was removed and can be set again by the reset email, the `GOOGLE_LINK_NOT_ALLOWED` state, and the too-many-attempts state;
    - register, sending the interface language;
    - forgot password;
    - reset password: the page reads the token from the URL fragment (`/reset-password#token=…`), removes it from the address bar, then checks it;
    - the forced password change, before any other page;
  - its web dependencies (for example `axios`, `zustand`, `@tanstack/react-query`, `react-hook-form`), proposed in its plan step: none is in §4;
  - the Google client ID on the web.
  - Writes `architecture/system-overview.md` (the first end-to-end request).
- **F-6 — Shells and preferences** (`feat/shells`):
  - `shared/preferences` (language and theme, writing the pre-paint keys);
  - the public shell (header, footer) and the dashboard shell (sidebar per role: ADMIN, and OWNER or RECEPTION at the selected space; top bar; space switcher);
  - the placeholder pages each route group needs to be navigable;
  - the site and dashboard boundary ([ADR 0011](../architecture/decisions/0011-one-web-app.md), [architecture.md §2–§3](../frontend/architecture.md#2-page-groups)): each page group mounted lazily, and the dashboard-only rule in lint, over the capability names of [architecture.md §3](../frontend/architecture.md#3-capabilities-features);
  - the account's profile and settings belong to the `users` capability;
  - acceptance: a guest's download holds no dashboard code, and a site page group that imports a dashboard-only capability fails `lint`.

### F-7 — First public deployment · `chore/deployment`

Drafted here; its full contract is written in its plan step. It comes right after F-6 and is inside the finish line. [ADR 0014](../architecture/decisions/0014-deployment.md) assumes the same application runs locally and online with no architectural change. F-7 proves it while the app is smallest, right after F-5 builds the session and its cookies, the riskiest part online.

**Scope**
- Vercel and Neon, both in Frankfurt, as ADR 0014 sets them up:
  - the thin function entry around the same composition root ([conventions §12](../backend/conventions.md#12-environments));
  - the pooled connection for the app and the direct one for migrations;
  - the production environment variables, and the Google OAuth origins for the public address.
- **Continuous deployment:** every merge to `main` deploys, and every PR gets a preview, so a slice that breaks something specific to the free tier is caught in its own PR, not at the end of the project.
- The plan step settles:
  - how one project serves the web at `/` and the API under `/api` (Vercel's *Services* is still beta);
  - which database the previews use: a Neon branch, never production;
  - Google sign-in on preview addresses.

**Acceptance criteria**
- [ ] Register, sign in, refresh across a reload and sign out work at the public address exactly as they do locally.
- [ ] A merge to `main` deploys, and a PR gets a preview.
- [ ] `setup.md` explains the deployment and its environment.

**Out of scope:** the scheduler's endpoint, object storage and the email sender online. Each is built by the slice that first needs it, within ADR 0014.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Docker Desktop is heavy or unavailable on the machine | F-2 stops and proposes a native PostgreSQL install; nothing else changes |
| The two parallel conversations conflict | Separate worktrees; rebase before PR; shared files listed in §2 |
| Prisma cannot express the partial unique indexes | Raw SQL in the migration, with integration tests proving them (F-3) |
| Lifting localisation from Quick Tweets takes longer than expected | The two-day cap and the react-i18next fallback in ADR 0006 |
| Power and internet outages | Commit and push at every complete unit; each item stays small |
