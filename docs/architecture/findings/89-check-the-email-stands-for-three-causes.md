# 89. «Check the email» stands for three causes

**Status:** Open · **Date:** 2026-10-18

**Evidence:** the add-owner sheet keeps an account only when the users list's search returns a row with
exactly the email, and otherwise offers no upgrade and says «تعذّر عرض صاحب هذا الحساب، فلا يُرقّى من هنا —
تحقّق من البريد.». It reads the first page only (the default limit, newest first) of a search by part of a
name or an email, whose text is capped at 100 characters while an email may run to 254. So a right email
reads as unconfirmed when more than a page of newer accounts contain it, when it is over 100 characters
(the read is refused), or when the read fails — and the line asks the admin to check an email that is
right, with no retry but editing the email away and back. It fails safe: no upgrade is sent (#89's review,
finding 11).

**Resolves when:** the read asks for a larger page (or an exact email filter), and a failed read is worded
apart, with a retry.
