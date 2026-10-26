# 163. A subscription's corrections have no screen

**Status:** Open · **Date:** 2026-10-25

**Evidence:** The API corrects a subscription — its name, dates and limits (`PATCH …/subscriptions/:subscriptionId`, the staff's) and the owner's price (`PUT …/subscriptions/:subscriptionId/price`), #106 — but the desk's design (screens 13–16) has no control for either, so the customer's file (#122) offers only «إنهاء الاشتراك». A wrong limit or price typed at the subscribe is not corrected on the web.

**Resolves when:** a design gives the corrections a place (the subscription's card in the customer's file), and the web builds it on the routes as they are.
