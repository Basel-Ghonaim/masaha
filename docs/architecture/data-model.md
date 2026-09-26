# Data Model

> **Status:** Active · **Class:** Contract — conventions and rules to build against; no schema exists yet · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
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
- **Available seats:** `max(capacity − open check-ins, 0)`.
- **Membership status:** from `endsOn` — active, ending soon (≤ 7 days), expired.
- **Stale:** a fact group whose `...UpdatedAt` is older than the staleness setting (default 60 days).

## Constraints worth stating

- One open check-in per member per space (partial unique index on `memberId` where `checkedOutAt IS NULL`).
- Member phone unique within a space among non-deleted members (partial unique index).
- Check-ins and audit-log entries are never deleted.
