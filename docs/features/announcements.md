# Announcements

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-24 · **Owner:** Basel Ghoneim
> **Authority:** The `announcements` capability: what a space tells its users changes — a closure, an outage, an offer, an event or general news — posted and changed by its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#announcements-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `announcements` (L2); `@masaha/shared/announcements`.

## What it does

- Lets a space's staff, the owner and reception, post an announcement: a type, an Arabic text, an English one when given, a start (now when none is sent) and an end, or none. A retried post answers the first, never a second.
- Lets them edit any of its fields; the period is held to its bounds.
- Answers each announcement with its state now: upcoming, running or ended.
- Tells the live status which spaces a running closure covers ([occupancy](occupancy.md)).

## Who uses it

- **The space's owner and reception,** through the API, under `/manage/spaces/:spaceId/announcements`: they post and edit. The screens are not built.
- **The live status** ([occupancy](occupancy.md)): a running `CLOSURE` makes a space `CLOSED`.

## Responsibility boundary

- **Owns** the `announcements` table, its idempotency key, an announcement's state and the bounds of its period.
- **Leaves** the space and its lock to [`spaces`](spaces.md); who may write to `can()` (`announcements.manage`, [security › Authorization](../backend/security.md#authorization)); a closure's extension of the subscriptions it covered to [`subscriptions`](subscriptions.md), which owns `closure_extensions`.

## How it composes the platform

- Its manage router sits at `/announcements` below `/manage/spaces/:spaceId`, behind the one boundary that admits the space's staff ([conventions › Routers](../backend/conventions.md#routers)).
- Its writes ask `can()` at the route, through `requireCan`, then again under the space's lock, taken through `spaces` ([conventions › Space access](../backend/conventions.md#space-access)).
- A post carries the `Idempotency-Key` ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)).
- Each change is audited in its own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the names the [contract](../api/api-contract.md#announcements-managed) gives.
- Its requests are checked by the shared schemas ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The state** (`announcementState`, pure): upcoming while its start is after now, ended once its end is at or before now, else running. These are the comparisons of `closedAt`, so a running closure is exactly what closes the live status ([data model › Derived values](../architecture/data-model.md#derived-values-computed-not-stored)).

**Post.** In one transaction: the space's lock; `can()` on the links as they are under it; the announcement this key already posted, answered as it is now; the period at now (`periodErrors`, pure: a start at most 30 days back and 365 ahead, an end after now and at most 365 days after the start), the start now when none is sent; the row with its key; its audit entry.

**Edit.** The same lock and `can()`; the announcement's row, locked (`FOR UPDATE`), the space's and not deleted; only the fields the edit sets to a new value (`announcementChange`, pure: an instant compared as an instant, `null` clearing the English text or the end). An edit that changes nothing writes nothing. What changed is checked against now and the window, and the merged end against the merged start, so an ended announcement's text can still be corrected.

## Decisions

### API decisions

- **A post carries an idempotency key, unique within the space** (S1). *Why:* reception posts a closure on the spot, on the desk's weak connection; a retried post would make two closures, and the owner could extend the subscriptions twice ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)). Rows made before the key got one of their own in the migration. 2026-10-24, #112.
- **The writes are the staff's, owner and reception** (ADR 0009's writers). *Why:* reception announces a closure at the desk; `announcements.manage` decides at the route and again under the space's lock, so a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-24, #112.
- **The period's bounds** (S5): a start at most 30 days back and 365 ahead, an end after now and at most 365 days after its start; texts 1–500 characters, line breaks kept. *Why:* a closure may be posted late, but a typo in a year must never make a closure of a decade; ending one now is its own route. 2026-10-24, #112.
- **An edit checks against now only what it changes.** *Why:* an ended announcement's text stays correctable; a changed end still comes after now. 2026-10-24, #112.
- **No title and no author on an announcement** (O9). *Why:* the design shows neither; the audit records who. 2026-10-24, #112.

## Code map

- `apps/api/src/modules/announcements/` — the module: its service, its repository, its manage router, and the pure rules (`announcementState`, `period`, `announcementChange`).
- `packages/shared/src/announcements/` — the requests and answers.

## Open findings

None.

## History

### API history

- 2026-10-24, #112 — posted (idempotent) and edited by the staff.
