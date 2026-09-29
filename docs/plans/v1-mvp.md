# Plan — Masaha v1

> **Status:** Active · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
> **Authority:** Strategy, sequence and risks for delivering v1. Scope is owned by [overview.md](../project/overview.md); work items and their contracts live in PRs (and Issues when the owner creates them).

## Timeline

16 weeks, from 27 September 2026 to 16 January 2027.

| Phase | Weeks | Output |
|---|---|---|
| 0. Foundation decisions | 1 | This docs set, CLAUDE.md, ADRs 0001–0007 ✔ |
| 1. Visual direction (Claude Design) ✅ | 1 | Chosen palette, fonts, radius, density on 3 anchor screens (light/dark, RTL) — *Sea* |
| 2. Lock tokens + scaffold repo | 1–2 | Token values in foundation.md ✅; monorepo, lint, typecheck, CI — [design-system-layer.md](historical/design-system-layer.md) WI-1–2. The API and database skeleton moves alongside phase 4 |
| 3. Design-system layer in code | 2–3 | Tokens, themes, pre-paint script, adapted shadcn components; synced into Claude Design — [design-system-layer.md](historical/design-system-layer.md) WI-3–9 · layer built ✅; synced ✅ |
| 4. Screen design (Claude Design) | 3–5 | 32 screens (phone + desktop, light + dark, key screens LTR). In parallel: API skeleton, PostgreSQL, Prisma init, `test:api` in CI |
| 5. Technical design | 5 | Prisma schema, permission table, API contract finalised; F-3b updates them for the scope change once the dashboard screens are reviewed ([foundation.md](foundation.md)) |
| 6. Build | 6–12 | Foundation (auth, session, i18n, shells) → directory → admin → space profile and staff → front desk, customers, subscriptions, payments → finance and statistics |
| 7. Test and evaluate | 13–14 | Functional tests, occupancy scenarios on seeded data, usability test with students and freelancers |
| 8. Report and defence | 15–16 | Final report, presentation, rehearsal |

**Scope change (2026-09-29):** the owner and reception dashboard adds about 8–9 working days to phase 6. The phase dates are not moved.

## Sequence inside the build

Each slice is complete (table → API → screen → tests) before the next begins:

