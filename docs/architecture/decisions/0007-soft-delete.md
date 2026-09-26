# ADR 0007 — Soft delete for operational records

> **Status:** Accepted · **Date:** 2026-09-26

## Context
Quick Tweets deletes rows and cascades. Masaha's occupancy reports and audit log depend on history: a deleted member would erase past check-ins and distort reports.

## Decision
- **Soft delete** (`deletedAt`) for `Space`, `Member` and `Announcement`. Hidden from all normal queries; kept for reports and the audit log.
- **Users are suspended** (`suspendedAt`), not deleted.
- **Check-ins and audit-log entries are never deleted.**
- **Hard delete with cascade** remains for purely dependent rows with no history value: favourites, sessions (refresh tokens), photos of a deleted space.
- Repositories apply the `deletedAt IS NULL` filter by default.

## Alternatives
- **Hard delete everywhere** (Quick Tweets' model) — rejected: loses history the reports need.
- **Archive tables** — rejected: more machinery than v1 needs.

## Consequences
- Unique constraints that must ignore deleted rows (for example, a member's phone within a space) use partial unique indexes.
- A deliberate divergence from Quick Tweets' model, recorded here.
