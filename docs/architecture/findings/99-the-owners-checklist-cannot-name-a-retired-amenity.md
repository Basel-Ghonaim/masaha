# 99. The owner's checklist cannot name a retired amenity

**Status:** Open · **Date:** 2026-10-20

**Evidence:** an owner's area and amenity fields read only the public catalogue (`GET /lookups`), since the admin's lists (`/admin/amenities`, `/admin/governorates`) refuse an owner ([lookups › Web decisions](../../features/lookups.md#web-decisions)). The catalogue names the active amenities only, so an amenity the platform retired after the space ticked it stays linked to the space, unseen: the owner's checklist keeps it in the value and one line counts it («يبقى مرفق واحد لم يعد في قائمة المنصة مرتبطًا بالمساحة.»), but cannot name it, and the owner has no way to remove it. The admin's checklist names and removes it.

**Resolves when:** a read the owner may make names the retired amenities a space holds (a managed read of the lookups, or the public catalogue naming them), so the owner's checklist shows each, marked, until a save leaves it out; or the owner accepts it.
