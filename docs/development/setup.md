# Setup

> **Status:** Active · **Last Updated:** 2026-09-27 · **Owner:** Basel Ghoneim
> **Authority:** How to install, run, check and test the repository locally, and what CI runs. Which lane proves a behaviour is owned by [testing.md](testing.md); how work is executed by [workflow.md](workflow.md).

## Prerequisites

- **Node.js 24** (≥ 24.15), the version in `.nvmrc` ([ADR 0001](../architecture/decisions/0001-monorepo-and-stack.md)). With nvm: `nvm use`.
- **npm**, the one bundled with Node 24.

The pin is strict: `engines` allows `>=24.15.0 <25`, and `.npmrc` sets `engine-strict`, so `npm install` and `npm ci` fail on any other Node version.

## Install

```
npm ci
```

One lockfile at the root installs every workspace: `packages/shared`, `apps/api` and `apps/web`.

**Windows:** `npm ci` deletes `node_modules` first. It fails with `EPERM` on `resolver.win32-x64-msvc.node` while an editor's ESLint server has that native module loaded (it comes with the TypeScript import resolver that the zone boundaries use). Close VS Code, or disable its ESLint extension, before running `npm ci`. `npm install` with an unchanged lockfile is not affected.

## Commands

All commands run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web app's Vite dev server |
| `npm run build` | Builds every workspace, `packages/shared` first because the API compiles against its `dist` (`packages/shared/dist`, `apps/api/dist`, `apps/web/dist`) |
| `npm run lint` | ESLint over the whole repository |
| `npm run typecheck` | TypeScript in every workspace |
| `npm run test:unit` | The unit lane (`*.unit.test.ts`, Node) |
| `npm run test:component` | The component lane (`*.component.test.tsx`, jsdom) |
| `npm run test:api` | The API integration lane (`*.api.test.ts`, Supertest against the Express app) |
| `npm run check:classes` | Fails on physical direction classes (`ml-`, `left-`, `text-left` …) anywhere in `apps/web/src`; use the logical form ([foundation §8](../frontend/design-system/foundation.md#8-direction-rtl--ltr)). Also fails on arbitrary-value classes (`text-[13px]`, `bg-[#fff]`, `bg-(--token)` …) outside `shared/design-system/`; use a token utility ([foundation §2](../frontend/design-system/foundation.md#2-principles)) |
| `npm run check:build` | Run after `npm run build`: fails if `apps/web/dist` contains the development-only design-system showcase (its route path or any of its fixture strings) |
| `npm run format` | Prettier over the repository (Markdown is excluded) |

A single workspace can be targeted with `-w`, for example `npm run test:unit -w @masaha/web`.

In development, the design-system showcase is at `/__showcase` ([foundation §3](../frontend/design-system/foundation.md#3-architecture)).

## The API

The API reads its settings from `apps/api/.env`, loaded by Node's `--env-file`. Copy `apps/api/.env.example` to `.env` first. It lists every variable, and the API refuses to start, naming each one, when a required variable is missing or invalid.

| Command | What it does |
|---|---|
| `npm run dev -w @masaha/api` | Starts the API with `tsx watch` on `PORT` (default 3000), logs made readable by `pino-pretty` |
| `npm run build -w @masaha/api` | Compiles `apps/api/src` to `apps/api/dist` (build `packages/shared` first, or run the root `build`) |
| `npm run start -w @masaha/api` | Runs the built API from `dist`, with JSON logs |

`GET /health` answers when the API is up; everything else lives under `/api/v1`.

In development, tests and typechecking, the API reads `@masaha/shared` from its source through the package's `@masaha/source` export condition, so the shared package does not need building first. Only `build` and `start` use its `dist`.

## CI

GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) runs `lint`, `typecheck`, `test:unit`, `test:component`, `test:api`, `check:classes` and `build` as separate checks on every pull request and on `main`, using the Node version from `.nvmrc`. The `build` check then runs `check:build` on its output.

## Editor

The repository shares two VS Code files; the rest of `.vscode/` stays ignored.

- `.vscode/extensions.json` recommends **Tailwind CSS IntelliSense**.
- `.vscode/settings.json` opens `*.css` files in Tailwind CSS mode, so VS Code does not flag `@theme`, `@custom-variant` or `source()`. It also sets the spell checker (Code Spell Checker) to British English, the spelling the documents use.

## Line endings

`.gitattributes` stores every text file with LF, and `.editorconfig` and Prettier write LF, so a Windows checkout with `core.autocrlf` still formats cleanly.
