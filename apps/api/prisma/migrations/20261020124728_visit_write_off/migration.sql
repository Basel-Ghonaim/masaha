-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "write_off_reason" TEXT,
ADD COLUMN     "written_off_at" TIMESTAMPTZ(3),
ADD COLUMN     "written_off_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_written_off_by_id_fkey" FOREIGN KEY ("written_off_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Raw SQL: a CHECK constraint and a trigger function, which the Prisma schema cannot express ──
-- Prisma compares neither, so later migrations leave them alone. src/db/front-desk.api.test.ts and
-- src/db/payments.api.test.ts prove them.

-- A write-off has its time, who and a non-blank reason together, and only a closed, priced visit
-- can be written off (data-model › Written-off visit).
ALTER TABLE "visits" ADD CONSTRAINT "visits_write_off_check"
  CHECK (
    ("written_off_at" IS NULL) = ("written_off_by_id" IS NULL)
    AND ("written_off_at" IS NULL) = ("write_off_reason" IS NULL)
    AND ("write_off_reason" IS NULL OR btrim("write_off_reason") <> '')
    AND ("written_off_at" IS NULL OR ("checked_out_at" IS NOT NULL AND "charge_agorot" IS NOT NULL))
  );

-- The ledger's fourth rule: a written-off visit takes no payment. The function is the
-- desk_visit_charge migration's, with only the visit's read and that refusal added.
CREATE OR REPLACE FUNCTION "payments_guard_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  due integer;
  paid bigint;
  written_off boolean;
BEGIN
  IF NEW."voided_at" IS NOT NULL THEN
    RAISE EXCEPTION 'payments_void_once: a payment is recorded first, then voided'
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_void_once';
  END IF;

  IF NEW."visit_id" IS NOT NULL THEN
    SELECT "charge_agorot", "written_off_at" IS NOT NULL INTO due, written_off
      FROM "visits" WHERE "id" = NEW."visit_id" FOR UPDATE;
    -- An unknown item is left to its foreign key.
    IF NOT FOUND THEN RETURN NEW; END IF;
    -- A written-off visit takes no payment until the owner undoes it (K6).
    IF written_off THEN
      RAISE EXCEPTION 'payments_visit_written_off: a written-off visit takes no payment'
        USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_visit_written_off';
    END IF;
    IF due IS NULL THEN
      RAISE EXCEPTION 'payments_visit_uncharged: a visit is paid once its charge is set'
        USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_visit_uncharged';
    END IF;
  ELSE
    SELECT CASE WHEN "billing" = 'FIXED' THEN "price_agorot" END INTO due
      FROM "subscriptions" WHERE "id" = NEW."subscription_id" FOR UPDATE;
    IF NOT FOUND OR due IS NULL THEN RETURN NEW; END IF;
  END IF;

  -- A retried request is left to its unique key, so the service can return the first payment.
  IF EXISTS (SELECT 1 FROM "payments"
             WHERE "space_id" = NEW."space_id" AND "request_id" = NEW."request_id") THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(sum("amount_agorot"), 0) INTO paid FROM "payments"
    WHERE "voided_at" IS NULL
      AND ("visit_id" = NEW."visit_id" OR "subscription_id" = NEW."subscription_id");
  IF paid + NEW."amount_agorot" > due THEN
    RAISE EXCEPTION 'payments_within_due: % agorot would exceed the % due (% paid)',
        NEW."amount_agorot", due, paid
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_within_due';
  END IF;
  RETURN NEW;
END;
$$;
