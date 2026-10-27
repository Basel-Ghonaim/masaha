# Audit

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-27 · **Owner:** Basel Ghoneim
> **Authority:** The `audit` capability: reading the audit log, which every module writes through `shared/audit` ([conventions §6](../backend/conventions.md#6-audit)). Its endpoints are owned by the [API contract](../api/api-contract.md#audit-log); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `audit` (L5); `@masaha/shared/audit`.

## What it does

- Pages a space's audit log for its owner: every entry of the space — its staff's, the timed jobs', the admin's — newest first, the admin shown as **Masaha**, never named.
- Filters a log by its period (the last 30 days, the default, or all time), by the target's current name (`q`), by actor and by action, every filter before the page is cut, and answers the period's actors with the page.
- Answers each entry's action as stored, its time, its actor, its target with its current name, and its values before and after as stored.

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/audit-log`. Reception is refused. The owner's screen is designed (O13) but not built ([finding 14](../architecture/findings/14-the-owners-audit-screen-has-no-design.md)).

## Responsibility boundary

- **Owns** no table: it reads `audit_logs`, which `shared/audit` alone writes, append-only; it writes nothing.
- **Reads** the names of the targets and the actors (spaces, users, customers, subscriptions, packages, visits, check-ins, announcements, lookups) and the space's links (`space_managers`) in its own queries, as a read model ([conventions §8](../backend/conventions.md#8-module-rules), R7); it imports no module.
- **Leaves** who may read to `can()` (`space.auditLog.read`, [security › Authorization](../backend/security.md#authorization)) and the boundary of `/manage/spaces/:spaceId`; what is audited, and with which values, to each writing service.

## How it composes the platform

- Its manage router sits at `/audit-log` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; its route asks `requireCan('space.auditLog.read')` before the query is read.

## Behaviour and flows

**The owner's log.** Three statements in parallel share one `WHERE`: the page, newest first, then the higher id; its count; and the actors of the entries every filter but the actor's keeps (at most 50, persons by name, then `MASAHA`, then `SYSTEM`). The period starts at the Gaza midnight 29 days before today (`auditPeriod.ts`, pure), so the last 30 days are whole Gaza days across a daylight-saving change. Read without a lock: a log is history.

**The actor.** An entry's actor joined to its link to the entry's space, of any state: a link makes them a person, named even after it ended; none makes them `MASAHA`, the platform, whose id and name are never selected into the answer; no actor is `SYSTEM`. `actor=<id>` keeps a linked person's entries only.

**The target.** One left join per entity type, its type in the join's condition, so at most one matches (a visit's and a check-in's customer joined through them), reads the target's current name by `coalesce` — a space's and a lookup's in both languages; a person's, a customer's, a subscription's, a package's; a visit's visitor, else its customer; a check-in's customer — and whether a space or an announcement is deleted. Joins, not a lateral subquery: a search over a year reads each table once. `q` is matched against both names through `masaha_search_text`, in the same statement, before the page is cut ([data-model › Conventions](../architecture/data-model.md#conventions), *Search*).

## Decisions

### API decisions

- **The admin is `MASAHA` to the owner, decided by links, not by the role** (S1, the owner's decision 8). *Why:* the role is read now and can change; the links are kept for ever, and only the platform acts on a space without one (an admin is never linked). 2026-10-27, #128.
- **The owner's actor filter never names an admin** (S4): an id matches a linked person only; the admin's entries are `actor=MASAHA`. *Why:* an admin's id guessed into the filter would confirm who acted. 2026-10-27, #128.
- **The target's current name, not the name it had** (D4). *Why:* the table stores ids; a name copied into every entry would put the entity's knowledge in the writer, which knows no domain (conventions §6). 2026-10-27, #128.
- **The target by one left join per entity type, not a lateral subquery per entry.** *Why:* measured on a generated year, PostgreSQL wrapped the lateral in a `Memoize` node that missed on every entry, and a `q` over the year took 2.5–8.4 s; the joins read each table once. 2026-10-27, #128.
- **`before` and `after` answered as stored; the action as stored.** *Why:* the writer never stores a secret; summarising them would put display rules in the API ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)); an action written later is still shown, and `AUDIT_ACTIONS` is what the filter accepts. 2026-10-27, #128.
- **The period is the last 30 days or all time, no free range** (the owner's decision 9, §13 Q8). 2026-10-27, #128.
- **`meta.actors`** (S7): the period's actors, so a screen offers the actor filter without reading every page. 2026-10-27, #128.

## Code map

- `apps/api/src/modules/audit/` — the module: its service, its repository (the queries), its mapper, the period (`auditPeriod.ts`) and its manage router.
- `packages/shared/src/audit/` — the actions and entity types, the queries, the answers.

## Open findings

- [14. The owner's audit screen has no design](../architecture/findings/14-the-owners-audit-screen-has-no-design.md)

## History

### API history

- #128 — the owner's audit log of the space, the admin shown as Masaha; paged, the last 30 days or all, searched by target, filtered by actor and action.
