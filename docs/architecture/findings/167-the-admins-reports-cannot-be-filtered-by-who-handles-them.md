# 167. The admin's reports cannot be filtered by who handles them

**Status:** Open · **Date:** 2026-10-28

**Evidence:** the admin's «بلاغات البيانات» (#129) shows «يعالجه» on each report — «الإدارة» while its space is unverified, «المالك» once verified — from `AdminReport.space.verified` (DI-39). The design's filter by who handles a report (R2-AD-UX-003) has no parameter: `GET /admin/data-reports` filters by status, field and space only ([api-contract › Data reports](../../api/api-contract.md#data-reports)), so the admin cannot list only the reports the admin decides. The page offers no such filter (A8).

**Resolves when:** `GET /admin/data-reports` takes a `verified` (or handled-by) filter and the admin's list offers it; or the owner accepts the per-row «يعالجه» as enough.
