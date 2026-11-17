# 217. Contacts and every phone refuse Arabic-Indic digits

**Status:** Resolved · **Date:** 2026-11-10

**Evidence:** the shared phone rule, `normalisePhone` in `packages/shared/src/core/phone.ts`, matches `\d` without the `u` flag, which reads Western digits only. A WhatsApp or phone contact, a «وسيلة أخرى» number and a customer's phone typed as `٠٥٩٩١٢٣٤٥٦` on an Arabic keyboard are refused («رقم غير صالح»), and the web converts Arabic-Indic digits (`toWesternDigits`) only for times, amounts and whole numbers, never for a contact or a phone. The space profile's contacts decision (C2, `SPACE_PROFILE` 2026-11-08) says a contact's value is «normalised as today (Arabic-Indic digits, …)», which assumed otherwise; #140 left the rule unchanged and does not assert the case (the owner's decision, 2026-11-10: record only).

**Resolves when:** the owner decides whether the platform's phone rule reads Arabic-Indic digits; if it does, `normalisePhone` (or every form that sends a phone) converts them, a test types `٠٥٩٩١٢٣٤٥٦` for a contact and for a customer, and C2 stands as written.

**Resolution (2026-11-15, #149):** the owner decided that every phone reads Arabic-Indic and Eastern digits. `normalisePhone` reads its input through `toWesternDigits`, which moved from the web's `shared/lib` to `@masaha/shared/core` so the server reads the same digits, and «وسيلة أخرى» tells a number by its Western digits. `phone.unit.test.ts` types `٠٥٩٩١٢٣٤٥٦` and `۰۵۹۹۱۲۳۴۵۶`; the contacts' Sheet sends `+970599777888` for `٠٥٩٩٧٧٧٨٨٨`, the desk's edit dialog `+970599000304` for `٠٥٩٩٠٠٠٣٠٤`, and the contacts' API stores `+970599123456` for `٠٥٩٩١٢٣٤٥٦`. C2 stands as written.
