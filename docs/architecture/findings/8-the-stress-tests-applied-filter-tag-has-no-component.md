# 8. The stress test's applied-filter tag has no component

**Status:** Open · **Date:** 2026-09-28

**Evidence:** Under the filter row, the Admin › Data reports stress test (`5-data-reports-desktop.png`, and the phone screens of `0-overview.jpg`) shows the filters in force as a tag: «الحالة: جديد، قيد المراجعة ×». It is a grey pill with a remove button, beside a «مسح الفلاتر» link. Foundation §12 lists no removable tag. A Badge has no button, and a ToggleGroup chip toggles rather than removes. WI-8 builds the filter row without it: the showcase shows the search, the Combobox triggers and the DatePicker.

**Resolves when:** the owner decides whether the layer gets a removable tag (for example, a Badge with a remove button whose label is a prop, which would take a §12 row), or whether the Data reports page composes one when it is built. The «مسح الفلاتر» link is an ordinary `Button variant="link"` either way.

*Decided (2026-09-28, WI-9):*
- **The component:** the layer gets a removable filter tag, as a layer component with a §12 row.
- **When:** it is built at the start of the data-reports feature slice, step 10 of the build sequence in [v1-mvp.md](../../plans/v1-mvp.md#sequence-inside-the-build).
- **Until then:** the finding stays open, and nothing is built now.
