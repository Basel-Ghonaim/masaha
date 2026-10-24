# 131. The space page cannot show a closure's notice

**Status:** Open · **Date:** 2026-10-22

**Evidence:** the design's space page shows a closure in force as an Alert above its sections (PU's closure notice). `PublicSpace`, the answer of `GET /spaces/:slug`, carries no announcement: the announcements, a closure among them, are step 10 of the build map. The site's space page (#107) therefore draws no closure; meanwhile the cards' and pins' live status (and the page's, since #108) says «مغلق الآن» while a closure holds, by the live status's rule (design issue 23; the owner's decision, 2026-10-21).

**Resolves when:** step 10 adds the announcements in force to `GET /spaces/:slug`, and the page shows a closure's notice.
