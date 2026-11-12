# 216. The admin's shifts Sheet cannot mark a shift a package uses

**Status:** Accepted · **Date:** 2026-11-11 · **Accepted:** 2026-11-10

**Evidence:** the space profile's «الورديات» Sheet holds the removal of a shift a saved price uses, or, on the owner's page, a package (`useShiftsSheet`, the shifts the owner's page reads from `packages`' `usePackageShiftIds`), and says why on its row. Packages are private to the space's staff (`packages`, D7): the admin's page cannot read them, so the admin's Sheet offers the removal of a shift only a package uses. The server refuses it — the database's key on the package's shift, the hours' save taken back (409, `hours.api.test.ts`) — and the Sheet says so («وردية حذفتها ما زالت مستعملة…»), the space fetched again. Accepted by the owner with the production plan's SD5 (2026-11-10): the server's refusal is the guard.

**Resolves when:** the admin's read of a space names the shifts its packages use (a count or the ids, nothing of the packages themselves), and the admin's Sheet marks them as the owner's does; or the owner keeps it accepted.
