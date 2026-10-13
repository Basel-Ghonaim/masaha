# 59. The verified space's editor cannot name its owner

**Status:** Open · **Date:** 2026-10-13

**Evidence:** the design's verified space page (AD-012, as amended by A4) names who edits the space, «يعدّلها أحمد», and offers one «فك ربط {name}» per owner. The web's editor reads the space with `GET /admin/spaces/:spaceId`, whose `AdminSpace` says whether the space is verified but carries none of its owners ([api-contract §5](../../api/api-contract.md#spaces-the-admin)), and no endpoint gives a space's owners by its id: only the spaces list's rows (`AdminSpaceRow.owners`) and the users list's (`AdminUserRow.spaces`) hold them, each a page of a search. So the editor's notice reads «يعدّلها مالكها» with no name (the owner's decision at S2b-4a), and offers no unlink, which no screen of the web builds yet.

**Resolves when:** a space's read carries its owners, and the owners item builds the one unlink dialog (A4); the notice then names each owner and offers to unlink them.
