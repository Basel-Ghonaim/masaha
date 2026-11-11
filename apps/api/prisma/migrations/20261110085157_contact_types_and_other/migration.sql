-- AlterEnum: the contact networks the owner asked for, and «وسيلة أخرى» (M4).
ALTER TYPE "ContactType" ADD VALUE 'TELEGRAM';
ALTER TYPE "ContactType" ADD VALUE 'X';
ALTER TYPE "ContactType" ADD VALUE 'LINKEDIN';
ALTER TYPE "ContactType" ADD VALUE 'YOUTUBE';
ALTER TYPE "ContactType" ADD VALUE 'OTHER';

-- AlterTable: «وسيلة أخرى»'s own name; every existing row keeps NULL.
ALTER TABLE "space_contacts" ADD COLUMN "label" TEXT;

-- An «other» contact has its own name, never blank, and no other type has one
-- (docs/features/spaces.md › Decisions). The type is compared as text: a value added above
-- cannot be used as an enum literal in the same transaction.
ALTER TABLE "space_contacts" ADD CONSTRAINT "space_contacts_label_check"
  CHECK (("type"::text = 'OTHER') = ("label" IS NOT NULL)
         AND ("label" IS NULL OR btrim("label") <> ''));
