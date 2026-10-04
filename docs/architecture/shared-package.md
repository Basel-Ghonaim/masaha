# The Shared Package

> **Status:** Active · **Class:** Contract — rules to build against; R3 is enforced by lint, R4 by the package's `exports` · **Last Updated:** 2026-10-04 · **Owner:** Basel Ghoneim
> **Authority:** How `packages/shared` is structured and what belongs in it. The payloads themselves are owned by the [API contract](../api/api-contract.md), and the levels by [backend conventions §7](../backend/conventions.md#7-modules).

## Purpose

`packages/shared` (`@masaha/shared`) is the contract between the web and the API in code. Every request body and every response the web uses is defined once here, and both apps import it: the API validates with the request schemas and its mappers return the response types, and the web's endpoint calls are typed by them.

## Structure

```
packages/shared/src/
  core/          the foundation: the error vocabulary, the envelopes, pagination, common fields, languages
  <capability>/  one per backend module with a contract (lookups, users, space-links, auth, …)
```

## Rules

| Rule | Why |
|---|---|
| **R1** One folder per backend module that has a contract, with the module's own name and level ([conventions §7](../backend/conventions.md#7-modules)). | You find a fact from its capability's name, the same in the API, the web and here. |
| **R2** Each folder has `index.ts`, its only entry; `requests.ts` for what enters the server (Zod schemas and their inferred types); `responses.ts` for what the server answers (types); a rule both sides compute gets its own file named after it (`passwordPolicy.ts`). A file that would be empty is absent. | One predictable shape per capability. |
| **R3** `core` imports nothing but zod. A capability imports `core` and capabilities at **lower** levels only, through their `index.ts`. Lint enforces it. | No cycles or tangles as it grows. |
| **R4** Consumers import by capability path, `@masaha/shared/auth` or `@masaha/shared/core`. There is no root barrel, and deep paths are blocked by the package's `exports`. | An import says where a fact lives. |
| **R5** Only what crosses the wire, or a rule both sides must compute, belongs here. Never a web-only type or a database type. | The package stays small and means one thing. |
| **R6** Requests are Zod schemas with inferred types; responses are types only, with no runtime validation on the web. | Validation happens where data enters the server; the typecheck on both sides keeps the shapes in step. |
| **R7** Names: `registerSchema` / `RegisterRequest`; a response is named for its resource (`Session`, `SpaceSummary`), with no `Dto` suffix. | Names you can predict. |

## Adding a capability

1. Check that the backend module exists in the level map ([conventions §7](../backend/conventions.md#7-modules)) and that its facts cross the wire (R5).
2. Create `src/<module>/` with the files R2 calls for, and its `index.ts`.
3. Import only `core` and lower levels (R3); `npm run lint` refuses anything else.
4. Import it from the apps as `@masaha/shared/<module>` (R4). No export entry is needed: one subpath pattern serves every folder.

## Domain error codes

The domain error codes stay **one list in `core/errors.ts`**, grouped by capability with a comment per group, since both apps read the whole vocabulary at once. Revisit if it grows past about 50 codes.
