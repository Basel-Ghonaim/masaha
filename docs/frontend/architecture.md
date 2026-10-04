# Frontend Architecture

> **Status:** Active · **Class:** Contract — rules to build against; the zones and the dependency rule (§1), and Axios only inside `shared/api`, are enforced by lint; `shared/localisation`, `shared/copy`, `shared/preferences` (§4), `shared/errors` (§5), `shared/api` (§7), `shared/session` (§4), and the catalogue registration, the transport's setup, the session's wiring, the one QueryClient and the provider composition (`providers.tsx`) in `app/` (§1), and the development-only `showcase` group (§2), are built; so are the root of the layout tree and the `site` group's shell, with its toggles and lazy pages, and the status states and the four route guards in `shared/routing` (§2); the rest of the layout tree, the `dashboard` group (§2), the dashboard-only rule (§3) and the rest are not yet implemented · **Last Updated:** 2026-10-04 · **Owner:** Basel Ghoneim
> **Authority:** The zones of `apps/web`, the dependency rule, the boundary between the public site and the dashboard, the capability layout, routing and role guards. Why the site and the dashboard are one application is in [ADR 0011](../architecture/decisions/0011-one-web-app.md); data and state choices are in [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md); the design system is owned by [design-system/foundation.md](design-system/foundation.md); localisation by [localisation.md](localisation.md).

## 1. Four zones

**app assembles · pages compose · features own · shared provides**

