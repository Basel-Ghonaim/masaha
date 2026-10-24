# Backend Conventions

> **Status:** Active · **Class:** Contract — rules to build against. **Built:** the shared errors, http and validation code, with `parseId`; `shared/auth` (the access tokens, `requireAuth`, `requireRole`, `signedIn`, `can()`, and the links loader without the refusal, `loadSpaceLinks`, on the admin's space routes; `requireSpaceAccess` on `/manage/spaces/:spaceId`; `requireCan`); the audit writer (§6); the rate limiter; the level rule (§7), enforced by lint; `runInTransaction` in `db/`; the modules `sessions`, and `platform-settings` minimally (the new-space defaults and the staleness thresholds), and the first reads of `visits`, `subscriptions` and `customers`, which `occupancy` composes; `announcements` (posting, editing, ending, starting, deleting; the closures `occupancy` reads; the public ones, 2026-10-24, #112), beside the capabilities documented in [`docs/features/`](../README.md#features--one-document-per-capability); the logging of §10; the clock and the timer of §11; of §12, the composition root, the email port, the Google identity port, the storage port with its two adapters and the rate limits in PostgreSQL; of §13, the idempotency key's name, the session lock and the space's lock; Gaza time (§11); the idempotent creates of the desk (a visit's check-in, and its payment at its check-out or after it, §13), and a customer's; the composed customers list and file (§9); the ledger's translation table (§4, §13); the scheduler port (§12), with the auto check-out of `visits` and `subscriptions`. **Not yet built:** `optionalAuth` (§7); the audit reader (§6); every other module · **Last Updated:** 2026-10-24 · **Owner:** Basel Ghoneim
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
    <port>/                      a port only this module needs, and its adapters, e.g. auth's
                                 email/ (R5)
  shared/              the platform (R6): knows no domain concept
    errors/            AppError + factories, error handler
    http/              sendSuccess, pagination helpers
    validation/        validate(schema, source) middleware, parseId (user text is normalised by
                       the shared schemas, in packages/shared, §3)
    auth/              the access-token codec, requireAuth, optionalAuth, requireRole,
                       requireSpaceAccess and requireCan (§8), can(), signedIn (the claims a
                       guard set)
    audit/             the audit writer (§6)
    jobs/              the scheduler that runs the modules' timed work: an in-process timer
                       locally, an internal endpoint called by an external cron online (§12)
    storage/           the storage port, bytes by key, and its adapters: the local disk locally,
                       Cloudinary online (§12)
    rate-limit/        the fixed-window counters in PostgreSQL and the limiter over them (§12)
