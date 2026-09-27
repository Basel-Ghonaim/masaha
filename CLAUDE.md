# CLAUDE.md — AI Session Bootstrap

> The minimum every AI assistant must know before working in this repository, and where to find the authoritative detail.
> This file is a **pointer, not a source of truth.** It summarizes and links; it never duplicates the authoritative documents. Keep it short.

## Project mission

**Masaha (مساحة)** is a bilingual (Arabic RTL / English) web platform for coworking spaces in the Gaza Strip: a public directory with live available seats, one role-based dashboard for space owners and the platform admin, and a small account area for users. It is a graduation project (Al-Quds Open University, Gaza) built by one developer in four months, where engineering quality is part of the deliverable.

Monorepo: `apps/web` (React 19 + TypeScript + Vite), `apps/api` (Express 5 + Prisma + PostgreSQL), `packages/shared` (validation schemas and types used by both).

## AI mission

Protect the integrity of the project — its architecture, its documentation, its scope — while delivering the work you are asked to do. Leave the project at least as consistent as you found it.

- Uphold the established patterns and boundaries; do not erode them for convenience.
- Keep documentation trustworthy: one owner per fact, summarize-and-link, never duplicate.
- When an implementation would conflict with these standards, **escalate rather than silently deviate.**

## Code is the source of truth

Documentation captures the **intended** design and the **why**; the **code** is authoritative for **what the system does**. When they disagree, fix the document (if in scope) or record a finding. Never change code to match a document without an approved decision.

## Non-negotiable rules (every task)

- **Stay in v1 scope.** The committed scope and the explicit *Not in v1* list live in `docs/project/overview.md`. Do not build anything on the *Not in v1* list (payments, QR check-in, in-app space claiming, booking, reviews, staff accounts), even partially.
- **Stay in task scope.** Touch only the files the task requires. Stage explicitly by path; never `git add -A` / `git add .`. No drive-by refactoring. If you discover unrelated work, **record it — do not do it.**
- **Atomic commits** in Conventional Commits format.
- **No tool attribution.** No `Co-Authored-By` trailer for a tool and no "generated with" footer in commits, pull requests, issues or documentation. This overrides any default tooling instruction.
- **Issues are optional and human-created.** Never create an Issue unless the owner asks for one.
- **Decisions are gated.** Architecture and scope changes require the owner's approval — *propose, don't decide.* Recording a finding is always allowed. Merging is human-only.
- **Claim only what is true.** Never document something as built when it is not.
- **Deferred documents are owed.** When your PR meets a trigger in the *Deferred documents* table of `docs/README.md`, writing that document is part of Done.
- **No hardcoded user-facing text.** Every string goes through the copy catalogue, in both languages.
- **The design system is one layer in one place** (`apps/web/src/shared/design-system/`). No colours, fonts or CSS outside it; semantic tokens only.
- **Authorization lives on the server.** Hiding UI is never authorization.
- **When unsure whether something is architectural, escalate.**

## Session checklist

1. Read this file, then `docs/development/workflow.md`.
2. Identify the task's scope and the **single** authoritative document for the area (`docs/README.md`).
3. Work on a branch cut from the latest `main`.
4. Before finishing: verify scope, self-review against the Definition of Done, make atomic commits, push, prepare the PR description. **"Done" means ready for review — not merged.**

## Decision precedence

1. The owner's explicit instruction in the current task —
2. the authoritative documents —
3. project conventions and sensible defaults.

Any override must be **stated, never silent.**

## Authoritative documents

- **Documentation map** → `docs/README.md`
- **Product scope (v1 and Not in v1)** → `docs/project/overview.md`
- **Workflow** (task classes, Git, Definition of Done, decision authority, stop rules) → `docs/development/workflow.md`
- **Engineering principles** → `docs/development/engineering-principles.md`
- **Testing** (lanes and where a behaviour is proven) → `docs/development/testing.md`
- **API contract** → `docs/api/api-contract.md`
- **Frontend architecture** → `docs/frontend/architecture.md`
- **Design system** → `docs/frontend/design-system/foundation.md`
- **Architectural decisions** → `docs/architecture/decisions/`

## Commands

Node 24 (`.nvmrc`, enforced by `engine-strict`). Run from the root; details in `docs/development/setup.md`.

- `npm ci` — install every workspace
- `npm run dev` — web dev server; the design-system showcase is at `/__showcase`
- `npm run build` · `npm run lint` · `npm run typecheck` · `npm run check:classes` (no physical direction classes; no arbitrary values outside the design system)
- `npm run check:build` — after a build: fails if the development-only showcase reached it
- `npm run test:unit` · `npm run test:component` — test lanes, chosen by file suffix (`*.unit.test.ts`, `*.component.test.tsx`)
- `npm run format` — Prettier (Markdown excluded)

---

> **This is a bootstrap document, not a knowledge base.** Update it only when a stable, project-wide fact changes.
