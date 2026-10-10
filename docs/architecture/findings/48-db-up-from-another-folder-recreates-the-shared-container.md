# 48. `db:up` from another folder recreates the shared container

**Status:** Open · **Date:** 2026-10-10

**Evidence:** `docker-compose.yml` binds the init script by a path relative to the folder (`./docker/postgres/create-test-database.sql`), and its project name `masaha` is the same in every folder, so every folder owns the one container `masaha-postgres-1` ([setup › Database](../../development/setup.md#database)). `npm run db:up` from a second folder, such as the `masaha-b` worktree, sees a changed configuration (another bind source) and recreates the container bound to that folder. The data survives, because it lives in the named volume `masaha-pgdata`; but the container then depends on that folder, and fails to start once the folder is gone. [Setup › Running a second folder](../../development/setup.md#running-a-second-folder) tells a second folder to start the existing container instead.

**Resolves when:** the container no longer depends on the folder that started it.
