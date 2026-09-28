# Plan — Masaha v1

> **Status:** Active · **Last Updated:** 2026-09-28 · **Owner:** Basel Ghoneim
> **Authority:** Strategy, sequence and risks for delivering v1. Scope is owned by [overview.md](../project/overview.md); work items and their contracts live in PRs (and Issues when the owner creates them).

## Timeline

16 weeks, from 27 September 2026 to 16 January 2027.

| Phase | Weeks | Output |
|---|---|---|
| 0. Foundation decisions | 1 | This docs set, CLAUDE.md, ADRs 0001–0007 ✔ |
| 1. Visual direction (Claude Design) ✅ | 1 | Chosen palette, fonts, radius, density on 3 anchor screens (light/dark, RTL) — *Sea* |
| 2. Lock tokens + scaffold repo | 1–2 | Token values in foundation.md ✅; monorepo, lint, typecheck, CI — [design-system-layer.md](historical/design-system-layer.md) WI-1–2. The API and database skeleton moves alongside phase 4 |
| 3. Design-system layer in code | 2–3 | Tokens, themes, pre-paint script, adapted shadcn components; synced into Claude Design — [design-system-layer.md](historical/design-system-layer.md) WI-3–9 · layer built ✅; synced ✅ |
| 4. Screen design (Claude Design) | 3–5 | 27 screens (phone + desktop, light + dark, key screens LTR). In parallel: API skeleton, PostgreSQL, Prisma init, `test:api` in CI |
| 5. Technical design | 5 | Prisma schema, permission table, API contract finalised |
| 6. Build | 6–12 | Foundation (auth, session, i18n, shells) → directory → admin → owner dashboard → attendance, occupancy, reports |
| 7. Test and evaluate | 13–14 | Functional tests, occupancy scenarios on seeded data, usability test with students and freelancers |
| 8. Report and defence | 15–16 | Final report, presentation, rehearsal |

## Sequence inside the build

Each slice is complete (table → API → screen → tests) before the next begins:

1. Auth and session, role guards, dashboard and public shells, language and theme switching.
2. Lookups and admin space management (seed the survey data).
3. Public directory: list, map, filters, space page.
4. Admin owner linking → verified spaces.
5. Owner space profile.
6. Members.
7. Attendance, live occupancy, auto check-out.
8. Announcements, data reports, favourites.
9. Occupancy reports, audit log, settings.

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

Legend: 🌐 public · 👤 any signed-in user · 🏢 OWNER of that space · 🛡 ADMIN

#### Auth
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | 🌐 | → `{ user, accessToken }` + refresh cookie |
| POST | `/auth/login` | 🌐 | email or phone + password |
| POST | `/auth/refresh` | cookie | → `{ user, accessToken }`; rotation with 30 s grace |
| POST | `/auth/logout` | cookie | 204 |
| POST | `/auth/password/forgot` | 🌐 | always 202 |
| POST | `/auth/password/reset` | 🌐 | token + new password |
| POST | `/auth/password/change` | 👤 | required on first login for new owners |

#### Me
| Method | Path | Access |
|---|---|---|
| GET / PATCH | `/me` | 👤 name, phone, language |
| GET | `/me/favorites` · POST / DELETE `/me/favorites/:spaceId` | 👤 |
| GET | `/me/reports` | 👤 |

