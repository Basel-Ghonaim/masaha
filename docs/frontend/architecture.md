# Frontend Architecture

> **Status:** Active · **Class:** Contract — rules to build against; the zones and the dependency rule (§1) are enforced by lint; `shared/localisation`, `shared/copy`, `shared/preferences` (§4), and the catalogue registration and the provider composition (`providers.tsx`) in `app/` (§1), and the development-only `showcase` group (§2), are built; the layout tree and the two page groups (§2), the dashboard-only rule (§3) and the rest are not yet implemented · **Last Updated:** 2026-10-03 · **Owner:** Basel Ghoneim
> **Authority:** The zones of `apps/web`, the dependency rule, the boundary between the public site and the dashboard, the capability layout, routing and role guards. Why the site and the dashboard are one application is in [ADR 0011](../architecture/decisions/0011-one-web-app.md); data and state choices are in [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md); the design system is owned by [design-system/foundation.md](design-system/foundation.md); localisation by [localisation.md](localisation.md).

## 1. Four zones

**app assembles · pages compose · features own · shared provides**

| Zone | Owns | May import |
|---|---|---|
| `app/` | Composition root: bootstrap (inject the token getter, register catalogues), providers, composed in one component (`providers.tsx` › `AppProviders`: QueryClient, DirectionProvider), router | pages, features, shared |
| `pages/` | One folder per **page group**: its route subtree, layout, and the loading / error / empty states of what it arranges. The only zone that combines several features | features, shared |
| `features/` | One folder per **capability**: a fact and the operations on it | shared |
| `shared/` | The platform: `design-system`, `api` (Axios client, refresh), `errors` (AppError), `session`, `preferences`, `localisation`, `copy`, `routing`, `map`, `lib` | shared (the design system imports nothing outside itself) |

**Dependency rule:** `app → pages → features → shared`, one direction only. **No sibling imports** (feature → feature, page group → page group). Held by path aliases (`@app/*`, `@pages/*`, `@features/*`, `@shared/*`), barrel-only imports, and `eslint-plugin-boundaries`.

## 2. Page groups

**Two domains, one application** ([ADR 0011](../architecture/decisions/0011-one-web-app.md)): the **site** and the **dashboard**, one page group each.

| Group | Area | Routes | Guard (per route) |
|---|---|---|---|
| `site` | public | `/`, `/spaces`, `/spaces/:slug`, `/about` | none |
| | auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | guests only |
| | account | `/me`, `/me/favorites`, `/me/reports` | signed in |
| `dashboard` | admin, space | `/dashboard` (redirects, below), `/dashboard/admin/...`, `/dashboard/spaces/:spaceId/...` ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)) | `admin/...`: ADMIN · `spaces/:spaceId/...`: an active link at that space, OWNER or RECEPTION (per route) |
| `showcase` | | `/__showcase/…` | none; **development only**, not in the build |

### The layout tree

```
RootLayout (app)                 ScrollRestoration; a last-resort error state with no shell
├── site
│   ├── SiteLayout               full header + footer
│   │   ├── public/*             home, directory, space details, about, the site's 404
│   │   └── AccountLayout        + the account's side navigation
│   │       └── account/*        favourites, my reports, settings
│   └── FocusLayout              short header (logo, language, theme), no footer
│       └── auth/*               sign in, register, forgot/reset password, the forced change
│                                (the forced change's short header: logo and sign out)
└── dashboard
    └── DashboardLayout          sidebar + top bar (ADR 0016)
        ├── admin/*
        └── spaces/:spaceId/*
```

- **Each level adds one thing** around its `<Outlet/>`.
- **Each domain owns its own shell**, and places the status states inside it.
- **A layout is built with its first consumer.** Not built yet: all of them. `RootLayout` and `SiteLayout` come with the site shell (F-6b), `FocusLayout` with the auth screens (F-5b3), `AccountLayout` with the first account screen, and `DashboardLayout` with the dashboard shells (F-6c).

### The two groups

