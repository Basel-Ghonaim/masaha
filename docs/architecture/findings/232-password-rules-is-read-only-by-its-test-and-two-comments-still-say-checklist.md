# 232. `PASSWORD_RULES` is read only by its test, and two comments still say "checklist"

**Status:** Resolved · **Date:** 2026-11-26

**Evidence:** since the password's condition became one line (A7, D1; #157), `usePasswordRules` reads the policy's `passwordRules` and `PASSWORD_MIN_LENGTH`, and nothing in the web reads `PASSWORD_RULES` (`packages/shared/src/users/passwordPolicy.ts`), the list that ordered the old checklist and marked the upper bound as shown only while broken; only its own unit test does. Two comments in `features/users`, outside #157's files, still describe the checklist: `components/forced-change/ForcedPasswordChangeForm.tsx` ("its rules ticking as the user types") and `hooks/settings/usePasswordChangeForm.ts` ("the rules' checklist").

**Resolves when:** `PASSWORD_RULES` is removed or given a reader that needs it (with `PasswordRule`'s type kept from the policy), and the two comments say the policy's line.

**Resolution (2026-11-26):** Removed the unused `PASSWORD_RULES` export, retained `PasswordRule` as the four-ID union, tested the ordered keys returned by `passwordRules()`, and updated both comments to describe the policy's line. Resolved in #160.
