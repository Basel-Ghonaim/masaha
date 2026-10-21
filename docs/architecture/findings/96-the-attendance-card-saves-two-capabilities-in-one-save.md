# 96. The attendance card saves two capabilities in one save

**Status:** Resolved · **Date:** 2026-10-19

**Evidence:** the design's «الحضور والحالة المباشرة» card (O2, `docs/design/prototype/Owner settings.html`) has one «حفظ» for the capacity and the stay limit, and its comment names `PATCH /manage/spaces/:id` for the capacity. The contract has two requests: `PUT …/capacity` (`occupancy`) and `PATCH …/settings` (`space-settings`), #92. One save can then half succeed, while DI-38 fails a card as a whole.

**Resolves when:** screen 24's plan decides the order of the two requests and what the card says when the second fails, or the owner splits the card's save.

**Resolution (2026-10-20, #99):** the card saves the capacity first, then the settings, each only when it changed; if the settings fail after the capacity, whatever the second request's failure, its note says «حُفظت السعة، ولم تُحفظ إعدادات الخروج التلقائي» beside the failure, the saved capacity becomes its own and every value typed stays, so the next save sends only the settings ([space-settings › Web decisions](../../features/space-settings.md#web-decisions)).
