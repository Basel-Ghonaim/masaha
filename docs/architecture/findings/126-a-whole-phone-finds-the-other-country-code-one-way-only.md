# 126. A whole phone finds the other country code one way only

**Status:** Open · **Date:** 2026-10-24

**Evidence:** a whole phone typed at the desk's customer search matches a phone stored under either code by its national digits with the trunk 0 at its end (`customerSearch.ts`: `phoneDigits` is `0` and the national digits; `customers.repository.ts` matches the end of the stored digits). That works only because `970` ends in `0`: `0521234567`, normalised to `+972521234567`, finds `+970521234567`, whose digits end in `0521234567`. The reverse does not: `0591234567`, normalised to `+970591234567`, does not find a stored `+972591234567`, whose digits `972591234567` do not end in `0591234567`. The decided case of #109 works; the asymmetry was found by its review (finding 4).

**Resolves when:** a whole phone matches on its national digits without the trunk (at least nine), so both codes find each other; or the owner accepts the one-way match.
