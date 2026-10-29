# 103. Arabic-Indic digits are read by five helpers

**Status:** Resolved · **Date:** 2026-10-21 · **Resolved:** 2026-10-29

**Evidence:** a number typed in Arabic-Indic digits is read into Western ones in five places, each with its own copy of the same replacement: `apps/web/src/shared/lib/numbers/wholeNumber.ts` (`wholeNumberOf`, the settings' minutes and the attendance card's capacity and hours, new in #99), `apps/web/src/features/packages/services/packageValues.ts` (`countOf`, a package's counts), `apps/web/src/features/spaces/services/clockTime.ts` (the opening hours), `apps/web/src/shared/lib/money/shekels.ts` (`agorotOf`, an amount) and `apps/web/src/shared/map/services/coordinates.ts` (a point typed by hand). #98's review asked for a finding when the next one appeared; #99 is that point, and left the others as they are (no drive-by refactor).

**Resolves when:** one reader of Arabic-Indic digits in `shared/lib` serves all five, each keeping its own rule for what follows (a whole number, a time, an amount, a coordinate).

**Resolution (#132):** One reader of Arabic-Indic digits in `shared/lib` serves the five (D3.7): `toWesternDigits` reads both sets (U+0660–U+0669 and the extended U+06F0–U+06F9), and `wholeNumberOf`, `countOf`, the opening hours, `agorotOf` and the coordinates call it, each keeping its own rule.
