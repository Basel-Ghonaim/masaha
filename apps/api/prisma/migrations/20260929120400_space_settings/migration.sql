-- The space's settings and manual live-status override, the closure extension of subscriptions,
-- a data report's resolution note, and the amenities the directory filter offers.

-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('AVAILABLE', 'FULL', 'CLOSED');

-- AlterTable
ALTER TABLE "amenities" ADD COLUMN     "is_filterable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "data_reports" ADD COLUMN     "resolution_note" TEXT;

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "auto_checkout_at_closing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminder_template" TEXT,
ADD COLUMN     "state_override" "LiveStatus",
ADD COLUMN     "state_override_by_id" INTEGER,
ADD COLUMN     "state_override_until" TIMESTAMPTZ(3),
ADD COLUMN     "visit_cap_at_day_price" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visit_rounding" "VisitRounding" NOT NULL DEFAULT 'UP_AFTER_MINUTES',
ADD COLUMN     "visit_rounding_minutes" INTEGER DEFAULT 15,
ADD COLUMN     "visit_student_prices" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "closure_extensions" (
    "id" SERIAL NOT NULL,
    "announcement_id" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "applied_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "closure_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_extensions" (
    "closure_extension_id" INTEGER NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_extensions_pkey" PRIMARY KEY ("closure_extension_id","subscription_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "closure_extensions_announcement_id_key" ON "closure_extensions"("announcement_id");

-- CreateIndex
CREATE INDEX "subscription_extensions_subscription_id_idx" ON "subscription_extensions"("subscription_id");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_state_override_by_id_fkey" FOREIGN KEY ("state_override_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_extensions" ADD CONSTRAINT "closure_extensions_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closure_extensions" ADD CONSTRAINT "closure_extensions_applied_by_id_fkey" FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_extensions" ADD CONSTRAINT "subscription_extensions_closure_extension_id_fkey" FOREIGN KEY ("closure_extension_id") REFERENCES "closure_extensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_extensions" ADD CONSTRAINT "subscription_extensions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─── Data: the amenities nearly every space has tell no space apart ─────────────────────────
-- New databases get the same flags from the seed (src/db/seed/lookups.ts).
UPDATE "amenities" SET "is_filterable" = false WHERE "key" IN ('internet', 'stable_power');

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────
-- src/db/schema.api.test.ts proves each one.

-- An override has its state, its end and who set it, all together.
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_state_override_check"
  CHECK (num_nonnulls("state_override", "state_override_until", "state_override_by_id") IN (0, 3));
-- The rounding's minutes belong to the "up after N minutes" rule, and only to it. The IS NOT NULL
-- is needed: a comparison with NULL is NULL, which a CHECK accepts.
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_visit_rounding_check"
  CHECK (
    ("visit_rounding" = 'UP_AFTER_MINUTES' AND "visit_rounding_minutes" IS NOT NULL
     AND "visit_rounding_minutes" BETWEEN 1 AND 59)
    OR ("visit_rounding" <> 'UP_AFTER_MINUTES' AND "visit_rounding_minutes" IS NULL)
  );

ALTER TABLE "closure_extensions" ADD CONSTRAINT "closure_extensions_days_check"
  CHECK ("days" > 0);
