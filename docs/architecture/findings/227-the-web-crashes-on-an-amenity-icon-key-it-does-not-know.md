# 227. The web crashes on an amenity icon key it does not know

**Status:** Resolved · **Date:** 2026-11-14

**Evidence:** `GlyphIcon` draws a glyph by its name from a closed map
(`apps/web/src/shared/design-system/icons/GlyphIcon.tsx`: `const Glyph = GLYPHS[name]; return <Glyph … />`), and
`AmenityIcon` (`apps/web/src/features/lookups/components/AmenityIcon.tsx`) hands it an active amenity's `icon` as the
API answers it. The API passes the key through unvalidated, and the web parses nothing, so a key the running bundle
does not know renders `undefined`, which React refuses: the admin's lookups page (`AmenityRow.tsx`) and the
«المرافق» Sheet (`AmenityChecklist.tsx`) fail to render. Only the retired amenities go through `iconOf`, which falls
back to none. So every migration that adds an icon key breaks the code before it, against
[setup › How it is served](../../development/setup.md#how-it-is-served)'s rule that every migration works with the code before it: #145's
`womens_hall` row (`venus`) does, after a rollback past #145 or in a tab still on the old bundle (its review, F2).

**Resolution (2026-11-14, #146):** `knownAmenityIcon` recognises only the keys the running bundle draws and returns
none for any other, so `AmenityIcon`, the amenity rows and the checklist fall back to no icon when the API's key is
unknown. The checklist's component test renders an active amenity with an unknown key and finds no icon.
