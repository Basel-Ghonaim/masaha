-- The front desk of the scope change of 2026-09-29 (docs/architecture/data-model.md): members
-- become customers and memberships become subscriptions (renamed in place, so rows, sequences and
-- history are kept), check-ins become subscription attendance only, and daily visitors move to
-- visits. Packages are new. No environment holds check-ins or memberships yet (no endpoint has
-- written any), and the new required columns would stop this migration if one did.

-- CreateEnum
CREATE TYPE "SubscriptionBilling" AS ENUM ('FIXED', 'PER_HOUR', 'PER_DAY');

-- CreateEnum
CREATE TYPE "VisitRounding" AS ENUM ('UP_AFTER_MINUTES', 'NEAREST_HALF_HOUR', 'PER_MINUTE');

-- ─── members → customers ─────────────────────────────────────────────────────────────────────

ALTER TABLE "members" RENAME TO "customers";
ALTER SEQUENCE "members_id_seq" RENAME TO "customers_id_seq";
ALTER TABLE "customers" RENAME CONSTRAINT "members_pkey" TO "customers_pkey";
ALTER TABLE "customers" RENAME CONSTRAINT "members_space_id_fkey" TO "customers_space_id_fkey";
ALTER TABLE "customers" RENAME CONSTRAINT "members_user_id_fkey" TO "customers_user_id_fkey";
-- The partial index follows the column rename: it now ignores archived customers.
ALTER TABLE "customers" RENAME COLUMN "deleted_at" TO "archived_at";
ALTER INDEX "members_space_id_phone_key" RENAME TO "customers_space_id_phone_key";
-- A customer's phone is optional.
ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "customers" DROP CONSTRAINT "members_phone_e164_check";

-- CreateIndex
CREATE UNIQUE INDEX "customers_id_space_id_key" ON "customers"("id", "space_id");

-- ─── memberships → subscriptions ─────────────────────────────────────────────────────────────

ALTER TABLE "memberships" RENAME TO "subscriptions";
ALTER SEQUENCE "memberships_id_seq" RENAME TO "subscriptions_id_seq";
ALTER TABLE "subscriptions" RENAME CONSTRAINT "memberships_pkey" TO "subscriptions_pkey";
-- Replaced by foreign keys through space_id.
ALTER TABLE "subscriptions" DROP CONSTRAINT "memberships_member_id_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT "memberships_shift_id_fkey";
ALTER TABLE "subscriptions" DROP CONSTRAINT "memberships_dates_check";
ALTER TABLE "subscriptions" RENAME COLUMN "member_id" TO "customer_id";
ALTER INDEX "memberships_member_id_ends_on_idx" RENAME TO "subscriptions_customer_id_ends_on_idx";
-- Daily visitors are visits now, and a subscription's terms are its limits and billing.
ALTER TABLE "subscriptions" DROP COLUMN "type",
ADD COLUMN     "space_id" INTEGER NOT NULL,
ADD COLUMN     "package_id" INTEGER,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "total_days" INTEGER,
ADD COLUMN     "days_per_week" INTEGER,
ADD COLUMN     "hours_per_day" INTEGER,
ADD COLUMN     "total_hours" INTEGER,
ADD COLUMN     "billing" "SubscriptionBilling" NOT NULL,
ADD COLUMN     "price_agorot" INTEGER NOT NULL,
ADD COLUMN     "audience" "PriceAudience" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "price_set_by_id" INTEGER,
ADD COLUMN     "ended_at" TIMESTAMPTZ(3),
ADD COLUMN     "ended_by_id" INTEGER,
ALTER COLUMN "starts_on" DROP NOT NULL,
ALTER COLUMN "ends_on" DROP NOT NULL;

-- DropEnum
DROP TYPE "MembershipType";

-- ─── check_ins: subscription attendance only ─────────────────────────────────────────────────

-- DropForeignKey
ALTER TABLE "check_ins" DROP CONSTRAINT "check_ins_member_id_fkey";

