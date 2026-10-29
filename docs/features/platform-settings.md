# Platform settings

> **Status:** Active · **Class:** Description — what is built, as the code shows it · **Last Updated:** 2026-10-29 · **Owner:** Basel Ghoneim
> **Authority:** The `platform-settings` capability: the platform's own settings, which the admin edits and other modules read. Its endpoints are owned by the [API contract](../api/api-contract.md#platform-settings); its entity by the [data model](../architecture/data-model.md#operations). The API is built; no screen yet.
> **Scope:** the API module `platform-settings` (L0); `@masaha/shared/platform-settings`, and the new-space defaults' schema in `@masaha/shared/space-settings`.

## What it does

- Keeps the platform's settings as key–value rows, each read through one typed catalogue: the new-space defaults, the two staleness thresholds and the platform's contact.
- Answers the admin three cards, each its own resource, read and saved whole and on its own: the new-space defaults, the staleness thresholds, and the contact (an email and a WhatsApp number).
- Writes and audits only what a save changes; a save that changes no value writes no value and no entry.
- Answers anyone the platform's contact (`GET /settings/public`), cached 5 minutes.
- Answers the modules that apply a value: the new-space defaults to a space's creation, the thresholds to every read of a space's stale groups.

## Who uses it

- **The admin,** under `/admin/settings/{new-space-defaults|staleness|contact}`. The admin's settings screen (32) is not built.
- **Anyone,** at `/settings/public`: the contact, for the site's About and the owner's line.
- **`spaces`** reads the defaults when a space is created and the thresholds for its stale groups.
- The site still reads its contact from `VITE_CONTACT_*`; moving it to the API is the web's.

## Responsibility boundary

- **Owns** the `settings` table, its key catalogue (`settingKeys.ts`), the thresholds' bounds and the rule of what a save changes (`settingsChange.ts`).
- **Leaves** applying a value to the module that consumes it ([conventions › Settings](../backend/conventions.md#settings-three-screens-three-owners)): the copy into a new space's settings to [`spaces`](spaces.md) and [`space-settings`](space-settings.md), the staleness rule to `spaces`; the new-space defaults' schema to `@masaha/shared/space-settings`, a space's settings subset; who may save to `/admin`'s guard.

## How it composes the platform

- Its public router sits at `/settings`, with no guard: `GET /settings/public`, the contact. Its admin router sits at `/settings` inside `/admin`, behind its one guard (`requireRole('ADMIN')`); each save's body is checked by its shared schema.
- The composition root passes it `runInTransaction` and the audit writer; it imports no module.
- Each save is audited in its own transaction ([conventions §6](../backend/conventions.md#6-audit)) with the names the [contract](../api/api-contract.md#platform-settings) gives, on the admin's log ([audit](audit.md)).

## Behaviour and flows

**A read.** One query for the card's keys; each value parsed by its catalogue schema. A required key with no row, or any value that fails its schema, throws: a fault, never a default. An optional key (the contact's) with no row reads `null`.

**A save.** In one transaction: a row inserted, JSON `null`, for each of the card's optional keys that has none (`ON CONFLICT DO NOTHING`); the card's rows locked by key (`FOR UPDATE`) and parsed; the fields that differ from the stored ones (`settingsChange`, pure); none → the card answered as it is, nothing written; else each changed key written (`null` as JSON `null`) and one entry audited, `platformSettings.<card>Edited`, the entity `platformSettings` with no id and no space, `before` and `after` the changed fields only. Two saves of one card at once: the second waits on the rows and its `before` is the first's `after`. Two first saves of the contact: the second's insert waits on the first's, then does nothing.

**The public contact.** The contact's two keys read as for the admin, answered with `Cache-Control: public, max-age=300`; a stored value that fails its schema is a 500, never answered.

**The defaults** apply to the next space created, never to an existing one; **a threshold** applies at once, as every stale-group read reads it.

## Decisions

### API decisions

- **Three resources, one per card** (the owner's decision 11; AD-029). *Why:* each card is its own save and error on the admin's page; the shared level rule keeps an L0 capability from importing another, so each card is typed by its owner — the defaults by `space-settings`, which they are a subset of. 2026-10-28, #130.
- **The contact in the catalogue, optional** ([finding 40](../architecture/findings/40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md), resolved). *Why:* the seed writes it only when its environment gives it; a missing row is "unset", not a fault. 2026-10-28, #130.
- **The contact read in the form the seed stores, written normalised** (S10). *Why:* a stricter read could turn an existing row into a 500 on the public contact; the admin's save lowercases the email and puts the number in its E.164 form. 2026-10-28, #130.
- **The thresholds are whole days from 1 to 365** (S11). *Why:* a typo of thousands would mark nothing stale for years; the stored 60 and 30 pass. 2026-10-28, #130.
- **A save writes and audits only what changed; the same values write no value and no entry.** *Why:* as a space's settings; an entry that changes nothing is noise on the admin's log. 2026-10-28, #130.
- **The card's rows locked by key, after an insert of the missing optional ones.** *Why:* two admins saving one card at once are one after the other; a lock on a row that does not exist yet would lock nothing ([conventions › Concurrency](../backend/conventions.md#concurrency)). 2026-10-28, #130.
- **The public contact cached 5 minutes** (D7). *Why:* it changes rarely, and the site reads it on About and the owner's line; a saved change reaches a reader within 5 minutes. 2026-10-28, #130.
- **An audit entry with no entity id** (S8). *Why:* a setting has no numeric id; a fake `0` would lie. 2026-10-28, #130.

## Code map

- `apps/api/src/modules/platform-settings/` — the module: the key catalogue (`settingKeys.ts`), its repository, its service with the three cards, the pure rule of what a save changes (`settingsChange.ts`), its controller, its admin and public routers.
- `packages/shared/src/platform-settings/` — the thresholds' and the contact's schemas and answers; `packages/shared/src/space-settings/requests.ts` — the new-space defaults' schema.

## Open findings

- [153. The seed stores the contact's WhatsApp in a form the phone rule does not](../architecture/findings/153-the-seed-stores-the-contacts-whatsapp-in-a-form-the-phone-rule-does-not.md)

## History

### API history

- #130 — the admin's three cards, the new-space defaults, the staleness thresholds and the contact, each read and saved on its own and audited; the contact in the typed catalogue (finding 40); the public contact, `GET /settings/public`.
