# Plan — Masaha v1

> **Status:** Active · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
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
| 6. Build | The steps of the [build map](#sequence-inside-the-build), each built with its screens (2026-10-29, #132) | ✅ |
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
- **Built:** the site's and the dashboard's shells (#30, #39); screens 5 and 6 (#35), with Google (#42), 7 (#40), 8, and the forced password change (#38); screen 9, «إعدادات حسابي»: the profile, the preferences and the ways of signing in (2026-10-29, #132).

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
- **Built:** screen 30, the lookups (#43, #49), and screen 26, the spaces: the list (#50), the add page with its pin (#57), the editor (#74, #79) with its gallery (#85), and the deleted spaces (#67, #84), finished with the retired amenities and the lookups' positions (2026-10-29, #132).

### 3. Public directory

**Goal:** anyone finds a space, in the list or on the map, near them or by filter, and sees its page and how to contact Masaha.
- **Screens:** [public site](../design/SCREENS.md#public-site-8): 1 Home, 2 Directory, 3 Space details, 4 About / Contact.
- **Supported by:**
  - [ADR 0008](../architecture/decisions/0008-live-status-not-counts.md) (live status);
  - conventions §9: [occupancy](../backend/conventions.md#occupancy-the-spaces-state-now) and [composed reads](../backend/conventions.md#composed-reads);
  - [frontend architecture §6](../frontend/architecture.md#6-map) (the map) and [foundation §13](../frontend/design-system/foundation.md#13-screens-to-design-32) (near me, under *Directory*).
- **Settles:** live-status delivery and caching.
- **Built:** screen 2, the directory: the list (#101), the filters (#103) and the map (#105); screen 3, a space's page (#107, #108); screens 1 and 4, Home and About (#111); each finished, and About's contact read from the platform's settings (2026-10-29, #132).

### 4. Owners and users

**Goal:** the admin manages accounts: owners are created or upgraded and linked to their spaces, which become verified, and users are suspended, given a role or a temporary password.
- **Screens:** [admin](../design/SCREENS.md#admin-8): 27 Space owners, 29 Users.
- **Supported by:**
  - [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md) and [ADR 0013](../architecture/decisions/0013-identity-modules.md);
  - conventions [§7](../backend/conventions.md#the-modules) (`space-links`, `users`) and §9 [composed reads](../backend/conventions.md#composed-reads) (the space owners list);
  - [security.md](../backend/security.md#passwords) (temporary passwords).
- **Built:** screen 27, the space owners (#88, #89, #91), and screen 29, the users (#93), on the API of #60 and #62; both finished, the owner a refusal names linked (2026-10-29, #132).

### 5. The owner's space profile and packages

**Goal:** an owner keeps the space's public facts and prices true, and confirms them.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 20 Space profile, 21 Prices & packages.
- **Supported by:**
  - conventions [§7](../backend/conventions.md#the-modules) (`spaces`, `packages`);
  - [ADR 0014](../architecture/decisions/0014-deployment.md) (the request size limit).
- **Settles:** photos. Their API is built for the admin (the gallery, the storage port, the public covers and photos); the owner's routes reuse its service.
- **Built:** screen 20, the space profile (#96, on the API of #83), and screen 21, Prices & packages (#98, on the API of #87) (finished 2026-10-29, #132).

### 6. Staff

**Goal:** an owner adds and deactivates reception accounts.
- **Built:** its API (#90, [api-contract › Staff (managed)](../api/api-contract.md#staff-managed)) and screen 22, Staff (#99), with each person's start and month (2026-10-29, #132).
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 22 Staff.
- **Supported by:** [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md); conventions [§7](../backend/conventions.md#the-modules) (`space-links`).

### 7. Front desk and visits

**Goal:** the staff run the day at the desk: check in and out, the visit charge and its payment at check-out, live status with the manual override, auto check-out, uncollected visits: collecting one, its debt by phone, and its write-off.
- **Built:** the staff's read of a space's state now: who is present, the capacity and the live status, and the manual override; the live status in the directory (#94, [api-contract › Occupancy (managed)](../api/api-contract.md#occupancy-managed)); a visitor's check-in by name and check-out, with the charge, the first payment, the unpaid rest left to a customer by phone, and a price typed by hand or an unpriced close, each idempotent; a visit's quote and the desk's terms (#95, [api-contract › Front desk (managed)](../api/api-contract.md#front-desk-managed)); the auto check-out of open visits and subscription check-ins at their due time, run every 5 minutes (#97, [api-contract › Internal](../api/api-contract.md#internal)); the unpriced visits and their pricing, and the uncollected visits (#97); a visit's payment after its check-out, its debt to a customer by phone, and the owner's write-off with its undo (#100); the written-off visits listed, and a visit's check-in for its customer (2026-10-29, #132). The step's API is built, and so is screen 13, the front desk: who is present, the live status and its override, a visit's check-in and check-out with its payment (#116); the uncollected and unpriced visits, collected, left as a debt, priced or written off (#117); the subscribers found and checked in and out (#119); «السجل», a day's visits and check-ins beside who is present, and the owner's «لن تُحصَّل», the written-off visits with their undo (2026-10-29, #132).
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 13 Front desk.
- **Supported by:**
  - [ADR 0008](../architecture/decisions/0008-live-status-not-counts.md), [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md) and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md);
  - conventions §9: [the front desk](../backend/conventions.md#the-front-desk-desk), [occupancy](../backend/conventions.md#occupancy-the-spaces-state-now) and [composed reads](../backend/conventions.md#composed-reads) (uncollected visits);
  - conventions [§11](../backend/conventions.md#11-time) (time) and [§13](../backend/conventions.md#13-idempotency-and-concurrency) (idempotency and concurrency);
  - data-model.md: [derived values](../architecture/data-model.md#derived-values-computed-not-stored).
- **Closes:** [finding 15](../architecture/findings/15-the-payments-migration-predates-adr-0015.md): the first payment is written at a visit's check-out. Done (#95).
- **Settles:** the auto check-out scheduling mechanism, within ADR 0014. Done (#97): an in-process timer locally, and online an external cron calling a secret-protected endpoint ([conventions §12](../backend/conventions.md#12-environments)).

### 8. Customers and subscriptions

**Goal:** the staff keep customers on file and run their subscriptions: limits, billing, progress, statement, renewal, ending early, and subscription check-ins.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 14 Customers, 15 Customer details, 16 New / renew subscription.
- **Supported by:**
  - [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md), and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md): subscriptions and customers gain their idempotency key;
  - conventions §9: [the front desk](../backend/conventions.md#the-front-desk-desk) and [composed reads](../backend/conventions.md#composed-reads) (the customers list and file);
  - data-model.md: [subscription scenarios](../architecture/data-model.md#subscription-scenarios).
- **Settles:** date inputs.
- **Built:** customers created, edited, archived and restored; the list and the file, debts in the database (#102); subscriptions made from a package or custom, renewed with a payment allocated oldest debt first, paid, read as a statement, corrected and ended early (#106); subscribers checked in with their warnings and out, and the check-ins listed open or by date (#109): step 8's API is complete. So are its screens: 14 and 15, the customers list and a customer's file (#122), and 16, the subscription sheet (#124), renewing and subscribing from the desk too; a customer's actions by their state, the file's WhatsApp reminder, and a subscription's corrections from its card (2026-10-29, #132).

### 9. Payments and debts

**Goal:** payments are voided, and balances, credit, debts and each staff member's collections today are seen; a visit's payment after its check-out is received since step 7 (#100), a subscription's with step 8.
- **Screens:** [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 17 Payments.
- **Supported by:** [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md) and [ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md); conventions §13: [the ledger's rules](../backend/conventions.md#the-ledgers-rules).
- **Built:** payments voided by the owner, a written-off visit's once the write-off is undone; the payments list, the owner's and reception's own of today (#114, [api-contract › Front desk (managed)](../api/api-contract.md#front-desk-managed)) — step 9's API is complete; and screen 17: the owner's «الدفعات» with its void, and reception's «دفعاتي اليوم» (#127), the ledger's staff filter naming the space's other owners (2026-10-29, #132).

### 10. Announcements, data reports and favourites

**Goal:** a space tells its users what changes, with the closure extension; users report wrong information and see the resolution note; users keep their favourite spaces.
- **Screens:**
  - [my account](../design/SCREENS.md#my-account-3): 10 Favourites, 11 My reports;
  - [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 18 Announcements, 23 Data reports;
  - [admin](../design/SCREENS.md#admin-8): 28 Data reports.
- **Supported by:** [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md); conventions §9: [data reports](../backend/conventions.md#data-reports) and [composed reads](../backend/conventions.md#composed-reads) (the favourites' cards).
- **Closes:** [finding 8](../architecture/findings/8-the-stress-tests-applied-filter-tag-has-no-component.md), at the start of the step: the removable filter tag.
- **Built:** announcements and the closure warning, on the API: posted (idempotent), edited, ended, started and deleted by the staff; the managed list with each closure's extension state and its summary; a space's page's announcements; `CLOSURE_IN_FORCE` at check-in (#112, [api-contract › Announcements (managed)](../api/api-contract.md#announcements-managed)); data reports, on the API: a signed-in user's report (10 an hour, a repeat answering the open one), the user's own with the replies, the owner's and the admin's lists and decisions, the reporter anonymous to the owner (#120, [api-contract › Data reports](../api/api-contract.md#data-reports)); favourites, on the API: saved and removed, idempotent, at most 200, read whole as the directory's cards, newest saved first or nearest first (#121, [api-contract › Favourites](../api/api-contract.md#favourites)); the closure extension, on the API: its preview, and the owner's extension of the subscriptions a closure covered, once per closure under one key, an extended closure guarded by the database (#123, [api-contract › Announcements (managed)](../api/api-contract.md#announcements-managed)). So are the screens: 10 and 11, the account's favourites and reports; 18, the announcements, with the closure extension; 23 and 28, the owner's and the admin's data reports (#129); a report opened beside its field (2026-10-29, #132).

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
- **Built early:** the space's settings and its capacity, on the API (#92, [api-contract › Settings (managed)](../api/api-contract.md#settings-managed)), ahead of the front desk; screen 24, its cards (#99), gained its last, «حسابي», leading to one's own settings (2026-10-29, #132).
- **Settles:** charts and CSV exports: the API answers each chart's series and figure, aggregated on the server; the CSV is built in the browser from the JSON, so there is no export route (the owner's decisions 4 and 5, 2026-10-26).
- **Built:** the audit reader, on the API: the owner's log of the space, the admin shown as Masaha, and the admin's log of the platform's events, by a default-deny list (2026-10-27, #128).
- **Built:** the platform's settings, on the API: the admin's three cards — the new-space defaults, the staleness thresholds and the contact — and the public contact (2026-10-28, #130).
- **Built:** the space's finance, on the API: a month's income with the month before, today, all time, the last 12 months, the visits' last 30 days and each staff member's collections; who owes and who is in credit, with the totals and the reminder template; who paid in a month; and the occupancy statistics from closed stays — four reads, the owner's alone ([api-contract › Finance](../api/api-contract.md#finance), 2026-10-29, #131).
- **Built:** the step's screens: 19, «المالية والتقارير», the month's income, who owes and who paid, and the occupancy, with the CSV built in the browser; 31, «سجل التدقيق», the admin's and, in «الفريق والإعدادات», the owner's, scoped to the space (O13, finding 14); 32, «إعدادات المنصة», the three cards (2026-10-29, #132).

### 12. Overviews

**Goal:** the owner and the admin see their figures at a glance.
- **Screens:**
  - [owner and reception dashboard](../design/SCREENS.md#owner-and-reception-dashboard-13): 12 Overview;
  - [admin](../design/SCREENS.md#admin-8): 25 Overview.
- **Supported by:** conventions §9: [overview](../backend/conventions.md#overview).
- **Built:** both overviews, on the API: the owner's work queue — the fact groups missing or stale, the open reports, the uncollected and unpriced visits, the closures awaiting their extension, capacity, how many customers owe (a count, no amount), present now with the live status, the subscriptions ending soon and the running announcements; and the admin's — the spaces by status, the open reports by who handles them, the new users of the last 30 days and the spaces whose data is incomplete; each figure read from its owning module and equal to the list it links to ([api-contract › Overview](../api/api-contract.md#overview), 2026-10-29, #131). So are screens 12 and 25, «نظرة عامة»: the owner's landing, a work queue of counts with no amount, and the admin's, the platform at a glance (2026-10-29, #132).

### Ordering notes

- The foundation comes first: every screen needs the session and a shell.
- The API may run one step ahead of the screens; what runs in parallel is [workflow §9](../development/workflow.md#9-parallel-work)'s.
- The directory follows the admin's spaces: it lists the spaces the admin entered.
- The directory's API carries the live state since step 7 (#94); Home, the directory and the space page show it with their screens.
- The space page's announcements, its report button and the favourite action arrive with step 10.
- Owners are linked (step 4) before they edit their space (5) or add staff (6). The admin's *Spaces* screen gains its owner linking in step 4.
- Payments (step 9) follow the desk (7) and subscriptions (8), which record the first payments.
- A space runs on the new-space defaults copied at its creation until its owner edits its settings (on the API since #92, screen 24 since #99); the platform runs on its seeded settings until the admin saves them (on the API since #130; screen 32, 2026-10-29, #132).
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

Every route below is built and owned by [api-contract.md](../api/api-contract.md); nothing remains planned (2026-10-29, #132).

Legend: 🌐 public · 👤 any signed-in user · 🧾 OWNER or RECEPTION of that space · 🏢 OWNER of that space · 🛡 ADMIN. Space access comes from the user's link to that space ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).

#### Auth
Built: every auth endpoint, in [api-contract §5](../api/api-contract.md#5-endpoints): register, login, Google sign-in, refresh, logout, and the forgotten password (forgot, the reset link's check, reset).

#### Me
Built: `GET` / `PATCH /me`, one's own account, its name and language (#131, [api-contract › Me](../api/api-contract.md#me)); `POST /me/password`, the password change and the forced change at first sign-in ([api-contract §5](../api/api-contract.md#5-endpoints)); `GET /me/reports`, the user's own reports with the replies (#120, [api-contract › Data reports](../api/api-contract.md#data-reports)); the favourites, `GET /me/favorites` and `POST` / `DELETE /me/favorites/:spaceId` (#121, [api-contract › Favourites](../api/api-contract.md#favourites)).

| Method | Path | Access |
|---|---|---|
| GET / PATCH | `/me` | 👤 name, language (built, #131) |
| GET | `/me/favorites` · POST / DELETE `/me/favorites/:spaceId` | 👤 at most 200, whole, near me by the header (built, #121) |
| GET | `/me/reports` | 👤 with the resolution note (built, #120) |

#### Public directory
Built: `GET /lookups`, the active governorates with their active areas and the active amenities; `GET /spaces`, the directory's list, paged and filtered on the server, with its search and near me (the device's location in a header, only to sort); `GET /map/spaces`, the map's pins; and `GET /spaces/:slug`, a space's public page, with its running and upcoming announcements (2026-10-24, #112); the live status on the cards and the pins, the `availableNow` filter, and `GET /spaces/:slug/occupancy`, a space's live status alone ([api-contract §5](../api/api-contract.md#directory-public)); `POST /spaces/:slug/reports`, a signed-in user's report of a listed space, 10 an hour (#120, [api-contract › Data reports](../api/api-contract.md#data-reports)); `GET /settings/public`, the platform's contact (#130, [api-contract › Platform settings](../api/api-contract.md#platform-settings)).

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/spaces/:slug` | 🌐 | its running and upcoming announcements, built (#112) |
| POST | `/spaces/:slug/reports` | 👤 | report wrong information (built, #120) |
| GET | `/settings/public` | 🌐 | the platform's contact email and WhatsApp, `null` while unset, cached 5 minutes (built, #130) |

#### Managed spaces (`/manage/spaces/:spaceId/...`)
Built: the finance's four reads and the owner's overview ([Finance](../api/api-contract.md#finance), [Overview](../api/api-contract.md#overview)) and the visits by day (#131); `GET /manage/spaces`, and the profile, facts, confirmations and photo routes below (#83), the package routes (#87) and the staff routes (#90), the settings and capacity routes, the staff's read of the space's state now with its override, a visitor's check-in and check-out (`POST …/visits`, `POST …/visits/:visitId/check-out`), and a visit's debt: its payment after the check-out (`POST …/payments`), «تسجيل دينًا» (`PUT …/visits/:visitId/customer`) and the owner's write-off (`POST` / `DELETE …/visits/:visitId/write-off`) (#100), and the customers: the list and the file (`GET …/customers`, `GET …/customers/:customerId`), the create and the edit (`POST …/customers`, `PATCH …/customers/:customerId`), the archive and the restore (`POST …/customers/:customerId/archive`, `…/restore`) (#102), and the subscriptions: subscribing and renewing (`POST …/customers/:customerId/subscriptions`), a subscription's payment (`POST …/payments`), its statement (`GET …/subscriptions/:id`), its corrections (`PATCH …/subscriptions/:id`, the owner's `PUT …/subscriptions/:id/price`) and its end (`POST …/subscriptions/:id/end`) (#106), and the subscribers' check-ins: the check-in and the check-out (`POST …/check-ins`, `POST …/check-ins/:checkInId/check-out`) and the lists (`GET …/check-ins`) (#109), and the announcements: the post, the edit, the end, the start and the delete, the list and its summary (#112), and the payments: the list (`GET …/payments`) and the owner's void (`POST …/payments/:paymentId/void`) (#114) ([Subscriptions (managed)](../api/api-contract.md#subscriptions-managed), [api-contract › Settings (managed)](../api/api-contract.md#settings-managed), [Capacity (managed)](../api/api-contract.md#capacity-managed), [Occupancy (managed)](../api/api-contract.md#occupancy-managed), [Front desk (managed)](../api/api-contract.md#front-desk-managed), [Customers (managed)](../api/api-contract.md#customers-managed)); and the space's data reports, the owner's list and decision (#120, [Data reports](../api/api-contract.md#data-reports)); the written-off visits (`GET …/written-off-visits`), a visit's check-in for its customer, a subscription sold at the published price the desk showed, and one data report read by its id (2026-10-29, #132).
An active owner or reception link is required; reception reads, sets and clears the live status's override, checks visitors in and out, receives a visit's payment and records its debt; the owner writes a visit off. Each route's screens are in its step of the [build map](#sequence-inside-the-build) ([api-contract §5](../api/api-contract.md#5-endpoints)).

| Method | Path | Access | Notes |
|---|---|---|---|
| GET / PATCH | `/manage/spaces/:spaceId` | GET 🧾 · PATCH 🏢 | the profile and all facts (read), the profile (edit) (built, #83) |
| PUT | `/manage/spaces/:spaceId/:group` | 🏢 | the facts, one group at a time (`hours` with the shifts, `prices`, `amenities`, `contacts`), on the same logic as the admin's ([api-contract §5](../api/api-contract.md#spaces-the-admin)) (built, #83) |
| POST | `/manage/spaces/:spaceId/:group/confirm` | 🏢 | «المعلومات ما زالت صحيحة»: resets that group's freshness date, as the admin's confirm does ([api-contract §5](../api/api-contract.md#spaces-the-admin)) (built, #83) |
| GET / POST / DELETE / PUT | `/manage/spaces/:spaceId/photos[/:photoId \| /order]` | GET 🧾 · writes 🏢 | list, upload, remove, reorder, on the admin's service ([api-contract › Photos](../api/api-contract.md#photos)) (built, #83) |
| GET / POST / PATCH | `/manage/spaces/:spaceId/staff[/:userId]` | 🏢 | reception accounts, created new with a temporary password shown once, listed whole, deactivated and re-activated, a pending temporary password re-issued and handed over ([api-contract › Staff (managed)](../api/api-contract.md#staff-managed)) (built, #90) |
| GET / POST / PATCH | `/manage/spaces/:spaceId/packages[/:packageId]` | GET 🧾 · writes 🏢 | subscription templates, listed whole, retired ones included; never public ([api-contract › Packages (managed)](../api/api-contract.md#packages-managed)) (built, #87) |
| GET / POST | `/manage/spaces/:spaceId/customers` | 🧾 | list (search; filters: subscription type, status, payment), create (built, #102) |
| GET / PATCH | `/manage/spaces/:spaceId/customers/:customerId` | 🧾 | details with subscriptions, balances and debt; edit (built, #102) |
| POST | `/manage/spaces/:spaceId/customers/:customerId/subscriptions` | 🧾 | new or renewal, from a package or custom; an optional amount the server allocates oldest debt first, one payment per item, under one key; warns while an older debt remains (built, #106) |
| GET / PATCH / PUT | `/manage/spaces/:spaceId/subscriptions/:id[/price]` | 🧾 · the price 🏢 | progress and statement; correct its limits, dates and name; the owner its price and billing, with a reason (built, #106) |
| POST | `/manage/spaces/:spaceId/subscriptions/:id/end` | 🧾 | end early: the end becomes today (its start, if it has not started) (built, #106) |
| GET | `/manage/spaces/:spaceId/visits` | 🧾 | a range of Gaza days, the owner's; reception today's only (built, #131). The open visits are answered by `…/occupancy`, the uncollected by `…/uncollected-visits`, since step 7 |
| GET / POST | `/manage/spaces/:spaceId/check-ins` | 🧾 | subscription check-ins: `?open=true` or a date range; limit and full-space warnings in `meta.warnings` (built, #109) |
| POST | `/manage/spaces/:spaceId/check-ins/:checkInId/check-out` | 🧾 | built (#109) |
| GET | `/manage/spaces/:spaceId/payments` | 🧾 | list: the owner sees all (date, staff and method filters), reception its own today (built, #114). Recording one is built (`POST`, a visit's since step 7; a subscription's since #106) |
| POST | `/manage/spaces/:spaceId/payments/:paymentId/void` | 🏢 | reason required (built, #114) |
| GET / POST | `/manage/spaces/:spaceId/announcements` | 🧾 | the list by state, each closure with its extension state, and `…/summary`; the post, idempotent (built, #112) |
| PATCH / DELETE | `/manage/spaces/:spaceId/announcements/:id` | 🧾 | edit, delete (soft); `POST …/:id/end`, `POST …/:id/start` (built, #112) |
| GET / POST | `/manage/spaces/:spaceId/announcements/:id/extend-subscriptions` | 🧾 / 🏢 | closure notices only: the preview, the staff's; the extension of the subscriptions it covered, the owner's, once per closure (built, #123) |
| GET | `/manage/spaces/:spaceId/finance/{income \| debts \| payers \| occupancy}` | 🏢 | income by month, visit income per day, collections per staff member; debtors and those in credit, with the totals; payers in a month; occupancy (by hour, by day, peak, average stay). No export route: the web builds the CSV from the JSON (built, #131) |
| GET | `/manage/spaces/:spaceId/overview` | 🏢 | the owner's work queue: counts, no amount (built, #131) |
| GET / PATCH | `/manage/spaces/:spaceId/data-reports[/:id]` | 🏢 | resolve with an optional note, or dismiss with a required one (the owner keeps them once the space is verified; built, #120) |
| GET | `/manage/spaces/:spaceId/audit-log` | 🏢 | every entry of the space, the admin as Masaha; paged, the last 30 days or all, searched and filtered (built, #128) |

#### Admin (`/admin/...`, 🛡)
Built: the admin's overview, `GET /admin/overview` (#131, [Overview](../api/api-contract.md#overview)); the lookups, `/admin/governorates` (with their areas), `/admin/areas` and `/admin/amenities`: list, add, edit, hide and restore, and order; the spaces, `/admin/spaces`: the list with its filters, an unverified space's creation, one space's read, its profile and facts edits, a group at a time, and the confirming of a group unchanged while it is unverified, and hiding and showing, soft delete and restore of any space; the users, `GET /admin/users`, the list with its search and its role and state filters, which the owners page reads filtered to the owners; the owners, `/admin/owners`, added with a new account or an upgraded one, and `/admin/spaces/:spaceId/owners`, linked and unlinked one space at a time; a temporary password's handover, `/admin/users/:userId/temporary-password/handover`; suspension, `/admin/users/:userId/suspended`; the role change, `/admin/users/:userId/role`; and the admin's temporary password, `/admin/users/:userId/temporary-password`; a space's photos, `/admin/spaces/:spaceId/photos`: the list, an upload, a removal and the order ([api-contract §5](../api/api-contract.md#5-endpoints)); the data reports, `/admin/data-reports`: every report with its reporter, and the decision of an unverified space's (#120), and one read by its id (2026-10-29, #132); the platform's settings, `/admin/settings/…`: the new-space defaults, the staleness thresholds and the contact, three cards (#130).

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/overview` | the admin's tiles and the spaces with incomplete data, counts only; replaces the planned `/admin/stats` (built, #131) |
| GET / PATCH | `/admin/data-reports[/:id]` | read all; resolve (with an optional note) or dismiss (with a required one) those of unverified spaces (built, #120) |
| GET | `/admin/audit-log` | the platform's events only, by a default-deny list (built, #128) |
| GET / PUT | `/admin/settings/{new-space-defaults \| staleness \| contact}` | three cards, each read and saved on its own, audited (built, #130) |

## Data model

Built: the Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), owns every entity and field, and [data-model.md](../architecture/data-model.md) owns the conventions, derived values and constraints.
