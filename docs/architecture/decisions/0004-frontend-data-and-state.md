# ADR 0004 — Frontend data and state: TanStack Query, Axios, Zustand

> **Status:** Accepted · **Date:** 2026-09-26
> **Revised:** 2026-10-01 — a mutation is retried only when it carries an idempotency key ([ADR 0015](0015-idempotency-and-concurrency.md))
> **Revised:** 2026-10-03 — the transport also retries timeouts

## Context
Almost all of Masaha's frontend state is server state: directory lists, filters, dashboard tables, live occupancy that refreshes periodically. Client-only state is small: the session, the language, the theme. Quick Tweets used Redux Toolkit with Axios gateways and an RTK Query base.

## Decision
- **Server state:** TanStack Query v5. Live occupancy uses `refetchInterval` (60 s), paused when the tab is hidden.
- **Transport:** Axios, reusing Quick Tweets' client: token attachment through an injected getter, single-flight refresh on 401, retry with backoff for 5xx, network errors and timeouts only, for queries and for the mutations that carry an idempotency key, normalisation into `AppError`. The conventions for keys, invalidation, retries and polling are owned by the [frontend architecture](../../frontend/architecture.md#7-server-state).
- **Client state:** Zustand, two small stores in `shared/`: `session` (user, role, token, restore status) and `preferences` (language, theme).
- **No Redux.**
- **Forms:** react-hook-form with Zod resolvers, using schemas from `packages/shared`. Validation messages are catalogue keys.

## Alternatives
- **RTK Query** — rejected: it requires Redux, which the project no longer needs, and the tested Axios refresh logic would have to be rewritten inside a base query.
- **Quick Tweets' custom form engine** — rejected for time; react-hook-form + Zod keeps the same idea (the schema is the centre, types are inferred) and handles field arrays (opening hours, prices).

## Consequences
- Each feature exposes query hooks from an `api.ts` and never calls Axios from a screen.
- Cache invalidation is by query key; mutations invalidate the lists they change.
