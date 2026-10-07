# Engineering Principles

> **Status:** Active · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** Code-design rules for the whole repository. Rules are defaults, not laws: a deviation is allowed when it is deliberate and recorded (an ADR or a finding), never silent.

## 1. Mindset

Simplicity over cleverness · maintainability first · explicit over magic · design for change.
**Put the boundary in now; build the generalisation at the second instance.** No registries, strategy layers or abstractions until a second real case exists.

## 2. SOLID, in checkable form

- **Single responsibility** — one reason to change per file, function or module.
- **Open/closed** — extend with a new file, map entry or strategy, not a growing `else if`.
- **Liskov** — any implementation of a port (repository, storage) is swappable.
- **Interface segregation** — a unit never depends on fields or props it does not use.
- **Dependency inversion** — business logic never imports the HTTP client, the ORM or storage directly.

## 3. Architecture rules

- Dependencies point one way. Frontend: `app → pages → features → shared` ([frontend/architecture.md](../frontend/architecture.md)). Backend: `routes → controller → service → repository` ([backend/conventions.md](../backend/conventions.md)).
- No dependency cycles. No sibling imports between features.
- Platform code (`shared/`) never depends on a feature.
- Every folder is reached through its `index.ts` barrel only.
- Cross-cutting concerns (auth, validation, errors, logging) live once, in middleware or interceptors.

## 4. Patterns

- **DTO → Mapper (pure function) → Entity** at every boundary.
- **Repositories** own all Prisma access; services never import Prisma.
- **One typed error shape** on each side: `AppError` on the server and on the client.
- **Factory functions** instead of classes and containers: a service receives only its real dependencies and creates its own repository ([conventions §2](../backend/conventions.md#2-layers)).
- **Request state** is modelled explicitly (`idle → loading → success | error`), which TanStack Query provides.
- **Validation schemas are shared** from `packages/shared` between the form and the endpoint.

## 5. TypeScript

Strict mode. Prefer inference; use `satisfies` over annotations for literals; discriminated unions for variants and states. No `any`; `unknown` plus narrowing at boundaries.

## 6. Security, performance, accessibility

- Validate every input at the boundary. Never trust the client. Least privilege. No secrets in the client.
- Authorization is enforced on the server for every protected action ([security.md](../backend/security.md)).
- Paginate every list. Avoid N+1 queries. Run independent work in parallel.
- Keep public pages light: the users' internet is weak.
- Accessible by default ([design-system foundation §10](../frontend/design-system/foundation.md)).

## 7. Naming

| Item | Convention | Example |
|---|---|---|
| Files | camelCase | `spaceMapper.ts` |
| React components | PascalCase | `SpaceCard.tsx` |
| Types and interfaces | PascalCase | `SpaceSummary` |
| Constants | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| URL paths | kebab-case | `/space-owners` |
| DB tables and columns | snake_case, mapped by Prisma `@map` | `space_managers.user_id` |
| Error codes | UPPER_SNAKE_CASE | `MEMBER_ALREADY_CHECKED_IN` |
| Copy keys | dot.separated camelCase | `attendance.checkIn.button` |

## 8. Comments

Explain **why**, not what. No issue or PR numbers, no TODO narration, no roadmap notes in code or test names. Pointers such as "see ADR 0003" are fine.
