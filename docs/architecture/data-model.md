# Data Model

> **Status:** Active · **Class:** Contract — conventions and rules to build against; the schema owns every field · **Last Updated:** 2026-10-19 · **Owner:** Basel Ghoneim
> **Authority:** Entities, relations, data conventions, derived values and constraints. The Prisma schema, [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), is the source of truth for every model, field and index; this document gives the rules and the *why*, and never copies field lists.

## Conventions

- **IDs:** `Int @id @default(autoincrement())`. Public space URLs use a unique `slug`, never reused. Two tables are keyed by a natural string instead, because a row is only ever found by it: `Setting` (its key in the catalogue) and `RateLimit` (its counter's key).
- **Naming:** models PascalCase, fields camelCase, mapped to snake_case tables (plural) and columns with `@map` / `@@map`.
- **Timestamps:** `createdAt`, `updatedAt` on every table, as `timestamptz`. The exceptions are the append-only `AuditLog` and `Payment`, which have `createdAt` only; a payment's one change, its void, carries its own time. Calendar dates (a subscription's start and end) are `date`.
- **Soft delete:** `deletedAt` on `Space` and `Announcement`, and `archivedAt` on `Customer` (named as the desk sees it); `suspendedAt` on `User` ([ADR 0007](decisions/0007-soft-delete.md)). Purely dependent rows (managers, settings, occupancy, hours, shifts, prices, contacts, amenity links, own amenities, photos, favourites, tokens) cascade from their parent; history (customers, packages, subscriptions, check-ins, visits, announcements, data reports, audit log) restricts deletion.
- **Bilingual content:** paired fields such as `nameAr` / `nameEn`, `descriptionAr` / `descriptionEn`, `addressAr` / `addressEn`. Arabic required, English optional. Two exceptions on a space: its **name** is English required, Arabic optional, because most spaces are known by an English name; its description and its landmark (`landmarkAr` / `landmarkEn`) are optional in both languages. Lookups (governorates, areas, amenities) require both.
- **Areas are two-level:** governorate → area, covering the whole Gaza Strip. Each carries an admin-managed `isActive` flag: an area beyond reach is hidden and restored later without deleting anything. Amenities carry the same flag, so a retired amenity keeps its links.
- **Prices:** every period (hour, day, week, month) is optional, so a missing period is a missing row. A price has an audience (general or student), an optional shift and an optional custom label (Arabic and English). Amounts are integers in agorot, above zero (a free event is an announcement), with a `currency` (`ILS`); display only in v1. Halls for rent and technical training are amenities, never prices.
- **Shifts:** a space may define named shifts inside its one daily opening range (for example 08:00–16:00 and 16:00–22:00 inside 08:00–22:00). Most spaces have none. A price, a package, a subscription or a visit may name one. Shifts belong to the hours fact group: they are saved with the hours, as the edit screen places them.
- **Times of day** are minutes after midnight in Asia/Gaza, not `time` columns. Opening hours are one range per day of the week (0 = Sunday … 6 = Saturday) with a closed flag. v1 does not support closing mid-day and reopening, or closing after midnight; a day open around the clock is the range 0–1,440. A new space has no hours until they are first saved; the hours form starts from the template Saturday–Thursday open, Friday closed.
- **Contacts** are a typed list per space (WhatsApp, phone, email, Instagram, Facebook, TikTok, website), not fixed columns:
  - phone and WhatsApp values, like every phone number in the database (customers), are stored in **E.164**. Input arrives as `+970…`, `+972…`, `00970…`, `00972…` or local `0…`, the spaces, dashes, dots and parentheses people type between digits dropped, and a `(0)` after the country code; Palestinian mobiles (`059…` Jawwal, `056…` Ooredoo) are normalised to `+970…` whatever prefix they arrived with, so one number has one form; another local mobile (`05…`) becomes `+972…`, a local landline `+970…`. Only Palestinian and Israeli numbers are taken (`phoneSchema`, `@masaha/shared/core`). Numbers are displayed LTR;
  - email is stored lowercased; Instagram, Facebook, TikTok and website as full `https://` URLs. A handle (`masaha`, `@masaha`) becomes its network's address, but a name ending in `.com`, `.net`, `.org` or `.php` is read as a link; a network's link must be on its own host and keeps its path only, its query and fragment dropped, except the numeric `id` of a Facebook profile with no username (`profile.php?id=…`); a website keeps its path and query, with a lowercase host.
