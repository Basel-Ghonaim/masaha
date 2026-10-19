# 97. The visit-rounding rule is written twice

**Status:** Open · **Date:** 2026-10-19

**Evidence:** the rounding rule and its minutes are checked in two places. The platform's new-space defaults, `newSpaceDefaultsSchema` in `apps/api/src/modules/platform-settings/settingKeys.ts`, take the Prisma enum, minutes 1–59 written as numbers, and a pairing `refine` that answers an English message. A space's settings edit, `updateSpaceSettingsSchema` in `packages/shared/src/space-settings/requests.ts` (#92), takes `VISIT_ROUNDINGS`, `ROUNDING_MINUTES` and the pair rule `roundingPair`, which answers field codes. #92 left the defaults unchanged on purpose: their editor is step 11's. Two definitions of one rule can drift: different codes for the same refusal, or different bounds after a change to one.

**Resolves when:** the new-space defaults reuse the rounding rules, the minutes' bounds and the pair rule from `@masaha/shared/space-settings` (both modules are L0), so the rule has one home; step 11's plan, which builds the defaults' editor, is the natural place.
