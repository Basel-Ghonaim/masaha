# Data Model

> **Status:** Active · **Class:** Contract — conventions and rules to build against; the schema owns every field · **Last Updated:** 2026-09-29 · **Owner:** Basel Ghoneim
> **Authority:** Entities, relations, data conventions, derived values and constraints. The Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), is the source of truth for every model, field and index; this document gives the rules and the *why*, and never copies field lists.
> **Planned:** the scope change of 2026-09-29 adds rules marked *planned (F-3b)*. They are not in the schema yet; [Pending entity changes](#pending-entity-changes-f-3b) lists what F-3b adds.

## Conventions

- **IDs:** `Int @id @default(autoincrement())`. Public space URLs use a unique `slug`, never reused.
- **Naming:** models PascalCase, fields camelCase, mapped to snake_case tables (plural) and columns with `@map` / `@@map`.
- **Timestamps:** `createdAt`, `updatedAt` on every table, as `timestamptz`. The exceptions are the append-only `AuditLog` and `Payment`, which have `createdAt` only; a payment's one change, its void, carries its own time. Calendar dates (a subscription's start and end) are `date`.
- **Soft delete:** `deletedAt` on `Space` and `Announcement`, and `archivedAt` on `Customer` (named as the desk sees it); `suspendedAt` on `User` ([ADR 0007](decisions/0007-soft-delete.md)). Purely dependent rows (managers, hours, shifts, prices, contacts, amenity links, photos, favourites, tokens) cascade from their parent; history (customers, packages, subscriptions, check-ins, visits, announcements, data reports, audit log) restricts deletion.
- **Bilingual content:** paired fields such as `nameAr` / `nameEn`, `descriptionAr` / `descriptionEn`, `addressAr` / `addressEn`. Arabic required, English optional. A space's description is optional in both languages. Lookups (governorates, areas, amenities) require both.
- **Areas are two-level:** governorate → area, covering the whole Gaza Strip. Each carries an admin-managed `isActive` flag: an area beyond reach is hidden and restored later without deleting anything. Amenities carry the same flag, so a retired amenity keeps its links.
- **Prices:** every period (hour, day, week, month) is optional, so a missing period is a missing row. A price has an audience (general or student), an optional shift and an optional custom label (Arabic and English). Amounts are integers in agorot with a `currency` (`ILS`); display only in v1. Halls for rent and technical training are amenities, never prices.
- **Shifts:** a space may define named shifts inside its one daily opening range (for example 08:00–16:00 and 16:00–22:00 inside 08:00–22:00). Most spaces have none. A price, a package, a subscription or a visit may name one. Shifts belong to the prices fact group.
- **Times of day** are minutes after midnight in Asia/Gaza, not `time` columns. Opening hours are one range per day of the week (0 = Sunday … 6 = Saturday) with a closed flag. v1 does not support closing mid-day and reopening, or closing after midnight. New spaces start from the template Saturday–Thursday open, Friday closed.
- **Contacts** are a typed list per space (WhatsApp, phone, email, Instagram, Facebook, TikTok, website), not fixed columns:
  - phone and WhatsApp values, like every phone number in the database (customers), are stored in **E.164**. Input arrives as `00970…`, `+972…` or local `05…`; Palestinian mobiles (`059…` Jawwal, `056…` Ooredoo) are normalised to `+970…` whatever prefix they arrived with, so one number has one form. Numbers are displayed LTR;
  - email is stored lowercased; Instagram, Facebook, TikTok and website as full `https://` URLs.
- **Capacity is private from the public:** stored on the space, visible only to the space's staff (owner and reception), never to the admin or in a public page or response ([ADR 0008](decisions/0008-live-status-not-counts.md)).
- **Freshness:** each fact group of a space carries its own `…UpdatedAt`, set when the group is saved **or confirmed unchanged**: profile (name, description, address, area, location, photos), hours, prices (with shifts), amenities, contacts. Confirming («المعلومات ما زالت صحيحة») resets only that group's date and changes none of its data.
- **Same space by construction:** a record that points at two things of one space carries the `spaceId` and points at each through a composite foreign key, `(id, spaceId)`, so the database refuses a customer, package, shift or subscription of another space. A price's shift set the pattern.
- **Idempotency:** a record the desk creates from a request that may be retried (a check-in, a visit) carries a client-generated `requestId` (a UUID), unique within its space. A retried request hits the key, and the service returns the row that already exists instead of recording it twice.
- **Settings** are key–value rows whose keys are fixed in code; each value is validated when read.
- **Indexes only for queries that run.** Foreign keys used in lists are indexed, or covered by the prefix of a unique index.
- **Unique violations** (Prisma `P2002`) become `409 CONFLICT`.

