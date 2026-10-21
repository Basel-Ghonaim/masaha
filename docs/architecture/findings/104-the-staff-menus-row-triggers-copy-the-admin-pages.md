# 104. The staff menu's row triggers copy the admin page's

**Status:** Open · **Date:** 2026-10-21

**Evidence:** the owner's staff list finds each row's menu button again for the dialogs it holds above the rows (`apps/web/src/features/staff/hooks/menu/useMenuTriggers.ts`), so the focus returns to the button the person has when a dialog closes. It is a copy of the admin's users page's `useRowTriggers` (`apps/web/src/pages/dashboard/admin/useRowTriggers.ts`): a feature may not import a page's hook ([architecture §1](../../frontend/architecture.md#1-four-zones)), so #99 wrote a second instance. Found in #99's review, the executor's own note.

**Resolves when:** one home serves both — `shared/`, or the design system's data layer beside `DataTable` — and the two lists use it.
