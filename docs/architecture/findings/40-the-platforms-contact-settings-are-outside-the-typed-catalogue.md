# 40. The platform's contact settings are outside the typed catalogue

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** settings are key–value rows whose keys are fixed in code, each value validated when read, through one typed catalogue ([data-model › Conventions](../data-model.md#conventions), [conventions §9](../../backend/conventions.md#settings-three-screens-three-owners)). The catalogue (`apps/api/src/modules/platform-settings/settingKeys.ts`) holds `newSpaceDefaults`, `stalenessDays` and `priceStalenessDays`. The seed (`apps/api/src/db/seed/seed.ts`) also writes `contactEmail` and `contactWhatsapp`, which no catalogue key names, so nothing validates them when they are read; nothing reads them yet. Since #107 the site reads its contact from `VITE_CONTACT_EMAIL` and `VITE_CONTACT_WHATSAPP`; the seeded rows stay unread.

**Resolves when:** the slice that builds the public contact adds both keys to the catalogue, with their schemas; or the documents say the contact keys are kept another way.

**Resolution (2026-10-28, #130):** the catalogue holds both keys, optional: a database without a contact row reads `null`, and each stored value is read with the schema of the form the seed writes (an email; an E.164 number), so no row needs migrating. The admin saves the contact as its own card, the email lowercased and the number normalised ([api-contract › Platform settings](../../api/api-contract.md#platform-settings)).
