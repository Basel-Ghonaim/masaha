# Glossary

> **Status:** Active · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** The canonical vocabulary. Code, documents and copy use these terms.

| Term | Arabic | Meaning |
|---|---|---|
| **Space** | مساحة | A coworking space listed in the directory |
| **Verified space** | مساحة موثّقة | A space linked to at least one Owner account by the admin |
| **Unverified space** | مساحة غير موثّقة | A listed space with no linked owner; data comes from the admin |
| **Owner** | صاحب المساحة | A user with the `OWNER` role who manages the spaces linked to them |
| **Space manager link** | ربط الإدارة | The record linking an Owner to a Space (`SpaceManager`) |
| **Member** | مشترك | A person registered by an owner at a space, with a membership type and dates; may have no platform account |
| **Daily visitor** | زائر يومي | A person checked in by name only, without a member record |
| **Membership status** | حالة الاشتراك | Derived from the end date: active, ending soon (≤ 7 days), expired |
| **Check-in** | تسجيل حضور | A record that a member or visitor is present at a space |
| **Open check-in** | حضور مفتوح | A check-in without a check-out |
| **Auto check-out** | خروج تلقائي | A check-out the system records at closing time or after the maximum duration |
| **Capacity** | السعة | The number of seats a space declares |
| **Available seats** | المقاعد المتاحة | Capacity minus open check-ins, never below zero |
| **Occupancy** | الإشغال | Open check-ins relative to capacity, live or over time |
| **Announcement** | إعلان | A time-bound notice from an owner shown on the space page |
| **Data report** | بلاغ | A user's report that a space's information is wrong or outdated |
| **Stale** | قد تكون قديمة | A fact not updated within the staleness threshold (default 60 days) |
| **Lookup** | قائمة ثابتة | An admin-managed bilingual list: areas, amenities |
| **Audit log** | سجل التدقيق | The record of sensitive actions: who, when, what |
