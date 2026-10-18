# 50. An owner whose only spaces are deleted stays an owner

**Status:** Resolved · **Date:** 2026-10-11

**Evidence:** the global `OWNER` counts a soft-deleted space's owner links, so deleting a space changes no role ([space-links › Decisions](../../features/space-links.md#decisions)). A person whose only active owner links are to soft-deleted spaces therefore stays `OWNER`, while the users list shows them no space (a deleted space's link counts for nothing there), and `DELETE /admin/spaces/:spaceId/owners/:userId` answers 404 on a deleted space. The only way back to `USER` is to restore the space, unlink the person, and delete it again; no screen says so, and the planned role change offers `USER` or `ADMIN` only ([ADR 0009](../decisions/0009-space-scoped-reception-role.md)).

**Resolves when:** an unlink reaches a soft-deleted space's links, or deleting a space settles its owners' roles; or the owner accepts the way out as it is, written where the admin will find it.

**Resolution (2026-10-15, #84):** by the owner's third option, the way out is written, not built. A deleted space's row in the admin's spaces list names its owners under «محذوفة», so the admin can see whose space it was, and the way back is written beside it in the capability documents: **restore the space, unlink the owner there, and delete it again** ([space-links › Behaviour and flows](../../features/space-links.md#behaviour-and-flows), [spaces › Decisions](../../features/spaces.md#decisions)). This is guidance on the screens that exist, the deleted list being the first; the repository has **no web unlink UI**, so this item adds no unlink of a deleted space and changes no API behaviour — `DELETE …/owners/:userId` still answers 404 on a deleted space.

*2026-10-18, #88:* its screen — an owner whose only spaces are deleted reads «كل مساحاته محذوفة — استرجع المساحة لفك ربطه» on the owners page, the line a link to the deleted spaces, where the restore begins the way out.