#### Public directory
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/spaces` | 🌐 | filters: `area`, `priceMin`, `priceMax`, `period`, `amenities`, `verified`, `availableNow`, `q`; sort |
| GET | `/spaces/:slug` | 🌐 | full public profile incl. announcements and freshness |
| GET | `/spaces/:slug/occupancy` | 🌐 | `{ capacity, present, available }` — verified spaces only |
| POST | `/spaces/:slug/reports` | 👤 | report wrong information |
| GET | `/lookups` | 🌐 | areas and amenities, both languages |
| GET | `/settings/public` | 🌐 | contact email and WhatsApp |

#### Owner — managed spaces (`/manage/spaces/:spaceId/...`, 🏢)
| Method | Path | Notes |
|---|---|---|
| GET | `/manage/spaces` | spaces the caller manages |
| GET / PATCH | `/manage/spaces/:spaceId` | profile, hours, prices, amenities, contact |
| POST / DELETE | `/manage/spaces/:spaceId/photos[/:photoId]` | upload, remove, reorder |
| GET / POST | `/manage/spaces/:spaceId/members` | list (search, status filter), create |
| PATCH / DELETE | `/manage/spaces/:spaceId/members/:memberId` | edit, deactivate (soft) |
| GET | `/manage/spaces/:spaceId/check-ins` | `?open=true` or date range |
| POST | `/manage/spaces/:spaceId/check-ins` | `{ memberId }` or `{ visitorName }` |
| POST | `/manage/spaces/:spaceId/check-ins/:checkInId/check-out` | |
| GET / POST | `/manage/spaces/:spaceId/announcements` | |
| PATCH / DELETE | `/manage/spaces/:spaceId/announcements/:id` | |
| GET | `/manage/spaces/:spaceId/reports/occupancy` | by hour, by day, peaks, average stay |
| GET / PATCH | `/manage/spaces/:spaceId/data-reports[/:id]` | resolve or dismiss |
| GET / PATCH | `/manage/spaces/:spaceId/settings` | auto check-out rule |
| GET | `/manage/spaces/:spaceId/audit-log` | |

#### Admin (`/admin/...`, 🛡)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | aggregate numbers only |
| GET / POST | `/admin/spaces` | list with filters; create unverified space |
| PATCH / DELETE | `/admin/spaces/:spaceId` | edit profile; hide; soft delete |
| POST / DELETE | `/admin/spaces/:spaceId/managers[/:userId]` | link / unlink an owner |
| POST | `/admin/owners` | create an OWNER account (temporary password, must change) |
| GET / PATCH | `/admin/users[/:userId]` | search; suspend; change role |
| GET / PATCH | `/admin/data-reports[/:id]` | |
| CRUD | `/admin/areas`, `/admin/amenities` | bilingual lookups |
| GET | `/admin/audit-log` | |
| GET / PATCH | `/admin/settings` | contact info, defaults |

## Planned data model

Moves into [data-model.md](../architecture/data-model.md) and the Prisma schema in the technical-design phase.

| Entity | Key fields | Relations |
|---|---|---|
| `User` | email (unique), phone, passwordHash, name, role (`USER`/`OWNER`/`ADMIN`), language, mustChangePassword, suspendedAt | managed spaces, favourites, reports, sessions |
| `RefreshToken` | tokenHash, expiresAt, rotatedAt, replacedById | belongs to User (cascade) |
| `Space` | slug, nameAr/En, descriptionAr/En, addressAr/En, areaId, lat, lng, capacity, phone, whatsapp, email, isHidden, deletedAt, profileUpdatedAt | area, managers, hours, prices, amenities, photos, members, check-ins, announcements, reports |
| `SpaceManager` | spaceId + userId (composite PK), role (`OWNER` only in v1) | Space, User |
| `Area` | nameAr, nameEn, sortOrder | spaces |
| `Amenity` | key, nameAr, nameEn, icon | via `SpaceAmenity` |
| `SpaceAmenity` | spaceId + amenityId | |
| `SpaceHours` | spaceId, dayOfWeek, opensAt, closesAt, isClosed | Space |
| `SpacePrice` | spaceId, period (`HOUR`/`DAY`/`WEEK`/`MONTH`), amountAgorot, currency, updatedAt | Space |
| `SpacePhoto` | spaceId, path, sortOrder | Space |
| `Member` | spaceId, name, phone, membershipType, startsOn, endsOn, userId (nullable, unused in v1), deletedAt | Space, check-ins |
| `CheckIn` | spaceId, memberId (nullable), visitorName (nullable), checkedInAt, checkedOutAt, method (`MANUAL`), checkoutMethod (`MANUAL`/`AUTO`) | Space, Member |
| `Announcement` | spaceId, type, textAr, textEn, startsAt, endsAt, deletedAt | Space |
| `DataReport` | spaceId, userId, field, message, status (`OPEN`/`RESOLVED`/`DISMISSED`), resolvedById | Space, User |
| `Favorite` | userId + spaceId | |
| `Setting` | key, value | platform settings |
| `AuditLog` | actorId, action, entityType, entityId, spaceId, before, after, createdAt | |