1. Auth and session (email and password, Google, the reset email, staff sign-in), role guards, dashboard and public shells, language and theme switching.
2. Lookups and admin space management (seed the survey data).
3. Public directory: the list or the map, near me, filters, space page.
4. Admin owner linking → verified spaces.
5. Owner space profile, prices and packages, confirming a fact group is still correct.
6. Staff management: reception accounts.
7. Front desk and visits: check in and out, the visit charge and its payment at check-out, live status with the manual override, auto check-out, uncollected visits.
8. Customers, subscriptions and packages: limits, billing, progress, statement, renewal, ending early; subscription check-ins.
9. Payments and debts: receiving a payment, balances, credit and debts, voiding (owner), collections today.
10. Announcements (with the closure extension), data reports (with the resolution note), favourites.
11. Finance and statistics (with the occupancy reports; the CSV export is the first to drop if time is short), audit log, settings.

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
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | name, email, password → `{ user, accessToken }` + refresh cookie |
| POST | `/auth/login` | 🌐 | email + password |
| POST | `/auth/google` | 🌐 | Google ID token → as login; creates or links the account ([security.md](../backend/security.md#sign-in-methods)) |
| POST | `/auth/refresh` | cookie | → `{ user, accessToken }`, the user with their active space links; rotation with 30 s grace |
| POST | `/auth/logout` | cookie | 204 |
| POST | `/auth/password/forgot` | 🌐 | always 202; emails a reset link valid for 1 hour |
| POST | `/auth/password/reset` | 🌐 | token + new password |
| POST | `/auth/password/change` | 👤 | required at first sign-in for accounts created by someone else; a Google-only account sets its first password |

#### Me
| Method | Path | Access |
|---|---|---|
| GET / PATCH | `/me` | 👤 name, language |
| GET | `/me/favorites` · POST / DELETE `/me/favorites/:spaceId` | 👤 |
| GET | `/me/reports` | 👤 with the resolution note |

#### Public directory
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/spaces` | 🌐 | filters: `area`, `priceMin`, `priceMax`, `period`, `amenities` (the filterable ones), `studentPrices`, `openFriday`, `verified`, `availableNow` (live status `AVAILABLE`), `q`; sort. Returns the **whole filtered set in one request**, unpaginated (an exception to [api-contract §4](../api/api-contract.md#4-pagination); the directory holds tens of spaces): the map uses it, and with «الأقرب إليّ» the device sorts it by distance. Takes **no location** |
| GET | `/spaces/:slug` | 🌐 | full public profile incl. announcements and freshness; never capacity |
| GET | `/spaces/:slug/occupancy` | 🌐 | `{ status: "AVAILABLE" \| "FULL" \| "CLOSED" }`, never counts ([ADR 0008](../architecture/decisions/0008-live-status-not-counts.md)) — verified spaces only |
| POST | `/spaces/:slug/reports` | 👤 | report wrong information |
| GET | `/lookups` | 🌐 | active governorates with their active areas, and active amenities, both languages |
| GET | `/settings/public` | 🌐 | contact email and WhatsApp |

#### Managed spaces (`/manage/spaces/:spaceId/...`)
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/manage/spaces` | 🧾 | spaces the caller has an active link to, with the role at each |
| GET / PATCH | `/manage/spaces/:spaceId` | GET 🧾 · PATCH 🏢 | profile, hours, shifts, prices, amenities, contacts, capacity (private) |
| POST | `/manage/spaces/:spaceId/facts/:group/confirm` | 🏢 | «المعلومات ما زالت صحيحة»: resets that group's freshness date |
| GET | `/manage/spaces/:spaceId/occupancy` | 🏢 | exact numbers for the owner: `{ capacity, present }` |
| PUT / DELETE | `/manage/spaces/:spaceId/status-override` | 🧾 | set a state until a time (30 min, 1 h, 2 h or closing time), or clear it |
| POST / DELETE | `/manage/spaces/:spaceId/photos[/:photoId]` | 🏢 | upload, remove, reorder |
| GET / POST / PATCH | `/manage/spaces/:spaceId/staff[/:userId]` | 🏢 | add reception by name and email (a new account with a temporary password shown once, or an existing account linked); deactivate |
| GET / POST / PATCH | `/manage/spaces/:spaceId/packages[/:id]` | GET 🧾 · write 🏢 | subscription templates; private ones are never public |
| GET / POST | `/manage/spaces/:spaceId/customers` | 🧾 | list (search; filters: subscription type, status, payment), create |
| GET / PATCH | `/manage/spaces/:spaceId/customers/:customerId` | 🧾 | details with subscriptions, balances and debt; edit |
| POST | `/manage/spaces/:spaceId/customers/:customerId/subscriptions` | 🧾 | new or renewal, from a package or custom; warns when the customer has a balance |
| GET / PATCH | `/manage/spaces/:spaceId/subscriptions/:id` | 🧾 | progress and statement; correct one |
| POST | `/manage/spaces/:spaceId/subscriptions/:id/end` | 🧾 | end early: the end becomes today |
| GET / POST | `/manage/spaces/:spaceId/visits` | 🧾 | `?open=true`, `?uncollected=true` or a date range; check in by name |
| POST | `/manage/spaces/:spaceId/visits/:visitId/check-out` | 🧾 | → the charge; records its payment, or leaves it unpaid with a phone number |
| GET / POST | `/manage/spaces/:spaceId/check-ins` | 🧾 | subscription check-ins: `?open=true` or a date range; limit warnings in `meta.warnings` |
| POST | `/manage/spaces/:spaceId/check-ins/:checkInId/check-out` | 🧾 | |
| GET / POST | `/manage/spaces/:spaceId/payments` | 🧾 | record one payment for one visit or subscription; list: the owner sees all (date, staff and method filters), reception its own today |
| POST | `/manage/spaces/:spaceId/payments/:paymentId/void` | 🏢 | reason required |
| GET / POST | `/manage/spaces/:spaceId/announcements` | 🧾 | |
| PATCH / DELETE | `/manage/spaces/:spaceId/announcements/:id` | 🧾 | |
| POST | `/manage/spaces/:spaceId/announcements/:id/extend-subscriptions` | 🏢 | closure notices only; once per closure |
| GET | `/manage/spaces/:spaceId/finance/...` | 🏢 | summary, income by month, visit income per day, debtors and payers, collections per staff member, occupancy (by hour, by day, peaks, average stay); CSV export |
| GET / PATCH | `/manage/spaces/:spaceId/data-reports[/:id]` | 🏢 | resolve with an optional note, or dismiss (the owner keeps them once the space is verified) |
| GET / PATCH | `/manage/spaces/:spaceId/settings` | 🏢 | auto check-out rule, visit rounding rule |
| GET | `/manage/spaces/:spaceId/audit-log` | 🏢 | |

#### Admin (`/admin/...`, 🛡)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | aggregate numbers only |
| GET / POST | `/admin/spaces` | list with filters; create unverified space |
| PATCH / DELETE | `/admin/spaces/:spaceId` | edit profile and facts while the space is unverified; hide or unhide and soft delete any space |
| POST / DELETE | `/admin/spaces/:spaceId/managers[/:userId]` | link / unlink an owner |
| POST | `/admin/owners` | create an OWNER account (temporary password, must change) |
| GET / PATCH | `/admin/users[/:userId]` | search; suspend; change role |
| POST | `/admin/users/:userId/temporary-password` | recovery for a user who lost access to their email; must change at first sign-in |
| GET / PATCH | `/admin/data-reports[/:id]` | read all; resolve (with an optional note) or dismiss those of unverified spaces |
| CRUD | `/admin/governorates`, `/admin/areas`, `/admin/amenities` | bilingual lookups; hide and restore with the active flag |
| GET | `/admin/audit-log` | |
| GET / PATCH | `/admin/settings` | contact info, defaults |

## Data model

Built: the Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), owns every entity and field, and [data-model.md](../architecture/data-model.md) owns the conventions, derived values and constraints.
