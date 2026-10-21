# 130. The dashboard's shells have no skip link

**Status:** Open · **Date:** 2026-10-21

**Evidence:** SH-018 ([the design's changes](../../design/CHANGES.md)) puts a «تخطَّ إلى المحتوى» link first in every shell, leading to `main`. The site's shell has it, and moves the focus to its `main` when another page opens (#101). The dashboard's shells (`pages/dashboard/shell/`, the admin's and the space's under `DashboardLayout`) have neither: a keyboard user crosses the sidebar's links on every page, and a page change leaves the focus on the link that opened it. PUBLIC built it on the site only, its scope.

**Resolves when:** a dashboard item adds the skip link and the focus on a page change to `DashboardLayout`.
