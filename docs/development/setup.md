# Setup

> **Status:** Active · **Last Updated:** 2026-11-01 · **Owner:** Basel Ghoneim
> **Authority:** How to install, run, check and test the repository locally, what CI runs, and how it is deployed. Which lane proves a behaviour is owned by [testing.md](testing.md); how work is executed by [workflow.md](workflow.md).

## Prerequisites

- **Node.js 24** (≥ 24.15), the version in `.nvmrc` ([ADR 0001](../architecture/decisions/0001-monorepo-and-stack.md)). With nvm: `nvm use`.
- **npm**, the one bundled with Node 24.
- **Docker Desktop** (on Windows, with the WSL 2 backend), running. It hosts the local PostgreSQL ([Database](#database)).

The pin is strict: `engines` allows `>=24.15.0 <25`, and `.npmrc` sets `engine-strict`, so `npm install` and `npm ci` fail on any other Node version.

## Install

```
npm ci
```

One lockfile at the root installs every workspace: `packages/shared`, `apps/api` and `apps/web`. The install also generates the Prisma client ([Database](#database)), so a fresh clone needs nothing beyond `npm ci`.

**After a pull that changes `package-lock.json`, install again** (`npm install` or `npm ci`). Until then, the new packages are missing. For example, a checkout installed before the API's database work has no `prisma` and no generated client, and `npm run lint` fails with hundreds of `no-unsafe-*` errors in `apps/api`.

**Install scripts.** npm 11 reviews dependencies' install scripts against the `allowScripts` field of the root `package.json`. The field approves, by name, the six packages whose scripts the setup needs:

| Package | Why |
|---|---|
| `prisma`, `@prisma/engines` | Prisma's CLI and its engines, used by the generation and the migrations |
| `bcrypt` | password hashing; its script uses the bundled prebuilt binary, and compiles only on a platform without one |
| `esbuild` | the bundler inside Vite and `tsx` |
| `unrs-resolver` | the import resolver behind the zone boundaries in ESLint |
| `fsevents` | macOS only, for file watching; never installed on Windows or Linux |

- **Today the policy only warns.** npm still runs unreviewed scripts, but reports them as `npm warn allow-scripts`. A future npm release will block them. With this list, the install prints no such warning, and `npm ci --strict-allow-scripts` passes.
- **When a new dependency brings an install script,** npm names it in that warning. Review it, then approve it with `npm approve-scripts --no-allow-scripts-pin <pkg>`. Entries are name-only, because the lockfile already pins every version.
- **`sharp`**, the API's image library, needs no approval: it has no install script, and its native libvips comes prebuilt for each platform as an optional package (`@img/sharp-win32-x64` on Windows, `@img/sharp-linux-x64` in CI and online), which the lockfile lists for every platform.
- **Keep the policy in `package.json`.** npm ignores an `allowScripts` in a workspace, and refuses `--allow-scripts` on the command line inside a project.
- The API's own `postinstall` (`prisma generate`) belongs to a workspace, which the policy does not cover. It always runs.

**Windows:** `npm ci` deletes `node_modules` first. It fails with `EPERM` on `resolver.win32-x64-msvc.node` while an editor's ESLint server has that native module loaded (it comes with the TypeScript import resolver that the zone boundaries use).
- **Before `npm ci`,** close VS Code, or disable its ESLint extension.
- **If it has already failed,** `node_modules` is left half-deleted, without `prisma`. Close the editor and run `npm ci` again.
- **Do not run a bare `npx prisma` on such a tree.** With no local `prisma`, `npx` goes to the registry instead.
- `npm install` with an unchanged lockfile is not affected.

## Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web app's Vite dev server at `http://localhost:5320` (it stops if the port is taken), forwarding `/api` to the API on port 3320, so the web and the API share one origin ([ADR 0014](../architecture/decisions/0014-deployment.md)). A folder can set other ports ([The web](#the-web)) |
| `npm run build` | Builds every workspace, `packages/shared` first because the API compiles against its `dist` (`packages/shared/dist`, `apps/api/dist`, `apps/web/dist`) |
| `npm run lint` | ESLint over the whole repository |
| `npm run typecheck` | TypeScript in every workspace |
| `npm run test:unit` | The unit lane (`*.unit.test.ts`, Node) |
| `npm run test:component` | The component lane (`*.component.test.tsx`, jsdom) |
| `npm run test:api` | The API integration lane (`*.api.test.ts`, Supertest against the Express app and the test database; needs `npm run db:up`, see [The API test lane](#the-api-test-lane)) |
| `npm run check:classes` | Fails on physical direction classes (`ml-`, `left-`, `text-left` …) anywhere in `apps/web/src`; use the logical form ([foundation §8](../frontend/design-system/foundation.md#8-direction-rtl--ltr)). Also fails on arbitrary-value classes (`text-[13px]`, `bg-[#fff]`, `bg-(--token)` …) outside `shared/design-system/`; use a token utility ([foundation §2](../frontend/design-system/foundation.md#2-principles)). Also fails on the selected tint shown as a hover (`hover:bg-accent`, `focus:text-accent-foreground`, `data-[selected=true]:bg-sidebar-accent` …) anywhere in `apps/web/src`, the design system included; use `hover` ([foundation §5](../frontend/design-system/foundation.md#5-semantic-roles)) |
| `npm run check:links` | Fails on a relative link, an image path or an anchor of any Markdown file that does not resolve, and on a `docs/….md` path cited in a source file that does not exist; paths are compared with the real files, case included. External links are not checked ([documentation rules §8](../architecture/documentation.md#8-link-integrity)) |
| `npm run check:conflicts` | Fails when any git-tracked file holds a merge-conflict marker (`<<<<<<< `, `>>>>>>> `, or `=======` between them); skips binary files; prints each hit as `<file>:<line>` and a total |
| `npm run check:build` | Run after `npm run build`: fails if `apps/web/dist` contains the development-only design-system showcase (its route path, or any of its fixture strings that the copy catalogues do not also write), or if the site's first download, read from the build's manifest, reaches the dashboard's code or a heavy library's chunk, or a library's chunk is missing, or a site page's chunk reaches a heavy library's through its static imports, or a chunk the dashboard's reaches imports it back ([architecture §3](../frontend/architecture.md#3-capabilities-features)) |
| `npm run format` | Prettier over the repository (Markdown is excluded) |
| `npm run format:check` | The same files, checked without writing: fails naming each file `format` would change |

A single workspace can be targeted with `-w`, for example `npm run test:unit -w @masaha/web`.

In development, the design-system showcase is at `/__showcase` ([foundation §3](../frontend/design-system/foundation.md#3-architecture)).

The web reads `@masaha/shared` from its source, through the package's `@masaha/source` export condition, in development, its tests, typechecking and its build, so the shared package never needs building first for the web.

## Database

PostgreSQL 18 runs in Docker Compose ([`docker-compose.yml`](../../docker-compose.yml)): one service with a named volume and a healthcheck.

- It listens on host port **5433**, not the default 5432, so a native PostgreSQL on this machine can keep running.
- It holds two databases:
  - `masaha_dev`, used by the running API;
  - `masaha_test`, used only by the API test lane.
- The user and password are both `masaha`. This is a local development secret, never used anywhere else.
- `masaha_test` is created when the volume is first created, by an init script the Compose file holds inline (its `configs`), so the container depends on no folder (2026-10-29, #132). This needs Docker Compose 2.23.1 or later.
- The Compose project is named `masaha`, so every checkout of the repository (including a git worktree) shares the same container and data.

| Command | What it does |
|---|---|
| `npm run db:up` | Starts PostgreSQL and waits until it is healthy |
| `npm run db:down` | Stops it; the data stays in the volume. `docker compose down -v` also deletes the data |
| `npm run db:migrate` | `prisma migrate dev` on `masaha_dev`: applies pending migrations and creates one from any schema change |
| `npm run db:reset` | `prisma migrate reset`, then `prisma db seed`: drops `masaha_dev`, re-applies every migration and seeds it. Prisma 7's reset no longer seeds by itself, so the script chains the seed. Prisma first asks "Are you sure…?": type `y`. The default is No, so Enter cancels ("Reset cancelled."), and then nothing is dropped and the seed does not run either |
| `npm run db:seed` | Seeds `masaha_dev` (see [The seed](#the-seed)) |
| `npm run db:studio` | Opens Prisma Studio on `masaha_dev` |

**Prisma** (7) lives in `apps/api`:
- The schema is in `prisma/schema.prisma`, the source of truth for every model ([data-model.md](../architecture/data-model.md)). Its migrations are in `prisma/migrations/`.
- **After `prisma migrate dev` creates a migration, read it before committing.** The `CHECK` constraints live as raw SQL in the migrations, and a change to one needs a hand-written migration ([data-model.md › Constraints](../architecture/data-model.md#constraints-worth-stating)).
- The connection comes from `DATABASE_URL` through `prisma.config.ts`, which loads `apps/api/.env` the same way the API does.
- The client is generated into `apps/api/src/generated/prisma/`. That folder is not committed. Every `npm install` and `npm ci` regenerates it (the API's `postinstall`), even when no package changed. After a schema change, `npm exec -w @masaha/api -- prisma generate` regenerates it by hand.

### The seed

`npm run db:seed` fills a database with what every environment starts with:
- the lookups: the Gaza Strip's governorates and areas (the unreachable ones inactive) and the amenities, in both languages;
- one `ADMIN` account;
- the default settings ([their values](../architecture/data-model.md#operations)): the staleness thresholds and the new-space defaults, plus the platform's contact email and WhatsApp when they are given.

It reads the admin's credentials and the contact from `apps/api/.env` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, optionally `SEED_ADMIN_NAME`, `SEED_CONTACT_EMAIL`, `SEED_CONTACT_WHATSAPP`; see `.env.example`). They live only there, never in the repository. It stops, naming each one, when a required one is missing or invalid.

The seed only **creates what is missing**. It never changes an existing row, so running it again changes nothing, and the admin's later edits (a hidden area, a changed setting, the admin's password) survive. The data of real spaces is not seeded: the admin enters it, through the API today ([spaces](../features/spaces.md)).

**Demo data (development only).** With `SEED_DEMO=true` and a `SEED_DEMO_PASSWORD` in `apps/api/.env`, the seed also adds one verified demo space (`masaha-demo`): an owner (`demo-owner@example.com`) and a reception account (`demo-reception@example.com`), both with that password; the space's hours, prices, shifts and packages; the four [subscription scenarios](../architecture/data-model.md#subscription-scenarios); people present now, visits (paid, uncollected, and unpaid on a customer) and payments (partial, voided, and a credit). It adds the directory's demo set too: 24 publicly listed spaces across four governorates, about half verified and owned by one more account (`demo-directory-owner@example.com`, the same password), with what the public pages show from data alone — prices hidden as stale on an unverified space, photos (stored in the local storage, `apps/api/.storage`, which the API serves with the default `STORAGE_MODE=local`) and none, a space with no hours, shift and student prices, Friday open and closed, phone and WhatsApp contacts, own amenities, and each live state (full, closed by its hours or by a closure, available). Their dates are counted from the day it runs. Each is created once, its own unit: when the demo space, or the set's first space (`noor-hub`), exists, that part changes nothing, so a database that holds the demo space gains the set. It refuses to run with `NODE_ENV=production`. Running the seed again on another day renews the set's day-bound states: spaces with present visitors receive today's visitors, and the space marked closed today is closed for the current weekday.

## The web

The web needs no settings to run. Its optional settings are read from `apps/web/.env` (copy [`apps/web/.env.example`](../../apps/web/.env.example); never committed). Vite reads it when it starts, so restart `npm run dev` after a change.

- `WEB_PORT` (default 5320) and `API_PROXY_TARGET` (default `http://localhost:3320`) set the development server's port and the API it forwards `/api` to. They carry no `VITE_` prefix, so they never reach the browser.

- `VITE_GOOGLE_CLIENT_ID` turns on Google sign-in. It must be **the same client id** as the API's `GOOGLE_CLIENT_ID` (below), whose Google Cloud OAuth client lists `http://localhost:5320` as an authorised JavaScript origin. Without it, the sign-in and register pages show no Google button. A Google answer from a client whose id the API does not hold is refused as `GOOGLE_TOKEN_INVALID`.

- The platform's contact, shown on About and to an unverified space's owner on its page, is no setting of the web: the site reads it from the API (`GET /settings/public`), as the admin saves it in «إعدادات المنصة» (2026-10-29, #132).

### Running a second folder

A second folder, such as a worktree, runs its web and its API beside the first on ports of its own, each set in that folder's own `.env` files, never committed:
- `apps/api/.env`: its `PORT`, and `CORS_ORIGIN` naming its web, for example `3321` and `http://localhost:5321`;
- `apps/web/.env`: `WEB_PORT=5321` and `API_PROXY_TARGET=http://localhost:3321`.

The database container is shared by every folder. Every folder now gives Compose the same configuration, so a second folder's `npm run db:up` leaves the running container as it is ([finding 48](../architecture/findings/48-db-up-from-another-folder-recreates-the-shared-container.md)). **Once,** on a machine whose container was created before the init script moved inline (it binds a folder's `docker/postgres/create-test-database.sql`), the first `npm run db:up` recreates the container with the new configuration; the data stays in the volume (2026-10-29, #132).

Google sign-in there also needs that origin listed on the OAuth client. When done, stop both servers and check that their ports are free: on Windows, a `tsx watch` API can survive Ctrl+C.

## The API

### First run

From the repository root, with Docker Desktop running:

1. `npm ci`, which also generates the Prisma client.
2. Copy `apps/api/.env.example` to `apps/api/.env`. **Do this before the first run.** Without it the API stops at once, reporting `NODE_ENV`, `CORS_ORIGIN`, `DATABASE_URL` and `JWT_SECRET` as missing. The example's database values match the local database. Set `JWT_SECRET` to a random value of at least 32 characters (for example, the output of `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`), and fill in `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` for the seed. `GOOGLE_CLIENT_ID` is optional locally: without it, Google sign-in is off.

   The reset email defaults to `EMAIL_MODE=log`: nothing is sent, and the reset link appears in the API's log. To send real email from development, set `EMAIL_MODE=smtp` and the `SMTP_*` and `EMAIL_FROM` values (the example explains Gmail's app password). Outside development, `log` is refused.

   Files (a space's photos) default to `STORAGE_MODE=local`: they are written under `apps/api/.storage/` (git-ignored) and served by the API at `/api/v1/files/…`, which the web's development server reaches through its `/api` proxy, offline. To store them in Cloudinary instead, set `STORAGE_MODE=cloudinary` and `CLOUDINARY_URL` (`cloudinary://<api_key>:<api_secret>@<cloud_name>`, from Cloudinary's console); each environment keeps its files under its own folder, `masaha/<NODE_ENV>/`. `CLOUDINARY_URL` holds the account's secret: it lives only in `apps/api/.env`. Production refuses `local`.
3. `npm run db:up` starts PostgreSQL.
4. `npm run db:migrate` applies the migrations to `masaha_dev`.
5. `npm run db:seed` adds the lookups, the admin account and the settings.
6. `npm run dev -w @masaha/api`, then open `http://localhost:3320/health`: it reports `"db": "up"`.

The API reads its settings from `apps/api/.env`, loaded by Node's `--env-file`. The example lists every variable. The API refuses to start, naming each one, when a required variable is missing or invalid. It also refuses to start when the database at `DATABASE_URL` cannot be reached.

| Command | What it does |
|---|---|
| `npm run dev -w @masaha/api` | Starts the API with `tsx watch` on `PORT` (default 3320), logs made readable by `pino-pretty` |
| `npm run build -w @masaha/api` | Compiles `apps/api/src` to `apps/api/dist` (build `packages/shared` first, or run the root `build`) |
| `npm run start -w @masaha/api` | Runs the built API from `dist`, with JSON logs |

`GET /health` reports the API and the database ([api-contract §1](../api/api-contract.md#1-conventions)): 200 while the database is up, 503 while it is unreachable. Everything else lives under `/api/v1`.

In development, tests and typechecking, the API reads `@masaha/shared` from its source through the package's `@masaha/source` export condition, so the shared package does not need building first. Only `build` and `start` use its `dist`.

### Timed jobs

The auto check-out runs as a timed job ([api-contract › Internal](../api/api-contract.md#internal)). Locally, the API runs it itself: 10 s after start, then every 5 minutes, logging one `job ran` line per job. `JOBS_SECRET` is optional locally: without it, the endpoint is not mounted.

Online, set `JOBS_SECRET` (a random value of at least 32 characters) in the host's settings, and create one job on a free external cron service (for example cron-job.org): `POST https://<host>/api/v1/internal/jobs/run` every 60 minutes while the site is not launched (2026-11-04, #135), so the free database sleeps between calls ([finding 213](../architecture/findings/213-a-cron-every-5-minutes-keeps-neons-free-database-awake-all-month.md)), with the header `Authorization: Bearer <JOBS_SECRET>`, written exactly so (`Bearer` with its capital, one space, the secret). A run where a job itself failed answers 500, which the service shows. A stay a job could not close does not: the run answers 200 with that job's `failed` count, so read the API's logs for `stay not closed`, which names the stay. A missed run is caught up by the next.

## The API test lane

`npm run test:api` runs against `masaha_test`, never `masaha_dev`. It reads the database from `TEST_DATABASE_URL` in `apps/api/.env`.

- **Once, before the lane:** it checks that the database is reachable and applies every migration (`prisma migrate deploy`).
- **Before each test file:** it empties every table except Prisma's migration history and restarts the ID sequences. So files run one at a time.
- **Refuses the wrong database:** both steps abort, naming the database, unless its name ends in `_test`. A misconfigured `TEST_DATABASE_URL` cannot wipe `masaha_dev`.

The tooling lives in `apps/api/test/`, outside `src`, so the build never contains it.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs `lint`, `format:check`, `typecheck`, `test:unit`, `test:component`, `test:api`, `check:classes`, `check:links`, `check:conflicts` and `build` as separate checks on every pull request and on `main`, using the Node version from `.nvmrc`. The `build` check then runs `check:build` on its output.

`test:api` is its own job: it runs next to a `postgres:18-alpine` service container whose database is `masaha_test`, and sets `TEST_DATABASE_URL` to it.

## The deployment

Online, Masaha runs on Vercel and Neon, both in Frankfurt, at one origin ([ADR 0014](../architecture/decisions/0014-deployment.md), which lists every free-tier difference). This section is the runbook: how it is served, its variables, the owner's steps, and the first checks. **No value is ever written here or in the repository:** every secret lives only in Vercel's and Neon's settings (2026-11-01, #133).

### How it is served

One Vercel project at the repository root, set by [`vercel.json`](../../vercel.json):

- **Install:** `npm ci`. `.npmrc` includes the devDependencies whatever `NODE_ENV` says: with `NODE_ENV=production` set, npm would omit them, and the build (Vite, `tsc`) and the API's `postinstall` (`prisma generate`) need them.
- **Build:** `NODE_ENV=production npm run build`, then the migration step (below). The root `vercel-build` script builds `@masaha/shared` and `@masaha/api` again for the function: Vercel's own step for build outputs a function includes.
- **The web:** `apps/web/dist` at `/`. A path that is not a file and not under `/api` falls back to `index.html`, so a deep link or a reload opens its page.
- **The API:** one Node.js function, `api/index.js`, which re-exports the API's thin entry ([conventions §12](../backend/conventions.md#12-environments)). Every `/api/*` path is rewritten to it with its path unchanged, so the routes are the same (`/api/v1/…`). Only `/api/*` reaches it: `/health` stays the local server's.
- **Region** `fra1`; **Node.js 24**, from `engines` in `package.json`.
- **Production from `main` only, no previews** (`git.deploymentEnabled`). A preview would need a database of its own, never production's, and Google sign-in and the allowed CORS origin each hold one fixed address. A Neon branch per preview can be revisited later.
- **Migrations, on production deploys only.** Once the build has succeeded, `apps/api/scripts/migrateOnDeploy.ts` runs `prisma migrate deploy` over Neon's direct connection, `DIRECT_URL`; on any other build it does nothing. A missing `DIRECT_URL` or a failed migration fails the deploy, and the deployment before it keeps serving. **Every migration must work with the code before it:** a rollback on Vercel brings the old code back, never the old database.

**The web's headers** (`vercel.json`, on every path but `/api/*`; the API keeps Helmet's):

| Header | Value, and why |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`, then each directive below |
| — `script-src` | `'self'`; `index.html`'s two inline scripts by their SHA-256 hashes (the pre-paint theme and language; zod's settings), never `'unsafe-inline'`; `https://accounts.google.com/gsi/client`, Google's sign-in |
| — `style-src` | `'self'`; `'unsafe-inline'`, for the `<style>` elements that `sonner` and Radix's scroll lock insert at run time, which no hash can name; `https://accounts.google.com/gsi/style` |
| — `img-src` | `'self'`; `data:`, Leaflet's icons inside its stylesheet; `https://tile.openstreetmap.org`, the map's tiles ([finding 46](../architecture/findings/46-the-deployments-headers-must-let-the-maps-tiles-load.md)); `https://res.cloudinary.com`, the photos ([finding 64](../architecture/findings/64-the-deployments-headers-must-let-cloudinarys-photos-load.md)) |
| — `font-src` | `'self'`; `data:`, the font subsets the build inlines |
| — `connect-src`, `frame-src` | `'self'` (connect only); `https://accounts.google.com/gsi/`, Google's sign-in and its button ([finding 33](../architecture/findings/33-the-deployments-headers-must-let-googles-sign-in-work.md)) |
| — the rest | `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups`: Google's sign-in window answers the page |
| `Referrer-Policy` | `strict-origin-when-cross-origin`: OpenStreetMap's tile policy asks for a referrer |
| `X-Content-Type-Options`, `X-Frame-Options` | `nosniff`; `DENY` |
| `Cache-Control`, on `/assets/*` only | a year, `immutable`: the file names carry their content's hash |

- **A change to an inline script of `index.html` changes its hash:** the web's unit lane then fails, naming the new hash to write in `vercel.json`.
- **A new outside source** (a script, an image host, a frame) needs its line here and in the policy, or it is blocked online only.
- **zod builds its schemas jitless** (`index.html`'s second script), so it never probes for eval, which the policy refuses and would report on every page.

### The variables

All in the Vercel project's **Production** environment (Settings, Environment Variables), never in the repository:

| Variable | Value | Where it comes from |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | Neon's **pooled** connection string (its host ends in `-pooler`) | Neon's console, Connect, with connection pooling on |
| `DIRECT_URL` | Neon's **direct** connection string | the same, pooling off. Only the deploy's migration step and the first admin's seed use it |
| `CORS_ORIGIN` | the public address, `https://<project>.vercel.app`, no trailing slash | Vercel, the project's domain. The reset email's link leads there too |
| `JWT_SECRET`, `JOBS_SECRET` | each a new random value | `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"`, once for each; never a development value, never the same twice |
| `TRUST_PROXY` | `1` | Vercel overwrites `x-forwarded-for` with the visitor's address and forwards none a client sends: trusting that one hop gives the visitor's address, and a forged header picks no rate-limit bucket ([security › Rate limits](../backend/security.md#rate-limits-fixed-window)) |
| `GOOGLE_CLIENT_ID` | Masaha's OAuth client id | Google Cloud console: the one client, with both origins. Its consent screen stays in *Testing* (step 5) |
| `VITE_GOOGLE_CLIENT_ID` | the same value | read by the web's **build**: a change takes a redeploy |
| `EMAIL_MODE` | `smtp` | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | `smtp.gmail.com`, `465`, `true` | |
| `SMTP_USER`, `EMAIL_FROM` | Masaha's own Gmail address; `"مساحة Masaha" <that address>` | the Gmail account made for Masaha |
| `SMTP_PASSWORD` | that account's app password | the Google account's Security, App passwords (2-step verification on) |
| `STORAGE_MODE` | `cloudinary` | |
| `CLOUDINARY_URL` | `cloudinary://<api_key>:<api_secret>@<cloud_name>` | Cloudinary's console. The files go under `masaha/production/` |
| `LOG_LEVEL` | `info` | optional |
| `NODEJS_HELPERS` | `0` | Vercel then hands the function Node's own request and response, as the local server gets them; Express reads the body and the query itself |

Not set online: `PORT`, `TEST_DATABASE_URL` and the `SEED_*` variables.

**Neon's strings as they come,** ending in `?sslmode=require&channel_binding=require`, in both variables (checked 2026-11-01 against the installed versions):

- **`DATABASE_URL`, the app** (`pg` 8.23 through `@prisma/adapter-pg`, which hands the string to `pg` unchanged): `channel_binding` is accepted and ignored; `pg` reads only its own `enableChannelBinding` option, so the connection authenticates by plain SCRAM. `sslmode=require` is taken as `verify-full`: Neon's certificate is verified, and the log shows one `SECURITY WARNING` about that alias per instance, which changes nothing.
- **`DIRECT_URL`, `prisma migrate deploy`** (Prisma 7's schema engine) and the seed: `channel_binding=require` is accepted and enforced. Against a local PostgreSQL 18 over TLS with SCRAM, `migrate status` and `migrate deploy` succeeded with both parameters; without TLS the engine refused with `authentication error: server did not use channel binding`. Neon offers channel binding over TLS, so the string stays whole. Should the first deploy's migration step still fail with that message, remove only `&channel_binding=require` from `DIRECT_URL`, and redeploy.


### The owner's steps

1. **Neon:** a project in Frankfurt (AWS eu-central-1), PostgreSQL 18. Copy its pooled and its direct connection strings.
2. **Vercel:** import the GitHub repository as a new project, its root directory the repository's root. Leave the framework, install, build and output settings as they come: `vercel.json` sets them. The project's name gives the address, `https://<project>.vercel.app`.
3. **The variables:** every one of the table above, in the Production environment, before the first deploy (the import screen takes them).
4. **The first deploy.** Its build log shows Node.js 24, the build, the migration step applying every migration over the direct host, and the function built.
5. **Google:** add the public address to the OAuth client's authorised JavaScript origins, beside `http://localhost:5320`. If the address differs from `CORS_ORIGIN`, correct the variable and redeploy. **The consent screen stays in *Testing*:** publishing it needs a homepage and a privacy-policy address, and Masaha has no privacy page (outside v1). So online, Google sign-in works only for the test users listed on the consent screen (at most 100); everyone else registers by email. Add each test user's Google account there (the owner's decision, 2026-11-01; its branding and publishing are discussed with the owner on 2026-11-02).
6. **The first admin,** from the owner's machine, at the repository's root, in a new PowerShell window:

   ```
   $env:NODE_ENV = "production"
   $env:DATABASE_URL = "<Neon's direct connection string>"
   $env:SEED_DEMO = "false"
   $env:SEED_ADMIN_EMAIL = "<the admin's email>"
   $env:SEED_ADMIN_PASSWORD = "<a new password, never the development one>"
   npm run db:seed
   ```

   Then close the window, and the values with it. A value set in the shell wins over `apps/api/.env` (`prisma.config.ts` loads that file without overriding), so the seed writes Neon, never `masaha_dev`. It adds the lookups, the admin and the settings ([The seed](#the-seed)), and never changes a row that exists. With `NODE_ENV=production` the demo data refuses to run, and `SEED_DEMO=false` keeps it from trying when `apps/api/.env` says `true`. The site starts empty but for the admin, who adds the first spaces from the dashboard.
7. **The cron:** one job on cron-job.org, every 60 minutes, as [Timed jobs](#timed-jobs) says, with `JOBS_SECRET`.
8. **The first checks,** below.

### The first checks

At the public address, in a browser whose console shows no CSP violation on any page:

- home; the directory, with its map's tiles; a space's photos, from `res.cloudinary.com`, once the admin has added a space with photos;
- register by email; sign in; reload, still signed in; sign out; Google sign-in with a listed test user's account (any other Google account is refused by Google's own screen);
- a reset email arrives, from Masaha's Gmail; a photo upload from the admin's editor;
- the cron's first run answers 200, with each job's `done` counts (cron-job.org's history).

What only the account can prove, from its logs and settings:

- the build log: Node.js 24.x, the migration over the direct host, the web built before the function;
- the function: a read answers (Prisma's client, generated by the install, with the `pg` adapter and no engine binary); a password sign-in (bcrypt's Linux build); a photo upload (sharp's Linux build);
- Neon's usage after a week: on pace under its 100 compute-hours a month ([finding 213](../architecture/findings/213-a-cron-every-5-minutes-keeps-neons-free-database-awake-all-month.md)).

Three findings are measured here, after the deployment, and stay open until then:

- [**65**](../architecture/findings/65-the-forgotten-passwords-wait-is-an-estimate-not-a-measurement.md), the reset email's wait: request a reset for a real account a few times, read each request's `responseTime` in Vercel's log (kept an hour), and set `NO_SEND_WAIT` from them;
- [**23**](../architecture/findings/23-no-per-address-ceiling-for-signed-in-requests.md), a ceiling per address for signed-in requests: read Vercel's function usage and Neon's compute after the first weeks, and size it, or record why it is not needed;
- [**152**](../architecture/findings/152-audit-entries-kept-for-ever-meet-the-databases-05-gb.md), the audit's retention: read the database's size in Neon's console each month against its 0.5 GB, and the audit table's with `SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));`.

## Editor

The repository shares two VS Code files; the rest of `.vscode/` stays ignored.

- `.vscode/extensions.json` recommends **Tailwind CSS IntelliSense**.
- `.vscode/settings.json` opens `*.css` files in Tailwind CSS mode, so VS Code does not flag `@theme`, `@custom-variant` or `source()`. It also sets the spell checker (Code Spell Checker) to British English, the spelling the documents use.

## Line endings

`.gitattributes` stores every text file with LF, and `.editorconfig` and Prettier write LF, so a Windows checkout with `core.autocrlf` still formats cleanly.