- **Capacity is private from the public:** stored in the space's occupancy row, visible only to the space's staff (owner and reception), never to the admin or in a public page or response ([ADR 0008](decisions/0008-live-status-not-counts.md)).
- **Freshness:** each fact group of a space carries its own `…UpdatedAt`, set when the group is saved **or confirmed unchanged**: profile (name, description, address, area, location), hours (with shifts), prices, amenities, contacts. A space's photos are no fact group: a photo added, removed or moved dates nothing, and nothing confirms them (the design's gallery has no date and no confirm; a new photo says nothing of whether the facts are still true). The profile is dated when the space is created; every other group's date is null, the group **missing**, until it is first saved, even empty: an empty group is never fresh by default. Confirming («المعلومات ما زالت صحيحة») resets only that group's date and changes none of its data; a missing group has nothing to confirm.
- **Same space by construction:** a record that points at two things of one space carries the `spaceId` and points at each through a composite foreign key, `(id, spaceId)`, so the database refuses a customer, package, shift or subscription of another space. A price's shift set the pattern.
- **Idempotency:** a record the desk creates from a request that may be retried (a check-in, a visit, a payment) carries the client's **idempotency key** (a UUID, sent in the `Idempotency-Key` header), unique within its space ([ADR 0015](decisions/0015-idempotency-and-concurrency.md)). A retried request hits the key, and the service returns the row that already exists instead of recording it twice. Its Prisma field is `idempotencyKey`, stored in the `request_id` column (the name it had before [ADR 0015](decisions/0015-idempotency-and-concurrency.md) told the two ids apart).
- **Settings** are key–value rows whose keys are fixed in code; each value is validated when read (the contact keys excepted, [finding 40](findings/40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md)).
- **Search** is the database's, through the `pg_trgm` extension and two SQL functions of the directory's migration, so the stored names and the query go through one rule: `masaha_search_text` normalises a text (lowercased; tashkeel and tatweel removed; أ إ آ ٱ folded into ا, ة into ه, ى into ي; whitespace collapsed), and `masaha_search_score` scores a query against a text from 0 to 1: 1 when the text holds it, else the trigram `word_similarity`, so a typo still scores. The directory counts a match from 0.3, pg_trgm's own default. No trigram index: at a thousand spaces a scan costs a few milliseconds, and Prisma would drop an index it does not know. Prisma compares neither extensions nor functions, so later migrations leave both alone; a change to either is a new raw-SQL migration.
- **Indexes only for queries that run.** Foreign keys used in lists are indexed, or covered by the prefix of a unique index.
- **Unique violations** (Prisma `P2002`) become `409 CONFLICT`.

## Entities

Summaries only: the schema owns the fields.

