# ADR 0016 — Dashboard URLs: the selected space is in the URL

> **Status:** Accepted · **Date:** 2026-10-01

## Context
One dashboard serves the admin and every user with an active link to a space, as owner or reception ([ADR 0009](0009-space-scoped-reception-role.md), [ADR 0011](0011-one-web-app.md)). A person may hold links at several spaces, and what they see follows their role at the selected space.

The selected space had to live somewhere. In client state, a link to a space's screen could not be shared, the back button would not restore the space, and two tabs could not hold two spaces. The API already puts the space in its path, under the managed spaces.

## Decision
1. **The selected space is in the URL, not in client state.** Links can be shared, back works, two tabs can hold two spaces, and the dashboard's path mirrors the API's.
2. **Two branches under one dashboard:**
   - the admin's screens under `/dashboard/admin/…`;
   - a space's screens under `/dashboard/spaces/:spaceId/…`, for its owner and its reception.

   `/dashboard` itself redirects by role.

The routes, the landing after sign-in and the guards are owned by the [frontend architecture](../../frontend/architecture.md#2-page-groups).

## Alternatives
- **The selected space in client state**, with flat dashboard paths. Rejected: no shareable links, back does not restore the space, and every tab shares one selection.
- **The space as a query parameter.** Rejected: the space is the scope of everything on the page, not a filter on it, and a path mirrors the API.

## Consequences
- The space switcher navigates. It holds no state of its own.
- A wrong or unknown space in a URL must be handled as a page state (no access, or not found), never silently redirected.
- Every space screen reads its space from the route, and its server data is keyed by that space.
