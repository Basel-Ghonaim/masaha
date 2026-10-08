# 10. The seeded amenity icon keys have no icons in the design system yet

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** F-3 seeds eight amenities, each with an `icon` key that the web maps to an icon ([`apps/api/src/db/seed/lookups.ts`](../../../apps/api/src/db/seed/lookups.ts)): `wifi`, `zap`, `sun`, `plug-zap`, `coffee`, `users`, `presentation`, `graduation-cap`. They are Lucide names, and Lucide is imported only inside the design-system layer. The layer's icon set (`shared/design-system/icons/iconSet.tsx`) includes none of them yet, so the web has nothing to map these keys to.

**Resolves when:** the lookups and admin spaces slice (step 2 of the build sequence in [v1-mvp.md](../../plans/v1-mvp.md#sequence-inside-the-build)) adds these eight keys to the design-system icon set, with the map from key to icon, and the admin's amenity form offers that set.

*Progress (2026-10-02, F-10):* the design-system icon set has an icon for each of the eight keys, and `packages/shared` owns the list of valid keys ([`lookups/amenityIcons.ts`](../../../packages/shared/src/lookups/amenityIcons.ts)), which types the seed. The map from key to icon and the admin's amenity form remain for step 2.

**Resolution (2026-10-07, S2a-3):** the design system draws an icon by its glyph's name (`GlyphIcon`, over a closed set of names), and the web hands it each amenity's key, so a key it cannot draw fails the typecheck; the design system still does not import the keys. The admin's amenity sheet offers the eight icons as a grid ([lookups](../../features/lookups.md)).