The `site` and `dashboard` groups have the same structure:

```
app/
  router.tsx        RootLayout + siteRoutes + dashboardRoutes + showcase (development only)
  RootLayout.tsx
pages/
  site/
    index.ts        siteRoutes: the group's only export
    shell/          SiteLayout, SiteHeader, SiteFooter, SiteMenu (phone), FocusLayout
    navigation.ts   the site's links: configuration, no logic
    public/         home, directory, space details, about
    auth/           sign in, register, forgot and reset password, the forced change
    account/        AccountLayout and its screens
  dashboard/
    index.ts        dashboardRoutes: the group's only export
    shell/          DashboardLayout, sidebar, top bar, space switcher
    navigation.ts   the navigation config per role
    admin/          platform screens (ADMIN)
    space/          the screens of the space in the URL (OWNER, RECEPTION)
```

- **Lazy loading.**
  - A group's `index.ts` exports **route definitions only**. Their components load through React Router's `lazy`, so a visitor to the site never downloads dashboard code.
  - Each site page loads lazily on its own.
- **The language and theme toggles.**
  - Their visual controls are the design system's `LanguageToggle` and `ThemeToggle`.
  - Each shell wires them to `shared/preferences` itself, in a line or two. There is no shared "connected toggle": `shared/preferences` stays without UI, and the two groups cannot import each other.
  - The theme toggle sets the opposite of the theme shown (§4).
- **The status states** live in `shared/routing`: `NotFoundState`, `RouteErrorState`, and a pure `classifyRouteError`.
  - They are route-level elements, built on the design system's `EmptyState`.
  - They take their actions as props. The site's 404 offers "Home" and "Browse spaces"; the dashboard's will offer its own.
  - Each domain renders them inside its own shell. Its error boundary sits on a pathless route just under its layout, because React Router renders a boundary in place of its own route's element. An error in a shell itself reaches the root's state, which has no shell.
  - `RouteErrorState` shows **offline** for a failed lazy load or when the browser reports no connection, and the **general error** otherwise. "Try again" reloads the page, and so does the browser's `online` event: React Router keeps a failed lazy load for its route, so only a reload retries it.
