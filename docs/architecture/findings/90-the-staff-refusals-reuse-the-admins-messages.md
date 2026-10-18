# 90. The staff refusals reuse the admin's messages

**Status:** Open · **Date:** 2026-10-18

**Evidence:** the owner's staff routes answer codes first written for the admin ([api-contract › Staff (managed)](../../api/api-contract.md#staff-managed), #90), and the catalogues hold the admin's words for them: `EMAIL_HAS_ACCOUNT` says to upgrade the account to an owner, which an owner cannot do; `ACCOUNT_HAS_LINKS` says to unlink the person; `ACCOUNT_IS_ADMIN` speaks of a space's owner; `TEMPORARY_PASSWORD_NOT_PENDING` speaks of a handover, and the re-issue answers it too (`apps/web/src/shared/copy/*/errors.ts`). No staff screen exists yet, so nothing shows them. Found in #90's review.

**Resolves when:** the staff web item gives these refusals the owner's own words, for the field or the screen, or the API gives the staff routes codes of their own.
