-- AlterTable
ALTER TABLE "closure_extensions" ADD COLUMN     "request_id" UUID;

-- Rows made before the key (tests, the dev data) get one of their own.
UPDATE "closure_extensions" SET "request_id" = gen_random_uuid() WHERE "request_id" IS NULL;
ALTER TABLE "closure_extensions" ALTER COLUMN "request_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "closure_extensions_request_id_key" ON "closure_extensions"("request_id");

-- Decision 6 (2026-10-21): once a closure's subscriptions were extended, it keeps its type and its start, is
-- never deleted, and its end only comes earlier (S3: a running closure must still be able to end). Its text
-- may change. The database owns the rule: `announcements` cannot read this table (conventions §7).
CREATE FUNCTION "announcements_guard_extended"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "closure_extensions" WHERE "announcement_id" = OLD."id") AND (
       NEW."type" <> OLD."type" OR NEW."starts_at" <> OLD."starts_at"
       OR NEW."deleted_at" IS DISTINCT FROM OLD."deleted_at"
       OR (NEW."ends_at" IS DISTINCT FROM OLD."ends_at"
           AND NOT (NEW."ends_at" IS NOT NULL AND (OLD."ends_at" IS NULL OR NEW."ends_at" < OLD."ends_at")))) THEN
    RAISE EXCEPTION 'announcements_closure_extended: closure % had its subscriptions extended', OLD."id"
      USING ERRCODE = 'check_violation', TABLE = 'announcements', CONSTRAINT = 'announcements_closure_extended';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "announcements_guard_extended"
  BEFORE UPDATE OF "type", "starts_at", "ends_at", "deleted_at" ON "announcements"
  FOR EACH ROW WHEN (OLD."type" = 'CLOSURE') EXECUTE FUNCTION "announcements_guard_extended"();
