# 153. The seed stores the contact's WhatsApp in a form the phone rule does not

**Status:** Open · **Date:** 2026-10-28

**Evidence:** one phone number has one form ([data-model › Conventions](../data-model.md#conventions), *Contacts*): `normalisePhone` (`packages/shared/src/core/phone.ts`) stores a Palestinian mobile (059, 056) as `+970…`, whichever code it was typed with. The seed takes `SEED_CONTACT_WHATSAPP` by a looser rule, any E.164 number (`apps/api/src/db/seed/run.ts`), and stores it as given; the catalogue reads it in that form (#130, [finding 40](40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md)), so nothing fails. But a number given as `+97259…` is stored that way, and the admin's first save of the contact, even of the same values, rewrites it as `+97059…` and audits a change no one made. Seen in #130's real run on a development database, where the seeded number had the `+972` code. The same holds for an email given with capitals: stored as given, lowercased by the first save.

**Resolves when:** the seed checks and stores the contact through the same schemas as the admin's save (`emailSchema`, `phoneSchema`), so a seeded contact is already in its one form; or the documents accept the first save's rewrite.
