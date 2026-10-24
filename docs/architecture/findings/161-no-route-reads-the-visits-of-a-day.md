# 161. No route reads the visits of a day

**Status:** Open · **Date:** 2026-10-24

**Evidence:** The desk's design has an attendance log tab («السجل»), the day's visits and check-ins. The API answers a space's subscriber check-ins by date (`GET …/check-ins?from&to`), but no route reads its visits by date: the open ones come with the state now (`GET …/occupancy`), the uncollected ones from `…/uncollected-visits`, and the plan's `GET …/visits` with a date range is not built ([v1 plan](../../plans/v1-mvp.md)). The desk's screen (#116) leaves the tab out.

**Resolves when:** the planned `GET /manage/spaces/:spaceId/visits` with a date range is built, and the desk's log tab reads it.