## Entities

Summaries only: the schema owns the fields.

### Users and sessions
- **User** — an account with one global role (`USER` / `OWNER` / `ADMIN`, [ADR 0002](decisions/0002-authorization-model.md)), a unique email, a language, and `mustChangePassword` for accounts created by someone else (new owners, new reception accounts, admin recovery). It signs in with a password, Google (a unique Google subject), or both, never neither: a Google-only account has no password ([security.md](../backend/security.md#sign-in-methods)). There is no phone login, so no phone. Suspended, never deleted.
- **RefreshToken** — one row per session, stored hashed, rotated with a link to its replacement ([security.md](../backend/security.md)). Cascades from its user.
- **PasswordResetToken** — a single-use reset token, stored hashed, with an expiry. Cascades from its user.

### Lookups
- **Governorate** and **Area** — the two-level place list, bilingual, ordered, with active flags. An area belongs to one governorate; a space belongs to one area.
- **Amenity** — a bilingual yes/no feature with a stable `key` and an icon key, ordered, with an active flag. Linked to spaces through **SpaceAmenity**.

### Spaces
- **Space** — a listed coworking space: bilingual profile, area and map location, private capacity, the optional auto check-out limit (`maxStayMinutes`), the admin's hide flag, soft delete, and one freshness timestamp per fact group.
- **SpaceManager** — a user's link to a space, with its role there, `OWNER` or `RECEPTION` ([ADR 0009](decisions/0009-space-scoped-reception-role.md)). The role alone decides what the user may do at the space; `can()` never reads the global role for it. The owner deactivates a reception link rather than deleting it, because payments and the audit log name its user; a deactivated link grants nothing. An active `OWNER` link makes the space verified.
- **SpaceHours** — one row per day of the week: a closed flag, or one opening range.
- **SpaceShift** — optional named shifts inside the opening range.
- **SpacePrice** — optional price rows by period, audience, shift and label.
- **SpaceContact** — the typed contact list.
- **SpacePhoto** — ordered photos, by storage key.

### Operations
- **Customer** — everyone on file at one space: a subscriber, or a visitor who left a debt. A name and an optional phone, unique within the space among customers that are not archived; optionally a platform user (unused in v1). Archived, never deleted.
- **Package** — an owner-defined subscription template, private to the space's staff: a validity in days, the same optional limits and billing as a subscription, an audience, an optional shift and an active flag. The public packages are the published `SpacePrice` rows, never duplicated here.
- **Subscription** — any multi-day arrangement for a customer, from a package or custom («مخصّص», typed at the desk): a name, optional limits (start and end dates, total days, days per week, hours per day, total hours), fixed or usage-based billing (per hour or per day) with its price or rate copied in, an audience and an optional shift. It records who typed a desk price and who ended it early, and when. A renewal adds a row.
- **CheckIn** — a customer present on one of their subscriptions, opened and closed manually or closed automatically. Never deleted.
- **Visit** — a same-day stay, checked in by name, as a customer, or both, with an audience and an optional shift. Its hour and day rates are copied at check-in; at check-out it stores its charge: the rounding in force, whether the day-price cap applied, the amount, and who typed it when the desk had to. It gains a customer when it is left unpaid. Never deleted.
- **Payment** — money the desk received for exactly one visit or one subscription ([ADR 0010](decisions/0010-manual-payment-ledger.md)): an amount above zero, the method (cash or transfer), an optional note, who recorded it and when it was received, and a client `requestId`. Never updated or deleted: a mistake is voided once, with who, when and a reason, and a voided payment counts nowhere.
- **Announcement** — a time-bound bilingual notice from the owner, typed (general, outage, closure, offer, event). Soft-deleted.
- **DataReport** — a user's report that one field group of a space is wrong (prices, hours, contact, location, amenities, other), with its resolution.
- **Favorite** — a user's saved space.
- **Setting** — a platform setting: the staleness thresholds `stalenessDays` (60) and `priceStalenessDays` (30), and the platform's `contactEmail` and `contactWhatsapp`.
- **AuditLog** — who did what to which entity, with before and after, optionally scoped to a space. The actor is null for system actions such as auto check-out. Never deleted.

## Derived values (computed, not stored)

- **Verified:** a space with at least one active `OWNER` link. A `RECEPTION` link never verifies a space.
- **Publicly listed:** a space is listed publicly (directory, search, map) and its page is public only when it is not deleted, not hidden, and both its area and its governorate are active. Otherwise the public gets "not found", while its owner and the admin still see it.
- **Live status** — public, a state and never a count ([ADR 0008](decisions/0008-live-status-not-counts.md)). Evaluated in this order, in Asia/Gaza time:
  1. an unverified space has **no live state**;
  2. **`CLOSED`** (مغلق الآن) while an active `CLOSURE` announcement covers now (not deleted, `startsAt ≤ now`, and `endsAt` after now or not set), or outside today's opening hours;
  3. *planned (F-3b):* while the space is open by its hours, a **manual override** in force gives its state: `AVAILABLE`, `FULL` or `CLOSED`, even when capacity is not set. The owner or reception sets it for 30 min, 1 h, 2 h or until today's closing time. A new override replaces the previous one, and staff can clear it early;
  4. **no live state** when the space has no opening hours at all, or is open but its capacity is not set;
  5. **`FULL`** (ممتلئ) when present ≥ capacity, where *present* is the open visits plus the open subscription check-ins;
  6. otherwise **`AVAILABLE`** (متاح).

  The directory's "available now" filter selects `AVAILABLE`. Capacity and the exact numbers (present / capacity) are shown only to the space's staff (owner and reception).
- **Auto check-out:** open check-ins are closed at the space's closing time, or at 23:59 when the space has no opening hours — or earlier, after `maxStayMinutes`, when the owner sets it. Closing-time check-out cannot be turned off.
- **Stale:** a fact group whose `…UpdatedAt` is older than its threshold: `priceStalenessDays` (default 30) for prices, `stalenessDays` (default 60) for the others. Both are admin settings.
- **Stale prices:**
  - on an **unverified** space, the amounts are hidden, "Price not up to date — contact the space" is shown, and the space is left out of the price filter;
  - on a **verified** space, the amounts are shown with a "may have changed" note, and the owner's overview reminds them to confirm.

### Front desk and money — planned (F-3b)

The money rules are decided in [ADR 0010](decisions/0010-manual-payment-ledger.md); who may do what in [ADR 0009](decisions/0009-space-scoped-reception-role.md). Amounts are in agorot; days and times are Asia/Gaza.

- **Visit charge.** When a visit is checked in, its rates are copied from the space's prices: the hour and day prices of its audience (student when chosen, otherwise general) and, for a visit in a shift, that shift's prices. At check-out, the stay is rounded by the space's rounding rule and multiplied by the hour rate, capped at the day price. The charge is stored on the visit. Fallbacks:
  - no hour price → the charge is the day price;
  - no day price → no cap;
  - neither → the desk types the amount, recorded as a desk-set price with who set it.
- **Unpaid visit:** a visit may be left unpaid only with a phone number. It then belongs to the customer with that phone (created if new), and its charge counts in that customer's debt.
- **Uncollected visits:** visits closed by the auto check-out and left unpaid.
- **Full warning:** a check-in (visit or subscription) while present ≥ capacity warns, never blocks.
- **Subscription limits:** any of a date range, total days, days per week, hours per day and total hours, freely combined, all optional. They produce warnings at check-in, never blocks.
- **Subscription progress**, from its check-ins: days used, days this week (Saturday to Friday), hours today and hours used.
- **Subscription status**, from its end date and its total (days or hours), whichever it has:
  - *expired* at whichever comes first: the end date passes, or the total is used up;
  - *ending soon* at whichever comes first: ≤ 7 days before the end date (for a subscription shorter than a week, on its last day), or ≤ 20 % of the total left;
  - otherwise *active*; with neither an end date nor a total, it stays *active* until it is ended.
  - The end date and the total are limits too: past them, a check-in still only warns.
  - The desk can end any subscription early («إنهاء الاشتراك»): its end becomes today, and who ended it is recorded.
- **Amount due:** a subscription's fixed price or, when it is usage-based, its attendance × its rate (days used × the day rate, or hours used × the hour rate). A visit's due is its charge.
- **Balance:** amount due − the payments that are not voided. **Payment status:** *paid* when the balance is ≤ 0, *partly paid* when a payment exists and the balance is > 0, *unpaid* when there is none. A negative balance, possible only on a usage-based subscription, is **credit** («له رصيد»).
- **Customer debt:** the sum of the positive balances of the customer's subscriptions and unpaid visits. Credit on one subscription never offsets another.
- **Income:** the payments that are not voided, counted by the day received: today, this month (against last month) and all time, split into visits and subscriptions.
- **Collections:** the same payments grouped by who recorded them. Reception sees its own for today; the owner sees every staff member.
- **Occupancy statistics:** peak hours and average stay, from visits and subscription check-ins.

### Subscription scenarios

The subscription model must express each of these without special cases; F-3b proves them with tests.

1. **Exam student:** three weeks, billed by the hour; a statement of days and hours at any time. Expires when the three weeks end.
2. **A split week:** six days over two weeks, three per week, at a fixed price. Expires when the two weeks end or the sixth day is used, whichever comes first.
3. **Every other day:** a month, three days per week, at a fixed, agreed price. Expires when the month ends; the days per week only warn.
4. **An hours pack:** 20 hours at a fixed price, with no end date. Expires when the 20 hours are used; ending soon from 4 hours left.

## Constraints worth stating

The database enforces these; the `apps/api/src/db/*.api.test.ts` files prove each one (`schema` for spaces, prices and accounts, `front-desk`, `subscriptions`, `payments`).

- One open check-in per customer, and one open visit per customer (partial unique indexes on `customerId` where `checkedOutAt IS NULL`). One open presence across both is checked by the service.
- Customer phone unique within a space among customers that are not archived (partial unique index); customers without a phone are not limited.
- A check-in's, a visit's, a subscription's and a package's customer, subscription, package and shift belong to the record's own space (composite foreign keys).
- A `requestId` is unique within its space (check-ins, visits, payments).
- One price per space, period, audience, shift and label, where a missing shift or label counts as one value (four unique indexes, three of them partial, because PostgreSQL treats NULLs as distinct).
- A price's shift belongs to the price's own space (a foreign key through `(shiftId, spaceId)`).
- `CHECK` constraints, written as raw SQL at the end of the init migration: phone numbers in E.164; an opening range and a shift inside the day, and a closed day without times; a check-in closes after it opens, and has a check-out method exactly when closed; end dates after start dates; location, capacity, stay limit and amounts in range.
- A user has a password, a Google subject, or both (a `CHECK`); a Google subject belongs to one user.
- The partial indexes use Prisma's `partialIndexes` preview feature, so Prisma knows them and later migrations keep them. `CHECK` constraints are not compared by Prisma, so later migrations leave them alone; a change to one is a new raw-SQL migration.
- `CHECK` constraints of the later migrations: a customer's phone in E.164; a subscription's and a package's limits positive (at most 7 days a week and 24 hours a day), prices not negative, and an early end with both its time and who ended it; a visit has a name or a customer, closes after it opens, has a check-out method exactly when closed, has no charge while open, names who typed a charge only with a charge, keeps rounding minutes (1–59) exactly for the "up after N minutes" rule, and has no negative rate or charge.
- **The payment ledger**, by `CHECK` constraints and two triggers in the payments migration:
  - a payment settles exactly one item, a visit or a subscription of its own space, with an amount above zero;
  - it is never updated or deleted; its only change is one void that sets the time, who voided and a non-blank reason together and touches nothing else, and a voided payment never changes again;
  - the payments of a visit, or of a fixed-price subscription, that are not voided never add up to more than its charge or price, and a visit is paid only once its charge is set. A usage-based subscription has no ceiling, so paying ahead leaves it in credit. The item's row is locked while this is checked, so payments recorded at once are counted in turn, and a retried request reaches its unique key rather than the ceiling;
  - the services check the same rules first, to answer with a domain error; the database is the backstop.
- Check-ins, visits, subscriptions, payments and audit-log entries are never deleted.

### Planned constraints (F-3b)

- An unpaid visit has a customer.
- A closure's subscription extension is applied at most once per closure announcement.

## Pending entity changes (F-3b)

Planned, not built. The schema will own the fields; this section folds into *Entities* when F-3b is merged.

- **Space:** the manual state override (state, until, who set it) and the visit rounding rule.
- **DataReport:** an optional resolution note, written by whoever resolves it.
- **Amenity:** a flag for the directory filter, so shared amenities (Internet, stable power) are left out of it.
- **Closure extension:** a record tying an extension to its closure announcement.
