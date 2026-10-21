# 132. A paged list shows no sign of the next page loading

**Status:** Open · **Date:** 2026-10-21

**Evidence:** every paged list on the web keeps the rows or cards shown while the next page or filter loads (`keepPreviousData`), and marks the list only with `aria-busy`: the site's Directory (`features/directory`, #101) and the admin's spaces, owners and users lists (`features/space-links`). `ListPagination` (`shared/lists`) still marks the old page as current until the answer comes, since it reads the shown answer's page. On a weak connection a tap on «2» changes nothing on screen for seconds, which invites a second tap. This follows the decision that the list never blanks between two answers (the Directory's S13, the admin lists' own); it is a design point, not a defect of one list (#101's review, item 9; #103).

**Resolves when:** the design gives a paged list a quiet loading sign, such as a subdued state on the rows or cards, or the chosen page marked at once, and every paged list takes it from `shared/lists`; the owner's call.
