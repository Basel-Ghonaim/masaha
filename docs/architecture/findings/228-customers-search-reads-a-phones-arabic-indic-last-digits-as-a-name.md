# 228. Customers' search reads a phone's Arabic-Indic last digits as a name

**Status:** Resolved · **Date:** 2026-11-15

**Evidence:** a whole phone typed in Arabic-Indic digits is read by `normalisePhone` and searched as a phone. A partial phone suffix does not pass that whole-phone rule: `customerSearch.ts` removes separators, then tests `/^\d{2,}$/`, which recognises Western digits only. Arabic-Indic suffix digits fail that test and are returned as `{ name: q }`, so the customer's name is searched instead of the end of their phone.

**Resolves when:** a customer's phone suffix typed in Arabic-Indic digits is treated as phone digits and searches the end of stored phone numbers, with tests proving the match and the name path kept for non-phone text.

**Resolution (2026-11-16, #149):** `customerSearch.ts` reads the term's digits through `toWesternDigits` before the digit test, so a phone's last digits typed in Arabic-Indic or Eastern digits search the end of a stored phone. `customerSearch.unit.test.ts` proves `٥٦٧٨`, `۵۶۷۸` and `٠٥٩ ١٢٣` resolve to phone digits and `أحمد` still searches the name; `matchesPerson.unit.test.ts` proves the desk's present search does the same.
