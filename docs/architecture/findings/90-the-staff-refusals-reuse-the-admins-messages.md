# 90. The staff refusals reuse the admin's messages

**Status:** Resolved · **Date:** 2026-10-18

**Evidence:** the owner's staff routes answer codes first written for the admin ([api-contract › Staff (managed)](../../api/api-contract.md#staff-managed), #90), and the catalogues hold the admin's words for them: `EMAIL_HAS_ACCOUNT` says to upgrade the account to an owner, which an owner cannot do; `ACCOUNT_HAS_LINKS` says to unlink the person; `ACCOUNT_IS_ADMIN` speaks of a space's owner; `TEMPORARY_PASSWORD_NOT_PENDING` speaks of a handover, and the re-issue answers it too (`apps/web/src/shared/copy/*/errors.ts`). No staff screen exists yet, so nothing shows them. Found in #90's review.

**Resolves when:** the staff web item gives these refusals the owner's own words, for the field or the screen, or the API gives the staff routes codes of their own.

**Resolution (2026-10-20, #99):** the owner's staff screen words them itself, in `staff`'s copy (`apps/web/src/shared/copy/*/staff.ts`): `EMAIL_HAS_ACCOUNT` on the add sheet's email, and `ACCOUNT_SUSPENDED`, `ACCOUNT_IS_ADMIN`, `ACCOUNT_HAS_LINKS` and `TEMPORARY_PASSWORD_NOT_PENDING` in the row's dialogs and toasts; the errors catalogues keep the admin's words ([space-links › Web decisions](../../features/space-links.md#web-decisions)).
