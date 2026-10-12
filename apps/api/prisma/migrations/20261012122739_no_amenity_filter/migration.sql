/*
  Warnings:

  - You are about to drop the column `is_filterable` on the `amenities` table. No amenity is a
    filter any more (docs/features/lookups.md › Decisions): its values are not kept.

*/
-- AlterTable
ALTER TABLE "amenities" DROP COLUMN "is_filterable";
