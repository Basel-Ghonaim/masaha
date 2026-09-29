-- Reception staff at a space (ADR 0009): a second link role, and a deactivation that keeps the
-- link, because payments and the audit log name who did what.

-- AlterEnum
ALTER TYPE "SpaceManagerRole" ADD VALUE 'RECEPTION';

-- AlterTable
ALTER TABLE "space_managers" ADD COLUMN     "deactivated_at" TIMESTAMPTZ(3);

