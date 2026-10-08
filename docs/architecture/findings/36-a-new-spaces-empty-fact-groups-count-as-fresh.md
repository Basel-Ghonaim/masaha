# 36. A new space's empty fact groups count as fresh

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** a space's fact groups are dated when the space is created (S2b-1), so a new space has hours, prices, amenities and contacts that are all "up to date" while it has none of them yet. The admin's spaces list shows such a space as fresh, and its "stale only" filter leaves it out, until each group has been empty for its threshold (30 days for the prices, 60 for the others). Staleness is computed only from the dates ([data-model › Derived values](../data-model.md#derived-values-computed-not-stored)).

**Resolves when:** the slice that builds the facts weighs whether an empty group counts as stale, missing, or fresh, and the list and the data model say so.

**Resolution (2026-10-07, S2b-2):** an empty group is **missing** until it is first saved, even empty. A migration made the dates of the hours, prices, amenities and contacts nullable, with no default, and cleared the date of every existing space's group that had no rows; a group with rows kept its date. A new space dates only its profile. The space and the list's rows name their missing groups, a missing group is never stale, and "stale only" keeps it ([data-model › Derived values](../data-model.md#derived-values-computed-not-stored), [spaces › Decisions](../../features/spaces.md#decisions)).
