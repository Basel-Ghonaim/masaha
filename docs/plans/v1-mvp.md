# Plan — Masaha v1

> **Status:** Active · **Last Updated:** 2026-10-20 · **Owner:** Basel Ghoneim
> **Authority:** Strategy, sequence and risks for delivering v1. Scope is owned by [overview.md](../project/overview.md); work items and their contracts live in PRs (and Issues when the owner creates them).

## Timeline

The project started on 27 September 2026 and has **16 January 2027** as v1's target date, its only fixed date. Every phase before it is a target: the phases follow one another by what they produce, not by weeks.

| Phase | Output | State |
|---|---|---|
| 0. Foundation decisions | This docs set, CLAUDE.md, ADRs 0001–0007 | ✅ |
| 1. Visual direction (Claude Design) | Chosen palette, fonts, radius, density on 3 anchor screens (light/dark, RTL) — *Sea* | ✅ |
| 2. Lock tokens + scaffold repo | Token values in foundation.md; monorepo, lint, typecheck, CI — [design-system-layer.md](historical/design-system-layer.md) WI-1–2. The API and database skeleton moves alongside phase 4 | ✅ |
| 3. Design-system layer in code | Tokens, themes, pre-paint script, adapted shadcn components; synced into Claude Design — [design-system-layer.md](historical/design-system-layer.md) WI-3–9 | ✅ |
| 4. Screen design (Claude Design) | 32 screens (phone + desktop, light + dark, key screens LTR). In parallel: API skeleton, PostgreSQL, Prisma init, `test:api` in CI | ✅ |
| 5. Technical design | Prisma schema, permission table, API contract finalised; F-3b updates them for the scope change once the dashboard screens are reviewed ([foundation.md](foundation.md)) | ✅ |
| 6. Build | The steps of the [build map](#sequence-inside-the-build) | In progress |
| 7. Test and evaluate | Functional tests, occupancy scenarios on seeded data, usability test with students and freelancers | To come |
| 8. Report and presentation | Final report, presentation, rehearsal; by 16 January 2027 | To come |

**Scope change (2026-09-29):** the owner and reception dashboard enlarges the build. The final date does not move.

## Sequence inside the build

This is the **build map**: the direction the build follows, not a contract. It changes as the project learns, through a PR like any document.

Each step names its goal and points to what supports it:
- its screens, as numbered in [SCREENS.md](../design/SCREENS.md);
- the decisions and the owning documents it builds on;
- the findings it closes;
- the deferred decisions it settles, from [foundation.md › A-3](foundation.md#a-3--cross-cutting-decisions--docscross-cutting).

**How** a step is built is decided in that step's own plan. A step is finished only when it is complete: table → API → screen → tests. Steps follow this order; two run side by side only when neither needs the other ([ordering notes](#ordering-notes)).

### 1. Foundation: sign-in, session and shells

**Goal:** a user signs in and lands in the right shell for their role, in Arabic or English, light or dark, locally and at the public address.
- **Screens:**
  - [public site](../design/SCREENS.md#public-site-8): 5 Sign in, 6 Register, 7 Forgot / reset password, 8 404 / error / offline;
  - [my account](../design/SCREENS.md#my-account-3): 9 Profile & settings; its forced password change belongs to F-5.
- **Supported by:** the contracts of F-5, F-6 and F-7 in the [foundation plan](foundation.md#5-work-items).
- **Settles:** the reset-email provider (F-5).

### 2. Lookups and the admin's spaces

**Goal:** the admin keeps the lookup lists and enters the surveyed spaces, so the directory starts with real data.
- **Screens:** [admin](../design/SCREENS.md#admin-8): 26 Spaces, 30 Lookups.
- **Supported by:**
  - [ADR 0007](../architecture/decisions/0007-soft-delete.md) (soft delete) and [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md) (access to a space);
  - conventions §9: [new-space defaults](../backend/conventions.md#new-space-defaults) and [composed reads](../backend/conventions.md#composed-reads) (the admin's spaces list).
- **Closes:**
  - [finding 10](../architecture/findings/10-the-seeded-amenity-icon-keys-have-no-icons-in-the-design-system-yet.md): the amenity icons, which the admin's amenity form offers;
  - [finding 11](../architecture/findings/11-nested-writes-in-an-interactive-transaction-trigger-a-pg-deprecation-warning.md): the first nested write, the admin's space creation.
- **Settles:** the map: the admin places a space's pin.

### 3. Public directory

**Goal:** anyone finds a space, in the list or on the map, near them or by filter, and sees its page and how to contact Masaha.
- **Screens:** [public site](../design/SCREENS.md#public-site-8): 1 Home, 2 Directory, 3 Space details, 4 About / Contact.
- **Supported by:**
  - [ADR 0008](../architecture/decisions/0008-live-status-not-counts.md) (live status);
  - conventions §9: [occupancy](../backend/conventions.md#occupancy-the-spaces-state-now) and [composed reads](../backend/conventions.md#composed-reads);
  - [frontend architecture §6](../frontend/architecture.md#6-map) (the map) and [foundation §13](../frontend/design-system/foundation.md#13-screens-to-design-32) (near me, under *Directory*).
- **Settles:** live-status delivery and caching.

### 4. Owners and users

**Goal:** the admin manages accounts: owners are created or upgraded and linked to their spaces, which become verified, and users are suspended, given a role or a temporary password.
- **Screens:** [admin](../design/SCREENS.md#admin-8): 27 Space owners, 29 Users.
- **Supported by:**
  - [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md) and [ADR 0013](../architecture/decisions/0013-identity-modules.md);
  - conventions [§7](../backend/conventions.md#the-modules) (`space-links`, `users`) and §9 [composed reads](../backend/conventions.md#composed-reads) (the space owners list);
  - [security.md](../backend/security.md#passwords) (temporary passwords).

### 5. The owner's space profile and packages

**Goal:** an owner keeps the space's public facts and prices true, and confirms them.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 20 Space profile, 21 Prices & packages.
- **Supported by:**
  - conventions [§7](../backend/conventions.md#the-modules) (`spaces`, `packages`);
  - [ADR 0014](../architecture/decisions/0014-deployment.md) (the request size limit).
- **Settles:** photos. Their API is built for the admin (the gallery, the storage port, the public covers and photos); the owner's routes reuse its service.

### 6. Staff

**Goal:** an owner adds and deactivates reception accounts.
- **Built:** its API (#90, [api-contract › Staff (managed)](../api/api-contract.md#staff-managed)); the screen remains planned.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 22 Staff.
- **Supported by:** [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md); conventions [§7](../backend/conventions.md#the-modules) (`space-links`).

### 7. Front desk and visits

**Goal:** the staff run the day at the desk: check in and out, the visit charge and its payment at check-out, live status with the manual override, auto check-out, uncollected visits.
- **Built:** the staff's read of a space's state now: who is present, the capacity and the live status, and the manual override; the live status in the directory (#94, [api-contract › Occupancy (managed)](../api/api-contract.md#occupancy-managed)); a visitor's check-in by name and check-out, with the charge, the first payment, the unpaid rest left to a customer by phone, and a price typed by hand or an unpriced close, each idempotent (#95, [api-contract › Front desk (managed)](../api/api-contract.md#front-desk-managed)); the rest of the step remains planned.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 13 Front desk.
- **Supported by:**
  - [ADR 0008](../architecture/decisions/0008-live-status-not-counts.md), [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md) and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md);
  - conventions §9: [the front desk](../backend/conventions.md#the-front-desk-desk), [occupancy](../backend/conventions.md#occupancy-the-spaces-state-now) and [composed reads](../backend/conventions.md#composed-reads) (uncollected visits);
  - conventions [§11](../backend/conventions.md#11-time) (time) and [§13](../backend/conventions.md#13-idempotency-and-concurrency) (idempotency and concurrency);
  - data-model.md: [derived values](../architecture/data-model.md#derived-values-computed-not-stored).
- **Closes:** [finding 15](../architecture/findings/15-the-payments-migration-predates-adr-0015.md): the first payment is written at a visit's check-out. Done (#95).
- **Settles:** the auto check-out scheduling mechanism, within ADR 0014.

### 8. Customers and subscriptions

**Goal:** the staff keep customers on file and run their subscriptions: limits, billing, progress, statement, renewal, ending early, and subscription check-ins.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 14 Customers, 15 Customer details, 16 New / renew subscription.
- **Supported by:**
  - [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md), and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md): subscriptions and customers gain their idempotency key;
  - conventions §9: [the front desk](../backend/conventions.md#the-front-desk-desk) and [composed reads](../backend/conventions.md#composed-reads) (the customers list and file);
  - data-model.md: [subscription scenarios](../architecture/data-model.md#subscription-scenarios).
- **Settles:** date inputs.

### 9. Payments and debts

**Goal:** payments are received and voided, and balances, credit, debts and each staff member's collections today are seen.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 17 Payments.
- **Supported by:** [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md) and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md); conventions §13: [the ledger's rules](../backend/conventions.md#the-ledgers-rules).

### 10. Announcements, data reports and favourites

**Goal:** a space tells its users what changes, with the closure extension; users report wrong information and see the resolution note; users keep their favourite spaces.
- **Screens:**
  - [my account](../design/SCREENS.md#my-account-3): 10 Favourites, 11 My reports;
  - [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 18 Announcements, 23 Data reports;
  - [admin](../design/SCREENS.md#admin-8): 28 Data reports.
- **Supported by:** [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md); conventions §9: [data reports](../backend/conventions.md#data-reports) and [composed reads](../backend/conventions.md#composed-reads) (the favourites' cards).
- **Closes:** [finding 8](../architecture/findings/8-the-stress-tests-applied-filter-tag-has-no-component.md), at the start of the step: the removable filter tag.

### 11. Finance, audit and settings

**Goal:** the owner reads the space's money and occupancy; the owner and the admin read their audit logs; the space's and the platform's settings are edited.
- **Screens:**
  - [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 19 Finance & statistics, 24 Settings;
  - [admin](../design/SCREENS.md#admin-8): 31 Audit log, 32 Settings.
- **Supported by:**
  - conventions [§6](../backend/conventions.md#6-audit) (audit), [§8](../backend/conventions.md#8-module-rules) (R7, read models) and §9 [settings](../backend/conventions.md#settings-three-screens-three-owners);
  - [ADR 0014](../architecture/decisions/0014-deployment.md) (the response size limit);
  - [overview.md](../project/overview.md#dashboard--owner-and-reception) (what drops first if time is short).
- **Closes:** [finding 14](../architecture/findings/14-the-owners-audit-screen-has-no-design.md): the owner's audit screen.
- **Built early:** the space's settings and its capacity, on the API (#92, [api-contract › Settings (managed)](../api/api-contract.md#settings-managed)), ahead of the front desk; screen 24 remains here.
- **Settles:** charts and CSV exports.

### 12. Overviews

**Goal:** the owner and the admin see their figures at a glance.
- **Screens:**
  - [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 12 Overview;
  - [admin](../design/SCREENS.md#admin-8): 25 Overview.
- **Supported by:** conventions §9: [overview](../backend/conventions.md#overview).

### Ordering notes

- The foundation comes first: every screen needs the session and a shell.
- The API may run one step ahead of the screens; what runs in parallel is [workflow §9](../development/workflow.md#9-parallel-work)'s.
- The directory follows the admin's spaces: it lists the spaces the admin entered.
- The directory's API carries the live state since step 7 (#94); Home, the directory and the space page show it with their screens.
- The space page's announcements, its report button and the favourite action arrive with step 10.
- Owners are linked (step 4) before they edit their space (5) or add staff (6). The admin's *Spaces* screen gains its owner linking in step 4.
- Payments (step 9) follow the desk (7) and subscriptions (8), which record the first payments.
- A space runs on the new-space defaults copied at its creation until its owner edits its settings (on the API since #92; screen 24 in step 11); the platform runs on its seeded settings until step 11.
- The overviews come last: they compose figures from every module.

## Documentation milestones

Deferred documents are written when their trigger is met, in the same PR ([workflow §7](../development/workflow.md#7-documentation-update-triggers)).

| Build step | Documents it triggers |
|---|---|
| Repository scaffolded | `development/setup.md`; the *Commands* section of `CLAUDE.md` |
| Design-system layer built | token files match `frontend/design-system/foundation.md` (values locked 2026-09-26); status line updated to *built* |
| Localisation mechanism lifted from Quick Tweets | the *Mechanism* section of `frontend/localisation.md` |
| Prisma schema written | the *Entities* section of `architecture/data-model.md` |
| First request works end to end (web → API → database) | `architecture/system-overview.md` |
| Each endpoint built | its entry in `api/api-contract.md` |
| Each feature merged | the *Built* section of `project/overview.md` |

## Risks

| Risk | Mitigation |
|---|---|
| Design phase runs long | Anchor screens first; the design system in code lets remaining screens reuse real components |
| Backend is the weaker area | Strict layering and shared Zod schemas; API integration tests per role catch mistakes early |
| RTL/LTR bugs discovered late | Every PR is checked in both directions (Definition of Done) |
| Power and internet outages | Local development environment; commit and push daily |
| Scope creep | *Not in v1* list in overview.md; CLAUDE.md forbids building it |

## Planned API surface

Moves into [api-contract.md](../api/api-contract.md) endpoint by endpoint as each is built.

Legend: 🌐 public · 👤 any signed-in user · 🧾 OWNER or RECEPTION of that space · 🏢 OWNER of that space · 🛡 ADMIN. Space access comes from the user's link to that space ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).

#### Auth
Built: every auth endpoint, in [api-contract §5](../api/api-contract.md#5-endpoints): register, login, Google sign-in, refresh, logout, and the forgotten password (forgot, the reset link's check, reset).

#### Me
Built: `POST /me/password`, the password change and the forced change at first sign-in ([api-contract §5](../api/api-contract.md#5-endpoints)).

| Method | Path | Access |
|---|---|---|
| GET / PATCH | `/me` | 👤 name, language |
| GET | `/me/favorites` · POST / DELETE `/me/favorites/:spaceId` | 👤 |
| GET | `/me/reports` | 👤 with the resolution note |

#### Public directory
Built: `GET /lookups`, the active governorates with their active areas and the active amenities; `GET /spaces`, the directory's list, paged and filtered on the server, with its search and near me (the device's location in a header, only to sort); `GET /map/spaces`, the map's pins; and `GET /spaces/:slug`, a space's public page, without announcements; the live status on the cards and the pins, the `availableNow` filter, and `GET /spaces/:slug/occupancy`, a space's live status alone ([api-contract §5](../api/api-contract.md#directory-public)).

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/spaces/:slug` | 🌐 | its announcements, with step 10 |
| POST | `/spaces/:slug/reports` | 👤 | report wrong information |
| GET | `/settings/public` | 🌐 | contact email and WhatsApp |

#### Managed spaces (`/manage/spaces/:spaceId/...`)
Built: `GET /manage/spaces`, and the API-only profile, facts, confirmations, photo, package and staff routes below, the settings and capacity routes, the staff's read of the space's state now with its override, and a visitor's check-in and check-out (`POST …/visits`, `POST …/visits/:visitId/check-out`) ([api-contract › Settings (managed)](../api/api-contract.md#settings-managed), [Capacity (managed)](../api/api-contract.md#capacity-managed), [Occupancy (managed)](../api/api-contract.md#occupancy-managed), [Front desk (managed)](../api/api-contract.md#front-desk-managed)).
An active owner or reception link is required; reception reads, sets and clears the live status's override, and checks visitors in and out. The web screen and later
dashboard modules remain planned ([api-contract §5](../api/api-contract.md#5-endpoints)).

| Method | Path | Access | Notes |
|---|---|---|---|
| GET / PATCH | `/manage/spaces/:spaceId` | GET 🧾 · PATCH 🏢 | the profile and all facts (read), the profile (edit) |
| PUT | `/manage/spaces/:spaceId/:group` | 🏢 | the facts, one group at a time (`hours` with the shifts, `prices`, `amenities`, `contacts`), on the same logic as the admin's ([api-contract §5](../api/api-contract.md#spaces-the-admin)) |
| POST | `/manage/spaces/:spaceId/:group/confirm` | 🏢 | «المعلومات ما زالت صحيحة»: resets that group's freshness date, as the admin's confirm does ([api-contract §5](../api/api-contract.md#spaces-the-admin)) |
| GET / POST / DELETE / PUT | `/manage/spaces/:spaceId/photos[/:photoId \| /order]` | GET 🧾 · writes 🏢 | list, upload, remove, reorder, on the admin's service ([api-contract › Photos](../api/api-contract.md#photos)) |
| GET / POST / PATCH | `/manage/spaces/:spaceId/staff[/:userId]` | 🏢 | reception accounts, created new with a temporary password shown once, listed whole, deactivated and re-activated, a pending temporary password re-issued and handed over ([api-contract › Staff (managed)](../api/api-contract.md#staff-managed)) |
| GET / POST / PATCH | `/manage/spaces/:spaceId/packages[/:packageId]` | GET 🧾 · writes 🏢 | subscription templates, listed whole, retired ones included; never public ([api-contract › Packages (managed)](../api/api-contract.md#packages-managed)) |
| GET / POST | `/manage/spaces/:spaceId/customers` | 🧾 | list (search; filters: subscription type, status, payment), create |
| GET / PATCH | `/manage/spaces/:spaceId/customers/:customerId` | 🧾 | details with subscriptions, balances and debt; edit |
| POST | `/manage/spaces/:spaceId/customers/:customerId/subscriptions` | 🧾 | new or renewal, from a package or custom; warns when the customer has a balance |
| GET / PATCH | `/manage/spaces/:spaceId/subscriptions/:id` | 🧾 | progress and statement; correct one |
| POST | `/manage/spaces/:spaceId/subscriptions/:id/end` | 🧾 | end early: the end becomes today |
| GET | `/manage/spaces/:spaceId/visits` | 🧾 | `?open=true`, `?uncollected=true` or a date range |
| GET / POST | `/manage/spaces/:spaceId/check-ins` | 🧾 | subscription check-ins: `?open=true` or a date range; limit and full-space warnings in `meta.warnings` |
| POST | `/manage/spaces/:spaceId/check-ins/:checkInId/check-out` | 🧾 | |
| GET / POST | `/manage/spaces/:spaceId/payments` | 🧾 | record one payment for one visit or subscription; list: the owner sees all (date, staff and method filters), reception its own today |
| POST | `/manage/spaces/:spaceId/payments/:paymentId/void` | 🏢 | reason required |
| GET / POST | `/manage/spaces/:spaceId/announcements` | 🧾 | |
| PATCH / DELETE | `/manage/spaces/:spaceId/announcements/:id` | 🧾 | |
| POST | `/manage/spaces/:spaceId/announcements/:id/extend-subscriptions` | 🏢 | closure notices only; once per closure |
| GET | `/manage/spaces/:spaceId/finance/...` | 🏢 | summary, income by month, visit income per day, debtors and payers, collections per staff member, occupancy (by hour, by day, peaks, average stay); CSV export |
| GET / PATCH | `/manage/spaces/:spaceId/data-reports[/:id]` | 🏢 | resolve with an optional note, or dismiss (the owner keeps them once the space is verified) |
| GET | `/manage/spaces/:spaceId/audit-log` | 🏢 | |

#### Admin (`/admin/...`, 🛡)
Built: the lookups, `/admin/governorates` (with their areas), `/admin/areas` and `/admin/amenities`: list, add, edit, hide and restore, and order; the spaces, `/admin/spaces`: the list with its filters, an unverified space's creation, one space's read, its profile and facts edits, a group at a time, and the confirming of a group unchanged while it is unverified, and hiding and showing, soft delete and restore of any space; the users, `GET /admin/users`, the list with its search and its role and state filters, which the owners page reads filtered to the owners; the owners, `/admin/owners`, added with a new account or an upgraded one, and `/admin/spaces/:spaceId/owners`, linked and unlinked one space at a time; a temporary password's handover, `/admin/users/:userId/temporary-password/handover`; suspension, `/admin/users/:userId/suspended`; the role change, `/admin/users/:userId/role`; and the admin's temporary password, `/admin/users/:userId/temporary-password`; a space's photos, `/admin/spaces/:spaceId/photos`: the list, an upload, a removal and the order ([api-contract §5](../api/api-contract.md#5-endpoints)).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | aggregate numbers only |
| GET / PATCH | `/admin/data-reports[/:id]` | read all; resolve (with an optional note) or dismiss those of unverified spaces |
| GET | `/admin/audit-log` | |
| GET / PATCH | `/admin/settings` | contact info, defaults |

## Data model

Built: the Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), owns every entity and field, and [data-model.md](../architecture/data-model.md) owns the conventions, derived values and constraints.
