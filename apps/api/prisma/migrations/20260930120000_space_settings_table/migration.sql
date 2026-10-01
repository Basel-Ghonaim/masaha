-- The space's settings leave "spaces" for a 1:1 table owned by the space-settings module
-- (docs/backend/conventions.md › space-settings). Prisma's generated drop-and-create would lose
-- them, so this is ordered by hand: create the table, copy the data, add the constraints, and only
-- then drop the old columns.

-- CreateTable
CREATE TABLE "space_settings" (
    "space_id" INTEGER NOT NULL,
    "auto_checkout_at_closing" BOOLEAN NOT NULL,
    "max_stay_minutes" INTEGER,
    "visit_rounding" "VisitRounding" NOT NULL,
    "visit_rounding_minutes" INTEGER,
    "visit_cap_at_day_price" BOOLEAN NOT NULL,
    "visit_student_prices" BOOLEAN NOT NULL DEFAULT true,
    "reminder_template" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_settings_pkey" PRIMARY KEY ("space_id")
);

-- ─── Data: every space has settings, a soft-deleted one included ─────────────────────────────
INSERT INTO "space_settings" (
    "space_id", "auto_checkout_at_closing", "max_stay_minutes", "visit_rounding",
    "visit_rounding_minutes", "visit_cap_at_day_price", "visit_student_prices",
    "reminder_template", "updated_at"
)
SELECT
    "id", "auto_checkout_at_closing", "max_stay_minutes", "visit_rounding",
    "visit_rounding_minutes", "visit_cap_at_day_price", "visit_student_prices",
    "reminder_template", CURRENT_TIMESTAMP
FROM "spaces";

-- AddForeignKey
ALTER TABLE "space_settings" ADD CONSTRAINT "space_settings_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────
-- They move with their columns, renamed for the new table. src/db/schema.api.test.ts proves each.

ALTER TABLE "space_settings" ADD CONSTRAINT "space_settings_max_stay_minutes_check"
  CHECK ("max_stay_minutes" IS NULL OR "max_stay_minutes" > 0);
-- The rounding's minutes belong to the "up after N minutes" rule, and only to it. The IS NOT NULL
-- is needed: a comparison with NULL is NULL, which a CHECK accepts.
ALTER TABLE "space_settings" ADD CONSTRAINT "space_settings_visit_rounding_check"
  CHECK (
    ("visit_rounding" = 'UP_AFTER_MINUTES' AND "visit_rounding_minutes" IS NOT NULL
     AND "visit_rounding_minutes" BETWEEN 1 AND 59)
    OR ("visit_rounding" <> 'UP_AFTER_MINUTES' AND "visit_rounding_minutes" IS NULL)
  );

-- ─── The old columns, and the constraints that named them ───────────────────────────────────
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_max_stay_minutes_check",
DROP CONSTRAINT "spaces_visit_rounding_check";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "auto_checkout_at_closing",
DROP COLUMN "max_stay_minutes",
DROP COLUMN "reminder_template",
DROP COLUMN "visit_cap_at_day_price",
DROP COLUMN "visit_rounding",
DROP COLUMN "visit_rounding_minutes",
DROP COLUMN "visit_student_prices";
