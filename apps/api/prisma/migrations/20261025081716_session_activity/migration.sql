-- When a session was last used, for reception's idle end (docs/backend/security.md › Tokens and
-- cookies), 2026-10-25. A family alive now counts its idle time from this migration.
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "last_activity_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
