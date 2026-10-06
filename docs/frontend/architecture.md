# Frontend Architecture

> **Status:** Active · **Class:** Contract — rules to build against; the zones and the dependency rule (§1), Axios only inside `shared/api`, and the dashboard-only rule (§3) are enforced by lint, and the dashboard-only rule by `check:build` too; `shared/localisation`, `shared/copy`, `shared/preferences` (§4), `shared/errors` (§5), `shared/api` (§7), `shared/session` (§4), `shared/forms` (§3), `features/auth` (§3: sign-in and registration by email and with Google, and the password recovery) and `features/users` (its account menu, its sign-out button and the forced password change's form), and the catalogue registration, the transport's setup, the session's wiring, the one QueryClient and the provider composition (`providers.tsx`, with the one Toaster) in `app/` (§1), and the development-only `showcase` group (§2), are built; so are the root of the layout tree, the `site` group's shell, with its toggles and lazy pages, and its focus shell with the sign-in, register, forgot and reset password and forced password change pages, and the status states, the four route guards, the password change's gate and its guard, and the landing rule in `shared/routing` (§2); so is the `dashboard` group's shell, with its navigation per role, the space switcher and a placeholder for each page (§2), and its first screen, the admin's lookups, with `features/lookups` (§3); the rest of the layout tree, the dashboard's other screens and the rest are not yet implemented · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The zones of `apps/web`, the dependency rule, the boundary between the public site and the dashboard, the capability layout, routing and role guards. Why the site and the dashboard are one application is in [ADR 0011](../architecture/decisions/0011-one-web-app.md); data and state choices are in [ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md); the design system is owned by [design-system/foundation.md](design-system/foundation.md); localisation by [localisation.md](localisation.md).

## 1. Four zones

**app assembles · pages compose · features own · shared provides**

| Zone | Owns | May import |
|---|---|---|
| `app/` | Composition root: bootstrap (register catalogues, hand the transport the session's token getter and refresh, create the one QueryClient, connect the session to it and to the preferences, start the restore), providers, composed in one component (`providers.tsx` › `AppProviders`: QueryClient, DirectionProvider, and the one `Toaster`, beside the routes so a toast outlives the change of shell after a sign-in), router | pages, features, shared |
| `pages/` | One folder per **page group**: its route subtree, layout, and the loading / error / empty states of what it arranges. The only zone that combines several features | features, shared |
| `features/` | One folder per **capability**: a fact and the operations on it | shared |
| `shared/` | The platform: `design-system`, `api` (Axios client, refresh), `errors` (AppError), `session`, `preferences`, `localisation`, `copy`, `routing`, `forms` (§3), `map`, `lib` | shared (the design system imports nothing outside itself) |

**Dependency rule:** `app → pages → features → shared`, one direction only. **No sibling imports** (feature → feature, page group → page group). Held by path aliases (`@app/*`, `@pages/*`, `@features/*`, `@shared/*`), barrel-only imports, and `eslint-plugin-boundaries`.

**Inside a module:** a `shared/` module or a feature groups its files into folders by role (`guards/`, `states/`, `services/`, `hooks/`, …) once it holds more than one role, so its roles read from its tree and its surface stays one file: inner folders have no `index.ts`, and the module's `index.ts` stays its only entry. Its core (its model, its store, a helper every role uses) may stay at the root, a module with a single role stays flat, and tests stay beside the files they prove. The design-system layer, whose layout [foundation §3](design-system/foundation.md#3-architecture) owns, and the copy's language folders are exempt.

**One responsibility per file** holds in a module and a page group alike (§3 › Capability layout); a page group groups its files into role folders too, such as `pages/dashboard/shell/`.

## 2. Page groups

**Two domains, one application** ([ADR 0011](../architecture/decisions/0011-one-web-app.md)): the **site** and the **dashboard**, one page group each.

| Group | Area | Routes | Guard (per route) |
|---|---|---|---|
| `site` | public | `/`, `/spaces`, `/spaces/:slug`, `/about` | none |
| | auth | `/login`, `/register`, `/forgot-password` | guests only |
| | | `/reset-password` | none: a signed-in person may open a reset link from their email |
| | account | `/me`, `/me/favorites`, `/me/reports` | signed in |
| `dashboard` | admin, space | `/dashboard` (redirects, below), `/dashboard/admin/...`, `/dashboard/spaces/:spaceId/...` ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)) | `admin/...`: ADMIN · `spaces/:spaceId/...`: an active link at that space, OWNER or RECEPTION (per route) |
| `showcase` | | `/__showcase/…` | none; **development only**, not in the build |

