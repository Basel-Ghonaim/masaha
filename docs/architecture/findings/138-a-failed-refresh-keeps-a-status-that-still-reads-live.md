# 138. A failed refresh keeps a status that still reads live

**Status:** Open · **Date:** 2026-10-24

**Evidence:** The space page keeps the last status it read when a 60-second refresh fails, as decided (#108's review, carried into #111). After many failed refreshes the badge still shows that status under «الحالة مباشرة الآن», with no sign of its age. The owner decides it at the public site's in-person review (#111's review, item 13).

**Resolves when:** the page marks a status older than a bound (for example «آخر تحديث قبل …»), or the owner accepts it as it is.