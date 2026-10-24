# Announcements

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-24 · **Owner:** Basel Ghoneim
> **Authority:** The `announcements` capability: what a space tells its users changes — a closure, an outage, an offer, an event or general news — posted and changed by its staff. Its endpoints are owned by the [API contract](../api/api-contract.md#announcements-managed); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `announcements` (L2); `@masaha/shared/announcements`.

## What it does

- Lets a space's staff, the owner and reception, post an announcement: a type, an Arabic text, an English one when given, a start (now when none is sent) and an end, or none. A retried post answers the first, never a second.
- Lets them edit any of its fields; the period is held to its bounds.
- Lets them end a running one now, start an upcoming one now, and delete one in any state, softly.
- Answers each announcement with its state now: upcoming, running or ended.
- Pages one state's announcements and counts them by state, for the managed list and its summary, which [`subscriptions`](subscriptions.md) composes with each closure's extension.
- Answers a space's running and upcoming announcements, not deleted, by start then id, up to the count the caller gives, for its public page.
- Tells the live status which spaces a running closure covers ([occupancy](occupancy.md)).

## Who uses it

- **The space's owner and reception,** through the API, under `/manage/spaces/:spaceId/announcements`: they post, edit, end, start and delete. The screens are not built.
- **The live status** ([occupancy](occupancy.md)): a running `CLOSURE` makes a space `CLOSED`.
- **[`subscriptions`](subscriptions.md),** whose managed list and summary read its pages, its counts and its started closures.
- **[`directory`](directory.md),** whose space page reads its running and upcoming announcements.

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

**The list's reads.** A page of one state, not deleted: the state a filter on the instants, running and upcoming by start then id, ended by end, latest first, then id; its count in parallel. The counts of the three states are one grouped query; the started closures (since a given day) one more. `subscriptions` adds the extensions ([its document](subscriptions.md)).

**The public read** (`publicOf`). A space's announcements not deleted whose end is none or after now — running and upcoming, never an ended one — by start then id, at most the count the caller gives; [`directory`](directory.md) asks 20 for a space's page.

**End now, start now, delete.** Each takes the same lock and `can()`, then the row, locked. End now sets a running one's end to now; an ended one is answered as it is; an upcoming one is refused (`ANNOUNCEMENT_NOT_STARTED`). Start now sets an upcoming one's start to now, refused (`validation` on `endsAt`) when its end would then fall more than 365 days after its start; a started one is answered as it is. Delete sets `deletedAt` in any state, the row kept; a deleted one answers 204 again, writing nothing, and leaves every read and the live status.

## Decisions

### API decisions

- **A post carries an idempotency key, unique within the space** (S1). *Why:* reception posts a closure on the spot, on the desk's weak connection; a retried post would make two closures, and the owner could extend the subscriptions twice ([ADR 0015](../architecture/decisions/0015-idempotency-and-concurrency.md)). Rows made before the key got one of their own in the migration. 2026-10-24, #112.
- **The writes are the staff's, owner and reception** (ADR 0009's writers). *Why:* reception announces a closure at the desk; `announcements.manage` decides at the route and again under the space's lock, so a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-24, #112.
- **The period's bounds** (S5): a start at most 30 days back and 365 ahead, an end after now and at most 365 days after its start; texts 1–500 characters, line breaks kept. *Why:* a closure may be posted late, but a typo in a year must never make a closure of a decade; ending one now is its own route. 2026-10-24, #112. Revised: start now holds the end's bound too, an end more than 365 days after now refused. *Why:* starting a far-off announcement now kept its end, so its period could pass 365 days. 2026-10-24, #114.
- **An edit checks against now only what it changes.** *Why:* an ended announcement's text stays correctable; a changed end still comes after now. 2026-10-24, #112.
- **End now refuses an announcement not started yet: `ANNOUNCEMENT_NOT_STARTED`.** *Why:* its end would come before its start, which the database's `announcements_dates_check` refuses; the design offers deleting it there. 2026-10-24, #112.
- **End now, start now and delete answer a repeat as it is, writing nothing** (O10). *Why:* updates are idempotent by design ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)); a retry after a lost answer must not read as a refusal. 2026-10-24, #112.
- **Delete is soft and allowed in any state** (O10, [ADR 0007](../architecture/decisions/0007-soft-delete.md)). *Why:* the row stays for the audit and a closure's extension; a running closure deleted reopens the space at once. 2026-10-24, #112.
- **No title and no author on an announcement** (O9). *Why:* the design shows neither; the audit records who. 2026-10-24, #112.

## Code map

- `apps/api/src/modules/announcements/` — the module: its service, its repository, its manage router, and the pure rules (`announcementState`, `period`, `announcementChange`).
- `packages/shared/src/announcements/` — the requests and answers.

## Open findings

None.

## History

### API history

- 2026-10-24, #112 — posted (idempotent), edited, ended, started and deleted by the staff; the pages and counts the managed list composes; the running and upcoming ones a space's public page reads.
