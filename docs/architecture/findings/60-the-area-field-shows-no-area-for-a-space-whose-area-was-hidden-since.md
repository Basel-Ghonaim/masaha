# 60. The area field shows no area for a space whose area was hidden since

**Status:** Resolved · **Date:** 2026-10-13

**Evidence:** the space editor's «المساحة» section sets the area field of `lookups` (`AreaSelect`), which reads the public catalogue and offers only an area that may take a space ([lookups › Decisions](../../features/lookups.md#decisions)). A space keeps its area when the admin hides that area, or its governorate, later; its editor then holds an area the field does not offer, and the field shows nothing at all, not even its placeholder, as if the space had none (seen in S2b-4a's real run, a space of Al-Mawasi with the area hidden). The section still saves: it sends only the fields that changed ([spaces › Decisions](../../features/spaces.md#decisions)), so the unchanged area is never sent, and `PATCH` never refuses it.

**Resolves when:** the field shows a space's own area even when the catalogue no longer offers it (marked hidden, and not offered to another space), or the owner accepts it.

**Resolution (2026-10-14, #79):** the area field keeps a space's own area the catalogue no longer offers, named from the admin's lists and marked hidden, and offers it to no other space ([lookups › Behaviour and flows](../../features/lookups.md#behaviour-and-flows)).
