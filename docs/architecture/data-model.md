# Data Model

> **Status:** Active · **Class:** Contract — conventions and rules to build against; no schema exists yet · **Last Updated:** 2026-09-28 · **Owner:** Basel Ghoneim
> **Authority:** Entities, relations and data conventions. The Prisma schema becomes the source of truth once it exists.

## Conventions

- **IDs:** `Int @id @default(autoincrement())`. Public space URLs use a unique `slug`.
- **Naming:** models PascalCase, fields camelCase, mapped to snake_case tables and columns with `@map` / `@@map`.
- **Timestamps:** `createdAt`, `updatedAt` on every table.
- **Soft delete:** `deletedAt` on `Space`, `Member`, `Announcement`; `suspendedAt` on `User` ([ADR 0007](decisions/0007-soft-delete.md)).
- **Money-ready prices:** amounts as integers in agorot plus a `currency` field (`ILS`); display only in v1.
- **Bilingual content:** paired fields `nameAr` / `nameEn`, `descriptionAr` / `descriptionEn`, `addressAr` / `addressEn`. Arabic required, English optional.
- **Freshness:** each fact group carries its own `...UpdatedAt` for the "last updated" and stale labels.
- **Indexes only for queries that run.** Foreign keys used in lists are indexed.
- **Unique violations** (Prisma `P2002`) become `409 CONFLICT`.

## Entities

**Deferred.** Written in the technical-design phase together with the Prisma schema, which then owns every field. Until then the planned entities live in [plans/v1-mvp.md](../plans/v1-mvp.md#planned-data-model).

## Derived values (computed, not stored)

- **Verified:** a space with at least one `SpaceManager` row.
- **Live status** — public, a state and never a count ([ADR 0008](decisions/0008-live-status-not-counts.md)). Evaluated in this order, in Asia/Gaza time:
  1. an unverified space has **no live state**;
  2. **`CLOSED`** (مغلق الآن) while an active `CLOSURE` announcement covers now (not deleted, `startsAt ≤ now`, and `endsAt` after now or not set), or outside today's opening hours;
  3. **no live state** when the space has no opening hours at all, or is open but its capacity is not set;
  4. **`FULL`** (ممتلئ) when open check-ins ≥ capacity;
  5. otherwise **`AVAILABLE`** (متاح).

  The directory's "available now" filter selects `AVAILABLE`. Capacity and the exact numbers (present / capacity) are shown only to the space's owner.
- **Auto check-out:** open check-ins are closed at the space's closing time, or at 23:59 when the space has no opening hours.
- **Membership status:** from `endsOn` — active, ending soon (≤ 7 days), expired.
- **Stale:** a fact group whose `...UpdatedAt` is older than the staleness setting (default 60 days).

## Constraints worth stating

- One open check-in per member per space (partial unique index on `memberId` where `checkedOutAt IS NULL`).
- Member phone unique within a space among non-deleted members (partial unique index).
- Check-ins and audit-log entries are never deleted.
