# Favourites

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-25 · **Owner:** Basel Ghoneim
> **Authority:** The `favorites` capability: a signed-in user keeps the listed spaces they want to find again. Its endpoints are owned by the [API contract](../api/api-contract.md#favourites); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `favorites` (L2); `@masaha/shared/favorites`.

## What it does

- Lets a signed-in user save a publicly listed space, at most 200, and remove one, listed or not.
- Answers a save of a space already saved, and a removal of one not saved, as done, writing nothing.

## Who uses it

- **A signed-in user,** through the API: `POST` and `DELETE /me/favorites/:spaceId`. The space page's heart and the account's favourites are not built.

## Responsibility boundary

- **Owns** the `favorites` table and its ceiling (`FAVORITES_MAX`, 200).
- **Leaves** whether a space is publicly listed to the public listing of [`spaces`](spaces.md) (`publicListing.upTo`, with the areas [`lookups`](lookups.md) lists), as the directory lists it; the user's lock to [`users`](users.md) (`lockAccount`).

## How it composes the platform

- Its me router sits at `/me`, after the users' own, each route behind `requireAuth`; the path's id is read by `parseId` (a malformed one is `not_found`).

## Behaviour and flows

**Save.** In one transaction: the user's row locked (`users.lockAccount`, the session lock), so one user's saves are serialised; a space already saved is answered as it is, 204, writing nothing, even at the ceiling; a space the public listing does not list is `not_found`; a new one past 200 is `FAVORITES_LIMIT_REACHED`; else the favourite, dated by the one clock. Two saves at once: the second waits on the lock and finds the first; the primary key is the backstop. Two saves of different spaces at 199: the second finds 200.

**Remove.** The caller's row of that space deleted, if there is one, 204 either way: a space that left the directory is removed all the same.

## Decisions

### API decisions

- **At most 200 favourites, held under the user's lock** (`FAVORITES_LIMIT_REACHED`, S9). *Why:* the list is answered whole; two saves at 199 would otherwise both pass the count. #121.
- **Saving and removing are idempotent by design**: a space already saved, or one not saved, answers 204. *Why:* a heart tapped twice, or a retry after a lost answer, is no error ([conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)). The already-saved answer comes before the listing and the ceiling, so a saved space at 200 still answers 204. #121.
- **"Publicly listed" is asked of the public listing** (S12). *Why:* the rule already lives in the directory's queries; a copy would drift. #121.
- **Not audited.** *Why:* a person's own choice, no one else's record. #121.

## Code map

- `apps/api/src/modules/favorites/` — the module: its service, its repository and its me router.
- `packages/shared/src/favorites/` — the ceiling.

## Open findings

None.

## History

### API history

- #121 — a signed-in user's favourites saved and removed, idempotent, at most 200.
