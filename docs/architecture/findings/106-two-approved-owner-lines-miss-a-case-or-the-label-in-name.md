# 106. Two approved owner lines miss a case, or the label in the name

**Status:** Open · **Date:** 2026-10-21

**Evidence:** both lines follow the approved plan, so #99 built them as written; its review found where each falls short.
- **A re-issue for an account become an admin's** is answered `ACCOUNT_HAS_LINKS` (`apps/api/src/modules/space-links/staff/staff.service.ts`: any account whose role is not `USER`). The owner then reads «صار لهذا الحساب مساحة أخرى؛ يستعيد كلمة مروره من فريق مساحة.» (`apps/web/src/shared/copy/arabic/staff.ts`, `refusals.ACCOUNT_HAS_LINKS`), which is false for an admin.
- **The reminder's insert buttons** show their token, «{الاسم}», and are named «إدراج الاسم» / "Insert the name" (`apps/web/src/features/space-settings/components/reminder/ReminderCard.tsx`): the visible text is not inside the accessible name (WCAG 2.5.3, label in name), so a voice user saying what they see does not reach the button.

**Resolves when:** the owner words `ACCOUNT_HAS_LINKS` for both of its causes (or the API gives the admin's its own code), and the insert buttons' names hold their tokens (for example «إدراج {الاسم}»).
