# 5. In dark, the destructive badge reads louder than the other status badges

**Status:** Accepted · **Date:** 2026-09-27

**Evidence:** In the dark stress test (Owner › Members), the «منتهية» (expired) badge looks brighter than «نشط» (active) and «ينتهي خلال 3 أيام» (ending in 3 days). The built Badge shows the same thing in the showcase. The values are not the cause:
1. **Values match.** The stress test's fills, sampled from `0-overview.jpg`, match foundation §5's dark subtle surfaces:
   - about `#300000`–`#380000` against `red-950` `#370003`;
   - about `#001808`–`#002008` against `green-950` `#001F0A`;
   - about `#201000`–`#281000` against `amber-950` `#261400`.
   The Badge binds exactly those pairs.
2. **Chroma differs.** The 950 surfaces share one lightness (OKLCH L 0.209–0.212), but `red-950` has much more chroma: C 0.086, against 0.056 (green), 0.046 (amber) and 0.062 (blue). Each fill is barely distinct from the dark page (1.04–1.07:1), so the eye reads the badge by its hue, and red's shows most.
3. **Contrast is not the issue.** Every dark subtle pair is about 12.7:1.

**Resolves when:** the owner chooses one of:
1. **Accept.** Expired is the status that needs action, so the extra salience is acceptable. The finding becomes *Accepted*.
2. **Calm the red.** Give dark `destructive-subtle` a lower-chroma surface: `red-950` with its chroma cut to blue's level (0.062) is `#300A09`; red-200 on it is 12.63:1. That is a new value in foundation §4–§5 first, then in `semantic.css`, where the contrast test re-checks it. Badge, Alert and Toast all bind the role, so all three change.

**Resolution (2026-09-27):** accepted as is, with no token change (option 1). *The status read Resolved until WI-9 (2026-09-28) corrected it to Accepted, as option 1 says.* The badge matches foundation and the stress test; expired is the status that should draw attention; and `#300A09` would be a value outside the red ramp.
