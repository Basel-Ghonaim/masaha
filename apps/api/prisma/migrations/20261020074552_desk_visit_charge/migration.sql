-- AlterTable
ALTER TABLE "visits" ADD COLUMN     "charge_reason" TEXT;

-- ─── Raw SQL: a CHECK constraint and a trigger function, which the Prisma schema cannot express ──
-- Prisma compares neither, so later migrations leave them alone. src/db/front-desk.api.test.ts and
-- src/db/payments.api.test.ts prove them.

-- A typed charge's reason comes with who typed it, and is never blank (data-model › Hand-typed prices).
ALTER TABLE "visits" ADD CONSTRAINT "visits_charge_reason_check"
  CHECK (
    ("charge_set_by_id" IS NULL) = ("charge_reason" IS NULL)
    AND ("charge_reason" IS NULL OR btrim("charge_reason") <> '')
  );

-- Finding 15: an uncharged visit gets a constraint name of its own, so it translates to its own code.
-- The function is the payments migration's, with only that RAISE changed.
CREATE OR REPLACE FUNCTION "payments_guard_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  due integer;
  paid bigint;
BEGIN
  IF NEW."voided_at" IS NOT NULL THEN
    RAISE EXCEPTION 'payments_void_once: a payment is recorded first, then voided'
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_void_once';
  END IF;

  IF NEW."visit_id" IS NOT NULL THEN
    SELECT "charge_agorot" INTO due FROM "visits" WHERE "id" = NEW."visit_id" FOR UPDATE;
    -- An unknown item is left to its foreign key.
    IF NOT FOUND THEN RETURN NEW; END IF;
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
