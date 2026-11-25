# 230. The layer's alert has no success variant

**Status:** Open · **Date:** 2026-11-24

**Evidence:** the approved picture of the sign-in over a page (masaha-prototype, `Space details/inplace.jsx`, the view «changed», A1) draws «تم تغيير كلمة المرور» as a success notice: the success's subtle surface, its border and a tick. The layer's `Alert` (`apps/web/src/shared/design-system/components/feedback/Alert/Alert.tsx`) has three variants, `info`, `warning` and `destructive`, and no `success`; the prototype paints its own over `info` with page CSS (`.inplace-done`). WI-C2 (#157) built the notice as the layer's `info` alert with the success tick (`CircleCheckIcon` in `text-success`, the variant's icon replaced), since the layer was not this item's to change (WI-B edits it beside it). The tokens a success alert needs exist (`success`, `success-subtle`, `success-subtle-foreground`, foundation §5).

**Resolves when:** the owner decides whether a success notice is a variant of `Alert` (foundation §12, its contrast verified as the other three's), and, if it is, the sign-in's notice takes it.
