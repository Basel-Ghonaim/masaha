# 41. The request log does not name the space

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** the fields of every request log include the space on space routes ([conventions §10](../../backend/conventions.md#10-logging)). The space routes exist since S2b-1 (the admin's `/admin/spaces/:spaceId`), but the request logger (`apps/api/src/shared/http/requestLogging.ts`) adds only the user and their role, once `requireAuth` has read them.

**Resolves when:** the logger adds the space id on the routes that load a space's links, with a test; or the rule is narrowed to the `/manage` routes and waits for them.

**Resolution (2026-10-07, S2b-2):** the request logger adds `spaceId` once the links loader has put the space on the request, as it adds the user once `requireAuth` has read them. A test of the admin's space read finds the space's id in the request's log line; it failed without it.
