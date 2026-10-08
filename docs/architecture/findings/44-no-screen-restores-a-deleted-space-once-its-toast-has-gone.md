# 44. No screen restores a deleted space once its toast has gone

**Status:** Open · **Date:** 2026-10-07

**Evidence:** the admin's spaces list deletes a space softly (S2b-3a), and the toast that follows offers an Undo for ten seconds, which restores it ([spaces › Decisions](../../features/spaces.md#decisions)). Once that toast has gone, nothing in the interface restores the space: the list never shows a deleted one, no screen lists them, and `POST /admin/spaces/:spaceId/restore` is reached only through the API ([api-contract §5](../../api/api-contract.md#spaces-the-admin)). A space deleted by mistake and noticed later needs the API.

**Resolves when:** a screen lists the deleted spaces and restores one (not among v1's committed screens: the owner's to decide), or the owner accepts that a restore after the toast goes through the API.
