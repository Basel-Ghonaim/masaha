# Glossary

> **Status:** Active · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
> **Authority:** The canonical vocabulary. Code, documents and copy use these terms.

| Term | Arabic | Meaning |
|---|---|---|
| **Space** | مساحة | A coworking space listed in the directory |
| **Verified space** | مساحة موثّقة | A space linked to at least one Owner account by the admin |
| **Unverified space** | مساحة غير موثّقة | A listed space with no linked owner; data comes from the admin |
| **Owner** | صاحب المساحة | A user with an `OWNER` link to a space, who manages it; the global `OWNER` role labels such users ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)) |
| **Space manager link** | ربط الإدارة | The record linking a user to a Space with a role, `OWNER` or `RECEPTION` (`SpaceManager`) |
| **Reception** | الاستقبال | Front-desk staff of a space, added by its owner (a `RECEPTION` link). No finance, voids, staff or space settings |
| **Front desk** | مكتب الاستقبال | Where visits, check-ins and payments are recorded, by the owner or reception |
| **Customer** | زبون | A person on file at a space: a subscriber, or a visitor who left a debt. May have no platform account. Replaces *Member* |
| **Visit** | زيارة | A same-day stay (hours or one day), checked in by name only and charged at check-out. Daily visitors are visits, not customers |
| **Subscription** | اشتراك | Any multi-day arrangement for a customer, with optional limits and fixed or usage-based billing. Replaces *Membership* |
| **Package** | باقة | An owner-defined subscription template. The published prices are the public packages; private packages are never shown publicly |
| **Custom subscription** | اشتراك مخصّص | A subscription with one-off terms typed at the desk («مخصّص») |
| **Subscription status** | حالة الاشتراك | Active, ending soon or expired, derived from the dates or the totals ([data-model](../architecture/data-model.md#derived-values-computed-not-stored)) |
| **Payment** | دفعة | Money received for one visit or one subscription, recorded by hand (cash or transfer). Never edited or deleted ([ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md)) |
| **Amount due** | المستحق | What a visit or a subscription costs, from the prices copied into it when it was created |
| **Balance** | المتبقي | Amount due minus the payments not voided. Below zero only as credit («له رصيد») on a usage-based subscription |
| **Payment status** | حالة الدفع | Paid, partly paid or unpaid, per visit or subscription |
| **Void a payment** | إلغاء دفعة | The owner cancels a payment, with a reason; it stays in the ledger and counts nowhere |
| **Shift** | وردية | An optional named part of a space's daily opening range (for example, morning and evening), which a price or a subscription can name |
| **Check-in** | تسجيل حضور | A record that a customer or a visitor is present at a space |
| **Open check-in** | حضور مفتوح | A check-in without a check-out |
| **Auto check-out** | خروج تلقائي | A check-out the system records at closing time or after the maximum duration |
| **Capacity** | السعة | The number of seats a space declares. Private from the public: only the space's staff (owner and reception) see it |
| **Live status** | الحالة المباشرة | The public state of a verified space right now: **Available** (متاح), **Full** (ممتلئ) or **Closed now** (مغلق الآن). Never a count |
| **Manual state override** | ضبط الحالة يدويًا | The owner or reception sets the live status by hand for a set time |
| **Occupancy** | الإشغال | Open check-ins and visits relative to capacity: live, shown to the space's staff; over time, in the owner's statistics |
| **Announcement** | إعلان | A time-bound notice from an owner shown on the space page |
| **Data report** | بلاغ | A user's report that a space's information is wrong or outdated; it may be resolved with a note shown to the reporter |
| **Stale** | قد تكون قديمة | A fact not updated or confirmed within its staleness threshold: 30 days for prices, 60 days for the other facts (both admin settings) |
| **Governorate** | محافظة | One of the Gaza Strip's five governorates; the upper level of the place list |
| **Area** | منطقة | A neighbourhood or town within a governorate; every space is in one. The admin hides an unreachable area without deleting it |
| **Lookup** | قائمة ثابتة | An admin-managed bilingual list: governorates, areas, amenities |
| **Audit log** | سجل التدقيق | The record of sensitive actions: who, when, what |
