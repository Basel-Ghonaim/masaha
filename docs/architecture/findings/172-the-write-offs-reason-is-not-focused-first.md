# 172. The write-off's reason is not focused first

**Status:** Resolved · **Date:** 2026-10-27 · **Resolved:** 2026-10-29

**Evidence:** «لن يُحصَّل…» (#117) asks its reason in an `AlertDialog` and marks the field `autoFocus`; in a browser the alert dialog's own first focus goes to «رجوع» instead (PAYMENTS_STEP10's real run, #127: the focus on opening was the button «رجوع»), so the reason the dialog asks first is not where the keyboard is (DI-27, DI-9). jsdom honours `autoFocus` there, so its test passes. The payment's void, built on the same pattern, met the same defect in its real run and places the focus itself (`onOpenAutoFocus`, #127).

**Resolves when:** the write-off's dialog focuses its reason on opening, as the void's does, with a test that fails without it.

**Resolution (#132):** The write-off's dialog focuses its reason on opening (D7.5): it places the focus itself (`onOpenAutoFocus`), as the void's does, and the field's `autoFocus` is gone; its test drops a field's `autoFocus`, as a browser does, so only the dialog's own placing passes.
