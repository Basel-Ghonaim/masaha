# Documentation Rules

> **Status:** Active · **Class:** Contract — rules every document in `docs/` follows · **Last Updated:** 2026-10-08 · **Owner:** Basel Ghoneim
> **Authority:** Where each kind of fact lives, what each category of document owns and must not contain, the document classes, the capability documents' shape, and link integrity. The map of the documents is [README.md](../README.md); *when* a document is updated is owned by [workflow §7](../development/workflow.md#7-documentation-update-triggers). Why the capability documents exist is in [ADR 0018](decisions/0018-capability-documents.md).

## 1. One home per fact

Every fact has **one home**; every other document links to it. If you would copy more than a sentence, link instead. The code is the source of truth for what the system does; the documents hold the rules, the intent and the *why*. Nothing unbuilt is described as built.

**One question places a fact: is it a shared mechanism, or a capability-specific application of one?**
- A **mechanism** lives in its platform document: the session, the transport, the route guards, the error model, the rate limiter, the audit writer.
- An **application** lives in its capability's document, which links the mechanism and never restates it. How the web restores a session is the session's ([frontend architecture §4](../frontend/architecture.md#4-session-and-preferences)); that a sign-in hands its answer to the session, and which toast it fires, is `auth`'s.

Four kinds of fact keep their platform home even when one capability applies them:
- **Security.** Every rule whose reason is security stays in [security.md](../backend/security.md): a security review reads one document, and the threat model is the platform's. A capability's document owns its flow, its experience and its other decisions, and links security.md.
- **Routing.** The guards, the gates and the landing rule stay in [frontend architecture §2](../frontend/architecture.md#2-page-groups), even when one capability is their only user: they hold every page, and a capability knows no routes.
- **The contract and the data.** Endpoints, payloads and codes are the [API contract](../api/api-contract.md)'s; entities, derived values and constraints the [data model](data-model.md)'s.
- **Cross-cutting lists** that one reader needs whole, such as the audited actions ([conventions §6](../backend/conventions.md#6-audit)).

**Records are exempt.** An ADR, a finding or a plan records what was decided or found at a date; a fact it repeats is repeated as of that date, not given a second home. A record changes in three ways only: a link whose target moves is repointed; an ADR gains a dated *Revised* line ([workflow §7](../development/workflow.md#7-documentation-update-triggers)); a finding gains its status and a dated resolution ([findings](findings/README.md)).

## 2. One owner per kind of fact

| Fact | Owner | Linked by |
|---|---|---|
| What v1 is committed to, and what is built | [overview.md](../project/overview.md) | every document that names scope |
| A term and its Arabic | [glossary.md](../project/glossary.md) | copy, documents |
| An endpoint, a payload, a status, a domain code | [api-contract.md](../api/api-contract.md) | capability documents |
| An entity, a relation, a derived value, a constraint | [data-model.md](data-model.md) (the Prisma schema owns the fields) | capability documents, conventions |
| A rule whose reason is security | [security.md](../backend/security.md) | capability documents, the contract |
| A backend module, its level, router and placement; a rule every module follows | [conventions.md](../backend/conventions.md) | capability documents |
| A web zone, a page group, a route, a guard; a rule every feature follows | [frontend architecture](../frontend/architecture.md) | capability documents |
| Languages, catalogues, formatting | [localisation.md](../frontend/localisation.md) | |
| A token, a component, a screen's design | [foundation.md](../frontend/design-system/foundation.md) | |
| Where a behaviour is tested | [testing.md](../development/testing.md) | |
| A capability's flows, experience, decisions and code map | its document in `docs/features/` | the map, the overview's *Built* list |
| A decision that meets the ADR threshold | an ADR in [decisions/](decisions/) | the document that applies it |
| A divergence between the design and the code | [findings/](findings/README.md) | the document it concerns |
| The order of a piece of work and its reasons | a plan in `docs/plans/` | |

## 3. What each category owns

| Category | Owns | Must not contain |
|---|---|---|
| **Platform documents** (architecture, conventions, security, the contract, the data model, localisation, the design system) | Mechanisms and the rules every capability follows, each with at most one short example | A capability's flow, its enumerations (which hooks, which exports, which toasts), or its decisions |
| **Capability documents** (`docs/features/`) | One capability's application of the platform: what it does, its boundary, its flows, its decisions, its folders | A restated mechanism, a security rule, an endpoint's shape, an entity's fields, a file list |
| **Records** (ADRs, findings, finished plans) | What was decided or found, at a date | Any edit but the three of §1 |
| **Plans** | The order of a piece of work and its rationale | Anything described as built |
| **The map** ([README.md](../README.md)) | Where each document is, what it owns and when to read it | Content, or a list of the code's files |

## 4. Classes

A document may declare its class in its header. **A declared class must be true.**

- **Contract** — rules to build against. It may hold a rule not yet built, and says which.
- **Description** — what is built, as the code shows it. Every capability document is one.
- **Record** — what was decided or found at a date: the ADRs, the findings, a finished plan.
- **Plan** — orders work and holds its rationale; it describes nothing as built.
- **Commitment** — what the product commits to: the v1 scope.

## 5. Capability documents

- **One document per capability,** across its API module, its folder of `packages/shared` and its web feature, named after the backend module (`space-links.md`). A web feature that serves a second audience over the same module is a section of that module's document.
- **The stable-core rule.** A capability's document is written in the PR in which the capability first has a stable core: its first merged, reviewed slice with settled decisions. When it is updated is [workflow §7](../development/workflow.md#7-documentation-update-triggers)'s; a new layer adds its section.
- **The template**, in this order:
  1. a header: status, class (*Description*), last updated, owner; its authority; its scope (the module, the shared folder, the web feature);
  2. *What it does*;
  3. *Who uses it*;
  4. *Responsibility boundary*: what it owns, and what it leaves to whom;
  5. *How it composes the platform*: links only;
  6. *Behaviour and flows*;
  7. *Decisions*: each with its reason, its date and its PR. A decision is recorded as it holds today; one owned by another document (a security rule, a payload, an ADR) is linked, not restated;
  8. *Code map*: folders and entry points only, never a file list;
  9. *Open findings*: links;
  10. *History*: the PRs.
- **A section appears only when its code exists.** A capability with no web feature has no web section.
- ***Decisions* and *History* by layer.** Each has an **API** part and a **Web** part, so the two workers append in different places ([workflow §9](../development/workflow.md#conflicts)); a part appears only when its layer's code exists. Not yet applied: the documents written before 2026-10-08 are aligned in one later item.
- **About 1,200 words at most,** so it can be read whole before a change.
- **Read first** when a task changes the capability ([workflow, Reading before work](../development/workflow.md#reading-before-work)).

## 6. Rules and intent, not inventories

- **A platform rule keeps one short example,** which names a capability without describing it. Every enumeration of a capability's parts lives in its document.
- **A header states the document's authority** and, for a Contract, which of its platform rules are built. It never carries a changelog of what each capability built: that is the capability's *History* and the overview's *Built* list.
- **A code reference names a folder or an entry point,** where a reader starts. A list of files goes stale with every PR.

## 7. ADRs

The threshold and the format are [workflow §7](../development/workflow.md#7-documentation-update-triggers)'s, narrowed by one clause: **no ADR when a document naturally owns the decision.** A capability's decision goes to its document's *Decisions*, a platform rule to its platform document.

## 8. Link integrity

- Links are relative, and point to a heading when the fact sits under one.
- **A move updates every link to the moved text in the same PR,** records' links included (§1).
- Links are checked by hand, with a search for each anchor ([finding 37](findings/37-links-between-documents-are-checked-by-hand.md)).
- A document never cites a path outside the repository.

## 9. One entry point

The [map](../README.md) is the entry point. It names every document, what it owns and when to read it, and lists each capability document by name, because they are what a worker reads first. It never enumerates the code's files.

## 10. Not adopted

- **Live status in an issue tracker.** Issues are optional ([workflow §2](../development/workflow.md#2-work-item)); a document's header and the overview carry the status.
- **A version number per document.** Git holds every version, and each header has its date.
- **Constitutional documents,** a tier above the others. [CLAUDE.md](../../CLAUDE.md)'s decision precedence already orders the sources.
- **An onboarding document for agents.** CLAUDE.md and the `start-work-item` skill are the bootstrap.
