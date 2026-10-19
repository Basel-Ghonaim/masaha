# 59. The verified space's editor cannot name its owner

**Status:** Resolved · **Date:** 2026-10-13

**Evidence:** the design's verified space page (AD-012, as amended by A4) names who edits the space, «يعدّلها أحمد», and offers one «فك ربط {name}» per owner. The web's editor reads the space with `GET /admin/spaces/:spaceId`, whose `AdminSpace` says whether the space is verified but carries none of its owners ([api-contract §5](../../api/api-contract.md#spaces-the-admin)), and no endpoint gives a space's owners by its id: only the spaces list's rows (`AdminSpaceRow.owners`) and the users list's (`AdminUserRow.spaces`) hold them, each a page of a search. So the editor's notice reads «يعدّلها مالكها» with no name (the owner's decision at S2b-4a), and offers no unlink, which no screen of the web builds yet.

*2026-10-15, #82:* the API half landed — the single-space read carries its owners. The editor's notice and the unlink dialog remain, so the finding stays Open.

**Resolves when:** a space's read carries its owners, and the owners item builds the one unlink dialog (A4); the notice then names each owner and offers to unlink them.

**Resolution (2026-10-19, #91):** the verified space's notice reads «يعدّلها {names}» from `AdminSpace.owners`, each name isolated, and offers «فك ربط {name}» per owner, the owners item's one unlink dialog, which reads the space's owners as it opens to say what follows ([space-links › Behaviour and flows](../../features/space-links.md#behaviour-and-flows), [spaces › Behaviour and flows](../../features/spaces.md#behaviour-and-flows)). The notice's title stays text: `AdminSpace.owners` carries no email, and a name search could match others. An unverified space's editor offers the link from the space's end.
