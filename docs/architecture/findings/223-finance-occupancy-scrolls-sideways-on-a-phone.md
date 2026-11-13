# 223. Finance › Occupancy scrolls sideways on a phone

**Status:** Open · **Date:** 2026-11-12

**Evidence:** the visual pass of the identity item (2026-11-12, Chrome): at 390 px the page's `scrollWidth` is 426 in English and 395 in Arabic for a `clientWidth` of 390, in every 390 variant; 768 and 1440 are clean. The Heatmap's visually hidden table (`apps/web/src/shared/design-system/components/data/Heatmap/Heatmap.tsx`, `<table class="sr-only">`) is positioned absolutely, and a table ignores `width: 1px`: its box is as wide as its rows (390 / 359 px). Its containing block lies outside the card content's `overflow-x-auto`, so it escapes that scroller and widens the page. With the table set to `display: none` the page is 390 px wide again.

**Resolves when:** the occupancy page does not scroll sideways at 390 px in either language, its table still read by assistive technology, with a test or a check that would see the overflow return.
