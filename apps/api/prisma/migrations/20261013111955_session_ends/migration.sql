-- A session lives at most 30 days from its sign-in (docs/backend/security.md › Tokens and cookies).
-- A family that exists now has no known sign-in, its first token being gone after 7 days: it gets
-- 30 days from this migration. One statement, so every token of a family gets the same deadline.
ALTER TABLE "refresh_tokens" ADD COLUMN "session_ends_at" TIMESTAMPTZ(3);
UPDATE "refresh_tokens" SET "session_ends_at" = now() + interval '30 days';
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_ends_at" SET NOT NULL;

-- One more each time every session of the account ends; an access token signed under another
-- version is refused.
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
