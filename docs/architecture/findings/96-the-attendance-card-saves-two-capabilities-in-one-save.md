# 96. The attendance card saves two capabilities in one save

**Status:** Open · **Date:** 2026-10-19

**Evidence:** the design's «الحضور والحالة المباشرة» card (O2, `docs/design/prototype/Owner settings.html`) has one «حفظ» for the capacity and the stay limit, and its comment names `PATCH /manage/spaces/:id` for the capacity. The contract has two requests: `PUT …/capacity` (`occupancy`) and `PATCH …/settings` (`space-settings`), #92. One save can then half succeed, while DI-38 fails a card as a whole.

**Resolves when:** screen 24's plan decides the order of the two requests and what the card says when the second fails, or the owner splits the card's save.
