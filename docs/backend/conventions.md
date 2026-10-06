# Backend Conventions

> **Status:** Active · **Class:** Contract — rules to build against. **Built:** the shared errors, http and validation code, with `parseId`; `shared/auth` (the access tokens, `requireAuth`, `requireRole`, `signedIn` and `can()`); the audit writer (§6); the rate limiter; the level rule (§7), enforced by lint; the modules `sessions`, `users`, `space-links` (the session's links, the caller's spaces, and the admin's spaces list, composed with the spaces' owners), `auth`, `lookups` (area names by ids, whether an area may take a space, the public catalogue, and its admin router: the governorates, their areas and the amenities), `platform-settings` and `space-settings` minimally (the new-space defaults and the staleness thresholds; a space's settings row, created with it), and `spaces` (space summaries by ids, the admin's list page with its stale groups, and the admin's creation of a space), with `runInTransaction` in `db/`; the logging of §10; the clock of §11; of §12, the composition root, the email port, the Google identity port and the rate limits in PostgreSQL; of §13, the idempotency key's name and the session lock. **Not yet built:** `optionalAuth` and the space middleware (§8); the audit reader (§6); every other module; Gaza time (§11); the storage and scheduler ports (§12); the idempotent creates and the ledger's translation table (§13) · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The backend's modules, their levels, routers and placements, and the rules every module follows; layering, validation, errors, pagination, audit, logging, time, environments, idempotency and concurrency in `apps/api`. Why the backend is a modular monolith is in [ADR 0012](../architecture/decisions/0012-modular-monolith-backend.md); why identity is three modules is in [ADR 0013](../architecture/decisions/0013-identity-modules.md). Payload shapes and paths are owned by the [API contract](../api/api-contract.md); security mechanisms by [security.md](security.md); where each behaviour is tested by [testing.md](../development/testing.md).

The backend is one application divided into **modules**, one per capability, arranged in **levels** (§7). Each module is built from the same **layers** (§2). **A screen is not a capability** (§7): placements follow the rule that consumes a value, never the screen that shows it.

## 1. Layout

```
apps/api/src/
  app.ts               the composition root: builds each module's service, wires the ports
                       (storage, email, Google identity, clock, scheduler) from the environment
                       (createAppFromEnv, §12), mounts the space middleware (§8) and every router
                       where the API contract puts it; then the 404 and error handler
  server.ts            starts it as a long-running server, locally (env check, DB check, the
                       scheduler, graceful shutdown); online, one thin function entry wraps the
                       same app instead and starts no scheduler (§12)
  config/              Zod-validated environment; fails fast
  db/                  the database infrastructure, in one place: the Prisma client,
                       runInTransaction (§8) and the seed
  modules/<module>/    one folder per module (§7)
    index.ts           the public entry: the service factory, the routers, the public types
    <module>.routes.ts           one file per router kind the module has (public, me, manage, admin)
    <module>.controller.ts
    <module>.service.ts          becomes a folder when it grows (§8)
    <module>.repository.ts
    <module>.mapper.ts
    <rule>.ts                    the pure domain rules the module owns (§8)
    <module>.limits.ts           the rate-limit policies the module applies (§2)
    <port>/                      a port the module owns and its adapters, e.g. auth's email/ (R5)
  shared/              the platform (R6): knows no domain concept
    errors/            AppError + factories, error handler
    http/              sendSuccess, pagination helpers
    validation/        validate(schema, source) middleware, parseId (user text is normalised by
                       the shared schemas, in packages/shared, §3)
    auth/              the access-token codec, requireAuth, optionalAuth, requireRole,
                       requireSpaceAccess (§8), can(), signedIn (the claims a guard set)
    audit/             the audit writer (§6)
    jobs/              the scheduler that runs the modules' timed work: an in-process timer
                       locally, an internal endpoint called by an external cron online (§12)
    storage/           the storage adapters (photos): local disk locally, object storage online (§12)
    rate-limit/        the fixed-window counters in PostgreSQL and the limiter over them (§12)
```

Only what exists is created: no empty module folders, and a layer a module does not need is absent.

## 2. Layers

Inside a module, each layer calls only the one below it.

| Layer | Owns | Never |
|---|---|---|
| **Routes** | The per-endpoint chain: rate limiter → auth guard → role guard → `validate(schema)` → controller. A limit counted on every request sits here; a limit that counts only failures, or counts by what only the service knows (the user behind a cookie, the account of an email), is applied by the service, where the outcome is decided | Logic |
| **Controller** | HTTP only: read validated input, call the service, respond with `sendSuccess`, set cookies | Business rules, Prisma |
| **Service** | Business rules, permission checks via `can()`, mapping to DTOs, audit entries (§6), calls to lower modules' services, transactions when it orchestrates (§8) | Importing Prisma or Express |
| **Repository** | Prisma queries on the module's own tables only; applies soft-delete filters by default; each function accepts an optional `tx` (§8) | Rules |

**Dependency injection** by factory functions with defaults: `createController(service = createService())` → `createService(repo = createRepository(), …lower modules' services)` → `createRepository(db = prisma)`. Tests pass plain-object fakes (R8).

## 3. Validation

- **Zod**, with schemas imported from `packages/shared` where the client uses the same rules ([shared-package.md](../architecture/shared-package.md)).
- `validate(schema, source = "body" | "query" | "params")` runs before the controller; on failure it throws `AppError.validation` with field-error **codes**. The rule from Zod's issues to the codes is `toFieldErrors` in `packages/shared` (`core`), which the web's forms use too, so the browser and the server name a failed rule alike.
- **A controller reads the body its route validated.** It casts `req.body` to the type inferred from the same schema that route passes to `validate` (`RegisterRequest` for `registerSchema`), and nothing else ties the two: a route and its controller handler are changed together.
- Query numbers (`page`, `limit`) are coerced and bounded in the schema.
- User text is NFC-normalised, and bidi control characters and control characters (line breaks included) are refused, by `textSchema` in `packages/shared`.
- A paragraph (a space's description) follows the same rules, except that it keeps line breaks, as `\n` (`\r\n` becomes `\n`; a lone `\r` and the Unicode separators are still refused), by `paragraphSchema` beside it.

## 4. Errors

- Any layer throws `AppError.<type>(code?, message?, errors?)`: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`, `rateLimit`, …
- One error handler, registered last, shapes the envelope. Unknown errors are logged and returned as a generic `server` error. The envelope carries the request id (§10).
- Prisma `P2002` → `conflict` with `NOT_UNIQUE` field errors.
- **Database rules become domain codes.** One translation table in `shared/errors` maps a database constraint's name to a domain error code, for example `payments_within_due` → `PAYMENT_EXCEEDS_DUE`, the way `P2002` becomes `NOT_UNIQUE`. The text comes from the copy catalogues. The ledger rules it serves are in §13.
- **Adding a domain error code**, in this order:
  1. the code in `packages/shared`;
  2. its text in both copy catalogues (the typecheck fails while one is missing);
  3. its line in [api-contract §6](../api/api-contract.md#6-domain-error-codes-initial);
  4. a test that provokes it.

## 5. Pagination

- Offset only: the service computes `skip = (page − 1) × limit` and runs `findMany` and `count` in parallel.
- **Filter before paginating.** A filter on a value another module owns is resolved to ids first: the owning module turns the filter into the matching ids, set-based, in one query for the whole space. The listing module then applies its own filters and search to those ids and paginates. Every page is full and the total is right. A page is never filtered after it is fetched.

## 6. Audit

- **Writing is a mechanism**, `shared/audit`:
  - append-only;
  - the only writer of the audit table;
  - it takes the caller's `tx`, so an entry commits or rolls back with the change it records;
  - it knows no domain concept. The calling service names the action and the entity.
- **Services audit their sensitive actions:**
  - space profile and fact changes;
  - spaces created, hidden, unhidden and soft-deleted;
  - lookup changes: a governorate, area or amenity added, edited, hidden or restored;
  - data reports resolved or dismissed;
  - customer create, edit and archive; subscriptions created, corrected and ended;
  - check-in and check-out, for visits and subscriptions;
  - payments recorded and voided ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md));
  - space links: linking owners, adding and deactivating staff;
  - role changes, suspensions and temporary passwords ([security.md](security.md#sign-in-methods));
  - settings changes, for spaces and the platform.
- **Reading is a module**, `audit` (L5, §7). It owns no table and has a `manage` and an `admin` router.
- **Privacy is a default-deny allowlist.** The admin sees only the platform event types on the audit module's list, never an entry about a space's customers, visits, subscriptions or payments ([ADR 0002](../architecture/decisions/0002-authorization-model.md), [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)). An event type not on the list stays hidden from the admin. The owner sees their space's entries.
- The owner's audit screen is in v1 scope ([overview.md](../project/overview.md)) but has no design yet ([finding 14](../architecture/findings.md#14-the-owners-audit-screen-has-no-design)).

## 7. Modules

**A screen is not a capability.** For each value or action on a screen, ask which rule consumes it and who may change it. Different consumers or different permissions mean different capabilities. A module is never created because a screen exists. A screen that shows several capabilities is served by composition at a higher level (§9).

### Level map

This is the only level map. A module imports only modules at **lower** levels, through their `index.ts`, and never one at its own level, so the graph has no cycles. Lint enforces it (`eslint.config.js`, which mirrors this map): an import of a module at the same or a higher level, past a module's `index.ts`, of a module missing from the map (or of a file placed directly in `modules/`), or of any module from `shared/`, `db` or `config` fails `lint`. So does an import of the root (`app.ts`, `server.ts`, the seed, `test/`) from anything but the root, except from a test, and an import past `db`'s or `config`'s `index.ts` from a module or `shared/`. Of `@masaha/shared`, a module imports `core` and the capabilities at its own level or lower, and `shared/`, `db` (outside the seed) and `config` import `core` only. `apps/api/test/levelRule.unit.test.ts` proves each case on probe files in the unit lane.

| Level | Modules |
|---|---|
| **L0** | `sessions` · `lookups` · `platform-settings` · `space-settings` |
| **L1** | `users` · `spaces` |
| **L2** | `space-links` · `customers` · `packages` · `announcements` · `favorites` |
| **L3** | `auth` · `data-reports` · `visits` · `subscriptions` |
| **L4** | `payments` · `occupancy` |
| **L5** | `desk` · `directory` · `finance` · `overview` · `audit` |

### Routers

A module has up to four routers, one per audience:

| Router | Serves | Guarded by |
|---|---|---|
| **public** | Anyone, signed in or not | none, or `optionalAuth` |
| **me** | The signed-in user's own things | `requireAuth` |
| **manage** | A space's staff (owner and reception), under `/manage/spaces/:spaceId` | `requireAuth` and the space middleware (§8); `can()` decides per action |
| **admin** | The platform, under `/admin` | `requireAuth` and `requireRole('ADMIN')` |

The [API contract](../api/api-contract.md) owns the paths. The composition root mounts each router where the contract puts it, so a path need not carry its module's name.

### The modules

| Module | Level | Owns (only it writes) | Routers | Holds |
|---|---|---|---|---|
| `sessions` | L0 | `refresh_tokens`, `password_reset_tokens`, `password_recoveries` | — | Issue, rotate with the grace window, revoke all; the recovery sessions that hold a reset link ([ADR 0017](../architecture/decisions/0017-recovery-session.md)). Knows only a user id, and of an address only the masked form and the digest it is handed ([ADR 0013](../architecture/decisions/0013-identity-modules.md)) |
| `lookups` | L0 | `governorates`, `areas`, `amenities` | public, admin | The bilingual lookup lists |
| `platform-settings` | L0 | `settings` | public, admin | The typed key catalogue (§9) |
| `space-settings` | L0 | `space_settings` | manage | A space's settings (§9) |
| `users` | L1 | `users` | me, admin | Identity, hashing and verifying credentials, the temporary password and the forced change, suspension, the role ([ADR 0013](../architecture/decisions/0013-identity-modules.md)) |
| `spaces` | L1 | `spaces`, `space_hours`, `space_shifts`, `space_prices`, `space_contacts`, `space_photos`, `space_amenities` | manage, admin | The profile, hours, shifts, published prices, contacts, photos, amenities and freshness; hiding and soft delete; the pure cut-off time for auto check-out |
| `space-links` | L2 | `space_managers` | me, manage, admin | The user's spaces and their role at each; staff (reception accounts); linking owners; the admin's spaces with their owners, and owners with their spaces (§9); the links loader for the space middleware (§8) |
| `customers` | L2 | `customers` | manage | Create, edit, archive; search and pagination over given ids (§9) |
| `packages` | L2 | `packages` | manage | The owner's subscription templates |
| `announcements` | L2 | `announcements` | manage | Announcements, including closure notices |
| `favorites` | L2 | `favorites` | me | A user's saved spaces (§9) |
| `auth` | L3 | — | public | The sign-in flows, as orchestrator: register, sign in with a password or with Google, refresh, sign out, forgot and reset password ([ADR 0013](../architecture/decisions/0013-identity-modules.md)) |
| `data-reports` | L3 | `data_reports` | me, manage, admin | Reports about a space's information (§9) |
| `visits` | L3 | `visits` | manage | The pure visit charge; auto check-out of its own visits |
| `subscriptions` | L3 | `subscriptions`, `check_ins`, `closure_extensions`, `subscription_extensions` | manage | Subscriptions, their check-ins and closure extensions; the pure progress and status; auto check-out of its own check-ins |
| `payments` | L4 | `payments` | manage | The ledger ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)); the pure balance; debt; uncollected visits (§9) |
| `occupancy` | L4 | `space_occupancy` | public, manage | The space's state now (§9) |
| `desk` | L5 | — | manage | The front desk's orchestrations and the customers list and file (§9) |
| `directory` | L5 | — | public | The public directory and profile, and the favourites' cards (§9) |
| `finance` | L5 | — (reads) | manage | Read model: finance and statistics, including the occupancy statistics |
| `overview` | L5 | — | manage, admin | Read composition for the two overview screens (§9) |
| `audit` | L5 | — (reads the audit table) | manage, admin | The audit reader (§6) |

## 8. Module rules

- **R1 — Ownership.** A module is one capability and owns its tables; only it writes them.
- **R2 — One public entry.** A module's `index.ts` exports its service factory, its routers and its public types, and what the composition root and the seed must wire from it: its controller factories, the adapters of the ports it owns (`auth`'s email senders and Google identity), its HTTP helpers (`sessions`' cookies) and, for the seed, `users`' `hashPassword`. It exports nothing else, never a repository or a mapper, and nothing imports past it.
- **R3 — Levels.** The module graph is acyclic: a module imports only lower levels (§7), never a module at its own level.
- **R4 — Direct calls, orchestrators above.** Calling a lower module's public API is the default. An operation that spans modules belongs to the module above them, which orchestrates it and owns its transaction.
- **R5 — Ports, rarely.** A port is an abstraction wired in the composition root. It is allowed only for:
  - external infrastructure: storage, email, Google's identity (sign-in), the clock, the scheduler;
  - a genuine upward need that moving the logic or passing a parameter cannot solve.

  The port lives in the module that needs it, never in `shared/`.
- **R6 — The platform knows no domain.** `shared/` holds only errors, http, validation, auth (the access-token codec, the route guards and the pure `can()` table), the audit writer, jobs, storage and the rate limiter.
- **R7 — Read models read, never write.** Read models may read other modules' tables with aggregate queries: `finance`, `overview` and the `audit` reader. They never write.
- **R8 — Testing**, in the lanes of [testing.md](../development/testing.md):
  - **Service logic** is unit-tested with plain-object fakes of the dependencies' public types. TypeScript is structural, so no interface files are written for this.
  - **Every endpoint and every orchestrator** is proven by API integration tests on the real database.

### Transactions

- `runInTransaction` lives in `db/`, next to the Prisma client, and is the one way to open a transaction. The orchestrator's service receives it by injection, like any dependency.
- The orchestrator opens the transaction and passes `tx` to each lower module's service it calls. Repository functions accept an optional `tx` and use it when it is given.
- A module called inside an orchestrator's transaction never opens its own.
- Inside an interactive transaction, write one statement at a time, never a nested create ([finding 11](../architecture/findings.md#11-nested-writes-in-an-interactive-transaction-trigger-a-pg-deprecation-warning)); before `pg`'s major version is upgraded, its guard, `createWithoutNestedWrites.api.test.ts`, is checked.

### Space access

- `requireSpaceAccess` (`shared/auth`) takes a links loader. The composition root wires it with `space-links`' service and mounts it **once** on `/manage/spaces/:spaceId`, before every module's `manage` router.
- It refuses a caller with no active link at the space. Otherwise it puts the space's links on the request: the `SpaceResource` from which `can()` reads the caller's role and whether the space is verified.
- On the admin's space routes, the composition root mounts the same loader without the refusal, so "verified" is known there too.
- Modules read the links from the request and pass them to their service. **No module imports `space-links` to learn its access or "verified".** `can()` decides per action.

### Pure rules

Each pure domain rule is a pure file in its owning module, computed nowhere else:
- the visit charge in `visits`;
- subscription progress and status in `subscriptions`;
- the balance in `payments`;
- the live status in `occupancy`;
- the auto check-out cut-off time in `spaces`.

The rules themselves are owned by [data-model.md](../architecture/data-model.md#derived-values-computed-not-stored).

### Growth

When a module's service grows, it becomes a folder inside the module, with one file per use case. It never spills into a new module.

## 9. Placements

How the rules of §7–§8 place the capabilities that are easy to misplace.

### Settings: three screens, three owners
- **Personal settings** → `users`, plus `sessions` for signing out everywhere. The theme lives only in the browser.
- **Space settings** → `space-settings`.
- **Platform settings** → `platform-settings`:
  - the key-value `Setting` table, with one typed key catalogue;
  - an admin router and a public router (the public contact);
  - values only, no rules. The module that consumes a value applies it.

### New-space defaults
- `platform-settings` holds the defaults for a new space:
  - auto check-out at closing;
  - the visit rounding rule and its minutes;
  - the cap at the day price.
- They are **copied** into a space's settings when the space is created. `spaces` does this in the same transaction, reading `platform-settings` and writing through `space-settings`, both below it.
- Changing a default never affects existing spaces.

### `space-settings`
It owns the 1:1 `space_settings` table, which takes over from `Space`:
- `autoCheckoutAtClosing`, `maxStayMinutes`;
- `visitRounding`, `visitRoundingMinutes`, `visitCapAtDayPrice`, `visitStudentPrices`;
- `reminderTemplate`.

The modules that apply them read them: visits and subscriptions (auto check-out), visits (the charge), finance (the reminder).

### `occupancy`: the space's state now
- **It owns:**
  - the single definition of *present* (open visits plus open subscription check-ins), the count, and the one list of who is present;
  - capacity and the manual override, in the 1:1 `space_occupancy` table. A space without a row has no capacity and no override. `occupancy` creates the row on its first write, so no lower module ever does;
  - the pure live-status rule;
  - `liveStatusFor(spaceIds)`, set-based, so the directory has no N+1.
- **It does not own:**
  - the occupancy statistics (peak hours, average stay), which are `finance`'s (R7);
  - auto check-out. `visits` and `subscriptions` each close their own records. The cut-off time is a pure function in `spaces`, and the timer is `shared/jobs`, wired in the composition root;
  - override expiry and staleness, which are derived at read time. No job runs for them.

### `data-reports`
- One module with three routers: `me` (the reporter's own, and creating one), `manage` and `admin`.
- Who may resolve a report comes from `can()`, with "verified" as an input.
- Resolving a report never edits the space. The design's "Edit the field" button is navigation only.

### `overview`
- One read-composition module, one file per screen (owner, admin), and one aggregate endpoint per screen because the users' connection is weak.
- **No logic:** every figure comes from its owning module.
- **It never imports `finance`:** the figures both show come from `payments`.
- Figures are fetched in parallel.

### The front desk: `desk`
`desk` orchestrates the operations that span the desk's modules, each in one transaction:
- **check-in** of a visit or a subscription, with the full-space warning from `occupancy`;
- **check-out of a visit** with its charge and its payment;
- **subscribing or renewing** with its payment, and the warning when the customer has a balance.

### Composed reads
A screen that shows or filters by values from several modules is composed by a module above all of them.
- **Set-based APIs, no duplicated rules.**
  - Subscription status is computed only by `subscriptions`, and the balance and debt only by `payments`.
  - Each offers a set-based API for many customers at once: no per-customer calls, no N+1.
  - `desk`, `finance` (debtors) and `overview` (total owed) all use the same APIs. None of them computes a status or a balance.
- **The customers list and the customer file** → `desk`.
  - The status and payment filters resolve to customer ids first, from `subscriptions` and `payments`.
  - `customers` then applies the search and the pagination to those ids (§5).
  - The file adds each subscription's progress, the payments, the balance and the attendance.
- **The admin's spaces list** (owners and verified status) and **the space owners list** → `space-links`.
  - The verified filter resolves to space ids in `space-links` first.
  - `spaces` then applies the hidden, stale and search filters and the pagination to those ids (§5).
- **"Verified" on the write side.**
  - The admin edits a space's facts only while it is unverified, and data reports follow the same rule.
  - `spaces` never imports `space-links` for this. The space middleware resolves the links on the space routes (§8), and `can()` decides.
  - `data-reports` sits above `space-links` and may call it directly for a report's space.
- **Uncollected visits** (closed by the auto check-out and left unpaid) → `payments`, which owns the balance.
- **The favourites' cards** (live status and prices) → `directory`, from the ids that `favorites` records. `favorites` never reads live status.

## 10. Logging

Built: the redaction, the request id, the levels, and the user and their role on a signed-in request. The space joins the fields with the first space route.

**The request's line is best effort online.** pino-http writes it when the response finishes, after the answer. The logger writes it to stdout synchronously, so it leaves the process at once, but a function frozen in that instant can still lose it ([§12](#12-environments)).

- **Redaction** is owned by [security.md](security.md#http-hardening): what the HTTP logger never writes.
- **The request id.** Every request gets a UUID, generated by the server. It is written in the request's log lines, returned in the `X-Request-Id` response header and in the error envelope ([api-contract §2](../api/api-contract.md#2-response-envelope)), and the web shows it in its error states, so a user's report can be matched to the log.
- **Fields** of every request log: the request id, the user, their role, the space (on space routes), the route, the status and the duration.
- **Levels:** a 4xx response is logged at `warn`, a 5xx at `error`.

## 11. Time

Masaha runs on Gaza time (`Asia/Gaza`). Built: the clock (below), wired since F-5a. The rest is not built yet: each rule applies from the first slice that reads Gaza time.

- **The library.** Gaza time is computed with `@date-fns/tz` and `date-fns`. Both are already in the lockfile through `react-day-picker`. The first slice that needs them adds them as direct dependencies of `apps/api` and `packages/shared`.
- **The calendar rules are shared.** "Today" in Gaza and the week (Saturday to Friday) are pure functions in `packages/shared`, so the web and the API agree. They take the time as a parameter and never read the clock. They are calendar rules, not one module's domain rule (§8).
- **Date-only columns** (a subscription's start and end) hold Gaza dates and are never converted to or from another zone.
- **The clock is a port** (R5), injected where the application is assembled. A rule never calls `new Date()`: it receives the time. `createApi` takes one clock and hands it to every rule that reads the time: the sessions' expiries and grace window, and the rate limits. A rate-limit window is computed from that clock, never from the database's `now()`, so a window and its `Retry-After` come from one source.
- **Daylight saving.** Palestine's daylight-saving dates change by decree, so the time-zone data can lag behind. This is a known risk, mitigated by keeping Node updated, and by a unit test that pins one known Gaza transition, so outdated data fails the tests.

## 12. Environments

The application runs in two environments: a long-running server locally, and a function on Vercel online ([ADR 0014](../architecture/decisions/0014-deployment.md)).

- **One composition root.** The same `app.ts` assembles the application in both. Only a thin entry differs, and it calls `createAppFromEnv`, the one mapping from the validated environment to the ports (the email mode, Google, the cookies, the trusted proxies). No module, rule or path changes between them.
- **The ports take a different implementation per environment.** Nothing else does.

  | Port | Locally | Online |
  |---|---|---|
  | Storage | local disk | free object storage |
  | Google identity | Google's published keys, when `GOOGLE_CLIENT_ID` is set | the same. Tests inject a fake |
  | Email | `log`: nothing is sent, and the link is written to the log (development only) | `smtp`: a single Gmail sender, through any SMTP relay ([security.md](security.md#passwords)) |
  | Scheduler | an in-process timer started by `server.ts` | an internal, secret-protected endpoint that an external cron calls every few minutes. The slice that builds it adds its path to the API contract |
  | Clock | the system clock | the system clock. Tests inject a fixed one (§11) |
- **No work runs after a response is sent**, in either environment. A function may be frozen as soon as it answers, so whatever a request must do is done before it responds. The one exception is the request's log line, written as the response finishes, synchronously and best effort (§10).
- **Timed work tolerates a late run.** An auto check-out records the cut-off time it was due at, never the time the job ran.
- **Rate limits** are stored in PostgreSQL, so every instance shares them ([security.md](security.md#rate-limits-fixed-window)).

## 13. Idempotency and concurrency

Why: [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md).

**Two ids, never confused.** The **idempotency key** is the client's: one per user action, the same on every retry of that action, sent in the `Idempotency-Key` header and stored with the record it creates. The **request id** is the server's: a new one for every HTTP request, retries included, used only for tracing (§10). A record never stores the request id as its idempotency key, or every retry would look new.

### Idempotency
- **Creates at the front desk** store the idempotency key, unique within the space. Today payments, visits and check-ins have it, in the Prisma field `idempotencyKey`, stored in the `request_id` column ([data-model.md](../architecture/data-model.md#conventions)).
  - Subscriptions and customers have none yet. The slice that builds them adds it ([plan, step 8](../plans/v1-mvp.md#sequence-inside-the-build)).
- **A retry returns the first result**, with the same status and body, never a conflict. The unique violation on the key is caught by the service, which returns the record that already exists. The general `P2002` → `NOT_UNIQUE` mapping (§4) never answers a retry.
- **Updates and deletes are idempotent by design.** A repeated check-out returns the closed record, and a repeated void returns the voided payment.
- **There is no generic store of responses.**

### Concurrency
- **Isolation stays at PostgreSQL's default, read committed.** The database's constraints and row locks are the guarantee.
- **Rows are locked in one fixed order:** oldest first, then by id. One amount spread over several items ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)) locks and pays them in that order, so it cannot deadlock.
- **The session lock.** Every transaction that writes a user's refresh tokens first locks that user's row (`FOR NO KEY UPDATE`, through `users`, which owns the row). Signing in, registering, Google sign-in, refresh, logout, a password change, a reset and a suspension's revocation all take it, so a new session and a revocation never interleave: whichever commits second sees the first.
  - **The order** is the user's row, then their tokens. A reset reads its recovery's owner first, without a lock, so it too takes the user's row before any token. Checking a reset link does the same before it binds the link to a recovery, so a password change that ends the link meanwhile is seen.
  - **bcrypt stays outside every transaction.** A sign-in compares the password first, then re-reads the hash under the lock and opens the session only if it is still the one that matched.
  - **A password change is a compare-and-set:** it writes only if the account still has the password and the pending flag it checked, so it never overwrites a reset that landed meanwhile.
  - API tests hold the row in a test transaction while each of these runs.

### The ledger's rules
- **The database owns the three payment rules its triggers enforce:** append-only, voided once, and never above the amount due ([data-model.md](../architecture/data-model.md#constraints-worth-stating)). The last one locks the item's row, so concurrent payments are counted one after the other.
- **Services do not repeat these rules.** They write, and the error handler translates a violation through the constraint table (§4). Who may void a payment is not a ledger rule: it stays with `can()`.
- **Each trigger is reached by an API integration test**, which checks the code the endpoint returns ([testing.md](../development/testing.md)).
