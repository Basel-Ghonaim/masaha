# 220. The admin's top bar still offers to hide and delete a space found deleted

**Status:** Resolved · **Date:** 2026-11-12

**Evidence:** seen in #143's fix round, in its run in Chrome: the admin's editor of an unverified space open in one tab, the space deleted from a second tab, then «حفظ» in the first. The page turns to the 404, «الصفحة غير موجودة», and the top bar above it still offers «إخفاء عن الزوار» and «حذف المساحة» (below 768 px, its «إجراءات الصفحة» menu) for the space just found deleted. `SpaceEditorActions` (`apps/web/src/features/spaces/components/editor/SpaceEditorActions.tsx`, in `SpaceEditPage`'s top bar) draws what `useSpaceEditorActions` (`apps/web/src/features/spaces/hooks/editor/useSpaceEditorActions.ts`) returns, and that hook returns the actions whenever the space's query (`useSpaceQuery('admin', spaceId)`) holds data: it returns none only while `query.data` is `undefined`. TanStack Query keeps a query's last data when a later read fails, so once the space answers 404 the query holds the error and the space read before it. The editor (`useSpaceEditor.ts`) and the page's title (`useSpaceName.ts`), in the same folder, read that 404 as the space being gone, whatever was read before; the actions' hook does not.

**Resolution (2026-11-14, #146):** `useSpaceEditorActions` offers nothing once a later read answers 404, so a deleted
space no longer keeps its top-bar actions; a transient failure (e.g. 500) on a later read keeps them. The actions
component test draws them, answers 404 to a later read and finds no action, and answers 500 to a later read and finds
them still there.