### The layout tree

```
RootLayout (app)                 ScrollRestoration; the password change's gate; a last-resort error state with no shell
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
        ├── admin/*              AdminLayout: the admin's header and navigation
        └── spaces/:spaceId/*    SpaceLayout: the space switcher, the navigation of the role there
```

- **Each level adds one thing** around its `<Outlet/>`.
- **Each domain owns its own shell**, and places the status states inside it.
- **A layout is built with its first consumer.**
  - Built: `RootLayout`; `SiteLayout`, with the site's header, footer and phone menu; `FocusLayout`, with sign-in, register, the forgotten password and the reset, and the forced change, for which the route gives the header sign-out as its only action; `DashboardLayout`, with the dashboard's two branches.
  - Not built yet: `AccountLayout`, with the first account screen.

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
    shell/          DashboardLayout, AdminLayout, SpaceLayout, the top bar and the page's header
    navigation.ts   each branch's pages, and the roles each space page allows: configuration, no logic
    admin/          platform screens (ADMIN)
    space/          the screens of the space in the URL (OWNER, RECEPTION)
```

Built so far: `app/`, and in `pages/site` its `index.ts`, `navigation.ts`, the site shell with `FocusLayout`, the placeholder public pages, and in `auth/` the sign-in, register, forgot and reset password and forced password change pages; in `pages/dashboard` its `index.ts`, `navigation.ts`, the shell, the `/dashboard` redirect and one `PlaceholderPage`, which titles each page from its navigation item until the page is built, and in `admin/` the lookups page. The dashboard's other screens (`admin/`, `space/`), `account/` and the space details page are not built yet.

- **The dashboard's shell.**
  - The sidebar takes the design system's `Sidebar` form for each width. Its header is the space switcher in a space, and the wordmark with "Platform admin" for the admin; its foot links a space's public page (`publicSpacePath`, by its slug), and on a phone holds the language.
  - The top bar holds the drawer's trigger on a phone, the page's title, the language and theme toggles, and the account (`CompactAccountMenu`). **The page fills the title and its own controls** with `PageHeader`, which the shell places in the bar.
  - A space's navigation lists the pages the user's role at the space in the URL allows (the owner's eleven, reception's four); a space they hold no link to lists none. The owner's audit screen is not listed ([finding 14](../architecture/findings.md#14-the-owners-audit-screen-has-no-design)).
  - The space branch's element remembers the space entered (`rememberSpace`), for the landing.

- **Lazy loading.**
  - A group's `index.ts` exports **route definitions only**. Their components load through React Router's `lazy`, so a visitor to the site never downloads dashboard code.
  - Each site page loads lazily on its own.
- **The language and theme toggles.**
  - Their visual controls are the design system's `LanguageToggle` and `ThemeToggle`.
  - Each shell wires them to `shared/preferences` itself, in a line or two. There is no shared "connected toggle": `shared/preferences` stays without UI, and the two groups cannot import each other.
  - The theme toggle sets the opposite of the theme shown (§4).
- **The status states** live in `shared/routing`: `NotFoundState`, `ForbiddenState`, `RouteErrorState`, and a pure `classifyRouteError`. They are built; each shell shows the 404 and the general error, `RequireRole` the 403, and `RequireSpaceRole` the 404 and the 403.
  - They are route-level elements, built on the design system's `EmptyState`.
  - They take their actions as props. The site's 404 offers "Home" and "Browse spaces"; the dashboard's offers none, since its sidebar is the way on.
  - Each domain renders them inside its own shell. Its error boundary sits on a pathless route just under its layout, because React Router renders a boundary in place of its own route's element. An error in a shell itself reaches the root's state, which has no shell.
  - `RouteErrorState` shows **offline** for a failed lazy load or when the browser reports no connection, and the **general error** otherwise. "Try again" reloads the page, and so does the browser's `online` event: React Router keeps a failed lazy load for its route, so only a reload retries it.
- **Guards sit visibly on each route** (`<RequireRole roles={['ADMIN']}>`), never inherited silently from the group.
- The dashboard's **navigation config per role** belongs to the `dashboard` page group, because choosing what appears together is composition. Features stay role-agnostic: the page passes the scope (`mine` for an owner, `all` for the admin).
- In the dashboard, `OWNER` and `RECEPTION` are the user's role **at the space in the URL**, never the global role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)). The selected space is the `:spaceId` of the route, never client state; the space switcher only navigates ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).
- UI hiding is for usability only; the server is the authority.
- **`showcase`** is a development tool for the design-system layer ([foundation §3](design-system/foundation.md#3-architecture)). `app/router.tsx` mounts it only when `import.meta.env.DEV`, so a build leaves it out; `check:build` fails if any of it reaches the build.

### Landing and guards

**Built:** the four guards in `shared/routing`, each made to wrap its route's page and to read the session (§4). `RequireGuest` guards `/login`, `/register` and `/forgot-password`; `RequireAuth` guards `/dashboard` and the space branch's shell, `RequireRole` the admin's branch (a non-admin gets the 403 without the admin's shell), and `RequireSpaceRole` each space page, with the roles its navigation item allows, so a 404 or a 403 for the space in the URL shows inside the space's shell. Beside them, the password change's gate and its guard (below).

| Guard | Lets through | Otherwise |
|---|---|---|
| `RequireAuth` | a signed-in user | a guest goes to sign-in |
| `RequireRole roles={[…]}` | a signed-in user with one of the global roles | a guest goes to sign-in; another role sees `ForbiddenState`, a 403, in place |
| `RequireGuest` | a guest (the auth pages) | a signed-in user goes on by the landing rule below: the return URL, else their dashboard, else `/`; also right after signing in or registering there, so the landing has this one owner |
| `RequirePasswordChange` | a signed-in user with a temporary password to change (`/change-password`) | once the change clears it, the user goes on where they land (`landingPath`, below): the page the gate carried in `next`, else by their role, so the landing after the change has this one owner; a guest, such as one who has just signed out there, goes to sign-in |
| `RequireSpaceRole roles={[…]}` | a signed-in user whose active link at the `:spaceId` in the URL has one of the roles, `OWNER` or `RECEPTION`, read from the session's links, never the global role | a guest goes to sign-in; a `:spaceId` that is not a positive integer gets `NotFoundState`, a 404; a space with no active link, or a role the route does not allow, gets `ForbiddenState`, a 403; both in place |

- **The password change's gate,** `PasswordChangeGate`, is mounted once, in `RootLayout`, so it holds every route, the site's and the dashboard's. A signed-in user whose account has a temporary password to change (`mustChangePassword`) goes to `/change-password`, carrying the page they asked for in `next` (`changePasswordPath`). The change page itself is exempt, and so is signing out, which its short header offers: once the session ends, the gate holds nothing. A reset link (`/reset-password`, `RESET_PASSWORD_PATH`) is exempt too: the reset settles a pending temporary password itself. While no such session is held, during the restore included, it lets every route through, so public pages never wait. The server refuses every other endpoint meanwhile ([security.md](../backend/security.md#passwords)); the gate is for usability.
- **While the session is restored,** every guard shows the design system's `Spinner`, centred. **While it is `unreachable`,** the offline state (no answer came back) or the general error (an answer that is not a verdict), whose "Try again", and the connection coming back when offline, re-run the restore.
- **The return URL** travels as `?next=` on `/login` (`signInPath`). It is read back with `returnUrlOf`, which accepts only a path on this site, so a crafted link cannot send a user elsewhere.
- **A credential never travels into `next`.** A return URL carries the page's fragment, and a reset link carries its token there (`/reset-password#token=…`). So `/reset-password` is wrapped by no guard and the gate lets it through: its fragment never enters `next`. A guard added to it must drop the fragment first.

