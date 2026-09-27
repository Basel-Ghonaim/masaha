# Setup

> **Status:** Active · **Last Updated:** 2026-09-27 · **Owner:** Basel Ghoneim
> **Authority:** How to install, run, check and test the repository locally, and what CI runs. Which lane proves a behaviour is owned by [testing.md](testing.md); how work is executed by [workflow.md](workflow.md).

## Prerequisites

- **Node.js 24** (≥ 24.15), the version in `.nvmrc` ([ADR 0001](../architecture/decisions/0001-monorepo-and-stack.md)). With nvm: `nvm use`.
- **npm**, the one bundled with Node 24.
- **Docker Desktop** (on Windows, with the WSL 2 backend), running. It hosts the local PostgreSQL ([Database](#database)).

The pin is strict: `engines` allows `>=24.15.0 <25`, and `.npmrc` sets `engine-strict`, so `npm install` and `npm ci` fail on any other Node version.

## Install

```
npm ci
```

One lockfile at the root installs every workspace: `packages/shared`, `apps/api` and `apps/web`.

**Windows:** `npm ci` deletes `node_modules` first. It fails with `EPERM` on `resolver.win32-x64-msvc.node` while an editor's ESLint server has that native module loaded (it comes with the TypeScript import resolver that the zone boundaries use). Close VS Code, or disable its ESLint extension, before running `npm ci`. `npm install` with an unchanged lockfile is not affected.

## Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web app's Vite dev server |
| `npm run build` | Builds every workspace, `packages/shared` first because the API compiles against its `dist` (`packages/shared/dist`, `apps/api/dist`, `apps/web/dist`) |
| `npm run lint` | ESLint over the whole repository |
| `npm run typecheck` | TypeScript in every workspace |
| `npm run test:unit` | The unit lane (`*.unit.test.ts`, Node) |
| `npm run test:component` | The component lane (`*.component.test.tsx`, jsdom) |
| `npm run test:api` | The API integration lane (`*.api.test.ts`, Supertest against the Express app and the test database; needs `npm run db:up`, see [The API test lane](#the-api-test-lane)) |
| `npm run check:classes` | Fails on physical direction classes (`ml-`, `left-`, `text-left` …) anywhere in `apps/web/src`; use the logical form ([foundation §8](../frontend/design-system/foundation.md#8-direction-rtl--ltr)). Also fails on arbitrary-value classes (`text-[13px]`, `bg-[#fff]`, `bg-(--token)` …) outside `shared/design-system/`; use a token utility ([foundation §2](../frontend/design-system/foundation.md#2-principles)) |
| `npm run check:build` | Run after `npm run build`: fails if `apps/web/dist` contains the development-only design-system showcase (its route path or any of its fixture strings) |
| `npm run format` | Prettier over the repository (Markdown is excluded) |

A single workspace can be targeted with `-w`, for example `npm run test:unit -w @masaha/web`.

In development, the design-system showcase is at `/__showcase` ([foundation §3](../frontend/design-system/foundation.md#3-architecture)).

## Database

PostgreSQL 18 runs in Docker Compose ([`docker-compose.yml`](../../docker-compose.yml)): one service with a named volume and a healthcheck.

- It listens on host port **5433**, not the default 5432, so a native PostgreSQL on this machine can keep running.
- It holds two databases:
  - `masaha_dev`, used by the running API;
  - `masaha_test`, used only by the API test lane.
- The user and password are both `masaha`. This is a local development secret, never used anywhere else.
- `masaha_test` is created by [`docker/postgres/create-test-database.sql`](../../docker/postgres/create-test-database.sql) when the volume is first created.
- The Compose project is named `masaha`, so every checkout of the repository (including a git worktree) shares the same container and data.

| Command | What it does |
|---|---|
| `npm run db:up` | Starts PostgreSQL and waits until it is healthy |
| `npm run db:down` | Stops it; the data stays in the volume. `docker compose down -v` also deletes the data |
| `npm run db:migrate` | `prisma migrate dev` on `masaha_dev`: applies pending migrations and creates one from any schema change |
| `npm run db:reset` | `prisma migrate reset`: drops `masaha_dev` and re-applies every migration |
| `npm run db:studio` | Opens Prisma Studio on `masaha_dev` |

**Prisma** (7) lives in `apps/api`:
- The schema is in `prisma/schema.prisma`. It has no models yet.
- The connection comes from `DATABASE_URL` through `prisma.config.ts`, which loads `apps/api/.env` the same way the API does.
- The client is generated into `apps/api/src/generated/prisma/`. That folder is not committed. `npm install` and `npm ci` regenerate it (the API's `postinstall`). After a schema change, `npm exec -w @masaha/api -- prisma generate` regenerates it by hand.

## The API

### First run

From the repository root, with Docker Desktop running:

1. `npm ci`, which also generates the Prisma client.
2. Copy `apps/api/.env.example` to `apps/api/.env`. **Do this before the first run.** Without it the API stops at once, reporting `CORS_ORIGIN` and `DATABASE_URL` as missing. The example's values match the local database, so nothing needs changing.
3. `npm run db:up` starts PostgreSQL.
4. `npm run db:migrate` applies the migrations to `masaha_dev`.
5. `npm run dev -w @masaha/api`, then open `http://localhost:3000/health`: it reports `"db": "up"`.

The API reads its settings from `apps/api/.env`, loaded by Node's `--env-file`. The example lists every variable. The API refuses to start, naming each one, when a required variable is missing or invalid. It also refuses to start when the database at `DATABASE_URL` cannot be reached.

| Command | What it does |
|---|---|
| `npm run dev -w @masaha/api` | Starts the API with `tsx watch` on `PORT` (default 3000), logs made readable by `pino-pretty` |
| `npm run build -w @masaha/api` | Compiles `apps/api/src` to `apps/api/dist` (build `packages/shared` first, or run the root `build`) |
| `npm run start -w @masaha/api` | Runs the built API from `dist`, with JSON logs |

`GET /health` reports the API and the database (`{ status, db, timestamp }`): 200 with `db: "up"`, or 503 with `db: "down"` while the database is unreachable. Everything else lives under `/api/v1`.

In development, tests and typechecking, the API reads `@masaha/shared` from its source through the package's `@masaha/source` export condition, so the shared package does not need building first. Only `build` and `start` use its `dist`.

## The API test lane

`npm run test:api` runs against `masaha_test`, never `masaha_dev`. It reads the database from `TEST_DATABASE_URL` in `apps/api/.env`.

- **Once, before the lane:** it checks that the database is reachable and applies every migration (`prisma migrate deploy`).
- **Before each test file:** it empties every table except Prisma's migration history and restarts the ID sequences. So files run one at a time.
- **Refuses the wrong database:** both steps abort, naming the database, unless its name ends in `_test`. A misconfigured `TEST_DATABASE_URL` cannot wipe `masaha_dev`.

The tooling lives in `apps/api/test/`, outside `src`, so the build never contains it.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs `lint`, `typecheck`, `test:unit`, `test:component`, `test:api`, `check:classes` and `build` as separate checks on every pull request and on `main`, using the Node version from `.nvmrc`. The `build` check then runs `check:build` on its output.

`test:api` is its own job: it runs next to a `postgres:18-alpine` service container whose database is `masaha_test`, and sets `TEST_DATABASE_URL` to it.

## Editor

The repository shares two VS Code files; the rest of `.vscode/` stays ignored.

- `.vscode/extensions.json` recommends **Tailwind CSS IntelliSense**.
- `.vscode/settings.json` opens `*.css` files in Tailwind CSS mode, so VS Code does not flag `@theme`, `@custom-variant` or `source()`. It also sets the spell checker (Code Spell Checker) to British English, the spelling the documents use.

## Line endings

`.gitattributes` stores every text file with LF, and `.editorconfig` and Prettier write LF, so a Windows checkout with `core.autocrlf` still formats cleanly.
