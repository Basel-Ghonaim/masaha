# Space settings

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-19 · **Owner:** Basel Ghoneim
> **Authority:** The `space-settings` capability: a space's settings, the rules its front desk will run on. Its endpoints are owned by the [API contract](../api/api-contract.md#settings-managed); its entity by the [data model](../architecture/data-model.md#spaces). The API is built; no web screen yet.
> **Scope:** the API module `space-settings` (L0); `@masaha/shared/space-settings`. No web feature yet.

## What it does

- Keeps a space's settings, one row per space: auto check-out at closing, the stay limit, the visit rounding rule and its minutes, the cap at the day price, student prices for visits, whether reception may type a price by hand, and the WhatsApp debt reminder.
- Creates the row with the space, from the platform's new-space defaults.
- Answers the space's owner its settings, whole.
- Lets the owner edit any of them.

## Who uses it

- **The space's owner,** through the API: reads and edits.
- **The front desk's modules** will read the values they apply: visits and subscriptions (auto check-out, the stay limit, hand-typed prices), visits (the rounding, the cap, student prices); finance, the reminder. None is built yet.
- Reception reads nothing here, and the admin never reaches it. No web screen reads it yet.

## Responsibility boundary

- **Owns** the `space_settings` table, the settings' bounds, and the rule of what an edit changes.
- **Leaves** the space and its lock to [`spaces`](spaces.md); the new-space defaults to `platform-settings` ([conventions › New-space defaults](../backend/conventions.md#new-space-defaults)); the capacity to `occupancy`; the charge and auto check-out themselves to `visits` and `subscriptions` (not built); who may read or write to `can()` ([security › Authorization](../backend/security.md#authorization)).

## How it composes the platform

- Its manage router sits at `/manage/spaces/:spaceId/settings`, behind the one boundary that admits the space's staff ([security › Authorization](../backend/security.md#authorization), [conventions › Routers](../backend/conventions.md#routers)).
- Both routes ask `can()` at the route, through `requireCan`; the edit asks it again under the space's lock, which the composition root passes in ([conventions › Space access](../backend/conventions.md#space-access), [§13](../backend/conventions.md#13-idempotency-and-concurrency)).
- The space's creation calls it in its own transaction, with the new-space defaults ([spaces › How it composes the platform](spaces.md#how-it-composes-the-platform)).
- Each edit is audited by the audit writer, in the edit's own transaction ([conventions §6](../backend/conventions.md#6-audit)), with the name the [contract](../api/api-contract.md#settings-managed) gives.
- Its request is checked by the shared schema ([shared-package.md](../architecture/shared-package.md)).

## Behaviour and flows

**The creation.** The space's creation writes the row in its own transaction: the four settings the new-space defaults govern, copied; the others take their database defaults (student prices on, hand-typed prices off, no stay limit, the catalogue's reminder).

**The read.** One query reads the space's row.

**The edit.** In one transaction: the space's lock; `can()` on the links as they are under it; the row; only the fields the edit sets to a new value are written and audited, `null` clearing the stay limit or the reminder. An edit that changes nothing writes nothing.

A change applies from then on ([data model › Front desk and money](../architecture/data-model.md#front-desk-and-money)).

## Decisions

### API decisions

- **The settings and their reads are the owner's: reception is refused at the route before the body is read; anyone else without a link, the admin included, gets 404 from the boundary** (D2). *Why:* the settings screen is the owner's ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)); the desk's modules read the values they need themselves. 2026-10-19, #92.
- **The edit is decided under the space's lock, on the links read there.** *Why:* a link ended meanwhile still decides ([finding 43](../architecture/findings/43-two-races-around-a-spaces-facts.md)). 2026-10-19, #92.
- **The lock reaches the module as a function the composition root passes** (P1). *Why:* the lock is `spaces`' (L1) and this module is L0; a lower module takes an upward need as a parameter ([conventions §8](../backend/conventions.md#8-module-rules), R5). 2026-10-19, #92.
- **The read is one query, with no lock** (P4). *Why:* one statement is never half of a change; the boundary has admitted the caller. 2026-10-19, #92.
- **The stay limit is whole hours, 1 to 23, or none** (the design's S9). *Why:* a visit is a same-day stay, so closing time already ends every stay; kept in minutes, so a finer step is a validation change. 2026-10-19, #92.
- **The rounding rule and its minutes are sent together, the minutes 1 to 59 for "up after N minutes" only** (OW-021). *Why:* they are one choice; a patch is checked alone, never against the stored row, so no partial patch can reach the database's check. 2026-10-19, #92.
- **The reminder is a paragraph of 1–500 characters, or `null` for the catalogue's text.** *Why:* a reminder is a few lines; 500 keeps a `wa.me` link of Arabic text inside every browser's URL limit. 2026-10-19, #92.
- **A switch is never `null`; what a patch leaves out is kept; unknown keys are stripped.** *Why:* a switch has two states; as every other managed write. 2026-10-19, #92.
- **Reception may type prices by hand only where the space allows it, off by default; not a new-space default** (D4). *Why:* a fraud guard whose safe value is fixed, as student prices' default is; the rule is the [data model's](../architecture/data-model.md#front-desk-and-money) and [ADR 0009's](../architecture/decisions/0009-space-scoped-reception-role.md). 2026-10-19, #92.
- **An edit writes and audits only what it changes, `space.settingsEdited`; one that changes nothing writes nothing** (D6). 2026-10-19, #92.
- **A missing settings row is a fault (500), never a 404 or a creation** (P2). *Why:* every space has one, created with it. 2026-10-19, #92.
- **A missing student price falls back to the general one** (the owner's design decision DI-41) and **a change applies from then on** — both the [data model's](../architecture/data-model.md#front-desk-and-money). 2026-10-19, #92.

## Code map

- **API:** `apps/api/src/modules/space-settings/`, entry `index.ts`: the service, the repository, the mapper, the manage router, and beside them the pure rule of what an edit changes (`settingsChange.ts`).
- **Shared:** `packages/shared/src/space-settings/`: the request, with the rounding rules and the bounds, and the response.

## Open findings

None.

## History

### API history

- #92 — a space's settings, read and edited by its owner on the API; reception's hand-typed prices switch.
