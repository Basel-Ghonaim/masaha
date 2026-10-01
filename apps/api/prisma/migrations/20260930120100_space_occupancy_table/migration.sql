-- Capacity and the manual live-status override leave "spaces" for a 1:1 table owned by the
-- occupancy module (docs/backend/conventions.md › occupancy). A space without a row has no capacity
-- and no override. Prisma's generated drop-and-create would lose them, so this is ordered by hand:
-- create the table, copy the data, add the constraints, and only then drop the old columns.

-- CreateTable
CREATE TABLE "space_occupancy" (
    "space_id" INTEGER NOT NULL,
    "capacity" INTEGER,
    "state_override" "LiveStatus",
    "state_override_until" TIMESTAMPTZ(3),
    "state_override_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_occupancy_pkey" PRIMARY KEY ("space_id")
);

-- ─── Data: a row only where a capacity or an override exists ───────────────────────────────
-- An override's three columns are set together (spaces_state_override_check), so its state
-- stands for all three.
INSERT INTO "space_occupancy" (
    "space_id", "capacity", "state_override", "state_override_until", "state_override_by_id",
    "updated_at"
)
SELECT
    "id", "capacity", "state_override", "state_override_until", "state_override_by_id",
    CURRENT_TIMESTAMP
FROM "spaces"
WHERE num_nonnulls("capacity", "state_override") > 0;

-- AddForeignKey
ALTER TABLE "space_occupancy" ADD CONSTRAINT "space_occupancy_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_occupancy" ADD CONSTRAINT "space_occupancy_state_override_by_id_fkey" FOREIGN KEY ("state_override_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────
-- They move with their columns, renamed for the new table. src/db/schema.api.test.ts proves each.

ALTER TABLE "space_occupancy" ADD CONSTRAINT "space_occupancy_capacity_check"
  CHECK ("capacity" IS NULL OR "capacity" > 0);
-- An override has its state, its end and who set it, all together.
ALTER TABLE "space_occupancy" ADD CONSTRAINT "space_occupancy_state_override_check"
  CHECK (num_nonnulls("state_override", "state_override_until", "state_override_by_id") IN (0, 3));

-- ─── The old columns, and the constraints that named them ───────────────────────────────────
-- DropForeignKey
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_state_override_by_id_fkey";

ALTER TABLE "spaces" DROP CONSTRAINT "spaces_capacity_check",
DROP CONSTRAINT "spaces_state_override_check";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "capacity",
DROP COLUMN "state_override",
DROP COLUMN "state_override_by_id",
DROP COLUMN "state_override_until";
