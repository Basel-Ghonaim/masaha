# 122. `subscription_usage` overflows on extreme usage-based prices

**Status:** Open · **Date:** 2026-10-22

**Evidence:** the database function `subscription_usage` (migration `subscription_usage`) computes a per-day subscription's due as `count(DISTINCT day)::integer * price_agorot` and a per-hour one's as `round(minutes * price_agorot / 60.0)::integer`, both in `integer`. With the price's bound (`PRICE_MAX_AGOROT`, 10,000,000 agorot), a per-day subscription overflows after about 215 days used, a per-hour one after about 215 hours. Every page of the customers list, its filters and each file compute the function for the space's subscriptions, so one such row answers 500 to the whole space's customers screen, not only to its own customer. The prices are unrealistic (the review of #102, finding 6).

**Resolves when:** the function computes the due in `bigint` (and the reads keep a failure to the row's own customer), or the usage-based price is bounded low enough that no subscription's due can overflow.
