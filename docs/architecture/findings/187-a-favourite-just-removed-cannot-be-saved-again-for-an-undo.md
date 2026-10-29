# 187. A favourite just removed cannot be saved again for an undo

**Status:** Open · **Date:** 2026-10-28

**Evidence:** «المفضّلة» offers «إزالة» on a saved space that left the directory (C7, DI-58). `POST /me/favorites/:spaceId` answers `not_found` (404) for a space that is not publicly listed — unknown, hidden, deleted, or in an area not listed — which is what such a space is, so a «تراجع» after its removal could never save it again. #129's review found the undo offered (R3-F1); by the owner's decision (DI-58, option (a)) the removal now says the space cannot be saved again while it is out of the directory, and offers no undo. The user who removes it by mistake loses it until the space is listed again.

**Resolves when:** the API lets a user save again, for a short while, a favourite they have just removed, whatever the space's listing, and «إزالة» offers «تراجع» again; or the owner accepts the removal without an undo.
