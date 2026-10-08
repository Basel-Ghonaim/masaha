# 12. The admin's settings list a "default auto check-out" that the model has no place for

**Status:** Resolved · **Date:** 2026-09-29

**Evidence:** foundation §13, screen 32 (admin *Settings*), lists "default auto check-out" beside the contact and the staleness threshold. F-3b follows the reviewed owner screens: auto check-out at closing and `maxStayMinutes` are settings of each space, with column defaults ([data-model.md](../data-model.md#entities)). No platform setting holds a default, and nothing says what it would set: the closing-time switch, the stay limit, or the starting values of a new space.

**Resolves when:** the owner decides whether a platform default exists and what it governs. Either the admin screen drops the item, or a `Setting` key is added in the settings slice (step 11 of the build sequence in [v1-mvp.md](../../plans/v1-mvp.md#sequence-inside-the-build)).

*Decided (2026-09-30, A-1):*
- `platform-settings` holds the defaults for a new space: auto check-out at closing, the visit rounding rule and its minutes, and the cap at the day price.
- They are copied into a space's settings when the space is created. Changing them never affects existing spaces ([conventions §9](../../backend/conventions.md#new-space-defaults)).
- The finding stays open until A-2 in the [foundation plan](../../plans/foundation.md) builds it.

**Resolution (2026-09-30, A-2):**
- The seed stores the defaults as one platform setting, `newSpaceDefaults` ([data-model.md](../data-model.md#operations)), with the values the space columns had as defaults, so no behaviour changes.
- The demo space's settings are copied from it. Copying it when an admin creates a space is built by the slice that creates spaces.
- The admin's *Settings* screen edits these defaults. They govern only a new space's starting values, never an existing space.
