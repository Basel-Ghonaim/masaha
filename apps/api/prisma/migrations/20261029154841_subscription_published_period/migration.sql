-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "published_period" "PricePeriod";

-- A subscription sold from a published price keeps its period, so the customers list can filter the weekly and
-- the monthly ones (foundation §13 #14): only a week or a month, never with a package.
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_published_period_check"
  CHECK ("published_period" IS NULL OR ("published_period" IN ('WEEK', 'MONTH') AND "package_id" IS NULL));
