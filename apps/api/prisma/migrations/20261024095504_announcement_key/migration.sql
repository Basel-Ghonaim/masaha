-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "request_id" UUID;

-- Rows made before the key (tests, the dev data) get one of their own.
UPDATE "announcements" SET "request_id" = gen_random_uuid() WHERE "request_id" IS NULL;
ALTER TABLE "announcements" ALTER COLUMN "request_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "announcements_space_id_request_id_key" ON "announcements"("space_id", "request_id");