- **Guards sit visibly on each route** (`<RequireRole roles={['OWNER']}>`), never inherited silently from the group.
- The dashboard's **navigation config per role** belongs to the `dashboard` page group, because choosing what appears together is composition. Features stay role-agnostic: the page passes the scope (`mine` for an owner, `all` for the admin).
- In the dashboard, `OWNER` and `RECEPTION` are the user's role **at the space in the URL**, never the global role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)). The selected space is the `:spaceId` of the route, never client state; the space switcher only navigates ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).
- UI hiding is for usability only; the server is the authority.
- **`showcase`** is a development tool for the design-system layer ([foundation §3](design-system/foundation.md#3-architecture)). `app/router.tsx` mounts it only when `import.meta.env.DEV`, so a build leaves it out; `check:build` fails if any of it reaches the build.

### Landing and guards

Not built yet: F-5b2 builds the guards and F-6c the landing and the switcher.

- **Identifiers in URLs:** the dashboard uses a space's id (`/dashboard/spaces/:spaceId/...`); the public pages use its slug (`/spaces/:slug`).
- **Landing after sign-in:**
  1. the return URL, when there is one;
  2. otherwise the admin goes to the admin's overview;
  3. a user with space links goes to the last space they used, on the page their link's role there gives: the overview for `OWNER`, the front desk for `RECEPTION`. When no space is remembered, or the remembered one is no longer an active link (a first sign-in, a link deactivated or removed), they go to their oldest active link, by the same rule. How the last space is remembered is F-6c's choice;
  4. `/dashboard` itself redirects by the same rules.
- **Failed guards:**
  - a guest goes to sign-in, with the return URL;
  - a signed-in user without access gets a clear 403 page, never a silent redirect;
  - an unknown space gets a 404 page.
- **The space switcher** shows for anyone with more than one active link, whatever their role at each.

## 3. Capabilities (features)

| Imported by | Capabilities |
|---|---|
| Any page group | `auth` · `directory` (the directory and the public profile) · `favorites` · `occupancy` · `announcements` · `data-reports` · `lookups` · `platform-settings` (the public contact) · `users` (the account's profile and settings; the admin's user screens) |
| The dashboard only | `spaces` (owner and admin profile editing) · `space-settings` · `customers` · `subscriptions` (with their check-ins) · `packages` · `visits` · `payments` · `desk` (the front desk: check-in, check-out with payment, subscribe with payment; the customers list and file) · `finance` (finance and statistics, with the occupancy reports) · `overview` (the owner's and the admin's overview) · `staff` · `owners` (admin linking) · `audit` |

**Names match the backend.** A capability carries the name of the backend module it calls ([backend conventions §7](../backend/conventions.md#7-modules)). A feature may be finer than its module only when it serves a different audience on different screens: `staff` (the owner's reception accounts) and `owners` (the admin's linking) are two features over the one `space-links` module. A sub-part with the same audience and the same screens stays inside its module's feature. Check-ins stay in `subscriptions`, for example, because a check-in changes the subscription's progress: split apart, one feature would have to import the other's query keys. Whether a feature exports screens or only hooks is not decided yet.

**The dashboard-only rule:** `pages/site` never imports a dashboard-only capability, so the site never pulls dashboard code in. The dashboard may import any capability. Lint will hold this rule, as it holds the zones (§1); the rule comes with F-6c.

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
- `shared/preferences` (Zustand), **built**: the language, the theme choice and the theme shown. No UI; F-6 builds the settings select and the top-bar toggles on it.
  - **Derived, never listed.** The languages are those with a catalogue (`CATALOGUES`); the themes are those the design system exports (`THEMES`). Adding either touches no preferences code.
  - **Theme choice:** a theme, or `system`, which stores nothing and follows the device's `prefers-color-scheme` live while it is the choice. The top-bar toggle sets the opposite of the theme shown, as an explicit choice.
  - **Persisted** as plain strings at the keys the pre-paint script reads ([localisation.md › Mechanism](localisation.md#mechanism)), never in Zustand's own `persist` format. Each change writes `lang`, `dir` and `data-theme` on `<html>`, and reaches every open tab through the `storage` event.
  - Read in a component with `usePreferences(select)`, elsewhere with `getPreferences()`.

## 5. Errors

One normaliser turns any failure (Axios, network, timeout, unknown) into `AppError { type, status, code?, errors?, requestId? }`. Screens pick catalogue text from `code` or `type`; no raw error ever reaches a component.

`requestId` is the server's request id ([api-contract §1](../api/api-contract.md#1-conventions)), present whenever the server answered. Error states show it, so a user's report can be matched to the log. Planned: F-5b builds it.

## 6. Map

`shared/map` wraps React Leaflet and OpenStreetMap tiles (loaded lazily). Space markers and popups belong to the `directory` feature.

## 7. Server state

TanStack Query holds the server state ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md)). Not built yet: these rules apply from the first feature that fetches.

- **Query keys start with their scope:**
  - `['space', spaceId, '<capability>', …]` for a space's data;
  - `['me', …]` for the signed-in user's own;
  - `['public', …]` for the public site's.
- **Invalidation:** each feature invalidates only its own keys. `desk`'s operations span several capabilities, so they invalidate the whole `['space', spaceId]` prefix, without importing the other features.
- **Retries:**
  - queries are always retried;
  - a mutation is retried only when it carries an idempotency key ([backend conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). The key is generated once per user action and reused on every retry of it.
- **Polling:**
  - the live status every 60 s, paused while the tab is hidden ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md));
  - the front desk's list of who is present every 30 s, and on window focus.
- **Optimistic updates** never for money or presence; only for favourites.
- **Offline:** there is no offline queue. A lost connection shows a clear "no connection" state, and the user retries.
