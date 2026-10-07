-- A fact group that can be empty is missing until it is first saved, never fresh while empty
-- (docs/architecture/data-model.md › Conventions, Freshness): its date becomes nullable, with no
-- default, so a new space leaves it null.

-- AlterTable
ALTER TABLE "spaces" ALTER COLUMN "hours_updated_at" DROP NOT NULL,
ALTER COLUMN "hours_updated_at" DROP DEFAULT,
ALTER COLUMN "prices_updated_at" DROP NOT NULL,
ALTER COLUMN "prices_updated_at" DROP DEFAULT,
ALTER COLUMN "amenities_updated_at" DROP NOT NULL,
ALTER COLUMN "amenities_updated_at" DROP DEFAULT,
ALTER COLUMN "contacts_updated_at" DROP NOT NULL,
ALTER COLUMN "contacts_updated_at" DROP DEFAULT;

-- An existing space's group with no rows was dated when the space was created, with nothing in
-- it: it becomes missing. A group with rows keeps its date. The shifts belong to the hours.
UPDATE "spaces" s SET "hours_updated_at" = NULL
WHERE NOT EXISTS (SELECT 1 FROM "space_hours" h WHERE h."space_id" = s."id")
  AND NOT EXISTS (SELECT 1 FROM "space_shifts" t WHERE t."space_id" = s."id");
UPDATE "spaces" s SET "prices_updated_at" = NULL
WHERE NOT EXISTS (SELECT 1 FROM "space_prices" p WHERE p."space_id" = s."id");
UPDATE "spaces" s SET "amenities_updated_at" = NULL
WHERE NOT EXISTS (SELECT 1 FROM "space_amenities" a WHERE a."space_id" = s."id");
UPDATE "spaces" s SET "contacts_updated_at" = NULL
WHERE NOT EXISTS (SELECT 1 FROM "space_contacts" c WHERE c."space_id" = s."id");
