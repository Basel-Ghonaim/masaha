# 217. Contacts and every phone refuse Arabic-Indic digits

**Status:** Open · **Date:** 2026-11-10

**Evidence:** the shared phone rule, `normalisePhone` in `packages/shared/src/core/phone.ts`, matches `\d` without the `u` flag, which reads Western digits only. A WhatsApp or phone contact, a «وسيلة أخرى» number and a customer's phone typed as `٠٥٩٩١٢٣٤٥٦` on an Arabic keyboard are refused («رقم غير صالح»), and the web converts Arabic-Indic digits (`toWesternDigits`) only for times, amounts and whole numbers, never for a contact or a phone. The space profile's contacts decision (C2, `SPACE_PROFILE` 2026-11-08) says a contact's value is «normalised as today (Arabic-Indic digits, …)», which assumed otherwise; #140 left the rule unchanged and does not assert the case (the owner's decision, 2026-11-10: record only).

**Resolves when:** the owner decides whether the platform's phone rule reads Arabic-Indic digits; if it does, `normalisePhone` (or every form that sends a phone) converts them, a test types `٠٥٩٩١٢٣٤٥٦` for a contact and for a customer, and C2 stands as written.