**Built:** the landing below, `landingPath` in `shared/routing/landing/`. `RequireGuest` lands the user by it, `RequirePasswordChange` after a forced change, and `/dashboard` redirects by it.

**Built:** the space switcher, `SpaceSwitcher` in `features/space-links` (§3), which the space's shell places in its sidebar header.

- **Identifiers in URLs:** the dashboard uses a space's id (`/dashboard/spaces/:spaceId/...`); the public pages use its slug (`/spaces/:slug`).
- **The dashboard's URL shape** ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)) lives in `shared/routing` (`dashboardPaths.ts`), not in the `dashboard` group: the space guard and the landing read it, and `shared/` never imports `pages/`.
- **Landing after sign-in:**
  1. the return URL, when there is one, read with `returnUrlOf`: a safe `next` wins, an explicit `next=/` included;
  2. otherwise the admin goes to the admin's overview;
  3. a user with space links goes to the last space they used, on the page their link's role there gives: the overview for `OWNER`, the front desk for `RECEPTION`. When no space is remembered, or the remembered one is no longer an active link (a first sign-in, a link deactivated or removed), they go to their oldest active link, by the same rule;
  4. a user with no role and no links goes home, `/`;
  5. `/dashboard` itself redirects by the same rules.
- **The last space** is remembered in the browser's `localStorage`, under a key that names the user (`rememberSpace`, which the space branch's shell calls), and read back only while the user still holds an active link to it. Storage that is unavailable remembers nothing, and the landing falls back to the oldest link.
- **Failed guards:**
  - a guest goes to sign-in, with the return URL;
  - a signed-in user without access gets a clear 403 page, never a silent redirect;
  - a `:spaceId` that is not a positive integer gets a 404; a space the user holds no active link to, whether it exists or not, gets a 403.
