# 81. A retired package that keeps its shift stops the owner from removing that shift

**Status:** Resolved · **Date:** 2026-10-18

**Evidence:** a space's shifts are removed by the hours' save, and a shift anything still names refuses
its delete (`apps/api/src/modules/spaces/hours/shifts.repository.ts`, `remove` → `inUse` → 409). A
package names its shift through `packages_shift_id_space_id_fkey` → `space_shifts(id, space_id)`, and
that key holds whatever the package's `is_active` says: a **retired** package still names its shift, so
the owner's `PUT /manage/spaces/:spaceId/hours` answers 409 for a shift that is no longer offered at all.
The contract already says so ([api-contract §5](../../api/api-contract.md#5-endpoints), `PUT …/hours`: a
shift "still used by a price, a package, a subscription or a visit" refuses its removal), and the rule is
consistent — but neither the contract's packages section nor [packages › Behaviour and flows](../../features/packages.md#behaviour-and-flows) tells the owner how to get out of it. The only way out today is `PATCH /manage/spaces/:spaceId/packages/:packageId` with `{ shiftId: null }` on the retired package. Found while reviewing #87.

**Resolves when:** the owner's packages screen says that a retired package still holds its shift and offers to clear it, or retiring a package clears its shift — decided with that screen, not here.

**Resolution (2026-10-20, #98):** the owner's packages say it on the paused package's row, «موقوفة وما زالت تحجز وردية «{shift}»؛ لا تُحذف الوردية قبل إزالتها منها.», with «إزالة الوردية», which clears it at once ([packages › Web decisions](../../features/packages.md#web-decisions)).
