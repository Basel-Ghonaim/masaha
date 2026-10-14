# 67. The prices table cuts its shift at 768 px

**Status:** Open · **Date:** 2026-10-14

**Evidence:** from 768 px the editor's «الأسعار» is a small table of twelve columns, the period, the audience and the shift two each ([spaces › The space editor on the web](../../features/spaces.md#behaviour-and-flows)). Between 768 px and about 900 px, beside the dashboard's collapsed sidebar, the shift's select is too narrow for its words: «بدون وردية» shows as «بدون و», and a shift's name is cut the same way (seen in #79's real run, 768 ar light). The value chosen is still read in full by a screen reader, and the select opens on the whole list.

**Resolves when:** the table starts at a width where every select holds its words (such as `lg`), or the shift takes more of the row, or the owner accepts it.
