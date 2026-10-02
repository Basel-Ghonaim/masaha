# Testing

> **Status:** Active · **Last Updated:** 2026-10-02 · **Owner:** Basel Ghoneim
> **Authority:** Where a behaviour is proven: the lanes, what each owns and is forbidden, and the rule that assigns a behaviour to one. It owns the placement of proof, not its style.

## 1. The assignment rule

A behaviour is proven in the lane of the **single unit that decides it**. **One behaviour, one lane.** The check: *if this test were deleted, would the behaviour still be proven elsewhere?* If yes, one of the two is redundant.

| The answer depends on | Lane |
|---|---|
| Inputs only | Unit |
| React rendering and interaction | Component |
| What the real server and database do | API integration |
| The whole system in a browser | E2E smoke |

## 2. Lanes

| Lane | Tools | Owns | Forbidden |
|---|---|---|---|
| **Unit** (web, api and `packages/shared`) | Vitest | Services, mappers, validators, occupancy calculation, permission checks (`can()`), catalogue parity | Rendering, network, database |
| **Component** (web) | Vitest + Testing Library (with user-event) + vitest-axe + MSW | Forms, dashboard wiring, role-based navigation, empty/loading/error states | Layout and visual correctness; real server |
| **API integration** | Vitest + Supertest + real PostgreSQL (test database) | Endpoints end to end: validation, **authorization per role and per space**, persistence, error envelope | Mocking Prisma |
| **E2E smoke** (end of project) | Playwright | 2–3 critical flows: search a space; reception checks a visitor in and the directory's live status changes; admin links an owner | Covering what lower lanes already prove |
| **Manual** | Browser | Visual review in RTL/LTR, light/dark, phone/desktop (Definition of Done) | Being the only proof of a behaviour |

A test file's suffix names its lane, and each lane's script runs only its own files: `*.unit.test.ts` (`test:unit`, Node), `*.component.test.tsx` (`test:component`, jsdom), and `*.api.test.ts` (`test:api`, Node).

## 3. Rules that bind every test

1. Deleting the test tooling leaves production complete.
2. No production code exists only to serve a test.
3. A seam sits at the unit that owns the dependency (inject the repository, not a global mock).
4. If a test needs a production change, keep it only if production is better for it anyway.

## 4. What must always be tested

- Every authorization rule: each protected endpoint is tested as USER, as an OWNER of another space, as the OWNER of this space, and as ADMIN.
- Live status: each branch of the rule in [data-model.md](../architecture/data-model.md#derived-values-computed-not-stored) (unverified, closure, outside hours, no hours, no capacity, full, available); no public response carries capacity or counts; auto check-out rules.
- Both catalogues have exactly the same keys and parameters.
- Both themes define exactly the same semantic tokens.

## 5. CI gate

GitHub Actions on every PR: `lint` · `typecheck` · `check:classes` · `test:unit` · `test:component` · `build` (then `check:build`) · `test:api` (with a PostgreSQL service). E2E runs locally before a release; the PR states whether it was run.
