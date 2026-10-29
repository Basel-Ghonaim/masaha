# 158. The admin's spaces list does not offer the editable status

**Status:** Open · **Date:** 2026-10-29

**Evidence:** `GET /admin/spaces` reads `status=editable` (the owner's OD3: the unverified spaces, hidden ones included), which with `stale=true` is the admin overview's «اكتمال البيانات» in full, its «عرض الكل» (#131). The server validates it with `adminSpacesListQuerySchema` (`@masaha/shared/space-links`), the list's schema widened by `editable`; the web's spaces list still reads the narrower `adminSpacesQuerySchema` and offers `SPACE_STATUSES` only, each with a line of its copy. Widening the one schema would have changed the web's types and needed a copy line, which the API's change could not carry. So an address with `?status=editable` falls back to every space on the web, and the card's «عرض الكل» has no list to land on yet.

**Resolves when:** the web's spaces list reads `adminSpacesListQuerySchema` and lands `?status=editable&stale=true` with its own copy (offered as a choice or not), and the two shared schemas become one.
