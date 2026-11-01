# 166. The ledger's staff filter cannot name a space's other owners

**Status:** Resolved · **Date:** 2026-10-27 · **Resolved:** 2026-10-29

**Evidence:** «الدفعات»'s staff filter (#127) offers the owner signed in and the space's reception accounts (`GET …/staff`, reception links only). A space may have more than one owner (ADR 0009), and no route names a space's owners to an owner, so a payment another owner recorded can be read in the rows («سجّلها» names them) but not chosen in the filter.

**Resolves when:** a managed route names a space's owners to its owners (or the staff list includes them, marked), and the filter offers them; or the owner accepts the rows' names as enough.

**Resolution (#132):** The ledger's staff filter names the space's other owners from the managed space read (D8.7): `spaces`' `useSpaceOwners` reads `owners` of `GET /manage/spaces/:spaceId`, which answers them to the owner (EC10), so no route was added; the page lists the owner signed in, then the other owners, each «{name} · صاحب المساحة», then the reception accounts.
