# Documentation

The **map** of Masaha's documentation: every document, what it owns, and when to read it. It is navigation, not content. Each fact has **one owner**; everything else links to it. A Work Item opens a document only when its *read it when* line matches the task ([workflow › Reading before work](development/workflow.md#reading-before-work)).

## Rules for this set

Where each fact lives, what each kind of document may contain, and the classes are owned by [architecture/documentation.md](architecture/documentation.md); when a document is updated, by [workflow §7](development/workflow.md#7-documentation-update-triggers).

## The map

### `project/` — what the product is
- [overview.md](project/overview.md) — what Masaha is, what is built, committed v1 scope, and *Not in v1* · read it when your task may add or widen a feature, or comes near *Not in v1*.
- [glossary.md](project/glossary.md) — the canonical vocabulary (English and Arabic) · read it when you name a concept in code, copy or a document.

### `features/` — one document per capability
Each owns one capability's flows, decisions and code map, and links the platform sections it uses ([the rules](architecture/documentation.md#5-capability-documents)) · read it first when your task changes that capability, then only the sections it links.
- [lookups.md](features/lookups.md) — the governorates, areas and amenities: the admin's screen and the public catalogue.
- [spaces.md](features/spaces.md) — a space's profile, freshness and life on the platform, as the admin keeps it (API only).
- [space-links.md](features/space-links.md) — a user's links to spaces: the session's links, the caller's spaces, the space switcher, the admin's spaces list and the links loader.
- [users.md](features/users.md) — the account: credentials, who may sign in, the password change and the forced change, the account menu and sign-out.
- [auth.md](features/auth.md) — the sign-in flows: registration, sign-in with a password or with Google, refresh, sign-out and the forgotten password.

### `architecture/` — how the system fits together
- [system-overview.md](architecture/system-overview.md) — the running system's parts, and one request traced from the web to the database and back · read it when you need the whole picture: a first task, or one that crosses the web and the API.
- [data-model.md](architecture/data-model.md) — data conventions, entities, derived values and constraints; the Prisma schema owns the fields · read it when your task reads or writes data, changes the schema, or computes a derived value.
- [decisions/](architecture/decisions/) — Architectural Decision Records · read one when your task changes or questions what it decided; the documents link the one they apply:
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
  - [0018](architecture/decisions/0018-capability-documents.md) capability documents own each capability's application of the platform
- [documentation.md](architecture/documentation.md) — the documentation rules: one home per fact, what each kind of document owns, the classes, the capability documents' template, link integrity · read it when your task writes, moves or reviews documentation.
- [shared-package.md](architecture/shared-package.md) — `packages/shared`, the web–API contract in code: its structure by capability and its rules · read it when your task adds or changes a request, a response, or a rule both apps compute.
- [findings.md](architecture/findings.md) — recorded divergences from the intended design · at the start of every Work Item, read the open findings' titles and *Resolves when* lines, then only those that touch it ([workflow §4](development/workflow.md#4-scope-control)).

### `api/`
- [api-contract.md](api/api-contract.md) — conventions, envelope, error model, pagination and endpoints · read it when your task adds, changes or calls an endpoint, a payload or an error code.

### `backend/`
- [conventions.md](backend/conventions.md) — the modules, their levels, routers and placements, the module rules; layering, validation, errors, pagination and audit · read it when your task changes the API.
- [security.md](backend/security.md) — tokens, passwords, cookies, authorization, rate limits, hardening · read it when your task signs someone in, checks who may act, handles a password or a token, or limits a request.

### `frontend/`
- [architecture.md](frontend/architecture.md) — the four zones, dependency rule, capability layout, routing and role guards · read it when your task changes the web.
- [localisation.md](frontend/localisation.md) — languages, direction, catalogues, formatting · read it when your task adds user-facing text, or shows a date, a number or a price.
- [design-system/foundation.md](frontend/design-system/foundation.md) — the design system: tokens, themes, typography, direction, components, screens · read it when your task builds or changes UI.

### `design/` — the final screen designs
- [design/README.md](design/README.md) — the design archive (made in Claude Design, 2026-09-29): a screenshot of every frame and the clickable prototypes, kept as a frozen record. [SCREENS.md](design/SCREENS.md) maps the 32 screens of [foundation §13](frontend/design-system/foundation.md#13-screens-to-design-32) to it · read it when your task builds a screen.

### `development/`
- [workflow.md](development/workflow.md) — how work is executed, including what to read, two workers in parallel and the AI tooling · read it at the start of every Work Item.
- [engineering-principles.md](development/engineering-principles.md) — code-design rules · read it when your task changes code.
- [testing.md](development/testing.md) — where each behaviour is proven · read it when your task changes code or its tests.
- [setup.md](development/setup.md) — install, run, check and test locally; what CI runs · read it when you set up, run or check the project, or change CI.
- [`.claude/skills/`](../.claude/skills/) — runbooks for the procedures every Work Item repeats; they own no facts and link to the documents that do · used when their step comes.

### Deferred documents

These documents are **committed but not yet written**, because what they describe does not exist yet. Each is written in the PR that meets its trigger; that is part of that PR's Definition of Done ([workflow §7](development/workflow.md#7-documentation-update-triggers)).

| Document | Written when | Holds until then |
|---|---|---|
| *Endpoints* in [api-contract.md](api/api-contract.md) | each endpoint is built | [plan: planned API surface](plans/v1-mvp.md#planned-api-surface) |

### `plans/`
Read the plan your prompt names; a finished one moves to `plans/historical/` and is a record.
- [v1-mvp.md](plans/v1-mvp.md) — the active plan: phases, sequence, risks.
- [historical/design-system-layer.md](plans/historical/design-system-layer.md) — finished: phases 2–3, the repository scaffold and the design-system layer, as nine Work Items.
- [foundation.md](plans/foundation.md) — the application foundation: API skeleton, database, technical design and its update, the backend architecture and its follow-ups, localisation, authentication, shells and the first public deployment, as nineteen Work Items.
- [feature-documents.md](plans/feature-documents.md) — one document per capability under `docs/features/`, and one home for every fact: the decisions, the duplication ledger, the decisions to record and the execution steps.
