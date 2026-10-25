# 160. A visit's check-in cannot name its customer

**Status:** Open · **Date:** 2026-10-25

**Evidence:** the desk's design offers a known customer with no current subscription, or an expired or not-started one, «تسجيل كزيارة» — a visit recorded as theirs (DK-020). The visit's check-in takes a name, an audience and a shift only (`checkInVisitSchema`, `POST …/visits`): it carries no customer, so a visit gains its customer only at an unpaid check-out or by «تسجيل دين». The desk (#119) checks such a customer in as a visit by their name, and says it is not added to their file (DI-14).

**Resolves when:** a visit's check-in takes the customer it is for (`customerId`), and the desk sends it; or the owner accepts a visit by name as DK-020's build.
