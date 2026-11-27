# 215. The prototype's Home and today's line disagree with production

**Status:** Resolved · **Date:** 2026-11-08

**Evidence:** the directory's filters were built from the prototype of #137 in #139, which left two of its pages as they were, by the owner's decision (OD7 b), since `shared.jsx` may also be another task's:
- [`docs/design/prototype/Home.html`](https://github.com/Basel-Ghonaim/masaha-prototype/blob/b16cbf8d2d894f983e1ffb031c87cdd9d5ebb40f/prototype/Home.html) still lists the spaces «متاحة الآن» as the verified spaces whose state is `open`, titled «متاحة الآن», and «عرض الكل» leads to `Directory.html?available=1`. Production lists the spaces open now by their hours, verified or not, titled «مفتوحة الآن», and leads to `?open=1` ([directory › Home's spaces on the web](../../features/directory.md#behaviour-and-flows)); the prototype's Directory no longer reads `available`.
- [`docs/design/prototype/masaha/shared.jsx`](https://github.com/Basel-Ghonaim/masaha-prototype/blob/b16cbf8d2d894f983e1ffb031c87cdd9d5ebb40f/prototype/masaha/shared.jsx)'s `TodayHours` picks today's hours by the browser's day (`new Date().getDay()`), while its own `openNow` reads Gaza's clock. Production's card reads Gaza's day for both, so near midnight the prototype's «اليوم …» line can name another day's hours than production's.

**Resolves when:** the prototype's Home lists and titles the spaces open now and links `?open=1`, and its `TodayHours` reads Gaza's day, as production does.

**Resolution (2026-11-27):** The prototype now lists spaces open by their hours, links Home's «عرض الكل» to `?open=1`, and reads today's hours on Gaza's day. [Prototype commit](https://github.com/Basel-Ghonaim/masaha-prototype/commit/19b05819552b44911968392c6504e0b658a8e8d7). Production PR #161.
