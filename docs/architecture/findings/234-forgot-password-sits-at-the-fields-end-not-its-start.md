# 234. «نسيت كلمة المرور؟» sits at the field's end, not its start

**Status:** Open · **Date:** 2026-11-25

**Evidence:** `features/auth`'s `SignInForm` places the page's way to a forgotten password under the password field at its end (`self-end`, `apps/web/src/features/auth/components/sign-in/SignInForm.tsx`), on the sign-in page as over a page (#157). The approved picture of the sign-in over a page (masaha-prototype, `Space details/inplace.jsx`) puts «نسيت كلمة المرور؟» at the field's start (`self-start`), under the field's label side. The shared form's layout was kept for both, since the full pages are WI-C3's.

**Resolves when:** WI-C3 settles the shared form's layout with the full pages' pictures, and both places follow it.
