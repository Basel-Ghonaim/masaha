# ADR 0011 — One web application for the public site and the dashboard

> **Status:** Accepted · **Date:** 2026-09-30

## Context
Masaha's interface serves two audiences: the public, who use the directory, sign in and keep an account, and the people who run the spaces and the platform: the admin, owners and reception staff, in one dashboard ([ADR 0009](0009-space-scoped-reception-role.md)). The monorepo could hold them as one web application, or as two with the code they share moved into packages.

Either way, most of the frontend platform is shared: the design system, localisation, the session and the API client. So are several capabilities both audiences touch, such as sign-in, spaces, data reports and lookups. The same people also move between the two: an owner is also a user, and reception staff hold ordinary user accounts. The public site must stay light on a weak connection. The project has one developer.

## Decision
- **One web application** serves the public site and the dashboard, from one origin with one session.
- **The boundary is kept inside the application.** The dashboard is a separate part of the app, loaded only when it is opened, so a public visitor never downloads it. The public site never depends on a capability that only the dashboard uses. Tooling enforces this, not convention. The operative rules are owned by the [frontend architecture](../../frontend/architecture.md).
- **Shared packages hold only the contract between client and server** ([ADR 0001](0001-monorepo-and-stack.md)). The frontend platform is not split into packages.
- **The server stays the authority** ([ADR 0002](0002-authorization-model.md)). Keeping the dashboard's code apart serves clarity and page weight, never protection.

## Alternatives
- **A separate dashboard application, with the shared frontend code in packages.** Rejected for v1:
  - nearly the whole frontend platform, and several capabilities, would become packages;
  - two origins would split the session, so users would sign in twice unless the cookies were widened to a parent domain, and cross-origin access would widen;
  - its main gain, a public site free of dashboard code, comes just as well from loading the dashboard separately inside one application;
  - independent deployment has no use with one developer and one release cadence.
- **Shared frontend packages inside one application.** Rejected: a package with a single consumer is a generalisation built before its second instance.

## Consequences
- One build, one deployment, one sign-in. Moving between the site and the dashboard is ordinary navigation.
- The separation rests on enforced rules, not on physical distance, so it must hold from the first dashboard screen.
- **Revisit this decision** when any of these becomes true:
  - the dashboard must be served from its own origin;
  - it needs its own release cadence or its own team;
  - a second client needs the frontend platform;
  - loading the dashboard separately no longer keeps the public site light.

  Because the boundary is kept from the start, splitting the dashboard out then is a move, not a redesign.