| Zone | Owns | May import |
|---|---|---|
| `app/` | Composition root: bootstrap (register catalogues, hand the transport the session's token getter and refresh, create the one QueryClient, connect the session to it and to the preferences, start the restore), providers, composed in one component (`providers.tsx` › `AppProviders`: QueryClient, DirectionProvider), router | pages, features, shared |
| `pages/` | One folder per **page group**: its route subtree, layout, and the loading / error / empty states of what it arranges. The only zone that combines several features | features, shared |
| `features/` | One folder per **capability**: a fact and the operations on it | shared |
| `shared/` | The platform: `design-system`, `api` (Axios client, refresh), `errors` (AppError), `session`, `preferences`, `localisation`, `copy`, `routing`, `map`, `lib` | shared (the design system imports nothing outside itself) |

**Dependency rule:** `app → pages → features → shared`, one direction only. **No sibling imports** (feature → feature, page group → page group). Held by path aliases (`@app/*`, `@pages/*`, `@features/*`, `@shared/*`), barrel-only imports, and `eslint-plugin-boundaries`.

**Inside a module:** a `shared/` module or a feature groups its files into folders by role (`guards/`, `states/`, `services/`, `hooks/`, …) once it holds more than one role, so its roles read from its tree and its surface stays one file: inner folders have no `index.ts`, and the module's `index.ts` stays its only entry. Its core (its model, its store, a helper every role uses) may stay at the root, a module with a single role stays flat, and tests stay beside the files they prove. The design-system layer, whose layout [foundation §3](design-system/foundation.md#3-architecture) owns, and the copy's language folders are exempt.

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
- **A layout is built with its first consumer.**
  - Built: `RootLayout` and `SiteLayout`, with the site's header, footer and phone menu.
  - Not built yet: `FocusLayout`, with the auth screens (F-5b3); `AccountLayout`, with the first account screen; `DashboardLayout`, with the dashboard shell (F-6c2).

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

Built so far: `app/` (without `dashboardRoutes`), and in `pages/site` its `index.ts`, `navigation.ts`, the site shell and the placeholder public pages. The `dashboard` group, `FocusLayout`, `auth/`, `account/` and the space details page are not built yet.

- **Lazy loading.**
  - A group's `index.ts` exports **route definitions only**. Their components load through React Router's `lazy`, so a visitor to the site never downloads dashboard code.
  - Each site page loads lazily on its own.
- **The language and theme toggles.**
  - Their visual controls are the design system's `LanguageToggle` and `ThemeToggle`.
  - Each shell wires them to `shared/preferences` itself, in a line or two. There is no shared "connected toggle": `shared/preferences` stays without UI, and the two groups cannot import each other.
  - The theme toggle sets the opposite of the theme shown (§4).
- **The status states** live in `shared/routing`: `NotFoundState`, `ForbiddenState`, `RouteErrorState`, and a pure `classifyRouteError`. They are built; the site shows the first and the third, and `RequireRole` the 403.
  - They are route-level elements, built on the design system's `EmptyState`.
  - They take their actions as props. The site's 404 offers "Home" and "Browse spaces"; the dashboard's will offer its own.
  - Each domain renders them inside its own shell. Its error boundary sits on a pathless route just under its layout, because React Router renders a boundary in place of its own route's element. An error in a shell itself reaches the root's state, which has no shell.
  - `RouteErrorState` shows **offline** for a failed lazy load or when the browser reports no connection, and the **general error** otherwise. "Try again" reloads the page, and so does the browser's `online` event: React Router keeps a failed lazy load for its route, so only a reload retries it.
- **Guards sit visibly on each route** (`<RequireRole roles={['ADMIN']}>`), never inherited silently from the group.
- The dashboard's **navigation config per role** belongs to the `dashboard` page group, because choosing what appears together is composition. Features stay role-agnostic: the page passes the scope (`mine` for an owner, `all` for the admin).
- In the dashboard, `OWNER` and `RECEPTION` are the user's role **at the space in the URL**, never the global role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)). The selected space is the `:spaceId` of the route, never client state; the space switcher only navigates ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).
- UI hiding is for usability only; the server is the authority.
- **`showcase`** is a development tool for the design-system layer ([foundation §3](design-system/foundation.md#3-architecture)). `app/router.tsx` mounts it only when `import.meta.env.DEV`, so a build leaves it out; `check:build` fails if any of it reaches the build.

### Landing and guards

**Built:** the four guards in `shared/routing`, each made to wrap its route's page and to read the session (§4). No route uses one yet: the account and auth pages bring the first uses (F-5b3), and the dashboard's shell the first of `RequireSpaceRole` (F-6c2).

| Guard | Lets through | Otherwise |
|---|---|---|
| `RequireAuth` | a signed-in user | a guest goes to sign-in |
| `RequireRole roles={[…]}` | a signed-in user with one of the global roles | a guest goes to sign-in; another role sees `ForbiddenState`, a 403, in place |
| `RequireGuest` | a guest (the auth pages) | a signed-in user goes on to the return URL, else `/` |
| `RequireSpaceRole roles={[…]}` | a signed-in user whose active link at the `:spaceId` in the URL has one of the roles, `OWNER` or `RECEPTION`, read from the session's links, never the global role | a guest goes to sign-in; a `:spaceId` that is not a positive integer gets `NotFoundState`, a 404; a space with no active link, or a role the route does not allow, gets `ForbiddenState`, a 403; both in place |

- **While the session is restored,** every guard shows the design system's `Spinner`, centred. **While it is `unreachable`,** the offline state (no answer came back) or the general error (an answer that is not a verdict), whose "Try again", and the connection coming back when offline, re-run the restore.
- **The return URL** travels as `?next=` on `/login` (`signInPath`). It is read back with `safeReturnUrl`, which accepts only a path on this site, so a crafted link cannot send a user elsewhere.

**Not built yet** (F-6c): the landing below, which replaces `RequireGuest`'s return URL or `/`, and the switcher.

- **Identifiers in URLs:** the dashboard uses a space's id (`/dashboard/spaces/:spaceId/...`); the public pages use its slug (`/spaces/:slug`).
- **The dashboard's URL shape** ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)) lives in `shared/routing` (`dashboardPaths.ts`), not in the `dashboard` group: the space guard and the landing read it, and `shared/` never imports `pages/`.
- **Landing after sign-in:**
  1. the return URL, when there is one;
  2. otherwise the admin goes to the admin's overview;
  3. a user with space links goes to the last space they used, on the page their link's role there gives: the overview for `OWNER`, the front desk for `RECEPTION`. When no space is remembered, or the remembered one is no longer an active link (a first sign-in, a link deactivated or removed), they go to their oldest active link, by the same rule. How the last space is remembered is F-6c's choice;
  4. `/dashboard` itself redirects by the same rules.
- **Failed guards:**
  - a guest goes to sign-in, with the return URL;
  - a signed-in user without access gets a clear 403 page, never a silent redirect;
  - a `:spaceId` that is not a positive integer gets a 404; a space the user holds no active link to, whether it exists or not, gets a 403.
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
  api.ts        calls through `api` (`@shared/api`, §7) + TanStack Query hooks (query keys live here)
  hooks/        what screens consume, when more than a query hook is needed
  forms/        react-hook-form setups using schemas from packages/shared
  screens/      presentation only
```

A layer the capability does not need is **absent, not empty**. A screen only presents: no Axios calls, no business rules the server also enforces.

A feature's wire types, its requests and the server's answers, come from `@masaha/shared/<module>` ([shared-package.md](../architecture/shared-package.md)), never a copy.

## 4. Session and preferences

- `shared/session` (Zustand), **built**: the session's state, its restore, refresh and sign-out ([ADR 0003](../architecture/decisions/0003-session-model.md)). No UI.
  - **What it holds:** the `SessionUser` and the access token exactly as the server sends them (the contract's types from `@masaha/shared`, no copy and no mapper), and the status. The token lives in memory only.
  - **The status:** `restoring`, `authenticated`, `anonymous`, or `unreachable` with its reason, `offline` (no answer, or a timeout) or `error` (an answer that is not a verdict).
  - **Read** in a component with `useSession(select)`, elsewhere with `getSession()`. The raw store is never exported; only the session's own functions write it.
  - **The endpoints** are `refresh` and `logout`, behind one interface (`SessionEndpoints`) whose factory defaults to the app's client, so a test passes a plain fake. Sign-in, registration and Google are `features/auth`'s: they hand their answer to `establishSession(session, { source: 'signIn' })`.
  - **The restore** runs at bootstrap and never blocks a render: public pages show at once, and only the guards wait (§2).
    - no session hint (`masaha_session`): `anonymous` at once, with no request;
    - a hint and a successful refresh: `authenticated`;
    - a refresh refused with 401, or with 403 because the account is suspended (`ACCOUNT_SUSPENDED`): the server's verdict on the session, so the hint is cleared and the status is `anonymous`;
    - any other failure (no connection, a timeout, a 5xx, a 429, or a 403 without that code, such as the API's refusal of a cross-site request, which keeps the cookies): the hint stays and the status is `unreachable`, which the guards offer to retry. A power or internet cut while the site opens never signs the user out.
  - **The refresh** is single-flight: the restore and the transport's 401 (§7) share one request. On success the store holds the new session before the promise resolves, and the transport reads the token from its getter. The same refusals end the session; any other failure leaves it as it was and rejects, so only the request that needed it fails, and the next 401 refreshes again. A refresh that succeeds after the session has ended, because a sign-out was answered first, drops its answer and rejects as `canceled`: it never brings a signed-out session back.
  - **A listener's failure is its own:** each listener of the two events below runs on its own, and an error it throws is logged with `console.error`. It never undoes the session's change, and never stops the other listeners.
  - **Sign-out** is the server's: the session ends here only once `POST /auth/logout` succeeds. A failed request clears nothing, because the refresh cookie would still be valid; `useSignOut()` exposes its pending and error state, and the user retries.
  - **Two events** let the composition root react without the session importing anything: `onSessionEstablished(listener)`, with the source (`signIn`, or `restore` for a restore and a refresh), and `onSessionEnded(listener)`, when a session that was held ends. Bootstrap connects them (`app/session.ts`):
    - a session that ends clears the QueryClient, so the next user never sees the last one's data;
    - a sign-in makes the account's language the interface's; a restore or a refresh never does, so the user's later choice on this device wins.
- `features/auth`: sign-in, register, password forms and their error wording.
- `shared/preferences` (Zustand), **built**: the language, the theme choice and the theme shown. No UI; F-6 builds the settings select and the top-bar toggles on it.
  - **Derived, never listed.** The languages are those with a catalogue (`CATALOGUES`); the themes are those the design system exports (`THEMES`). Adding either touches no preferences code.
  - **Theme choice:** a theme, or `system`, which stores nothing and follows the device's `prefers-color-scheme` live while it is the choice. The top-bar toggle sets the opposite of the theme shown, as an explicit choice.
  - **Persisted** as plain strings at the keys the pre-paint script reads ([localisation.md › Mechanism](localisation.md#mechanism)), never in Zustand's own `persist` format. Each change writes `lang`, `dir` and `data-theme` on `<html>`, and reaches every open tab through the `storage` event.
  - Read in a component with `usePreferences(select)`, elsewhere with `getPreferences()`.

## 5. Errors

One normaliser, `toAppError` in `shared/errors`, turns any failure (Axios, network, timeout, unknown) into `AppError { type, status, code?, errors?, requestId?, retryAfterSeconds? }`. Screens pick catalogue text from `code ?? type`; no raw error ever reaches a component. `AppError` decides a failure's type and never words it: it carries no user-facing message.

- **The type:** the server's envelope type when it is one the contract defines ([api-contract §3](../api/api-contract.md#3-error-types)), else inferred from the status. With no answer, the client's own types: `network`, `timeout`, `canceled`, and `unknown` for anything else. Every type has a line in both catalogues.
- **The domain code** is kept only when the client knows it, so `code ?? type` always has a line.
- **`requestId`** is the server's request id ([api-contract §1](../api/api-contract.md#1-conventions)), from the envelope, else from the `X-Request-Id` header (a proxy's answer has no body), so it is present whenever the server answered. Error states show it, so a user's report can be matched to the log; no error state is built yet.
- **`retryAfterSeconds`** comes from `Retry-After`, in its delta-seconds form only.

## 6. Map

`shared/map` wraps React Leaflet and OpenStreetMap tiles (loaded lazily). Space markers and popups belong to the `directory` feature.

## 7. Server state

TanStack Query holds the server state ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md)). The transport, `shared/api`, is built: one Axios client at `/api/v1`, relative in every environment ([ADR 0014](../architecture/decisions/0014-deployment.md)), with a 15 s timeout a request may override, the token through a getter the composition root hands in (every attempt sends its current token), and single-flight refresh on 401 through a function it hands in. Bootstrap hands it the session's (§4): the getter reads `getSession().accessToken`, and the refresh is `refreshSession`. The QueryClient and its defaults are built: the app makes one, at bootstrap, outside React. The rules on keys, invalidation and polling apply from the first feature that fetches.

- **Calls go through `api`** (`@shared/api`), whose helpers unwrap the envelope ([api-contract §2](../api/api-contract.md#2-response-envelope)), so no capability writes `unwrap` or sees the envelope:
  - `api.get<T>`, `api.post<T>`, `put`, `patch` and `delete` resolve to the envelope's `data`; a 204 resolves with nothing;
  - `api.getPage<T>` resolves to `{ data, meta }`, for a paginated list or an endpoint's own `meta`, such as the front desk's warnings. An answer with no `meta` breaks the contract, so it rejects as `unknown`;
  - a failure rejects with the `AppError` (§5);
  - `apiClient` and `unwrap` stay exported for the rare call the helpers do not fit.

- **Query keys start with their scope:**
  - `['space', spaceId, '<capability>', …]` for a space's data;
  - `['me', …]` for the signed-in user's own;
  - `['public', …]` for the public site's.
- **Invalidation:** each feature invalidates only its own keys. `desk`'s operations span several capabilities, so they invalidate the whole `['space', spaceId]` prefix, without importing the other features.
- **Retries live in one place, the transport.** TanStack Query's own `retry` is off, for queries and mutations, so attempts never multiply:
  - a `GET`, so every query, is retried;
  - a mutation is retried only when it carries an idempotency key ([backend conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). The key is generated once per user action and reused on every retry of it;
  - on a 5xx, a network failure or a timeout, twice, after 1 s and then 2 s. A 4xx is the server's answer and is never retried, 429 included; nor is a cancellation.
- **Query defaults** (`createQueryClient` in `shared/api`):
  - refetch on window focus, so the front desk refreshes when its window comes back;
  - data stays fresh for 30 s (`staleTime`), which spares slow connections a request per screen. A query that must refresh on every focus, such as the desk's list, sets `refetchOnWindowFocus: 'always'`;
  - `networkMode: 'always'`: a lost connection fails as a `network` error the screen shows, never a query paused on `navigator.onLine`, which stays true on a network with no internet; and a mutation is never held back to be sent later (see *Offline*);
  - the rest are TanStack Query's own.
- **Polling:**
  - the live status every 60 s, paused while the tab is hidden ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md));
  - the front desk's list of who is present every 30 s, and on window focus.
- **Optimistic updates** never for money or presence; only for favourites.
- **Offline:** there is no offline queue. A lost connection shows a clear "no connection" state, and the user retries.
