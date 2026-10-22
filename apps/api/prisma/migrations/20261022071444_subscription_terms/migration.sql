-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "price_reason" TEXT,
ADD COLUMN     "renewal_of_id" INTEGER,
ADD COLUMN     "request_id" UUID;

-- Existing rows (the demo seed's) get a key of their own before the column is required.
UPDATE "subscriptions" SET "request_id" = gen_random_uuid() WHERE "request_id" IS NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "request_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_space_id_request_id_key" ON "subscriptions"("space_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_renewal_of_id_customer_id_key" ON "subscriptions"("renewal_of_id", "customer_id");

-- CreateIndex
CREATE INDEX "visits_customer_id_closed_idx" ON "visits"("customer_id") WHERE ("customer_id" IS NOT NULL AND "checked_out_at" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_renewal_of_id_customer_id_fkey" FOREIGN KEY ("renewal_of_id", "customer_id") REFERENCES "subscriptions"("id", "customer_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- ─── Raw SQL: CHECK constraints and a trigger, which the Prisma schema cannot express ──────────────
-- Prisma compares neither, so later migrations leave them alone. src/db/subscriptions.api.test.ts and
-- src/db/payments.api.test.ts prove them.

-- A typed price's reason comes with who typed it, and is never blank (data model › Hand-typed prices).
-- The demo seed's typed prices predate reasons; production holds no subscription yet.
UPDATE "subscriptions" SET "price_reason" = 'Typed before reasons were recorded'
  WHERE "price_set_by_id" IS NOT NULL AND "price_reason" IS NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_reason_check" CHECK (
  ("price_set_by_id" IS NULL) = ("price_reason" IS NULL)
  AND ("price_reason" IS NULL OR btrim("price_reason") <> ''));

-- Finding 80: no package and no subscription is free.
ALTER TABLE "packages" DROP CONSTRAINT "packages_price_check";
ALTER TABLE "packages" ADD CONSTRAINT "packages_price_check" CHECK ("price_agorot" > 0);
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_price_check";
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_check" CHECK ("price_agorot" > 0);

-- The ledger (ADR 0010 rule 4): a fixed price never falls below what was paid on it; only a usage-based
-- subscription holds credit. The payments' insert trigger guards a payment; this guards the price.
CREATE FUNCTION "subscriptions_guard_price"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paid bigint;
BEGIN
  IF NEW."billing" = 'FIXED' THEN
    SELECT COALESCE(sum("amount_agorot"), 0) INTO paid FROM "payments"
      WHERE "subscription_id" = NEW."id" AND "voided_at" IS NULL;
    IF paid > NEW."price_agorot" THEN
      RAISE EXCEPTION 'subscriptions_price_below_paid: % agorot paid exceeds the price %', paid, NEW."price_agorot"
        USING ERRCODE = 'check_violation', TABLE = 'subscriptions', CONSTRAINT = 'subscriptions_price_below_paid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "subscriptions_guard_price" BEFORE UPDATE OF "billing", "price_agorot" ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION "subscriptions_guard_price"();
