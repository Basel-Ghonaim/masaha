-- The payment ledger of ADR 0010: one payment settles one visit or one subscription, and is never
-- updated or deleted, only voided once.

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER');

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "request_id" UUID NOT NULL,
    "visit_id" INTEGER,
    "subscription_id" INTEGER,
    "amount_agorot" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "note" TEXT,
    "recorded_by_id" INTEGER NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_at" TIMESTAMPTZ(3),
    "voided_by_id" INTEGER,
    "void_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_space_id_received_at_idx" ON "payments"("space_id", "received_at");

-- CreateIndex
CREATE INDEX "payments_visit_id_idx" ON "payments"("visit_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_space_id_request_id_key" ON "payments"("space_id", "request_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_visit_id_space_id_fkey" FOREIGN KEY ("visit_id", "space_id") REFERENCES "visits"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_space_id_fkey" FOREIGN KEY ("subscription_id", "space_id") REFERENCES "subscriptions"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─── Raw SQL: CHECK constraints and triggers, which the Prisma schema cannot express ────────
-- Prisma compares neither, so later migrations leave them alone. src/db/payments.api.test.ts
-- proves each one. The services check the same rules first, to answer with a domain error; these
-- are the backstop, so no code path can break the ledger.

-- A payment settles exactly one item, with a positive amount.
ALTER TABLE "payments" ADD CONSTRAINT "payments_one_item_check"
  CHECK (num_nonnulls("visit_id", "subscription_id") = 1);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check"
  CHECK ("amount_agorot" > 0);
-- A void has its time, who voided and a reason, all together; the reason is not blank.
ALTER TABLE "payments" ADD CONSTRAINT "payments_void_check"
  CHECK (
    num_nonnulls("voided_at", "voided_by_id", "void_reason") IN (0, 3)
    AND ("void_reason" IS NULL OR btrim("void_reason") <> '')
  );

-- Append-only: a payment is never deleted, and the only change it ever takes is its one void,
-- which touches nothing but the void's own columns.
CREATE FUNCTION "payments_guard_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'payments_append_only: a payment is never deleted; void it instead'
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_append_only';
  END IF;
  IF OLD."voided_at" IS NOT NULL THEN
    RAISE EXCEPTION 'payments_void_once: a voided payment never changes again'
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_void_once';
  END IF;
  IF NEW."voided_at" IS NULL
     OR (NEW."id", NEW."space_id", NEW."request_id", NEW."visit_id", NEW."subscription_id",
         NEW."amount_agorot", NEW."method", NEW."note", NEW."recorded_by_id", NEW."received_at",
         NEW."created_at")
        IS DISTINCT FROM
        (OLD."id", OLD."space_id", OLD."request_id", OLD."visit_id", OLD."subscription_id",
         OLD."amount_agorot", OLD."method", OLD."note", OLD."recorded_by_id", OLD."received_at",
         OLD."created_at") THEN
    RAISE EXCEPTION 'payments_append_only: a payment is never updated; only voided'
      USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_append_only';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "payments_guard_change"
  BEFORE UPDATE OR DELETE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION "payments_guard_change"();

-- Within the due: the payments of a visit, or of a fixed-price subscription, that are not voided
-- never add up to more than it costs. A usage-based subscription has no ceiling, because its due
-- grows with attendance: paying ahead leaves it in credit. The item's row is locked first, so two
-- payments recorded at once are counted one after the other.
CREATE FUNCTION "payments_guard_insert"() RETURNS trigger LANGUAGE plpgsql AS $$
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
      RAISE EXCEPTION 'payments_within_due: a visit is paid once its charge is set'
        USING ERRCODE = 'check_violation', TABLE = 'payments', CONSTRAINT = 'payments_within_due';
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

CREATE TRIGGER "payments_guard_insert"
  BEFORE INSERT ON "payments"
  FOR EACH ROW EXECUTE FUNCTION "payments_guard_insert"();
