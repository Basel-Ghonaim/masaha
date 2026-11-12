-- AlterTable: the owner declares that the space works in the evening; its hours say until when
-- (2026-11-12).
ALTER TABLE "spaces" ADD COLUMN "works_evenings" BOOLEAN NOT NULL DEFAULT false;

-- Once, on the day the directory's «مفتوحة مساءً» moves to the owner's switch (2026-11-12): every space
-- whose week already closes at 20:00 or later on an open day keeps the filter; an owner turns it off.
UPDATE "spaces" SET "works_evenings" = true
WHERE EXISTS (
  SELECT 1 FROM "space_hours" h
  WHERE h."space_id" = "spaces"."id" AND NOT h."is_closed" AND h."closes_minute" >= 1200);

-- The women's hall, a catalogue amenity by its fixed key, last in the order (2026-11-12). A catalogue
-- not yet seeded gets it from the seed, after its eight, so it never ties with the first; a key already
-- held is left as it is.
INSERT INTO "amenities" ("key", "name_ar", "name_en", "icon", "sort_order", "is_active", "updated_at")
SELECT 'womens_hall', 'قاعة للنساء', 'Women''s hall', 'venus', COALESCE(MAX("sort_order"), 0) + 1, true,
  CURRENT_TIMESTAMP
FROM "amenities" HAVING count(*) > 0
ON CONFLICT ("key") DO NOTHING;
