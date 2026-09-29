-- Accounts for the scope change of 2026-09-29 (docs/backend/security.md › Sign-in methods): no
-- phone login, so no phone; a Google-only account has no password; Google links by its subject.

-- DropIndex
DROP INDEX "users_phone_key";

-- AlterTable (dropping the column also drops users_phone_e164_check)
ALTER TABLE "users" DROP COLUMN "phone",
ADD COLUMN     "google_subject" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────

-- Every account can sign in some way: a password, Google, or both.
ALTER TABLE "users" ADD CONSTRAINT "users_sign_in_method_check"
  CHECK ("password_hash" IS NOT NULL OR "google_subject" IS NOT NULL);
