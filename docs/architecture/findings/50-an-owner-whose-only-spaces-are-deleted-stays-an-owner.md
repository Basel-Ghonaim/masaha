# 50. An owner whose only spaces are deleted stays an owner

**Status:** Open · **Date:** 2026-10-11

**Evidence:** the global `OWNER` counts a soft-deleted space's owner links, so deleting a space changes no role ([space-links › Decisions](../../features/space-links.md#decisions)). A person whose only active owner links are to soft-deleted spaces therefore stays `OWNER`, while the users list shows them no space (a deleted space's link counts for nothing there), and `DELETE /admin/spaces/:spaceId/owners/:userId` answers 404 on a deleted space. The only way back to `USER` is to restore the space, unlink the person, and delete it again; no screen says so, and the planned role change offers `USER` or `ADMIN` only ([ADR 0009](../decisions/0009-space-scoped-reception-role.md)).

**Resolves when:** an unlink reaches a soft-deleted space's links, or deleting a space settles its owners' roles; or the owner accepts the way out as it is, written where the admin will find it.
