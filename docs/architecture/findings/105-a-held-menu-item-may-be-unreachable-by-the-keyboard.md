# 105. A held menu item may be unreachable by the keyboard

**Status:** Open · **Date:** 2026-10-21

**Evidence:** a row menu draws a held action as a `disabled` `DropdownMenuItem` with its reason inside it: the owner's staff menu's «كلمة مرور مؤقتة جديدة» (`apps/web/src/features/staff/components/StaffActionsMenu.tsx`) and the admin's users page's items (`apps/web/src/pages/dashboard/admin/MenuActionItem.tsx`). Radix's menu may skip disabled items in its arrow-key navigation; if it does, a keyboard or screen-reader user never reaches the reason, and "every disabled action stays reachable with its reason" ([foundation §10](../../frontend/design-system/foundation.md#10-accessibility-baseline)) holds only for the pointer. **Unverified:** neither #99's executor nor its review opened Radix's source or tried it with a screen reader. A project-wide pattern, found in #99's review.

**Resolves when:** Radix's behaviour is checked; if it skips them, the held items stay focusable (`aria-disabled` without `disabled`, the action ignored) or their reason is said where a keyboard reaches it.
