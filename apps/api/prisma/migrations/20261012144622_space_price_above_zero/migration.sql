-- No price is free: a free event is an announcement (docs/features/spaces.md › Decisions).
ALTER TABLE "space_prices" DROP CONSTRAINT "space_prices_amount_check";
ALTER TABLE "space_prices" ADD CONSTRAINT "space_prices_amount_check"
  CHECK ("amount_agorot" > 0);