### Users and sessions
- **User** — an account with one global role (`USER` / `OWNER` / `ADMIN`, [ADR 0002](decisions/0002-authorization-model.md); `OWNER` follows the person's active owner links, a soft-deleted space's included, [ADR 0009](decisions/0009-space-scoped-reception-role.md)), a unique email, a language, `mustChangePassword` for accounts created by someone else (new owners, new reception accounts, admin recovery) and, while a temporary password is pending, when it expires ([security › Passwords](../backend/security.md#passwords)), and a session version that grows each time every session of the account ends ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). It signs in with a password, Google (a unique Google subject), or both, never neither: a Google-only account has no password ([security.md](../backend/security.md#sign-in-methods)). There is no phone login, so no phone. Suspended, never deleted.
- **RefreshToken** — one row per token, stored hashed, rotated with a link to its replacement. The tokens rotated from one sign-in form a family, its session, and each carries the session's deadline, 30 days from the sign-in ([security › Tokens and cookies](../backend/security.md#tokens-and-cookies)). Cascades from its user.
- **PasswordResetToken** — a single-use reset token, stored hashed, with an expiry. Cascades from its user.
- **PasswordRecovery** — where a person stands in recovering a password, found by the hash of the key in the browser's recovery cookie ([ADR 0017](decisions/0017-recovery-session.md)). It names its account only when one may sign in, and stores the address only masked and as a digest, never in clear ([security › Passwords](../backend/security.md#passwords)). It counts its resends and when the last link was asked for, and may hold the reset link checked in its browser, with which it ends. It cascades from its user and from that link.
- **RateLimit** — a fixed-window counter: a key, its hits and when its window ends. The rate limits and the reset email's caps share it ([security.md](../backend/security.md#rate-limits-fixed-window)). It belongs to no user.

### Lookups
- **Governorate** and **Area** — the two-level place list, bilingual, ordered, with active flags. An area belongs to one governorate; a space belongs to one area.
- **Amenity** — a bilingual yes/no feature with a stable `key` and an icon key from the shared list ([`lookups/amenityIcons.ts`](../../packages/shared/src/lookups/amenityIcons.ts)), ordered, with an active flag; no amenity is a filter ([lookups › Decisions](../features/lookups.md#decisions)). Linked to spaces through **SpaceAmenity**.

### Spaces
- **Space** — a listed coworking space: bilingual profile, area and map location, the admin's hide flag, soft delete, and one freshness timestamp per fact group.
- **SpaceSettings** — the space's settings, one row per space, keyed by the space and owned by the `space-settings` module ([conventions §9](../backend/conventions.md#space-settings)): auto check-out at closing, the optional auto check-out limit (`maxStayMinutes`), the visit rounding rule (up after N minutes, to the nearest half hour, or per minute), the visit cap at the day price, student prices for visits (on by default), whether reception may type a price by hand (off by default), and the WhatsApp reminder template (none by default: the copy catalogue's text). Every space has a row, created with the space as a copy of the `newSpaceDefaults` setting. The four settings those defaults govern have no database default, so a space created without copying them fails rather than silently taking other values.
- **SpaceOccupancy** — the space's private capacity and the manual live-status override (the state, until when, and who set it), at most one row per space, keyed by the space and owned by the `occupancy` module ([conventions §9](../backend/conventions.md#occupancy-the-spaces-state-now)). A space without a row has no capacity and no override; `occupancy` creates the row on its first write.
- **SpaceManager** — a user's link to a space, with its role there, `OWNER` or `RECEPTION` ([ADR 0009](decisions/0009-space-scoped-reception-role.md)). The role alone decides what the user may do at the space; `can()` never reads the global role for it. A link is ended by deactivating it, never deleted, the owner's reception links and the admin's owner links alike, because payments and the audit log name its user; a deactivated link grants nothing, and linking the same person to the same space again reactivates that row (the pair is its key). Whether a space is verified is derived from its links (below).
- **SpaceHours** — one row per day of the week: a closed flag, or one opening range.
- **SpaceShift** — optional named shifts inside the opening range.
- **SpacePrice** — optional price rows by period, audience, shift and label.
- **SpaceOwnAmenity** — the space's own amenities, beyond the platform's list: short texts, Arabic required and English optional, in their order, an Arabic name once per space. Saved with the amenity links, as one fact group.
- **SpaceContact** — the typed contact list.
- **SpacePhoto** — the space's photos, at most 10, in their order, the first its cover. A row holds one random storage key; each size's file is derived from it, and its URL is built at read time from the key and the storage's configuration, never stored ([conventions §12](../backend/conventions.md#12-environments)).

### Operations
- **Customer** — everyone on file at one space: a subscriber, or a visitor who left a debt. A name and an optional phone, unique within the space among customers that are not archived; optionally a platform user (unused in v1). Archived, never deleted.
- **Package** — an owner-defined subscription template, private to the space's staff: a validity in days, the same optional limits and billing as a subscription, an audience, an optional shift and an active flag. The public packages are the published `SpacePrice` rows, never duplicated here.
- **Subscription** — any multi-day arrangement for a customer, from a package or custom («مخصّص», typed at the desk): a name, optional limits (start and end dates, total days, days per week, hours per day, total hours), fixed or usage-based billing (per hour or per day) with its price or rate copied in, an audience and an optional shift. It records who typed a desk price and who ended it early, and when. A renewal adds a row.
- **CheckIn** — a customer present on one of their subscriptions, opened and closed manually or closed automatically. Never deleted.
- **Visit** — a same-day stay, checked in by name, as a customer, or both, with an audience and an optional shift. Its hour and day rates are copied at check-in; at check-out it stores its charge: the rounding in force, whether the day-price cap applied, the amount, and who typed it when the desk had to. It gains a customer when it is left unpaid. Never deleted.
- **Payment** — money the desk received for exactly one visit or one subscription ([ADR 0010](decisions/0010-manual-payment-ledger.md)): an amount above zero, the method (cash or transfer), an optional note, who recorded it and when it was received, and the client's idempotency key. Never updated or deleted: a mistake is voided once, with who, when and a reason, and a voided payment counts nowhere.
- **Announcement** — a time-bound bilingual notice from the owner or reception, typed (general, outage, closure, offer, event). Soft-deleted.
- **ClosureExtension** — the owner extended the space's active subscriptions after a closure: the closure announcement (at most one extension each), the days, who applied it and when. **SubscriptionExtension** links it to each subscription it moved on; how many is the count of those links.
- **DataReport** — a user's report that one field group of a space is wrong (prices, hours, contact, location, amenities, other), with its resolution and an optional note to the reporter, written by whoever resolves it.
- **Favorite** — a user's saved space.
- **Setting** — a platform setting: the staleness thresholds `stalenessDays` (60) and `priceStalenessDays` (30); `newSpaceDefaults`, one object holding the values a new space's settings are copied from (auto check-out at closing on, the visit rounding rule up after 15 minutes, the cap at the day price on; [conventions §9](../backend/conventions.md#new-space-defaults)); and the platform's `contactEmail` and `contactWhatsapp`, which the seed writes outside the typed catalogue ([finding 40](findings/40-the-platforms-contact-settings-are-outside-the-typed-catalogue.md)).
- **AuditLog** — who did what to which entity, with before and after, optionally scoped to a space. The actor is null for system actions such as auto check-out. Never deleted.

## Derived values (computed, not stored)

- **Verified:** a space with at least one active `OWNER` link. A `RECEPTION` link never verifies a space.
- **Publicly listed:** a space is listed publicly (directory, search, map) and its page is public only when it is not deleted, not hidden, and both its area and its governorate are active. Otherwise the public gets "not found", while its owner and the admin still see it.
- **Live status** — public, a state and never a count ([ADR 0008](decisions/0008-live-status-not-counts.md)). Evaluated in this order, in Asia/Gaza time:
  1. an unverified space has **no live state**;
  2. **`CLOSED`** (مغلق الآن) while an active `CLOSURE` announcement covers now (not deleted, `startsAt ≤ now`, and `endsAt` after now or not set), or outside today's opening hours;
  3. while the space is open by its hours, a **manual override** in force gives its state: `AVAILABLE`, `FULL` or `CLOSED`, even when capacity is not set. The owner or reception sets it for 30 min, 1 h, 2 h or until today's closing time. A new override replaces the previous one, and staff can clear it early;
  4. **no live state** when the space has no opening hours at all, or is open but its capacity is not set;
  5. **`FULL`** (ممتلئ) when present ≥ capacity, where *present* is the open visits plus the open subscription check-ins;
  6. otherwise **`AVAILABLE`** (متاح).

  The directory's "available now" filter selects `AVAILABLE`. Capacity and the exact numbers (present / capacity) are shown only to the space's staff (owner and reception).
- **Auto check-out:** open visits and check-ins are closed at the space's closing time, or at 23:59 when the space has no opening hours, unless the owner turns closing-time check-out off in the space's settings; and earlier, after `maxStayMinutes`, when the owner sets it.
- **Stale:** a fact group whose `…UpdatedAt` is older than its threshold: `priceStalenessDays` (default 30) for prices, `stalenessDays` (default 60) for the others. Both are admin settings.
- **Missing:** a fact group never saved, its `…UpdatedAt` null. It is never stale; the admin's "stale or missing" filter keeps it, as it keeps a stale one.
- **Stale prices:**
  - on an **unverified** space, the amounts are hidden, "Price not up to date — contact the space" is shown, and the space is left out of the price filters (a price range and student prices);
  - on a **verified** space, the amounts are shown with a "may have changed" note, and the owner's overview reminds them to confirm.

### Front desk and money

The money rules are decided in [ADR 0010](decisions/0010-manual-payment-ledger.md); who may do what in [ADR 0009](decisions/0009-space-scoped-reception-role.md). Amounts are in agorot; days and times are Asia/Gaza.

- **Visit charge.** When a visit is checked in, its rates are copied from the space's prices: the hour and day prices of its audience (student when chosen and the space's settings allow student prices for visits, otherwise general) and, for a visit in a shift, that shift's prices. Each student price the space does not publish falls back to the general one, the hour and the day apart; the desk offers the student audience only where it changes a rate (the owner's design decision DI-41, 2026-10-19, #92). At check-out, the stay is rounded by the space's rounding rule and multiplied by the hour rate, capped at the day price unless the space's settings turn the cap off. The charge is stored on the visit. Fallbacks:
  - no hour price → the charge is the day price;
  - no day price → no cap;
  - neither → the desk types the amount, under the rule of [hand-typed prices](#front-desk-and-money), recorded as a desk-set price with who set it.
- **Hand-typed prices.** A price typed by hand at the desk — a custom subscription's price, or a visit's charge where the space has no rate — is typed by the owner always, and by reception only where the space's settings allow it (off by default). Every hand-typed price, by anyone, carries a required reason, recorded with who typed it (2026-10-19, #92).
- **A change to the space's settings applies from then on:** a visit's rates (and its audience's student prices) are copied at check-in, its rounding rule and the cap are read at its check-out, and the closing-time check-out and the stay limit apply at once, to the stays already open too (2026-10-19, #92).
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

The subscription model expresses each of these without special cases: `apps/api/src/db/subscriptions.api.test.ts` stores each one, and the demo seed holds all four.

1. **Exam student:** three weeks, billed by the hour; a statement of days and hours at any time. Expires when the three weeks end.
2. **A split week:** six days over two weeks, three per week, at a fixed price. Expires when the two weeks end or the sixth day is used, whichever comes first.
3. **Every other day:** a month, three days per week, at a fixed, agreed price. Expires when the month ends; the days per week only warn.
4. **An hours pack:** 20 hours at a fixed price, with no end date. Expires when the 20 hours are used; ending soon from 4 hours left.

## Constraints worth stating

The database enforces these; the `apps/api/src/db/*.api.test.ts` files prove each one (`schema` for spaces, prices and accounts, `front-desk`, `subscriptions`, `payments`).

- One open check-in per customer, and one open visit per customer (partial unique indexes on `customerId` where `checkedOutAt IS NULL`).
- Customer phone unique within a space among customers that are not archived (partial unique index); customers without a phone are not limited.
- A check-in's, a visit's, a subscription's and a package's customer, subscription, package and shift belong to the record's own space (composite foreign keys).
- An idempotency key is unique within its space (check-ins, visits, payments).
- One price per space, period, audience, shift and label, where a missing shift or label counts as one value (four unique indexes, three of them partial, because PostgreSQL treats NULLs as distinct).
- A price's shift belongs to the price's own space (a foreign key through `(shiftId, spaceId)`).
- `CHECK` constraints, written as raw SQL at the end of the init migration: phone numbers in E.164; an opening range and a shift inside the day, and a closed day without times; a check-in closes after it opens, and has a check-out method exactly when closed; end dates after start dates; location and amounts in range.
- A user has a password, a Google subject, or both (a `CHECK`); a Google subject belongs to one user.
- The partial indexes use Prisma's `partialIndexes` preview feature, so Prisma knows them and later migrations keep them. `CHECK` constraints are not compared by Prisma, so later migrations leave them alone; a change to one is a new raw-SQL migration.
- `CHECK` constraints of the later migrations: a customer's phone in E.164; a subscription's and a package's limits positive (at most 7 days a week and 24 hours a day), prices not negative, and an early end with both its time and who ended it; a visit has a name or a customer, closes after it opens, has a check-out method exactly when closed, has no charge while open, names who typed a charge only with a charge, keeps rounding minutes (1–59) exactly for the "up after N minutes" rule, and has no negative rate or charge; a pending temporary password has an expiry, and only a pending one.
- **The payment ledger**, by `CHECK` constraints and two triggers in the payments migration:
  - a payment settles exactly one item, a visit or a subscription of its own space, with an amount above zero;
  - it is never updated or deleted; its only change is one void that sets the time, who voided and a non-blank reason together and touches nothing else, and a voided payment never changes again;
  - the payments of a visit, or of a fixed-price subscription, that are not voided never add up to more than its charge or price, and a visit is paid only once its charge is set. A usage-based subscription has no ceiling, so paying ahead leaves it in credit. The item's row is locked while this is checked, so payments recorded at once are counted in turn, and a retried request reaches its unique key rather than the ceiling;
- **The space's settings and occupancy**: a space has at most one row of each (the space is the key of both). By `CHECK` constraints, in the settings the rounding minutes (1–59) are set exactly for the "up after N minutes" rule and a stay limit is positive; in the occupancy a capacity is positive, and an override has its state, its end and who set it, together. A closure extension is applied at most once per closure announcement (a unique key), by at least one day.
- Check-ins, visits, subscriptions, payments and audit-log entries are never deleted.

### Checked by the service

These rules span rows the database checks one at a time, so the services own them:
- every space has a settings row, created in the same transaction as the space, from the new-space defaults ([conventions §9](../backend/conventions.md#new-space-defaults));
- a visit left unpaid at a manual check-out has a customer (the payment and the check-out are separate writes; a visit closed by the auto check-out may have none: it is uncollected);
- a customer is present at most once across visits and check-ins (each table has its own index);
- a closure extension belongs to a `CLOSURE` announcement, and extends only that space's active subscriptions;
- a void by the owner: who may void is a permission, checked by `can()`.

The ledger's own rules (append-only, voided once, within the due) are the database's alone: the services do not repeat them, and a violation is translated into a domain error code ([ADR 0015](decisions/0015-idempotency-and-concurrency.md), [conventions §13](../backend/conventions.md#13-idempotency-and-concurrency)).
