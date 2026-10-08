# 18. Whether a link to a deleted space still counts

**Status:** Resolved · **Date:** 2026-10-01

**Evidence:** the session lists the user's active links: those not deactivated ([api-contract §5](../../api/api-contract.md#session)). A space is soft-deleted (`deletedAt`), and its links are not touched, so a link to a deleted space still appears and would still open the dashboard. `space-links`' repository queries only its own table ([conventions §2](../../backend/conventions.md#2-layers)); nothing deletes spaces yet.

The two lists of a user's spaces now disagree. `GET /manage/spaces` (`mySpaces`) asks `spaces`, and leaves a soft-deleted space out. The session's links do not, and they feed `RequireSpaceRole` and the landing's fallback to the oldest link ([architecture.md › Landing and guards](../../frontend/architecture.md#landing-and-guards)). The dashboard reads both: its guards and its navigation read the session's links, and its switcher reads `mySpaces`. So a user can land on, and open, a space their switcher does not list.

**Resolves when:** the slice that soft-deletes spaces decides it, for example by deactivating the space's links in the same transaction, with a test.

*Resolved (2026-10-06, S2b-1):* a link to a soft-deleted space no longer counts. The session's links leave it out, as `GET /manage/spaces` does, both through `spaces`' own summaries, so the two lists agree. The link itself is left as it is. `auth.api.test.ts` proves the session's side, and `space-links.api.test.ts` the list's. Deleting a space writes nothing in `space_managers`, and the links loader of the space routes answers no links for a deleted space, so a restored space has its links again; `space.api.test.ts` proves it through the API.