- **The space switcher** shows the space in the URL, its name and area. For anyone with more than one active link, whatever their role at each, it opens their spaces, and choosing one follows the link the page gives it. A URL whose space is none of theirs offers their spaces. While the spaces load it shows the design system's `Skeleton`; a failure offers to try again.

## 3. Capabilities (features)

| Imported by | Capabilities |
|---|---|
| Any page group | `auth` · `directory` (the directory and the public profile) · `favorites` · `occupancy` · `announcements` · `data-reports` · `lookups` · `platform-settings` (the public contact) · `users` (the account's profile and settings; the admin's user screens) |
| The dashboard only | `spaces` (owner and admin profile editing) · `space-settings` · `customers` · `subscriptions` (with their check-ins) · `packages` · `visits` · `payments` · `desk` (the front desk: check-in, check-out with payment, subscribe with payment; the customers list and file) · `finance` (finance and statistics, with the occupancy reports) · `overview` (the owner's and the admin's overview) · `staff` · `owners` (admin linking) · `audit` · `space-links` (the user's own spaces: the space switcher) |

**Names match the backend.** A capability carries the name of the backend module it calls ([backend conventions §7](../backend/conventions.md#7-modules)). A feature may be finer than its module only when it serves a different audience on different screens: `staff` (the owner's reception accounts) and `owners` (the admin's linking) are two features over the one `space-links` module. A sub-part with the same audience and the same screens stays inside its module's feature. Check-ins stay in `subscriptions`, for example, because a check-in changes the subscription's progress: split apart, one feature would have to import the other's query keys. What a feature exports is set below ([What a feature exports](#what-a-feature-exports)).

**The dashboard-only rule:** `pages/site` never imports a dashboard-only capability, so the site never pulls dashboard code in. The dashboard may import any capability. The list above lives in code once, `apps/web/scripts/dashboardOnly.ts`, and two checks hold the rule ([ADR 0011](../architecture/decisions/0011-one-web-app.md)):
- **lint** refuses a dashboard-only capability in `pages/site`, as it refuses one page group in another (§1);
- **the build** puts the dashboard's code (the `dashboard` group, its route definitions aside, and the dashboard-only capabilities) in one chunk of its own, loaded lazily; what only the dashboard uses besides, such as TanStack Query's `useQuery`, lands in a chunk the dashboard loads beside it ([finding 27](../architecture/findings.md#27-two-dashboard-chunks-import-each-other)). `check:build` reads the build's manifest: the site's first download, its entry and every chunk the entry imports statically, must not reach the dashboard's chunk, nor a chunk made from a dashboard module. The group's route definitions (`index.ts`, `routes.tsx`, `navigation.ts`, `placeOf.ts`) are in the first download by design, so they hold paths, guards and lazy imports only.

### Capability layout

A feature, and a shared module where the roles apply, is grouped by **the kind of code**:

```
features/<capability>/
  index.ts        the only way in (below)
  repository/     what fetches the data: the server calls through `api` (`@shared/api`, §7); later
                  also its request types, DTOs and mappers, split into files as it grows
  hooks/          React hooks: queries, mutations, form hooks
  components/     React components: presentation only (below)
  services/       plain, non-React helpers
  types/          types shared inside the capability, only when more than one file uses them
```

- **A folder the capability does not need is absent, not empty.** `features/users` has no `services/`.
- **One component, one hook, one responsibility per file, internal ones included,** named after what it holds: `hooks/sign-in/useSignIn.ts`, `components/SpaceName.tsx`, `repository/authRepository.ts`. A file's name tells what it holds, so a reader never hunts inside a file. No file groups several hooks or components, a component used only inside its capability stays out of `index.ts`, and a pure helper sits in `services/`, never in `components/`.
- **One folder per operation.** A role folder (`hooks/`, `components/`) that holds more than one operation groups its files in one folder per operation, named after it in kebab-case (`hooks/sign-in/`, `components/register/`); what two or more operations share stays at the role folder's root. Inner folders have no `index.ts` (§1), and a test stays beside its file.
- **The data layer is the repository:** the interface `AuthRepository { login, register, google }` and its factory `createAuthRepository()`, whose calls go through the app's one client (`api`, §7); a hook makes it once, at module level. `shared/session` names its own the same way (§4).
- **Names inside `hooks/`:** `useXQuery` for a read, `useX` for a write (a verb and the resource: `useSignIn`, `useRegister`), `useXForm` for a form. The query keys live in `hooks/queryKeys.ts`, scoped as §7 says.
- **Folders by role** (§1). Inner folders have no `index.ts`, and tests sit beside their files.
- **Growth:** a file that grows becomes a folder, with one file per resource, as a backend module's service does ([backend conventions › Growth](../backend/conventions.md#growth)).

### Components present; hooks prepare

**A component renders, and that is all.** It gets everything it needs from its hook, **ready to render**: values, actions (submit, retry), states (pending, disabled), and errors as **text and view models**. A component never touches an `AppError`, an error code, `Retry-After`, a mutation, the transport or a query client.

- `SignInForm` renders what `useSignInForm` returns; `AccountMenu` (`features/users`) renders what `useAccount` returns.
- A hook may hand another hook more than a component gets, such as the form instance for `useWatch`; a component never receives it.

### React Query in a feature

- **Side effects:**
  - **what belongs to the capability lives in the hook.** `useSignIn` and `useRegister` hand the session they receive to `establishSession(session, { source: 'signIn' })` themselves, in `useMutation`'s own callback, which runs even when the page has gone by the time the answer arrives;
  - **a capability's toast is its hook's too,** fired from the same callback with the design system's `toast`, after the session's change, and worded with `currentCopy()` read then: a sign-in may switch the interface to the account's language, and the toast speaks the language it lands in. `useRegister` welcomes the new account, `useGoogleSignIn` says when Google has just been linked to an existing account and its password removed, and `useChangePassword` (`features/users`) says the password is saved. The one `Toaster` is mounted in `app/` (§1);
  - **what belongs to the place lives in the page.** A feature takes no callback for it: the place reacts to the capability's own state, as `RequireGuest` reacts to the session and sends a signed-in user on (§2).
- **The cache:** a sign-in clears nothing. Clearing happens when a session ends (§4).
- **Tests, layer by layer** ([testing › A feature, layer by layer](../development/testing.md#a-feature-layer-by-layer)): the repository in the unit lane, and the hooks (with `renderHook`) and the components in the component lane, all through the transport (`setupApiClient`) with `fakeAdapter` on `apiClient`. No hook takes a parameter only a test passes.

### Where state lives

- Server data → TanStack Query ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md), §7).
- Global client state → Zustand: the session and the preferences (§4).
- Where a flow stands, when the server holds it, such as a password recovery ([ADR 0017](../architecture/decisions/0017-recovery-session.md)) → TanStack Query, read on load and written with each answer; never browser storage, so a reload or another tab shows the server's step.
- What must survive a reload or be shared by a link (filters, views, the selected space) → the URL ([ADR 0016](../architecture/decisions/0016-dashboard-urls.md)).
- One component's own state → `useState`.

> **Context inside a feature** *(experimental: not part of the stable core; to be judged after its first use)*: only when several components of the capability, in one subtree, share client state that none of the places above fits. The capability's own component mounts it; it is never exported.

### What a feature exports

**A feature exports UI first.** It exports a hook only when a higher layer needs the capability's data or actions to compose something the capability does not own. **Nothing internal leaves `index.ts`:** no repository, no keys, no form setup, no internal types. Outside sees only what the capability chooses to offer. `features/auth` exports `SignInForm`, `RegisterForm`, `ForgotPasswordCard`, `ResetPasswordCard` and `ContinueWithGoogle`, Google's own button with its failure area, which takes the page's divider and shows it, as itself, only when Google sign-in is configured (`VITE_GOOGLE_CLIENT_ID`, [setup › The web](../development/setup.md#the-web)); `features/users` exports `AccountMenu`, `CompactAccountMenu` (the avatar alone, for the dashboard's top bar) and `AccountMenuSection`, which lead the admin and anyone with an active link to `/dashboard`, a path the page passes; it also exports `SignOutButton` and `ForcedPasswordChangeForm`. `features/lookups` exports `GovernoratesSection`, the admin's governorates and their areas, which the lookups page sets under its title.

- **One capability, several places.** Ask who owns the variation (a screen is not a capability):
  - **the places show the capability's own fact differently:** the feature exports the UI, with props or as two components (the account in a header's menu, and in a phone menu's section);
  - **a place mixes the capability with others, or arranges its own layout:** the feature exports small pieces or hooks, and the page composes.
- **A section of one capability owns its own states.** A section that shows one capability's list whole, with its own query, such as `GovernoratesSection`, shows its own loading, failure (with "Try again") and empty states, as the space switcher does (§2), so a page can set several such sections side by side, under tabs, for example. What the page arranges around them, and a route's own states, stay the page's (§1).
- **A component that combines several capabilities never lives in one of them.** It lives in the page, which composes the card, the title and the links around a feature's form.
- **Features know no routes.** No path is written inside a feature: links are props the page passes (`forgotPasswordLink`, `signInLink`).

A feature's wire types, its requests and the server's answers, come from `@masaha/shared/<module>` ([shared-package.md](../architecture/shared-package.md)), never a copy.

### Forms

`shared/forms`, **built**, is the one place every form uses: react-hook-form over the schemas of `packages/shared` ([ADR 0004](../architecture/decisions/0004-frontend-data-and-state.md)). Every form is one pattern, `useServerForm`, and a feature's form hook only passes it what is the feature's: the contract's schema, the default values, the fields in display order, the server call, the title of a refusal, and the form's own words for some codes. `useSignInForm` and `useRegisterForm` are such hooks; register adds the interface language to its call.

- **The browser names a failure as the server does.**
  - The form's values are checked with `toFieldErrors`, the rule the API answers with (`packages/shared`, `core`).
  - So each field's error is the field-error code the server would send for the same value, and one line serves both: the form's own line for that field and code, else `validation.<code>`. The hook hands each field's error to the component as text.
  - The form submits the parsed value.
- **A refusal lands where it belongs.**
  - The server's `errors` land on the form's own fields, and the first of them takes the focus once the fields are enabled again.
  - Whatever lands on no field becomes the form's failure, a view model (`useFormFailure`) that `FormFailure` renders:
    - too many attempts counts down the server's `Retry-After`, and the submit stays disabled until the count ends;
    - no connection, or no answer in time, offers to try again;
    - any other refusal shows the form's title and the failure's line (`code ?? type`), with the request's reference when it has no domain code (§5).
  - A refusal outside a form, such as a reset link's check, is read the same way by `useRefusalView`, which `useFormFailure` uses for every answered refusal, so the wording has one owner.
- **The password:**
  - `PasswordInput` reads left to right and can show and hide the password;
  - `usePasswordRules` words the policy as a checklist that ticks as the user types, from the policy's own `passwordRules`, and `PasswordRules` renders it.
- Validation runs on submit, and the first invalid field takes the focus ([foundation §10](design-system/foundation.md#10-accessibility-baseline)).

## 4. Session and preferences

- `shared/session` (Zustand), **built**: the session's state, its restore, refresh and sign-out ([ADR 0003](../architecture/decisions/0003-session-model.md)). No UI.
  - **What it holds:** the `SessionUser` and the access token exactly as the server sends them (the contract's types from `@masaha/shared`, no copy and no mapper), and the status. The token lives in memory only.
  - **The status:** `restoring`, `authenticated`, `anonymous`, or `unreachable` with its reason, `offline` (no answer, or a timeout) or `error` (an answer that is not a verdict).
  - **Read** in a component with `useSession(select)`, elsewhere with `getSession()`. The raw store is never exported; only the session's own functions write it.
  - **The repository** (`repository/`) holds the server calls, `refresh` and `logout`, behind one interface (`SessionRepository`, made by `createSessionRepository()`), on the app's one client; beside it, the session hint. Sign-in, registration and Google are `features/auth`'s: they hand their answer to `establishSession(session, { source: 'signIn' })`.
  - **The restore** runs at bootstrap and never blocks a render: public pages show at once, and only the guards wait (§2).
    - no session hint (`masaha_session`): `anonymous` at once, with no request;
    - a hint and a successful refresh: `authenticated`;
    - a refresh refused with 401, or with 403 because the account is suspended (`ACCOUNT_SUSPENDED`): the server's verdict on the session, so the hint is cleared and the status is `anonymous`;
    - any other failure (no connection, a timeout, a 5xx, a 429, or a 403 without that code, such as the API's refusal of a cross-site request, which keeps the cookies): the hint stays and the status is `unreachable`, which the guards offer to retry. A power or internet cut while the site opens never signs the user out.
  - **The refresh** is single-flight: the restore and the transport's 401 (§7) share one request. On success the store holds the new session before the promise resolves, and the transport reads the token from its getter. The same refusals end the session; any other failure leaves it as it was and rejects, so only the request that needed it fails, and the next 401 refreshes again. A refresh that succeeds after the session has ended, because a sign-out was answered first, drops its answer and rejects as `canceled`: it never brings a signed-out session back.
  - **A listener's failure is its own:** each listener of the two events below runs on its own, and an error it throws is logged with `console.error`. It never undoes the session's change, and never stops the other listeners.
  - **Sign-out** is the server's: the session ends here only once `POST /auth/logout` succeeds. A failed request clears nothing, because the refresh cookie would still be valid; `useSignOut()` exposes its pending and error state, and the user retries.
  - **A password change** answers with a new access token only, so `passwordChanged(userId, accessToken)` renews the token and clears `mustChangePassword`, keeping the rest of the session. `features/users` records who started the change and calls it from its mutation's own callback. It changes only that user's session, while it is still held: a sign-out answered first stays signed out, and another user who signed in meanwhile keeps their own token. It tells no listener: the session is the same one.
  - **Two events** let the composition root react without the session importing anything: `onSessionEstablished(listener)`, with the source (`signIn`, or `restore` for a restore and a refresh), and `onSessionEnded(listener)`, when a session that was held ends. Bootstrap connects them (`app/session.ts`):
    - a session that ends clears the QueryClient, so the next user never sees the last one's data;
    - a sign-in makes the account's language the interface's; a restore or a refresh never does, so the user's later choice on this device wins.
- `features/auth`: sign-in, register, password forms and their error wording.
- `shared/preferences` (Zustand), **built**: the language, the theme choice and the theme shown. No UI: each shell wires its own toggles to it, and `otherLanguage` names the language a two-language toggle offers.
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
  - `['public', …]` for the public site's;
  - `['admin', '<capability>', …]` for the admin's views of the platform's data, such as the lookups with their hidden rows: never the public's, whose lists leave those out.
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
