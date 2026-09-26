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
- [data-model.md](architecture/data-model.md) — data conventions, derived values and constraints (entities deferred).
- [decisions/](architecture/decisions/) — Architectural Decision Records:
  - [0001](architecture/decisions/0001-monorepo-and-stack.md) monorepo and stack
  - [0002](architecture/decisions/0002-authorization-model.md) authorization: three roles and space-scoped ownership
  - [0003](architecture/decisions/0003-session-model.md) session: in-memory access token, rotating refresh cookie
  - [0004](architecture/decisions/0004-frontend-data-and-state.md) frontend data and state: TanStack Query, Axios, Zustand
  - [0005](architecture/decisions/0005-design-system-approach.md) design system: one layer, shadcn/ui and Tailwind on a tiered token structure
  - [0006](architecture/decisions/0006-localisation-approach.md) localisation: typed catalogues, language not in the URL
  - [0007](architecture/decisions/0007-soft-delete.md) soft delete for operational records
- [findings.md](architecture/findings.md) — recorded divergences from the intended design.

### `api/`
- [api-contract.md](api/api-contract.md) — conventions, envelope, error model, pagination and endpoints.

### `backend/`
- [conventions.md](backend/conventions.md) — module layering, validation, errors, pagination.
- [security.md](backend/security.md) — tokens, passwords, cookies, authorization, rate limits, hardening.

### `frontend/`
- [architecture.md](frontend/architecture.md) — the four zones, dependency rule, capability layout, routing and role guards.
- [localisation.md](frontend/localisation.md) — languages, direction, catalogues, formatting.
- [design-system/foundation.md](frontend/design-system/foundation.md) — the design system: tokens, themes, typography, direction, components, screens.

### `development/`
- [workflow.md](development/workflow.md) — how work is executed.
- [engineering-principles.md](development/engineering-principles.md) — code-design rules.
- [testing.md](development/testing.md) — where each behaviour is proven.
- [setup.md](development/setup.md) — install, run, check and test locally; what CI runs.

### Deferred documents

These documents are **committed but not yet written**, because what they describe does not exist yet. Each is written in the PR that meets its trigger; that is part of that PR's Definition of Done ([workflow §7](development/workflow.md#7-documentation-update-triggers)).

| Document | Written when | Holds until then |
|---|---|---|
| `architecture/system-overview.md` | the first request works end to end (web → API → database) | [ADR 0001](architecture/decisions/0001-monorepo-and-stack.md) (stack) |
| *Entities* in [data-model.md](architecture/data-model.md) | the Prisma schema is written | [plan: planned data model](plans/v1-mvp.md#planned-data-model) |
| *Endpoints* in [api-contract.md](api/api-contract.md) | each endpoint is built | [plan: planned API surface](plans/v1-mvp.md#planned-api-surface) |
| *Mechanism* in [localisation.md](frontend/localisation.md) | the catalogue mechanism is lifted from Quick Tweets | [ADR 0006](architecture/decisions/0006-localisation-approach.md) |

### `plans/`
- [v1-mvp.md](plans/v1-mvp.md) — the active plan: phases, sequence, risks. Plans move to `plans/historical/` when finished.
- [design-system-layer.md](plans/design-system-layer.md) — phases 2–3: repository scaffold and the design-system layer, as nine Work Items.
