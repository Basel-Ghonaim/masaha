# Setup

> **Status:** Active · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** How to install, run, check and test the repository locally, and what CI runs. Which lane proves a behaviour is owned by [testing.md](testing.md); how work is executed by [workflow.md](workflow.md).

## Prerequisites

- **Node.js 24** (≥ 24.15), the version in `.nvmrc` ([ADR 0001](../architecture/decisions/0001-monorepo-and-stack.md)). With nvm: `nvm use`.
- **npm**, the one bundled with Node 24.

The pin is strict: `engines` allows `>=24.15.0 <25`, and `.npmrc` sets `engine-strict`, so `npm install` and `npm ci` fail on any other Node version.

## Install

```
npm ci
```

One lockfile at the root installs every workspace: `apps/web` and `packages/shared`. `apps/api` is a placeholder and becomes a workspace when it gets its `package.json`.

**Windows:** `npm ci` deletes `node_modules` first. It fails with `EPERM` on `resolver.win32-x64-msvc.node` while an editor's ESLint server has that native module loaded (it comes with the TypeScript import resolver that the zone boundaries use). Close VS Code, or disable its ESLint extension, before running `npm ci`. `npm install` with an unchanged lockfile is not affected.

## Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web app's Vite dev server |
| `npm run build` | Builds every workspace (`apps/web` → `apps/web/dist`, `packages/shared` → `packages/shared/dist`) |
| `npm run lint` | ESLint over the whole repository |
| `npm run typecheck` | TypeScript in every workspace |
| `npm run test:unit` | The unit lane (`*.unit.test.ts`, Node) |
| `npm run test:component` | The component lane (`*.component.test.tsx`, jsdom) |
| `npm run check:classes` | Fails on physical direction classes (`ml-`, `left-`, `text-left` …) anywhere in `apps/web/src`; use the logical form ([foundation §8](../frontend/design-system/foundation.md#8-direction-rtl--ltr)). Also fails on arbitrary-value classes (`text-[13px]`, `bg-[#fff]`, `bg-(--token)` …) outside `shared/design-system/`; use a token utility ([foundation §2](../frontend/design-system/foundation.md#2-principles)) |
| `npm run format` | Prettier over the repository (Markdown is excluded) |

A single workspace can be targeted with `-w`, for example `npm run test:unit -w @masaha/web`.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs `lint`, `typecheck`, `test:unit`, `test:component` and `check:classes` as separate checks on every pull request and on `main`, using the Node version from `.nvmrc`.

## Line endings

`.gitattributes` stores every text file with LF, and `.editorconfig` and Prettier write LF, so a Windows checkout with `core.autocrlf` still formats cleanly.
