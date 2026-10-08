# 7. The stress test's filter chips have no component

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** the Admin › Data reports phone stress test (`0-overview.jpg`, the filter bottom sheet) chooses statuses with toggle chips: pill-shaped, several selectable at once, a check and the `accent` pair when selected. Foundation §4 names "filter chips" as a user of `radius-pill`, but §12 lists no component for them, and none of WI-5 to WI-8 builds one. WI-7's showcase shows the filter sheet with checkboxes in their place.

**Resolves when:** WI-8 builds the ToggleGroup (filter chips).

*Decided (2026-09-28):* the owner put a ToggleGroup, on Radix's ToggleGroup from the approved `radix-ui` package, into the layer. It has a foundation §12 row and is in WI-8's scope in the [design-system plan](../../plans/historical/design-system-layer.md). The finding stays open until WI-8 builds it.

**Resolution (2026-09-28):** WI-8 built the ToggleGroup, and the showcase's filter sheet chooses statuses with its chips in place of checkboxes. The edges were sampled from `0-overview.jpg` by lightness, since the JPEG blurs a 1px line into its neighbours: `input` off and `primary` on, in both themes. The chips are 36px tall, as in the stress test, and `--control-height` on touch.
