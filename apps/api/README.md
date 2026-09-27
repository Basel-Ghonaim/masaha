# apps/api

The Masaha API: Express 5 on Node 24, TypeScript, ESM. The stack is recorded in [ADR 0001](../../docs/architecture/decisions/0001-monorepo-and-stack.md).

- **Layout and layering:** [backend/conventions.md](../../docs/backend/conventions.md)
- **Envelope, errors and pagination:** [api/api-contract.md](../../docs/api/api-contract.md)
- **Running, building and testing:** [development/setup.md](../../docs/development/setup.md#the-api)

Quick start, from the repository root, with Docker Desktop running: copy `apps/api/.env.example` to `apps/api/.env`, then `npm run db:up`, `npm run db:migrate` and `npm run dev -w @masaha/api`. The full sequence is in [setup.md › First run](../../docs/development/setup.md#first-run).