-- DropIndex
DROP INDEX "check_ins_member_id_key";

-- AlterTable
ALTER TABLE "check_ins" DROP CONSTRAINT "check_ins_member_or_visitor_check";
ALTER TABLE "check_ins" DROP COLUMN "member_id",
DROP COLUMN "visitor_name",
ADD COLUMN     "customer_id" INTEGER NOT NULL,
ADD COLUMN     "request_id" UUID NOT NULL,
ADD COLUMN     "subscription_id" INTEGER NOT NULL;

-- ─── New tables ──────────────────────────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "validity_days" INTEGER NOT NULL,
    "total_days" INTEGER,
    "days_per_week" INTEGER,
    "hours_per_day" INTEGER,
    "total_hours" INTEGER,
    "billing" "SubscriptionBilling" NOT NULL,
    "price_agorot" INTEGER NOT NULL,
    "audience" "PriceAudience" NOT NULL DEFAULT 'GENERAL',
    "shift_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "request_id" UUID NOT NULL,
    "visitor_name" TEXT,
    "customer_id" INTEGER,
    "audience" "PriceAudience" NOT NULL DEFAULT 'GENERAL',
    "shift_id" INTEGER,
    "hour_rate_agorot" INTEGER,
    "day_rate_agorot" INTEGER,
    "checked_in_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMPTZ(3),
    "method" "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "checkout_method" "CheckOutMethod",
    "rounding_rule" "VisitRounding",
    "rounding_minutes" INTEGER,
    "cap_applied" BOOLEAN,
    "charge_agorot" INTEGER,
    "charge_set_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packages_space_id_name_key" ON "packages"("space_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "packages_id_space_id_key" ON "packages"("id", "space_id");

-- CreateIndex
CREATE INDEX "subscriptions_space_id_ends_on_idx" ON "subscriptions"("space_id", "ends_on");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_id_customer_id_key" ON "subscriptions"("id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_id_space_id_key" ON "subscriptions"("id", "space_id");

-- CreateIndex
CREATE INDEX "visits_space_id_checked_out_at_idx" ON "visits"("space_id", "checked_out_at");

-- CreateIndex
CREATE INDEX "visits_space_id_checked_in_at_idx" ON "visits"("space_id", "checked_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "visits_space_id_request_id_key" ON "visits"("space_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "visits_customer_id_key" ON "visits"("customer_id") WHERE ("checked_out_at" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "visits_id_space_id_key" ON "visits"("id", "space_id");

-- CreateIndex
CREATE INDEX "check_ins_subscription_id_checked_in_at_idx" ON "check_ins"("subscription_id", "checked_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_space_id_request_id_key" ON "check_ins"("space_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_customer_id_key" ON "check_ins"("customer_id") WHERE ("checked_out_at" IS NULL);

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_shift_id_space_id_fkey" FOREIGN KEY ("shift_id", "space_id") REFERENCES "space_shifts"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_space_id_fkey" FOREIGN KEY ("customer_id", "space_id") REFERENCES "customers"("id", "space_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_space_id_fkey" FOREIGN KEY ("package_id", "space_id") REFERENCES "packages"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shift_id_space_id_fkey" FOREIGN KEY ("shift_id", "space_id") REFERENCES "space_shifts"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_set_by_id_fkey" FOREIGN KEY ("price_set_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_customer_id_space_id_fkey" FOREIGN KEY ("customer_id", "space_id") REFERENCES "customers"("id", "space_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_subscription_id_customer_id_fkey" FOREIGN KEY ("subscription_id", "customer_id") REFERENCES "subscriptions"("id", "customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_customer_id_space_id_fkey" FOREIGN KEY ("customer_id", "space_id") REFERENCES "customers"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_shift_id_space_id_fkey" FOREIGN KEY ("shift_id", "space_id") REFERENCES "space_shifts"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_charge_set_by_id_fkey" FOREIGN KEY ("charge_set_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────
-- src/db/front-desk.api.test.ts and src/db/subscriptions.api.test.ts prove each one.

ALTER TABLE "customers" ADD CONSTRAINT "customers_phone_e164_check"
  CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');

-- A package's and a subscription's limits are all optional; when set, they are positive, and a
-- week has at most seven days and a day at most 24 hours.
ALTER TABLE "packages" ADD CONSTRAINT "packages_validity_days_check"
  CHECK ("validity_days" > 0);
ALTER TABLE "packages" ADD CONSTRAINT "packages_limits_check"
  CHECK (
    ("total_days" IS NULL OR "total_days" > 0)
    AND ("days_per_week" IS NULL OR "days_per_week" BETWEEN 1 AND 7)
    AND ("hours_per_day" IS NULL OR "hours_per_day" BETWEEN 1 AND 24)
    AND ("total_hours" IS NULL OR "total_hours" > 0)
  );
ALTER TABLE "packages" ADD CONSTRAINT "packages_price_check"
  CHECK ("price_agorot" >= 0);

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_dates_check"
  CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "ends_on" >= "starts_on");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_limits_check"
  CHECK (
    ("total_days" IS NULL OR "total_days" > 0)
    AND ("days_per_week" IS NULL OR "days_per_week" BETWEEN 1 AND 7)
    AND ("hours_per_day" IS NULL OR "hours_per_day" BETWEEN 1 AND 24)
    AND ("total_hours" IS NULL OR "total_hours" > 0)
  );
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_check"
  CHECK ("price_agorot" >= 0);
-- Ended early: when and by whom, together.
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_ended_check"
  CHECK (("ended_at" IS NULL) = ("ended_by_id" IS NULL));

-- A visit has a name, a customer or both; it closes after it opens, and has a check-out method
-- exactly when it is closed.
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_or_customer_check"
  CHECK (num_nonnulls("visitor_name", "customer_id") >= 1);
ALTER TABLE "visits" ADD CONSTRAINT "visits_checked_out_at_check"
  CHECK ("checked_out_at" IS NULL OR "checked_out_at" >= "checked_in_at");
ALTER TABLE "visits" ADD CONSTRAINT "visits_checkout_method_check"
  CHECK (("checked_out_at" IS NULL) = ("checkout_method" IS NULL));
-- The charge is set at check-out, never on an open visit; a desk-typed charge names who set it.
ALTER TABLE "visits" ADD CONSTRAINT "visits_charge_check"
  CHECK (
    "checked_out_at" IS NOT NULL
    OR num_nonnulls("rounding_rule", "rounding_minutes", "cap_applied", "charge_agorot",
                    "charge_set_by_id") = 0
  );
ALTER TABLE "visits" ADD CONSTRAINT "visits_charge_set_by_check"
  CHECK ("charge_set_by_id" IS NULL OR "charge_agorot" IS NOT NULL);
-- The rounding's minutes belong to the "up after N minutes" rule, and only to it. The IS NOT NULL
-- is needed: a comparison with NULL is NULL, which a CHECK accepts.
ALTER TABLE "visits" ADD CONSTRAINT "visits_rounding_check"
  CHECK (
    ("rounding_rule" = 'UP_AFTER_MINUTES' AND "rounding_minutes" IS NOT NULL
     AND "rounding_minutes" BETWEEN 1 AND 59)
    OR ("rounding_rule" IS DISTINCT FROM 'UP_AFTER_MINUTES' AND "rounding_minutes" IS NULL)
  );
ALTER TABLE "visits" ADD CONSTRAINT "visits_amounts_check"
  CHECK (
    ("hour_rate_agorot" IS NULL OR "hour_rate_agorot" >= 0)
    AND ("day_rate_agorot" IS NULL OR "day_rate_agorot" >= 0)
    AND ("charge_agorot" IS NULL OR "charge_agorot" >= 0)
  );
