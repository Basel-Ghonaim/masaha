# 172. The write-off's reason is not focused first

**Status:** Open · **Date:** 2026-10-27

**Evidence:** «لن يُحصَّل…» (#117) asks its reason in an `AlertDialog` and marks the field `autoFocus`; in a browser the alert dialog's own first focus goes to «رجوع» instead (PAYMENTS_STEP10's real run, #127: the focus on opening was the button «رجوع»), so the reason the dialog asks first is not where the keyboard is (DI-27, DI-9). jsdom honours `autoFocus` there, so its test passes. The payment's void, built on the same pattern, met the same defect in its real run and places the focus itself (`onOpenAutoFocus`, #127).

**Resolves when:** the write-off's dialog focuses its reason on opening, as the void's does, with a test that fails without it.