```

Only what exists is created: no empty module folders, and a layer a module does not need is absent.

## 2. Layers

Inside a module, each layer calls only the one below it.

| Layer | Owns | Never |
|---|---|---|
| **Routes** | The per-endpoint chain: auth guard → role or space guard (`requireRole`, `requireSpaceAccess`) → permission guard (`requireCan`) → rate limiter → `validate(schema)` or the file reader → controller; a route with no signed-in caller starts at its limiter, and the general limit runs before every route. A guard refuses before anything of the request's body is read. A limit counted on every request sits here; a limit that counts only failures, or counts by what only the service knows (the user behind a cookie, the account of an email), is applied by the service, where the outcome is decided | Logic |
| **Controller** | HTTP only: read validated input, call the service, respond with `sendSuccess`, set cookies | Business rules, Prisma |
| **Service** | Business rules, permission checks via `can()`, mapping to DTOs, audit entries (§6), calls to lower modules' services, transactions when it orchestrates (§8) | Importing Prisma or Express |
| **Repository** | Prisma queries on the module's own tables only; applies soft-delete filters by default; each function accepts an optional `tx` (§8) | Rules |

**Dependency injection** by factory functions. The composition root passes a service only its real dependencies: the transaction runner, the audit writer, lower modules' services and ports (R5), as in `createService({ runInTransaction, audit, …lower modules' services })`. A service creates its own repository: no parameter exists only for tests ([testing §3](../development/testing.md#3-rules-that-bind-every-test), rule 2). The older services (`users`, `sessions`, `space-links`, and `lookups`' area names) still take a repository, and follow in the planned refactor.

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
- **Database rules become domain codes.** One translation table in `shared/errors` maps a database constraint's name to a domain error code, for example `payments_within_due` → `PAYMENT_EXCEEDS_DUE`, the way `P2002` becomes `NOT_UNIQUE`; the error handler applies it to a check violation, whose constraint `db`'s `checkViolationOf` reads from the database's message. Built with the ledger's two lines, `payments_within_due` and `payments_visit_uncharged` (2026-10-20, #95). The text comes from the copy catalogues. The ledger rules it serves are in §13.
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
  - spaces created, hidden, unhidden, soft-deleted and restored;
  - lookup changes: a governorate, area or amenity added, edited, hidden or restored;
  - data reports resolved or dismissed;
  - customer create, edit and archive; subscriptions created, corrected and ended;
  - a space's packages created and edited, a retirement included;
  - announcements created, edited, started, ended and deleted (2026-10-24, #112);
  - check-in and check-out, for visits and subscriptions;
  - payments recorded and voided ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md));
  - space links: linking owners, adding, deactivating and re-activating staff;
  - role changes, suspensions and temporary passwords ([security.md](security.md#passwords));
  - a person's email corrected at the forced change;
  - settings changes, for spaces and the platform, and a space's capacity.
- **Reading is a module**, `audit` (L5, §7). It owns no table and has a `manage` and an `admin` router.
- **Privacy is a default-deny allowlist.** The admin sees only the platform event types on the audit module's list, never an entry about a space's customers, visits, subscriptions or payments ([ADR 0002](../architecture/decisions/0002-authorization-model.md), [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)). An event type not on the list stays hidden from the admin. The owner sees their space's entries.
- The owner's audit screen is in v1 scope ([overview.md](../project/overview.md)) but has no design yet ([finding 14](../architecture/findings/14-the-owners-audit-screen-has-no-design.md)).

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
| [`lookups`](../features/lookups.md) | L0 | `governorates`, `areas`, `amenities` | public, admin | The bilingual lookup lists |
| `platform-settings` | L0 | `settings` | public, admin | The typed key catalogue (§9) |
| `space-settings` | L0 | `space_settings` | manage | A space's settings (§9) |
| [`users`](../features/users.md) | L1 | `users` | me, admin | Identity, hashing and verifying credentials, the temporary password and the forced change, suspension, the role ([ADR 0013](../architecture/decisions/0013-identity-modules.md)) |
| [`spaces`](../features/spaces.md) | L1 | `spaces`, `space_hours`, `space_shifts`, `space_prices`, `space_contacts`, `space_photos`, `space_amenities`, `space_own_amenities` | manage, admin | The profile, hours, shifts, published prices, contacts, photos, amenities (the platform's and its own) and freshness; hiding and soft delete; the pure cut-off time for auto check-out |
| [`space-links`](../features/space-links.md) | L2 | `space_managers` | me, manage, admin | The user's spaces and their role at each; staff (reception accounts); linking owners; the admin's spaces with their owners, and owners with their spaces (§9); the links loader for the space middleware (§8) |
| `customers` | L2 | `customers` | manage | Create, edit, archive; search and pagination over given ids (§9) |
| [`packages`](../features/packages.md) | L2 | `packages` | manage | The owner's subscription templates |
| [`announcements`](../features/announcements.md) | L2 | `announcements` | manage | Announcements, including closure notices; their key; the public ones |
| `favorites` | L2 | `favorites` | me | A user's saved spaces (§9) |
| [`auth`](../features/auth.md) | L3 | — | public | The sign-in flows, as orchestrator: register, sign in with a password or with Google, refresh, sign out, forgot and reset password ([ADR 0013](../architecture/decisions/0013-identity-modules.md)) |
| `data-reports` | L3 | `data_reports` | me, manage, admin | Reports about a space's information (§9) |
| `visits` | L3 | `visits` | manage | The pure visit charge; auto check-out of its own visits |
| `subscriptions` | L3 | `subscriptions`, `check_ins`, `closure_extensions`, `subscription_extensions` | manage | Subscriptions, their check-ins and closure extensions; the managed announcements list with each closure's extension, and its summary (§9); the pure progress and status; auto check-out of its own check-ins |
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
  - external infrastructure: storage, email, Google's identity (sign-in), the clock and the timer, the scheduler;
  - a genuine upward need that moving the logic or passing a parameter cannot solve.

  A port only one module needs lives in that module (`auth`'s email and Google identity); a platform port that knows no domain lives in `shared/` (storage, the scheduler). Either is wired in the composition root.
- **R6 — The platform knows no domain.** `shared/` holds only errors, http, validation, auth (the access-token codec, the route guards and the pure `can()` table), the audit writer, jobs, storage and the rate limiter.
- **R7 — Read models read, never write.** Read models may read other modules' tables with aggregate queries: `finance`, `overview` and the `audit` reader. They never write.
- **R8 — Testing**, in the lanes of [testing.md](../development/testing.md):
  - **Logic worth unit-testing** lives in pure helpers, unit-tested on their own.
  - **Every service, endpoint and orchestrator** is proven by API integration tests on the real database.

### Transactions

- `runInTransaction` lives in `db/`, next to the Prisma client, and is the one way to open a transaction. The orchestrator's service receives it by injection, like any dependency.
- The orchestrator opens the transaction and passes `tx` to each lower module's service it calls. Repository functions accept an optional `tx` and use it when it is given.
- A module called inside an orchestrator's transaction never opens its own.
- Inside an interactive transaction, write one statement at a time, never a nested create ([finding 11](../architecture/findings/11-nested-writes-in-an-interactive-transaction-trigger-a-pg-deprecation-warning.md)); before `pg`'s major version is upgraded, its guard, `createWithoutNestedWrites.api.test.ts`, is checked.

### Space access

- `requireSpaceAccess` (`shared/auth`) takes a links loader. The composition root wires it with `space-links`' service and mounts it **once** on `/manage/spaces/:spaceId`, before every module's `manage` router.
- It refuses whom `can()` refuses `space.read` at the space, as [security › Authorization](security.md#authorization) says, and otherwise puts the space's links on the request: the `SpaceResource` from which `can()` reads the caller's role and whether the space is verified.
- On the admin's space routes, the composition root mounts the same loader without the refusal, so "verified" is known there too.
- **A change that decides under the space's lock reads the links again there,** through the loaded space's `linksUnder(tx)`: every link change takes that lock (§13), so a link committed after the loader ran still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)).
- Modules read the links from the request and pass them to their service. **No module imports `space-links` to learn its access or "verified".** `can()` decides per action.
- **`requireCan(action)`** (`shared/auth`) asks `can()` for one action at the route, from the links on the request, where a refusal must come before the request's body is read ([security › Authorization](security.md#authorization)); the service's own `can()`, under the space's lock, still decides.

### Pure rules

Each pure domain rule is a pure file in its owning module, computed nowhere else:
- the visit charge in `visits`;
- subscription progress and status in `subscriptions`, on the attendance and amount due its database function `subscription_usage` counts, the one place they are computed (2026-10-21, #102);
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
  - the key-value `Setting` table, with one typed key catalogue: today the new-space defaults and the two staleness thresholds. The seed writes the platform's contact keys outside it ([finding 40](../architecture/findings/40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md));
  - an admin router and a public router (the public contact);
  - values only, no rules. The module that consumes a value applies it.

### New-space defaults
- `platform-settings` holds the defaults for a new space:
  - auto check-out at closing;
  - the visit rounding rule and its minutes;
  - the cap at the day price.
- They are **copied** into a space's settings when the space is created, in the same transaction ([spaces › How it composes the platform](../features/spaces.md#how-it-composes-the-platform)).
- Changing a default never affects existing spaces.

### `space-settings`
It owns the 1:1 `space_settings` table, which takes over from `Space` ([data-model › Spaces](../architecture/data-model.md#spaces); the schema owns the fields).

The modules that apply them read them: visits and subscriptions (auto check-out; whether reception may type a price by hand), visits (the charge), finance (the reminder).

### `occupancy`: the space's state now
- **It owns:**
  - the single definition of *present* (open visits plus open subscription check-ins), the count, and the one list of who is present, written once in `present.ts` and used by the staff's read, the check-ins' warnings and refusal, the archive's refusal, the customer's file and the directory (2026-10-22, #109);
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
- **check-in** of a visit or a subscription, with the full-space warning from `occupancy`, and its closure warning, from the closures `announcements` reads (2026-10-24, #112); a subscriber's names the subscription, is refused while the customer is archived or present (`occupancy`'s *present*), and adds the subscription's warnings (`subscriptions`' `limitWarnings`, pure on the function's counts; a retry's leave the check-in itself out) (2026-10-22, #109);
- **check-out of a subscriber**: the check-in's row locked after the space's, closed `MANUAL`, answered with the subscription's balance from `payments` (2026-10-22, #109);
- **check-out of a visit** with its charge and its payment;
- **a visit's payment after its check-out**, its unpaid rest left to a customer by the same rule as the check-out's, and **its debt left to a customer by phone** («تسجيل دينًا»);
- **the write-off of a visit's unpaid rest** by the owner, and its undo;
- **the void of a payment** by the owner, under the space's lock, then the payment's row (`FOR UPDATE`); a second void is answered as it is (2026-10-24, #114);
- **subscribing or renewing**: the terms from a package or typed, the renewal's start proposed by `subscriptions` (`proposedStart`), and an optional amount `payments` allocates (`allocate`, pure) over the customer's debts, oldest first, one payment each under a key derived from the request's; the warning when an older debt remains (2026-10-22, #106).

### Composed reads
A screen that shows or filters by values from several modules is composed by a module above all of them.
- **Set-based APIs, no duplicated rules.**
  - Subscription status is computed only by `subscriptions`, and the balance and debt only by `payments`.
  - Each offers a set-based API for many customers at once: no per-customer calls, no N+1.
  - `desk`, `finance` (debtors) and `overview` (total owed) all use the same APIs. None of them computes a status or a balance.
  - **The balances are one aggregate query in `payments`** (the owner's decision 6): it reads `visits`' closed visits and a subscription's due through its owner's function `subscription_usage`, and writes neither — the one place a module other than a composing one reads other modules' tables (R7's exception, stated). The same subtraction as `balance.ts`, applied in SQL. 2026-10-21, #102.
- **The customers list and the customer file** → `desk`.
  - The status and payment filters resolve to customer ids first, from `subscriptions` and `payments`; a filter for none (`kind=NONE`, `payment=SETTLED`) resolves to the ids to leave out.
  - `customers` then applies the search and the pagination to those ids (§5), each list one array parameter read as a set, so no list meets PostgreSQL's bound on parameters. 2026-10-21, #102.
  - The file adds each subscription's progress, the payments, the balance and the attendance.
- **The managed announcements list and its summary** → `subscriptions` (`closures`), the lowest module above `announcements` that owns a closure's extension: `announcements` pages one state and counts them, and `subscriptions` adds each closure's extension, how many it moved and who applied it, and counts the started closures with none. The writes stay `announcements`'. The owner's overview will read `closures.summary`. 2026-10-24, #112.
- **The admin's spaces list** (owners and verified status) and **the space owners list** → `space-links` ([how the list is composed](../features/space-links.md#how-it-composes-the-platform)).
- **"Verified" on the write side** ([security › Authorization](security.md#authorization)).
  - `spaces` never imports `space-links` for it. The space middleware resolves the links on the space routes (§8), and `can()` decides.
  - `data-reports` sits above `space-links` and may call it directly for a report's space.
- **Uncollected visits** (closed by the auto check-out and left unpaid) → `payments`, which owns the balance: it pages them in one query over the visits and their payments, the settled ones left out by the balance's subtraction, newest closed first (§5), and `visits` answers the page's visits (2026-10-20, #97; one query since 2026-10-21, #102, finding 113).
- **The public directory** (the list, the map's pins and a space's page) → `directory` ([how it composes them](../features/directory.md#how-it-composes-the-platform)). The listed areas and the areas a search matches resolve to ids first, from `lookups`, and the verified spaces from `space-links`; `spaces` then filters, searches, orders and pages.
- **The favourites' cards** (live status and prices) → `directory`, from the ids that `favorites` records. `favorites` never reads live status.

## 10. Logging

Built: the redaction, the request id, the levels, the user and their role on a signed-in request, and the space on the routes that load its links.

**The request's line is best effort online.** pino-http writes it when the response finishes, after the answer. The logger writes it to stdout synchronously, so it leaves the process at once, but a function frozen in that instant can still lose it ([§12](#12-environments)).

- **Redaction** is owned by [security.md](security.md#http-hardening): what the HTTP logger never writes.
- **The request id.** Every request gets a UUID, generated by the server. It is written in the request's log lines, returned in the `X-Request-Id` response header and in the error envelope ([api-contract §2](../api/api-contract.md#2-response-envelope)), and the web shows it with a refusal that has no domain code ([frontend architecture §5](../frontend/architecture.md#5-errors)), so a user's report can be matched to the log.
- **Fields** of every request log: the request id, the user, their role, the space (on space routes), the route, the status and the duration.
- **Levels:** a 4xx response is logged at `warn`, a 5xx at `error`.

## 11. Time

Masaha runs on Gaza time (`Asia/Gaza`). Built: the clock (below), wired since F-5a, the timer, and Gaza time (2026-10-19, #94).

- **The library.** Gaza time is computed with `@date-fns/tz` alone, a direct dependency of `apps/api` and `packages/shared`; `date-fns` itself is not needed.
- **The calendar rules are shared.** "Today" in Gaza and the week (Saturday to Friday) are pure functions in `packages/shared` (`core/gazaTime.ts`: an instant's Gaza date, weekday and minute, and a Gaza date's minute as an instant), so the web and the API agree. They take the time as a parameter and never read the clock. They are calendar rules, not one module's domain rule (§8).
- **Date-only columns** (a subscription's start and end) hold Gaza dates and are never converted to or from another zone.
- **The clock is a port** (R5), injected where the application is assembled. A rule never calls `new Date()`: it receives the time. `createApi` takes one clock and hands it to every rule that reads the time: the sessions' expiries and grace window, and the rate limits. A rate-limit window is computed from that clock, never from the database's `now()`, so a window and its `Retry-After` come from one source. **The timer** is its sibling port: `createApi` takes one `wait` and hands it to every rule that waits (today the forgotten password's answer that sends no email, [security › Passwords](security.md#passwords)); tests inject one that waits no real time.
- **Daylight saving.** Palestine's daylight-saving dates change by decree, so the time-zone data can lag behind. This is a known risk, mitigated by keeping Node updated, and by a unit test that pins one known Gaza transition, so outdated data fails the tests.

## 12. Environments

The application runs in two environments: a long-running server locally, and a function on Vercel online ([ADR 0014](../architecture/decisions/0014-deployment.md)).

- **One composition root.** The same `app.ts` assembles the application in both. Only a thin entry differs, and it calls `createAppFromEnv`, the one mapping from the validated environment to the ports (the email mode, the storage, Google, the cookies, the trusted proxies). No module, rule or path changes between them.
- **The ports take a different implementation per environment.** Nothing else does.

  | Port | Locally | Online |
  |---|---|---|
  | Storage | the local disk under `apps/api/.storage/`, its files served by the API itself at `/api/v1/files/…`, so they reach the web through its proxy at one origin | Cloudinary's free plan, as a plain store: files uploaded as they are and delivered as they were, with no transformation, under a folder per environment (`masaha/<NODE_ENV>/`). Production refuses the local disk. Tests pass the local disk in a temporary folder |
  | Google identity | Google's published keys, when `GOOGLE_CLIENT_ID` is set | the same. Tests inject a fake |
  | Email | `log`: nothing is sent, and the link is written to the log (development only) | `smtp`: through an SMTP relay ([security.md](security.md#passwords)) |
  | Scheduler | an in-process timer started by `server.ts`: the same jobs every 5 minutes, the first 10 s after start | `POST /api/v1/internal/jobs/run`, behind `JOBS_SECRET` ([api-contract › Internal](../api/api-contract.md#internal)), which an external cron calls every 5 minutes |
  | Clock | the system clock | the system clock. Tests inject a fixed one (§11) |
  | Timer | `setTimeout` | the same. Tests inject one that records and waits no real time (§11) |
- **The storage port is bytes by key** (`shared/storage`): a key's extension names its type, and a URL is built from the key at read time, never stored. A new kind of file is a new consumer of the port, with its own content check; a new provider is a new adapter behind the same port.
- **No work runs after a response is sent**, in either environment. A function may be frozen as soon as it answers, so whatever a request must do is done before it responds. The one exception is the request's log line, written as the response finishes, synchronously and best effort (§10).
- **Timed work tolerates a late run.** An auto check-out records the cut-off time it was due at, never the time the job ran.
- **Rate limits** are stored in PostgreSQL, so every instance shares them ([security.md](security.md#rate-limits-fixed-window)).

## 13. Idempotency and concurrency

Why: [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md).

**Two ids, never confused.** The **idempotency key** is the client's: one per user action, the same on every retry of that action, sent in the `Idempotency-Key` header and stored with the record it creates. The **request id** is the server's: a new one for every HTTP request, retries included, used only for tracing (§10). A record never stores the request id as its idempotency key, or every retry would look new.

### Idempotency
- **Creates at the front desk** store the idempotency key, unique within the space. Today payments, visits, check-ins, customers, subscriptions and announcements have it, in the Prisma field `idempotencyKey`, stored in the `request_id` column ([data-model.md](../architecture/data-model.md#conventions)).
  - Customers have it since 2026-10-21, #102, optional: a customer the desk creates from an unpaid visit's phone carries none. Subscriptions have it since 2026-10-22, #106, required: every subscription is a desk create. Announcements have it since 2026-10-24, #112, required: reception posts a closure on the spot, and a retried post must not make a second closure.
- **One request, several records:** a subscribe's payments each take a key derived from the request's (`derivedKey(key, index)`, `shared/http`: the SHA-256 of `key/index` as a UUID), in the allocation's order, so the ledger's key stays one per payment and a retry finds them all in one query. 2026-10-22, #106.
- **A retry returns the first result**, with the same status and body, never a conflict. The service reads the record by its key first, under the space's lock, which serialises the space's desk creates, so the read is race-free; inside a transaction PostgreSQL aborts on a unique violation, so the record could not be read after one. The unique key stays the backstop: a violation would be a bug, answered 500. The general `P2002` → `NOT_UNIQUE` mapping (§4) never answers a retry. 2026-10-20, #95.
- **Updates and deletes are idempotent by design.** A repeated check-out returns the closed record, and a repeated void returns the voided payment.
- **There is no generic store of responses.**

### Concurrency
- **Isolation stays at PostgreSQL's default, read committed.** The database's constraints and row locks are the guarantee.
- **Rows are locked in one fixed order:** oldest first, then by id. One amount spread over several items ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)) locks and pays them in that order, so it cannot deadlock.
- **The session lock.** Every transaction that writes a user's refresh tokens first locks that user's row (`FOR NO KEY UPDATE`, through `users`, which owns the row). Signing in, registering, Google sign-in, refresh, logout, a password change, a reset and a suspension's revocation all take it, so a new session and a revocation never interleave: whichever commits second sees the first. Ending every session raises the account's session version under it too (`users`' `endSessions`, the one way to revoke them), so an access token signed meanwhile carries the version it will be judged by.
  - **The order** is the user's row, then their tokens. A reset reads its recovery's owner first, without a lock, so it too takes the user's row before any token. Checking a reset link does the same before it binds the link to a recovery, so a password change that ends the link meanwhile is seen.
  - **bcrypt stays outside every transaction,** and a password change is a compare-and-set ([security › Passwords](security.md#passwords)).
  - API tests hold the row in a test transaction while each of these runs.
- **The admin-set lock.** A change that may remove an active admin (a suspension, a role change) takes the person's session lock and every active admin's row in one statement, by id (`users`' `lockForAdminChange`), then counts the other active admins under it. Two admins acting on each other at once therefore wait for each other, and the second counts what the first committed, so the platform never loses its last active admin.
  - **The order** is those rows, by id, then the person's tokens. It takes no space's row; a link change takes the space's, then the person's, an admin's included before it refuses the link, so no two orders cross.
- **The space's lock.** Every change of a space, of its facts or of its links first locks the space's row (`FOR NO KEY UPDATE`, through `spaces`), and decides on its links as they are under it (§8, *Space access*). **A future writer of any of them takes it too.** The space's read takes it in share mode (`FOR SHARE`) and reads the space, its facts and its links under it, so it waits for a change in progress and is never half of one; reads do not wait for each other.
  - **The order** is the space's row, then the person's row (the session lock) where a link changes, then their tokens. A link change on an existing account always takes the person's row, before it counts the person's links (a new account's row is inserted under the space's lock), since only then does it know whether their role changes. A facts save takes the space's row only, and a sign-in or a refresh the user's row only, reading the links without a lock, so no two orders cross.
  - API tests hold the row in a test transaction while each of these runs.

### The ledger's rules
- **The database owns the payment rules its triggers enforce:** append-only, voided once, never above the amount due, an unpriced visit takes no payment (`payments_visit_uncharged`), and a written-off visit takes none, nor are its payments voided until the write-off is undone (2026-10-24, #114), and a fixed price never falls below what was paid on it (`subscriptions_price_below_paid`, the subscriptions' trigger, 2026-10-22, #106) ([data-model.md](../architecture/data-model.md#constraints-worth-stating)). The ceiling locks the item's row, so concurrent payments are counted one after the other.
- **Services do not repeat these rules.** They write, and the error handler translates a violation through the constraint table (§4). Who may void a payment is not a ledger rule: it stays with `can()`.
- **Each trigger is reached by an API integration test**, which checks the code the endpoint returns ([testing.md](../development/testing.md)).
