# Frontend Architecture

> **Status:** Active · **Class:** Contract — rules to build against; the zones and the dependency rule (§1) are enforced by lint; `shared/localisation`, `shared/copy` and the catalogue registration in `app/` (§1), and the development-only `showcase` group (§2), are built; the site and dashboard boundary (lazy page groups in §2, the dashboard-only rule in §3) and the rest are not yet implemented · **Last Updated:** 2026-10-01 · **Owner:** Basel Ghoneim
> **Authority:** The zones of `apps/web`, the dependency rule, the boundary between the public site and the dashboard, the capability layout, routing and role guards. Why the site and the dashboard are one application is in [ADR 0011](../architecture/decisions/0011-one-web-app.md); data and state choices are in [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md); the design system is owned by [design-system/foundation.md](design-system/foundation.md); localisation by [localisation.md](localisation.md).

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

- **Two domains, one application** ([ADR 0011](../architecture/decisions/0011-one-web-app.md)): the **site** is `public`, `auth` and `account`; the **dashboard** is `dashboard`.
- A page group's barrel exports its **route subtree**, not individual screens. `app/router.tsx` mounts each subtree **lazily**, so a visitor to the site downloads no dashboard code.
- **Guards sit visibly on each route** (`<RequireRole roles={['OWNER']}>`), never inherited silently from the group.
- The dashboard's **navigation config per role** belongs to the `dashboard` page group, because choosing what appears together is composition. Features stay role-agnostic: the page passes the scope (`mine` for an owner, `all` for the admin).
- In the dashboard, `OWNER` and `RECEPTION` are the user's role **at the space selected** in the space switcher, never the global role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).
- Inside the `dashboard` group, the shell and the navigation are kept apart from the screens of each area:

  ```
  pages/dashboard/
    index.ts        the route subtree, the group's only export
    shell/          layout, sidebar, top bar, space switcher
    navigation.ts   the navigation config per role
    admin/          platform screens (ADMIN)
    space/          the selected space's screens (OWNER, RECEPTION)
  ```
- UI hiding is for usability only; the server is the authority.
- **`showcase`** is a development tool for the design-system layer ([foundation §3](design-system/foundation.md#3-architecture)). `app/router.tsx` mounts it only when `import.meta.env.DEV`, so a build leaves it out; `check:build` fails if any of it reaches the build.

## 3. Capabilities (features)

| Imported by | Capabilities |
|---|---|
| Any page group | `auth` · `directory` (the directory and the public profile) · `favorites` · `occupancy` · `announcements` · `data-reports` · `lookups` · `platform-settings` (the public contact) · `users` (the account's profile and settings; the admin's user screens) |
| The dashboard only | `spaces` (owner and admin profile editing) · `space-settings` · `customers` · `subscriptions` (with their check-ins) · `packages` · `visits` · `payments` · `desk` (the front desk: check-in, check-out with payment, subscribe with payment; the customers list and file) · `finance` (finance and statistics, with the occupancy reports) · `overview` (the owner's and the admin's overview) · `staff` · `owners` (admin linking) · `audit` |

**Names match the backend.** A capability carries the name of the backend module it calls ([backend conventions §7](../backend/conventions.md#7-modules)). A feature may be finer than its module only when it serves a different audience on different screens: `staff` (the owner's reception accounts) and `owners` (the admin's linking) are two features over the one `space-links` module. A sub-part with the same audience and the same screens stays inside its module's feature. Check-ins stay in `subscriptions`, for example, because a check-in changes the subscription's progress: split apart, one feature would have to import the other's query keys. Whether a feature exports screens or only hooks is not decided yet.

**The dashboard-only rule:** the site's page groups (`public`, `auth`, `account`) never import a dashboard-only capability, so the site never pulls dashboard code in. The dashboard may import any capability. Lint holds this rule, as it holds the zones (§1).

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

One normaliser turns any failure (Axios, network, timeout, unknown) into `AppError { type, status, code?, errors?, requestId? }`. Screens pick catalogue text from `code` or `type`; no raw error ever reaches a component.

`requestId` is the server's request id ([api-contract §1](../api/api-contract.md#1-conventions)), present whenever the server answered. Error states show it, so a user's report can be matched to the log. Planned: F-5 builds it.

## 6. Map

`shared/map` wraps React Leaflet and OpenStreetMap tiles (loaded lazily). Space markers and popups belong to the `directory` feature.
