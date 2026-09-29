# ADR 0008 — Live occupancy is public as a state, never a count

> **Status:** Accepted · **Date:** 2026-09-28
> **Revised:** 2026-09-29 — the owner or reception can set the state manually for a set time (30 min, 1 h, 2 h or until closing), and open visits and open subscription check-ins both count as present. The rule stays in [data-model.md](../data-model.md#derived-values-computed-not-stored).
> **Revised:** 2026-09-29 — capacity is private from the **public** only: the space's staff (owner and reception) see present / capacity in the dashboard, and a check-in warns when the space is full. The admin still does not see it.

## Context
The plan was to show the public "available seats" — capacity minus open check-ins — for verified spaces. The owner's survey of real spaces (2026-09-28) showed that space owners do not publish their seat count: it is commercially sensitive, and a small number reads badly. A count shown only for some spaces would also invite comparison between them. Users still need the answer to one question: *can I go there now?*

## Decision
- **Capacity is private.** It is stored on the space and visible only to that space's staff (owner and reception), in the dashboard. It never appears on a public page or in a public API response, and the admin does not see it.
- **The public live status is a state:** `AVAILABLE` (متاح), `FULL` (ممتلئ) or `CLOSED` (مغلق الآن). The rule that derives it is owned by [data-model.md › Derived values](../data-model.md#derived-values-computed-not-stored).
- **Closed comes from the hours and closure announcements, not from the seats,** so a closed space is never shown as available.
- Unverified spaces, which have no owner and no live data, show no live state.
- `GET /spaces/:slug/occupancy` returns `{ status }`, never counts. The directory's "available now" filter selects `AVAILABLE`.
- The space's dashboard keeps the exact numbers (present / capacity) for its staff, and a check-in warns when the space is full.

## Alternatives
- **Public counts** (the original plan) — rejected: owners do not want their capacity published.
- **Counts for verified spaces only** — rejected: the verified spaces are exactly the owners who asked for privacy.
- **A percentage or a "busy" scale** — rejected for v1: it still leaks capacity over time, and three states answer the user's question.

## Consequences
- The public API and pages carry no occupancy numbers; the occupancy tests prove the state rule, not a subtraction.
- `SPACE_CAPACITY_NOT_SET` stays a staff-facing error: a verified space without capacity shows no live state until its owner sets one.
- A later "busy" indicator would be a new decision, not a change to this one.
