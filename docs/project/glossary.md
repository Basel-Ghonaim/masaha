# Glossary

> **Status:** Active · **Last Updated:** 2026-09-28 · **Owner:** Basel Ghoneim
> **Authority:** The canonical vocabulary. Code, documents and copy use these terms.

| Term | Arabic | Meaning |
|---|---|---|
| **Space** | مساحة | A coworking space listed in the directory |
| **Verified space** | مساحة موثّقة | A space linked to at least one Owner account by the admin |
| **Unverified space** | مساحة غير موثّقة | A listed space with no linked owner; data comes from the admin |
| **Owner** | صاحب المساحة | A user with the `OWNER` role who manages the spaces linked to them |
| **Space manager link** | ربط الإدارة | The record linking an Owner to a Space (`SpaceManager`) |
| **Member** | مشترك | A person registered by an owner at a space; may have no platform account |
| **Membership** | اشتراك | One period of a member's subscription: a type (daily, weekly, monthly, seasonal), start and end dates, and optionally a shift. A renewal adds a membership |
| **Daily visitor** | زائر يومي | A person checked in by name only, without a member record |
| **Membership status** | حالة الاشتراك | Derived from the end date of the member's latest membership: active, ending soon (≤ 7 days), expired |
| **Shift** | وردية | An optional named part of a space's daily opening range (for example, morning and evening), which a price or a membership can name |
| **Check-in** | تسجيل حضور | A record that a member or visitor is present at a space |
| **Open check-in** | حضور مفتوح | A check-in without a check-out |
| **Auto check-out** | خروج تلقائي | A check-out the system records at closing time or after the maximum duration |
| **Capacity** | السعة | The number of seats a space declares. Private: only the space's owner sees it |
| **Live status** | الحالة المباشرة | The public state of a verified space right now: **Available** (متاح), **Full** (ممتلئ) or **Closed now** (مغلق الآن). Never a count |
| **Occupancy** | الإشغال | Open check-ins relative to capacity, live or over time; shown only to the space's owner |
| **Announcement** | إعلان | A time-bound notice from an owner shown on the space page |
| **Data report** | بلاغ | A user's report that a space's information is wrong or outdated |
| **Stale** | قد تكون قديمة | A fact not updated or confirmed within its staleness threshold: 30 days for prices, 60 days for the other facts (both admin settings) |
| **Governorate** | محافظة | One of the Gaza Strip's five governorates; the upper level of the place list |
| **Area** | منطقة | A neighbourhood or town within a governorate; every space is in one. The admin hides an unreachable area without deleting it |
| **Lookup** | قائمة ثابتة | An admin-managed bilingual list: governorates, areas, amenities |
| **Audit log** | سجل التدقيق | The record of sensitive actions: who, when, what |
