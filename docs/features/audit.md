# Audit

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-28 · **Owner:** Basel Ghoneim
> **Authority:** The `audit` capability: reading the audit log, which every module writes through `shared/audit` ([conventions §6](../backend/conventions.md#6-audit)). Its endpoints are owned by the [API contract](../api/api-contract.md#audit-log); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `audit` (L5); `@masaha/shared/audit`.

## What it does

- Pages a space's audit log for its owner: every entry of the space — its staff's, the timed jobs', the admin's — newest first, the admin shown as **Masaha**, never named.
- Pages the platform's events for the admin, of every space and of none, by a default-deny list: never a space's operations, money, people, settings or staff; each entry with the space it names.
- Filters a log by its period (the last 30 days, the default, or all time), by the target's current name (`q`), by actor and by action, every filter before the page is cut, and answers the period's actors with the page.
- Answers each entry's action as stored, its time, its actor, its target with its current name, and its values before and after as stored.

## Who uses it

- **The space's owner,** under `/manage/spaces/:spaceId/audit-log`. Reception is refused. The owner's screen is designed (O13) but not built ([finding 14](../architecture/findings/14-the-owners-audit-screen-has-no-design.md)).
- **The admin,** under `/admin/audit-log`. The admin's screen (31) is not built.

## Responsibility boundary

- **Owns** no table: it reads `audit_logs`, which `shared/audit` alone writes, append-only; it writes nothing. It owns the admin's list of the platform's events (`platformEvents.ts`).
- **Reads** the names of the targets and the actors (spaces, users, customers, subscriptions, packages, visits, check-ins, announcements, lookups) and the space's links (`space_managers`) in its own queries, as a read model ([conventions §8](../backend/conventions.md#8-module-rules), R7); it imports no module.
- **Leaves** who may read to `can()` (`space.auditLog.read`, [security › Authorization](../backend/security.md#authorization)), the boundary of `/manage/spaces/:spaceId` and `/admin`'s guard; what is audited, and with which values, to each writing service.

## How it composes the platform

- Its manage router sits at `/audit-log` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff; its route asks `requireCan('space.auditLog.read')` before the query is read. Its admin router sits at `/audit-log` inside `/admin`, behind its one guard.

## Behaviour and flows

**The owner's log.** Three statements in parallel share one `WHERE`: the page, newest first, then the higher id; its count; and the actors of the entries every filter but the actor's keeps (at most 50, persons by name, then `MASAHA`, then `SYSTEM`). The period starts at the Gaza midnight 29 days before today (`auditPeriod.ts`, pure), so the last 30 days are whole Gaza days across a daylight-saving change. Read without a lock: a log is history.

**The actor.** An entry's actor joined to its link to the entry's space, of any state: a link makes them a person, named even after it ended; none makes them `MASAHA`, the platform, whose id and name are never selected into the answer; no actor is `SYSTEM`. `actor=<id>` keeps a linked person's entries only.

**The target.** One left join per entity type, its type in the join's condition, so at most one matches (a visit's and a check-in's customer joined through them), reads the target's current name by `coalesce` — a space's and a lookup's in both languages; a person's, a customer's, a subscription's, a package's; a visit's visitor, else its customer; a check-in's customer — and whether a space or an announcement is deleted. Joins, not a lateral subquery: a search over a year reads each table once. `q` is matched against both names through `masaha_search_text`, in the same statement, before the page is cut ([data-model › Conventions](../architecture/data-model.md#conventions), *Search*).

**The admin's log.** The same three statements, scoped by the platform's list instead of a space: an action on `PLATFORM_ACTIONS`, whatever space it names, or on `PLATFORM_ACCOUNT_ACTIONS` with no space; the SQL is built from the same two arrays as the pure `isPlatformEvent`, so the rule and its test cannot drift. Each entry carries the space it names, a deleted one marked, and `q` matches that space's names too. The actor is a person, named, or `SYSTEM`; `actor` is a person's id.

## Decisions

### API decisions

- **The admin is `MASAHA` to the owner, decided by links, not by the role** (S1, the owner's decision 8). *Why:* the role is read now and can change; the links are kept for ever, and only the platform acts on a space without one (an admin is never linked). 2026-10-27, #128.
- **The owner's actor filter never names an admin** (S4): an id matches a linked person only; the admin's entries are `actor=MASAHA`. *Why:* an admin's id guessed into the filter would confirm who acted. 2026-10-27, #128.
- **The target's current name, not the name it had** (D4). *Why:* the table stores ids; a name copied into every entry would put the entity's knowledge in the writer, which knows no domain (conventions §6). 2026-10-27, #128.
- **The target by one left join per entity type, not a lateral subquery per entry.** *Why:* measured on a generated year, PostgreSQL wrapped the lateral in a `Memoize` node that missed on every entry, and a `q` over the year took 2.5–8.4 s; the joins read each table once. 2026-10-27, #128.
- **`before` and `after` answered as stored; the action as stored.** *Why:* the writer never stores a secret; summarising them would put display rules in the API ([ADR 0006](../architecture/decisions/0006-localisation-approach.md)); an action written later is still shown, and `AUDIT_ACTIONS` is what the filter accepts. 2026-10-27, #128.
- **The admin's log is a default-deny list of the platform's events** (S5, the owner's decision 9, §13 Q7). *Why:* ADR 0002 and 0009 keep a space's operations, money, capacity, settings and staff from the admin, while its public facts, existence, owners and moderation are the platform's; a list of what may be shown hides every action added later until it is listed. 2026-10-27, #128.
- **An account's event is the platform's only when it names no space** (S5). *Why:* an owner's staff account's events name the space and are the space's: its creation, its temporary passwords and their handover, and the email it corrects at its forced change (the space of its reception link); the admin's own accounts' name none. 2026-10-27, #128; the creation and the email, 2026-10-28, #128.
- **The platform's settings are the platform's events** (the owner's decision 11): each card's save, with the entity type `platformSettings` and no id, since a setting has none, so its target has no name. 2026-10-28, #130.
- **Kept for ever** (the owner's decision 10). *Why:* v1 has no retention rule; [finding 152](../architecture/findings/152-audit-entries-kept-for-ever-meet-the-databases-05-gb.md) records the cost. 2026-10-27, #128.
- **The period is the last 30 days or all time, no free range** (the owner's decision 9, §13 Q8). 2026-10-27, #128.
- **`meta.actors`** (S7): the period's actors, so a screen offers the actor filter without reading every page. 2026-10-27, #128.

## Code map

- `apps/api/src/modules/audit/` — the module: its service, its repository (the queries), its mapper, the period (`auditPeriod.ts`), the admin's list (`platformEvents.ts`) and its manage and admin routers.
- `packages/shared/src/audit/` — the actions and entity types, the queries, the answers.

## Open findings

- [14. The owner's audit screen has no design](../architecture/findings/14-the-owners-audit-screen-has-no-design.md)
- [152. Audit entries kept for ever meet the database's 0.5 GB](../architecture/findings/152-audit-entries-kept-for-ever-meet-the-databases-05-gb.md)

## History

### API history

- #128 — the owner's audit log of the space, the admin shown as Masaha, and the admin's log of the platform's events, by a default-deny list; paged, the last 30 days or all, searched by target, filtered by actor and action.
- #130 — the platform's settings' saves on the admin's log, their target with no id.
