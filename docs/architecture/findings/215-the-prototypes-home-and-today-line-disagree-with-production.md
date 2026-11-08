# 215. The prototype's Home and today's line disagree with production

**Status:** Open · **Date:** 2026-11-08

**Evidence:** the directory's filters were built from the prototype of #137 in #139, which left two of its pages as they were, by the owner's decision (OD7 b), since `shared.jsx` may also be another task's:
- `docs/design/prototype/Home.html` still lists the spaces «متاحة الآن» as the verified spaces whose state is `open`, titled «متاحة الآن», and «عرض الكل» leads to `Directory.html?available=1`. Production lists the spaces open now by their hours, verified or not, titled «مفتوحة الآن», and leads to `?open=1` ([directory › Home's spaces on the web](../../features/directory.md#behaviour-and-flows)); the prototype's Directory no longer reads `available`.
- `docs/design/prototype/masaha/shared.jsx`'s `TodayHours` picks today's hours by the browser's day (`new Date().getDay()`), while its own `openNow` reads Gaza's clock. Production's card reads Gaza's day for both, so near midnight the prototype's «اليوم …» line can name another day's hours than production's.

**Resolves when:** the prototype's Home lists and titles the spaces open now and links `?open=1`, and its `TodayHours` reads Gaza's day, as production does.
