# 137. Home's area counts fall short past a thousand spaces

**Status:** Open · **Date:** 2026-10-24

**Evidence:** Home's «تصفّح حسب المنطقة» counts each area's spaces from the directory's unfiltered pins (`useAreaCounts`). The pins stop at 1,000 and say so with `truncated`, which the count ignores: past 1,000 publicly listed spaces, every area's count and «كل المناطق»'s total are too low, with nothing on the page saying so. Today's directory holds far fewer, so nothing is wrong yet (#111's review, item 9).

**Resolves when:** the counts come from the server (a count by area, or the total the list already answers), or Home shows no number while the pins are truncated.