# 136. Near me's wait counts the time at the permission prompt

**Status:** Resolved · **Date:** 2026-10-22 · **Resolved:** 2026-10-29

**Evidence:** «الأقرب إليّ» gives up after 15 s with no answer (`useNearMe`'s `NO_ANSWER_MS`), counted from the press, so it includes the time the visitor spends reading the browser's permission prompt. A visitor who allows it after more than 15 s finds the ask already ended as denied, «تعذّر تحديد موقعك» shown and the answer dropped; a second press works, the permission given. The owner kept about 15 s, which favours the case of a prompt dismissed without a choice, which answers nothing (#105's review, item 15).

**Resolves when:** the wait starts once the permission is known (the Permissions API's state, where the browser offers it), or the owner accepts the 15 s as it is.

**Resolution (#132):** Near me's wait starts once the permission is known (D9.10). While the browser's prompt stays unanswered — one dismissed without a choice fires no `change` — a minute from the press bounds the ask, replaced by the 15 s once the permission is granted; settled, it stops following the permission (2026-11-01).
