# 173. The layer's range calendar ends a range on its first click

**Status:** Resolved · **Date:** 2026-10-27

**Evidence:** the layer's `Calendar` (`shared/design-system/components/fields/Calendar/Calendar.tsx`) says of `DateRange` that "`to` is missing until the second click". react-day-picker 10 does otherwise: in range mode, with `min` 0 (its default) and no `resetOnSelect`, a click on an empty selection gives `{ from: day, to: day }`, and a click on a full one extends it from its `from`. The layer sets neither prop. A caller that trusts the comment applies a range on its first click: «الدفعات»'s period did (#127's review, F1) and now passes `resetOnSelect` itself; the layer's own DatePicker range test passes only because its picker stays open after the first click.

**Resolves when:** the layer's range `Calendar` defaults to `resetOnSelect` (or its comment says what a range-mode caller must pass), with a test of a first click, in a design-system change of its own.

**Resolution (2026-10-28, #129):** the layer's `Calendar` sets `resetOnSelect` in range mode, and a caller may still set its own: a click on no range or on a whole one starts a range of that day with `to` missing, and the next click ends it. The `DateRange` comment says so. Its component test clicks three days (the first leaves `to` empty, the second ends the range, the third starts afresh); without the default it fails as the finding describes. The ledger's period, which passes `resetOnSelect` itself, is unchanged.
