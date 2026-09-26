# ADR 0001 — Monorepo and stack

> **Status:** Accepted · **Date:** 2026-09-26
> **Revised:** 2026-09-26 — Node 22 → 24 (24 is Active LTS; 22 is maintenance-only)

## Context
One developer, four months, a web client and an API that must agree on validation rules and types. The developer is strong in React and TypeScript and relies on AI assistance for the backend. A previous project (Quick Tweets) established a working architecture on a similar stack.

## Decision
- **npm workspaces monorepo**, one lockfile:
  - `apps/web` — React 19, TypeScript (strict), Vite, React Router.
  - `apps/api` — Node.js 24 LTS, Express 5, Prisma, PostgreSQL 16.
  - `packages/shared` — Zod schemas, enums (`Role`, membership types), error codes and shared types. No runtime dependencies beyond Zod.
- Apps never import each other; both may import `packages/shared`.
- API under `/api/v1`.

## Alternatives
- **Two repositories** — rejected: validation rules and types would drift between client and server.
- **Next.js full-stack** — rejected: the developer's strength and the reused architecture are a Vite SPA plus Express; SSR is not needed for v1.
- **NestJS** — rejected: more framework than the project needs; Express with explicit layering is already proven.

## Consequences
- One Zod schema validates a form and its endpoint.
- The frontend never guesses the API's rules.
- Tooling (lint, typecheck, test) runs per workspace and from the root.
