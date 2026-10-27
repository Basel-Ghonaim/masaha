# 101. The end sheet is not full width on a phone

**Status:** Resolved · **Date:** 2026-10-20

**Evidence:** the layer's `Sheet side="end"` is `w-3/4 max-w-sm` at every width (`apps/web/src/shared/design-system/components/overlays/Sheet/Sheet.tsx`), and its `SheetBody` has no `min-w-0`. OW-010 asks for a side sheet that takes the whole width below 768 px, so a form has room for its fields there. The owner's package sheet ([packages › Web decisions](../../features/packages.md#web-decisions)) is built with the sheet as it is: at 390 px it leaves a quarter of the screen to the page behind it, and its chips wrap into more rows. Found while building #98; the design system is not changed in a feature's item.

**Resolves when:** the layer's end sheet is full width below 768 px with a body that lets its content shrink, or the owner accepts the three-quarter sheet on a phone.

**Resolution (2026-10-26, #124):** the first. The layer's `start` and `end` sheets take the whole width below 768 px and three quarters, at most 24 rem, from there on; `SheetBody` lets its content shrink (`min-w-0`) ([foundation §12](../../frontend/design-system/foundation.md#12-component-inventory)).
