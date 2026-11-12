# 224. The map's tooltip and two scrolling strips fail axe

**Status:** Open · **Date:** 2026-11-12

**Evidence:** axe-core run in Chrome on every screen of the identity item's visual pass (2026-11-12, light-ar-390 and dark-en-1440). `aria-tooltip-name` (serious): the tooltip beside a selected mark on the directory's map, Leaflet's `role="tooltip"` element bound in `apps/web/src/shared/map/components/LeafletMarkerMap.tsx`, has no accessible name. `scrollable-region-focusable`, at 390 px: the strip of the other photos in `apps/web/src/features/spaces/components/photos/PhotosView.tsx` (`overflow-x-auto`) and the occupancy heatmap's card content (finding 223's) scroll with no focusable element inside, so the keyboard cannot scroll them. No colour-contrast violation was reported on any screen.

**Resolves when:** axe reports neither rule on those screens, in either theme.
