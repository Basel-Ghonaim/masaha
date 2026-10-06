-- A space's English name is required and its Arabic name optional: most spaces are known by an
-- English name (docs/architecture/data-model.md › Conventions). A space without an English name
-- takes one from its slug, which is Latin kebab-case ("focus-hub" → "Focus Hub").
UPDATE "spaces" SET "name_en" = initcap(replace("slug", '-', ' ')) WHERE "name_en" IS NULL;

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "landmark_ar" TEXT,
ADD COLUMN     "landmark_en" TEXT,
ALTER COLUMN "name_ar" DROP NOT NULL,
ALTER COLUMN "name_en" SET NOT NULL;
