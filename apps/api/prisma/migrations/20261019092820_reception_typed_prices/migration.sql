-- Whether reception may type a price by hand at the desk (a custom subscription's price, a visit's
-- charge): off for every space, the existing ones included (docs/architecture/data-model.md).
ALTER TABLE "space_settings" ADD COLUMN "reception_may_type_prices" BOOLEAN NOT NULL DEFAULT false;
