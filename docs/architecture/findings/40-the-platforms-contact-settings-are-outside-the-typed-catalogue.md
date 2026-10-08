# 40. The platform's contact settings are outside the typed catalogue

**Status:** Open · **Date:** 2026-10-06

**Evidence:** settings are key–value rows whose keys are fixed in code, each value validated when read, through one typed catalogue ([data-model › Conventions](../data-model.md#conventions), [conventions §9](../../backend/conventions.md#settings-three-screens-three-owners)). The catalogue (`apps/api/src/modules/platform-settings/settingKeys.ts`) holds `newSpaceDefaults`, `stalenessDays` and `priceStalenessDays`. The seed (`apps/api/src/db/seed/seed.ts`) also writes `contactEmail` and `contactWhatsapp`, which no catalogue key names, so nothing validates them when they are read; nothing reads them yet.

**Resolves when:** the slice that builds the public contact adds both keys to the catalogue, with their schemas; or the documents say the contact keys are kept another way.
