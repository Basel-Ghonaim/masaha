# ADR 0012 — Backend: a modular monolith with levelled modules

> **Status:** Accepted · **Date:** 2026-09-30

## Context
The API serves about twenty capabilities: identity, the directory, space management, the front desk, subscriptions, payments, finance, the admin's platform tools and more. Many operations cross them: checking a visitor out records a payment, and the owner's overview gathers figures from half the system. Money must stay consistent, so these operations run in one transaction ([ADR 0010](0010-manual-payment-ledger.md)). The project has one developer, one database and one deployment ([ADR 0001](0001-monorepo-and-stack.md)), and the backend is the weaker area of that developer's experience.

Without a rule for where each piece of logic lives and who may call whom, the code would drift toward a shared tangle: services importing each other in circles, the same rule computed in several places, and screens rather than rules deciding the structure.

## Decision
- **One deployable application, divided into modules.** A module is one capability, a fact and the rules on it, never a screen. It owns its tables, and only it writes them.
- **Each module has one public entry.** Other modules and the application use only that entry, never a module's data access.
- **Modules sit in levels, and the dependency graph has no cycles.** A module calls only modules at lower levels, never one at its own level. The level map is kept in one place and enforced by tooling.
- **Modules call each other directly.** An operation that spans modules belongs to the module above them, which orchestrates it and owns its transaction.
- **Abstractions only where they pay.** A module depends on an interface, wired where the application is assembled, only for external infrastructure (storage, email, the clock, the scheduler) or for a genuine upward need that moving the logic or passing a parameter cannot solve.
- **The shared platform knows no domain concept.** Read models (finance, the overviews, the audit log) may read other modules' tables to aggregate them; they never write.
- **Each pure domain rule lives in the module that owns it**, and is computed nowhere else.

The operative rules are owned by the [backend conventions](../../backend/conventions.md): the module list, the level map, each module's routers and the placements.

## Alternatives
- **Layers by technical kind** (all controllers together, all services together). Rejected: nothing marks who owns a table or a rule, so every service can reach every other, and cycles and duplicated rules follow.
- **Modules with free imports between them.** Rejected: cycles appear as soon as two capabilities need each other, and the order in which a transaction's steps run becomes unclear.
- **Events or a message bus between modules.** Rejected for v1: it hides the call flow behind indirection and makes consistency eventual where the ledger needs one transaction. One developer gains nothing from the decoupling.
- **Ports for every dependency** (a full hexagonal architecture). Rejected: an interface per call adds files and indirection with one implementation each. TypeScript's structural types already let tests pass plain fakes.
- **Separate services.** Rejected: one developer, one database and one release cadence; the network and deployment cost buys nothing.

## Consequences
- Each rule has one owner, and a reader can find it from the capability's name.
- Adding a module means placing it in the level map. A need that points upward is a design signal. It is resolved by moving the logic to the orchestrator above, or by passing a parameter, before any interface is considered.
- Transactions are explicit: the orchestrator opens one and passes it down.
- Screens that combine many capabilities are served by composition at the top levels, never by a lower module reaching up.
- **Revisit this decision** when a module needs its own deployment or its own database, or when the level map can no longer place a new capability without a cycle.
