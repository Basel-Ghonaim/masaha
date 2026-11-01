# 212. An owner on a phone cannot reach the written-off visits

**Status:** Resolved · **Date:** 2026-10-29 · **Resolved:** 2026-11-01

**Evidence:** The owner's «لن تُحصَّل» view — the written-off visits and their undo ([finding 164](164-a-written-off-visit-is-listed-nowhere.md), #132) — is a toggle in the header of the desk's «غير محصّل» card. Below 1280 px that card is hidden while it is empty (D7.6: an empty «غير محصّل» takes no room on a phone or a tablet), and its toggle with it. So an owner on a phone or a tablet with nothing uncollected has no way to the written-off visits, nor to undo a write-off, until a visit is left uncollected again; from 1280 px the empty card stays and the toggle is reached.

**Resolves when:** the written-off view is reachable at every width whatever «غير محصّل» holds — for instance its toggle kept, or a way to it elsewhere on the desk, while the empty card itself stays out of the way below 1280 px — with a test at a phone's width.

**Resolution (#132):** For the owner, the empty «غير محصّل» keeps its header, with the «لن تُحصَّل» toggle, at every width; below 1280 px only its empty line is hidden. Whoever cannot write off still finds the empty card out of the way below 1280 px. A test at 390 px proves the toggle is there.
