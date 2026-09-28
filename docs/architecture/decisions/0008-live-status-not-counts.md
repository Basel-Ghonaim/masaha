# ADR 0008 — Live occupancy is public as a state, never a count

> **Status:** Accepted · **Date:** 2026-09-28

## Context
The plan was to show the public "available seats" — capacity minus open check-ins — for verified spaces. The owner's survey of real spaces (2026-09-28) showed that space owners do not publish their seat count: it is commercially sensitive, and a small number reads badly. A count shown only for some spaces would also invite comparison between them. Users still need the answer to one question: *can I go there now?*

## Decision
- **Capacity is private.** It is stored on the space and visible only to that space's owner, in the dashboard. It never appears on a public page or in a public API response, and the admin does not see it.
- **The public live status is a state:** `AVAILABLE` (متاح), `FULL` (ممتلئ) or `CLOSED` (مغلق الآن). The rule that derives it is owned by [data-model.md › Derived values](../data-model.md#derived-values-computed-not-stored).
- **Closed comes from the hours and closure announcements, not from the seats,** so a closed space is never shown as available.
- Unverified spaces, which have no owner and no live data, show no live state.
- `GET /spaces/:slug/occupancy` returns `{ status }`, never counts. The directory's "available now" filter selects `AVAILABLE`.
- The owner's dashboard keeps the exact numbers (present / capacity).

## Alternatives
- **Public counts** (the original plan) — rejected: owners do not want their capacity published.
- **Counts for verified spaces only** — rejected: the verified spaces are exactly the owners who asked for privacy.
- **A percentage or a "busy" scale** — rejected for v1: it still leaks capacity over time, and three states answer the user's question.

## Consequences
- The public API and pages carry no occupancy numbers; the occupancy tests prove the state rule, not a subtraction.
- `SPACE_CAPACITY_NOT_SET` stays an owner-facing error: a verified space without capacity shows no live state until its owner sets one.
- A later "busy" indicator would be a new decision, not a change to this one.
