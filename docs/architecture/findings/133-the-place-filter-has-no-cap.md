# 133. The place filter has no cap

**Status:** Open · **Date:** 2026-10-21

**Evidence:** the server takes at most `DIRECTORY_AREAS_MAX` (50) areas in the directory's `area` filter, and the site's address reads more than 50 as none (`filtersOf`, #101). `lookups`' `AreaFilter`, which the Directory's page sets as its place filter (#103), lets any number be chosen and hands every id back. Once the catalogue holds more than 50 areas, choosing the 51st writes 51 ids, the address reads them as no area at all, and the whole place filter clears without a word. Today's catalogue holds well under 50, so it cannot happen yet (#103's review, item 10).

**Resolves when:** the place filter caps the choice at `DIRECTORY_AREAS_MAX`, saying so at the cap, or the limit is raised with the catalogue's growth; whichever comes first once the catalogue nears 50 areas.
