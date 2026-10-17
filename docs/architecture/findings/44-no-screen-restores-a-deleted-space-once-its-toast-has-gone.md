# 44. No screen restores a deleted space once its toast has gone

**Status:** Resolved · **Date:** 2026-10-07

**Evidence:** the admin's spaces list deletes a space softly (S2b-3a), and the toast that follows offers an Undo for ten seconds, which restores it ([spaces › Decisions](../../features/spaces.md#decisions)). Once that toast has gone, nothing in the interface restores the space: the list never shows a deleted one, no screen lists them, and `POST /admin/spaces/:spaceId/restore` is reached only through the API ([api-contract §5](../../api/api-contract.md#spaces-the-admin)). A space deleted by mistake and noticed later needs the API.

**Resolves when:** a screen lists the deleted spaces and restores one (not among v1's committed screens: the owner's to decide), or the owner accepts that a restore after the toast goes through the API.

**Resolution (2026-10-15, #84):** the admin's spaces list offers «محذوفة» as its fourth status, which the API already answers, and a deleted row's only action is **Restore** ([space-links › Behaviour and flows](../../features/space-links.md#behaviour-and-flows), [spaces › Behaviour and flows](../../features/spaces.md#behaviour-and-flows)). It restores the space as it was, the same mutation and toasts the delete's Undo uses, so a space deleted by mistake is brought back long after its toast has gone.
