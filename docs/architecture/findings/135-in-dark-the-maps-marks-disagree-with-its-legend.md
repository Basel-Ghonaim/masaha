# 135. In dark, the map's marks disagree with its legend

**Status:** Open · **Date:** 2026-10-22

**Evidence:** `leaflet.css` fills the hollow and dashed marks, and edges the filled ones, with `card`, as the plan specified (#105). OpenStreetMap's tiles stay light in both themes, so in dark the hollow and dashed marks read on the map as dark filled discs, while the legend draws the same marks on the dark card, where they read hollow: the map and its legend disagree in dark only. The four shapes stay distinct (#105's review, item 10; the real run's `2-pins-en-dark-1440.png`).

**Resolves when:** the owner decides how the marks are drawn on the always-light tiles, such as the light theme's values inside `.leaflet-container` (a layer change), in the public site's design review after its last page.
