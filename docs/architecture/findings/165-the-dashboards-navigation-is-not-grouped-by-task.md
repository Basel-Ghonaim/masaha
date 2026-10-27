# 165. The dashboard's navigation is not grouped by task

**Status:** Open · **Date:** 2026-10-27

**Evidence:** the settled prototypes group the space's sidebar by task (P3: the day's work — the desk, the customers, the payments —, the space's offer, its page, its team and settings), and the admin's likewise. The shell's `DashboardNavigation` draws one flat `SidebarGroup` from `SPACE_NAV` and `ADMIN_NAV`, which hold no group; the owner's eleven pages read as one list. PAYMENTS_STEP10 (#127) fills four of those pages and leaves the list flat (its A4, not taken): grouping it touches every dashboard page's shell and its slow routes test (finding 87).

**Resolves when:** `SPACE_NAV` and `ADMIN_NAV` carry each item's group and the sidebar draws the groups with their labels (hidden on the rail), in an item of its own; or the owner keeps the flat list.
