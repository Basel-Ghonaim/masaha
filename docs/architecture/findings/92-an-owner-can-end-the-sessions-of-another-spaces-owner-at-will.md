# 92. An owner can end the sessions of another space's owner at will

**Status:** Open · **Date:** 2026-10-18

**Evidence:** a deactivation of a reception link ends every session of the person (`PATCH /manage/spaces/:spaceId/staff/:userId`, #90), and the route is not counted. A settled receptionist the admin has since made the owner of another space keeps their reception link here, so this space's owner can deactivate and re-activate in a loop and sign them out of their own space each time. It belongs with [finding 84](84-a-person-cannot-work-at-two-spaces-front-desks.md): a person holding links at two spaces. Found in #90's review.

**Resolves when:** the owner decides, for example, that a deactivation ends every session only when the person holds no other active link, or the toggle is counted.
