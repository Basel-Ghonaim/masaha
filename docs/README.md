# Documentation

The **map** of Masaha's documentation: every document and what it owns. It is navigation, not content. Each fact has **one owner**; everything else links to it.

## Rules for this set

- **One owner per fact.** If you would copy more than a sentence, link instead.
- **Code is the source of truth** for what the system does; documents hold intent and the *why*.
- **Claim only what is true.** Unbuilt things are never described as built; committed scope lives only in [project/overview.md](project/overview.md).
- **Documents change in the same PR as the code** that changes them ([workflow §7](development/workflow.md)).

## The map

### `project/` — what the product is
- [overview.md](project/overview.md) — what Masaha is, what is built, committed v1 scope, and *Not in v1*.
- [glossary.md](project/glossary.md) — the canonical vocabulary (English and Arabic).

### `architecture/` — how the system fits together
- [system-overview.md](architecture/system-overview.md) — the running system's parts, and one request traced from the web to the database and back; it links to each part's owner.
- [data-model.md](architecture/data-model.md) — data conventions, entities, derived values and constraints; the Prisma schema owns the fields.
- [decisions/](architecture/decisions/) — Architectural Decision Records:
  - [0001](architecture/decisions/0001-monorepo-and-stack.md) monorepo and stack
  - [0002](architecture/decisions/0002-authorization-model.md) authorization: three roles and space-scoped ownership (partly superseded by 0009)
  - [0003](architecture/decisions/0003-session-model.md) session: in-memory access token, rotating refresh cookie
  - [0004](architecture/decisions/0004-frontend-data-and-state.md) frontend data and state: TanStack Query, Axios, Zustand
  - [0005](architecture/decisions/0005-design-system-approach.md) design system: one layer, shadcn/ui and Tailwind on a tiered token structure
  - [0006](architecture/decisions/0006-localisation-approach.md) localisation: typed catalogues, language not in the URL
  - [0007](architecture/decisions/0007-soft-delete.md) soft delete for operational records
  - [0008](architecture/decisions/0008-live-status-not-counts.md) live occupancy is public as a state, never a count
  - [0009](architecture/decisions/0009-space-scoped-reception-role.md) space-scoped staff: the Reception role
  - [0010](architecture/decisions/0010-manual-payment-ledger.md) payments: a manual, append-only ledger
  - [0011](architecture/decisions/0011-one-web-app.md) one web application for the public site and the dashboard
  - [0012](architecture/decisions/0012-modular-monolith-backend.md) backend: a modular monolith with levelled modules
  - [0013](architecture/decisions/0013-identity-modules.md) identity: sessions, users and auth as three modules
  - [0014](architecture/decisions/0014-deployment.md) deployment: one origin on Vercel and Neon's free tiers, adapted to the architecture
  - [0015](architecture/decisions/0015-idempotency-and-concurrency.md) idempotency and concurrency: idempotency keys, read committed, the database owns the ledger's rules
  - [0016](architecture/decisions/0016-dashboard-urls.md) dashboard URLs: the selected space is in the URL
  - [0017](architecture/decisions/0017-recovery-session.md) the recovery session: the server holds where a password recovery stands
- [shared-package.md](architecture/shared-package.md) — `packages/shared`, the web–API contract in code: its structure by capability and its rules.
- [findings.md](architecture/findings.md) — recorded divergences from the intended design.

### `api/`
- [api-contract.md](api/api-contract.md) — conventions, envelope, error model, pagination and endpoints.

### `backend/`
- [conventions.md](backend/conventions.md) — the modules, their levels, routers and placements, the module rules; layering, validation, errors, pagination and audit.
- [security.md](backend/security.md) — tokens, passwords, cookies, authorization, rate limits, hardening.

### `frontend/`
- [architecture.md](frontend/architecture.md) — the four zones, dependency rule, capability layout, routing and role guards.
- [localisation.md](frontend/localisation.md) — languages, direction, catalogues, formatting.
- [design-system/foundation.md](frontend/design-system/foundation.md) — the design system: tokens, themes, typography, direction, components, screens.

### `design/` — the final screen designs
- [design/README.md](design/README.md) — the design archive (made in Claude Design, 2026-09-29): a screenshot of every frame and the clickable prototypes, kept as a frozen record. [SCREENS.md](design/SCREENS.md) maps the 32 screens of [foundation §13](frontend/design-system/foundation.md#13-screens-to-design-32) to it.

### `development/`
- [workflow.md](development/workflow.md) — how work is executed, including two workers in parallel.
- [engineering-principles.md](development/engineering-principles.md) — code-design rules.
- [testing.md](development/testing.md) — where each behaviour is proven.
- [setup.md](development/setup.md) — install, run, check and test locally; what CI runs.
- [`.claude/skills/`](../.claude/skills/) — runbooks for the procedures every Work Item repeats; they own no facts and link to the documents that do.

### Deferred documents

These documents are **committed but not yet written**, because what they describe does not exist yet. Each is written in the PR that meets its trigger; that is part of that PR's Definition of Done ([workflow §7](development/workflow.md#7-documentation-update-triggers)).

| Document | Written when | Holds until then |
|---|---|---|
| *Endpoints* in [api-contract.md](api/api-contract.md) | each endpoint is built | [plan: planned API surface](plans/v1-mvp.md#planned-api-surface) |

### `plans/`
- [v1-mvp.md](plans/v1-mvp.md) — the active plan: phases, sequence, risks. Plans move to `plans/historical/` when finished.
- [historical/design-system-layer.md](plans/historical/design-system-layer.md) — finished: phases 2–3, the repository scaffold and the design-system layer, as nine Work Items.
- [foundation.md](plans/foundation.md) — the application foundation: API skeleton, database, technical design and its update, the backend architecture and its follow-ups, localisation, authentication, shells and the first public deployment, as nineteen Work Items.
