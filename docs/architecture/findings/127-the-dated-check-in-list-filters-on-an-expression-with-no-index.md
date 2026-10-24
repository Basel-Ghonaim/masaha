# 127. The dated check-in list filters on an expression with no index

**Status:** Open · **Date:** 2026-10-24

**Evidence:** the space's check-ins by date (`GET /manage/spaces/:spaceId/check-ins` with `from` and `to`) filter on each check-in's Gaza date, an expression (`subscriptions.repository.ts`: `(checked_in_at AT TIME ZONE 'Asia/Gaza')::date BETWEEN …`), which the `(space_id, checked_in_at)` index cannot serve; so each page and its count read every check-in of the space. At a coworking space's volume that stays cheap for years, and the bounds are correct (#109's tests prove both edges); found by #109's review (finding 5).

**Resolves when:** the filter bounds `checked_in_at` by the two Gaza midnights as instants, which the index serves; decided with [finding 120](120-gaza-dates-are-read-by-two-zone-databases.md), since those midnights would come from Node's zone data while the dates come from PostgreSQL's.
