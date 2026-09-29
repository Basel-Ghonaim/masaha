# Frontend Architecture

> **Status:** Active · **Class:** Contract — rules to build against; the zones and the dependency rule (§1) are enforced by lint, and the development-only `showcase` group (§2) is built; the rest is not yet implemented · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
> **Authority:** The zones of `apps/web`, the dependency rule, the capability layout, routing and role guards. Data and state choices are in [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md); the design system is owned by [design-system/foundation.md](design-system/foundation.md); localisation by [localisation.md](localisation.md).

## 1. Four zones

**app assembles · pages compose · features own · shared provides**

| Zone | Owns | May import |
|---|---|---|
| `app/` | Composition root: bootstrap (inject the token getter, register catalogues), providers (QueryClient, DirectionProvider, theme), router | pages, features, shared |
| `pages/` | One folder per **page group**: its route subtree, layout, and the loading / error / empty states of what it arranges. The only zone that combines several features | features, shared |
| `features/` | One folder per **capability**: a fact and the operations on it | shared |
| `shared/` | The platform: `design-system`, `api` (Axios client, refresh), `errors` (AppError), `session`, `preferences`, `localisation`, `copy`, `routing`, `map`, `lib` | shared (the design system imports nothing outside itself) |

**Dependency rule:** `app → pages → features → shared`, one direction only. **No sibling imports** (feature → feature, page group → page group). Held by path aliases (`@app/*`, `@pages/*`, `@features/*`, `@shared/*`), barrel-only imports, and `eslint-plugin-boundaries`.

## 2. Page groups

| Group | Routes | Guard |
|---|---|---|
| `public` | `/`, `/spaces`, `/spaces/:slug`, `/about` | none |
| `auth` | `/login`, `/register`, `/forgot-password`, `/reset-password` | guests only |
| `account` | `/me`, `/me/favorites`, `/me/reports` | signed in |
| `dashboard` | `/dashboard/...` | ADMIN, or an active space link, OWNER or RECEPTION (per route) |
| `showcase` | `/__showcase`, `/__showcase/preview` | none; **development only**, not in the build |

- A page group's barrel exports its **route subtree**, not individual screens.
- **Guards sit visibly on each route** (`<RequireRole roles={['OWNER']}>`), never inherited silently from the group.
- The dashboard's **navigation config per role** belongs to the `dashboard` page group, because choosing what appears together is composition. Features stay role-agnostic: the page passes the scope (`mine` for an owner, `all` for the admin).
- In the dashboard, `OWNER` and `RECEPTION` are the user's role **at the space selected** in the space switcher, never the global role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).
- UI hiding is for usability only; the server is the authority.
- **`showcase`** is a development tool for the design-system layer ([foundation §3](design-system/foundation.md#3-architecture)). `app/router.tsx` mounts it only when `import.meta.env.DEV`, so a build leaves it out; `check:build` fails if any of it reaches the build.

## 3. Capabilities (features)

`auth` · `spaces` (directory and public profile) · `space-management` (owner/admin profile editing) · `customers` · `subscriptions` · `packages` · `visits` · `attendance` (subscription check-ins) · `payments` · `occupancy` · `announcements` · `finance` (finance and statistics, with the occupancy reports) · `staff` · `data-reports` · `favorites` · `owners` (admin linking) · `users` · `lookups` · `audit` · `settings`

### Capability layout

```
features/<capability>/
  index.ts      public surface — the only way in
  model/        types and entities
  api.ts        Axios calls + TanStack Query hooks (query keys live here)
  hooks/        what screens consume, when more than a query hook is needed
  forms/        react-hook-form setups using schemas from packages/shared
  screens/      presentation only
```

A layer the capability does not need is **absent, not empty**. A screen only presents: no Axios calls, no business rules the server also enforces.

## 4. Session and preferences

- `shared/session` (Zustand): user, role, access token, restore status; restore, refresh and sign-out. No UI.
- `features/auth`: sign-in, register, password forms and their error wording.
- `shared/preferences` (Zustand): language and theme, persisted; the app writes `lang`, `dir` and `data-theme` on change.

## 5. Errors

One normaliser turns any failure (Axios, network, timeout, unknown) into `AppError { type, status, code?, errors? }`. Screens pick catalogue text from `code` or `type`; no raw error ever reaches a component.

## 6. Map

`shared/map` wraps React Leaflet and OpenStreetMap tiles (loaded lazily). Space markers and popups belong to the `spaces` feature.
