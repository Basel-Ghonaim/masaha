-- A temporary password expires 7 days after it is issued (docs/backend/security.md › Passwords).
-- One pending now has no known issue: it gets 7 days from this migration.
ALTER TABLE "users" ADD COLUMN "temporary_password_expires_at" TIMESTAMPTZ(3);
UPDATE "users" SET "temporary_password_expires_at" = now() + interval '7 days'
  WHERE "must_change_password";
-- A pending temporary password has an expiry, and only a pending one (S4).
ALTER TABLE "users" ADD CONSTRAINT "users_temporary_password_expiry_check"
  CHECK ("must_change_password" = ("temporary_password_expires_at" IS NOT NULL));
