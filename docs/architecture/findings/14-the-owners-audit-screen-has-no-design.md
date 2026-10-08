# 14. The owner's audit screen has no design

**Status:** Open · **Date:** 2026-09-30

**Evidence:** The owner's audit log is in v1 scope, but no screen for it was designed:
- The scope includes it: [overview.md](../../project/overview.md) lists "Audit log" in the owner and reception dashboard. `can()` has `space.auditLog.read` for the owner, and the planned API has `GET /manage/spaces/:spaceId/audit-log`.
- A reader exists for it: [conventions §6](../../backend/conventions.md#6-audit) gives the `audit` module a `manage` router.
- No design covers it:
  - [foundation §13](../../frontend/design-system/foundation.md#13-screens-to-design-32) lists owner screens 12–24, none of them an audit log. Screen 31, *Audit log*, is the admin's.
  - The [design archive](../../design/SCREENS.md) has only `Admin audit.html`.
  - The owner's navigation in the [design brief](../../design/prototype/BRIEF.md) has no audit entry.

**Resolves when:** the audit slice (step 11 of the build sequence in [v1-mvp.md](../../plans/v1-mvp.md#sequence-inside-the-build)) designs the owner's audit screen, with its place in the owner's navigation, and builds it.
