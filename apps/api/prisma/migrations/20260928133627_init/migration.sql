-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "SpaceManagerRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ILS');

-- CreateEnum
CREATE TYPE "PricePeriod" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "PriceAudience" AS ENUM ('GENERAL', 'STUDENT');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('WHATSAPP', 'PHONE', 'EMAIL', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WEBSITE');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'SEASONAL');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('MANUAL');

-- CreateEnum
CREATE TYPE "CheckOutMethod" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'OUTAGE', 'CLOSURE', 'OFFER', 'EVENT');

-- CreateEnum
CREATE TYPE "DataReportField" AS ENUM ('PRICES', 'HOURS', 'CONTACT', 'LOCATION', 'AMENITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "DataReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "language" "Language" NOT NULL DEFAULT 'ar',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "suspended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "rotated_at" TIMESTAMPTZ(3),
    "replaced_by_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governorates" (
    "id" SERIAL NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "governorate_id" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "description_ar" TEXT,
    "description_en" TEXT,
    "address_ar" TEXT NOT NULL,
    "address_en" TEXT,
    "area_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER,
    "max_stay_minutes" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "profile_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hours_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prices_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amenities_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacts_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_managers" (
    "space_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "SpaceManagerRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_managers_pkey" PRIMARY KEY ("space_id","user_id")
);

-- CreateTable
CREATE TABLE "space_amenities" (
    "space_id" INTEGER NOT NULL,
    "amenity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_amenities_pkey" PRIMARY KEY ("space_id","amenity_id")
);

-- CreateTable
CREATE TABLE "space_hours" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "opens_minute" INTEGER,
    "closes_minute" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_shifts" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "starts_minute" INTEGER NOT NULL,
    "ends_minute" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_prices" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "period" "PricePeriod" NOT NULL,
    "audience" "PriceAudience" NOT NULL DEFAULT 'GENERAL',
    "shift_id" INTEGER,
    "label_ar" TEXT,
    "label_en" TEXT,
    "amount_agorot" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ILS',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_contacts" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_photos" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "user_id" INTEGER,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "type" "MembershipType" NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "shift_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "member_id" INTEGER,
    "visitor_name" TEXT,
    "checked_in_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMPTZ(3),
    "method" "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "checkout_method" "CheckOutMethod",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "text_ar" TEXT NOT NULL,
    "text_en" TEXT,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_reports" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "field" "DataReportField" NOT NULL,
    "message" TEXT,
    "status" "DataReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" INTEGER,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "data_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" INTEGER NOT NULL,
    "space_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","space_id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "space_id" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_id_key" ON "refresh_tokens"("replaced_by_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "governorates_name_ar_key" ON "governorates"("name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "areas_governorate_id_name_ar_key" ON "areas"("governorate_id", "name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_key_key" ON "amenities"("key");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_slug_key" ON "spaces"("slug");

-- CreateIndex
CREATE INDEX "spaces_area_id_idx" ON "spaces"("area_id");

-- CreateIndex
CREATE INDEX "space_managers_user_id_idx" ON "space_managers"("user_id");

-- CreateIndex
CREATE INDEX "space_amenities_amenity_id_idx" ON "space_amenities"("amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_hours_space_id_day_of_week_key" ON "space_hours"("space_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "space_shifts_space_id_name_ar_key" ON "space_shifts"("space_id", "name_ar");

-- CreateIndex
CREATE UNIQUE INDEX "space_shifts_id_space_id_key" ON "space_shifts"("id", "space_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_prices_space_id_period_audience_key" ON "space_prices"("space_id", "period", "audience") WHERE ("shift_id" IS NULL AND "label_ar" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "space_prices_space_id_period_audience_shift_id_key" ON "space_prices"("space_id", "period", "audience", "shift_id") WHERE ("label_ar" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "space_prices_space_id_period_audience_label_ar_key" ON "space_prices"("space_id", "period", "audience", "label_ar") WHERE ("shift_id" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "space_prices_space_id_period_audience_shift_id_label_ar_key" ON "space_prices"("space_id", "period", "audience", "shift_id", "label_ar");

-- CreateIndex
CREATE UNIQUE INDEX "space_contacts_space_id_type_value_key" ON "space_contacts"("space_id", "type", "value");

-- CreateIndex
CREATE INDEX "space_photos_space_id_idx" ON "space_photos"("space_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_space_id_phone_key" ON "members"("space_id", "phone") WHERE ("deleted_at" IS NULL);

-- CreateIndex
CREATE INDEX "memberships_member_id_ends_on_idx" ON "memberships"("member_id", "ends_on");

-- CreateIndex
CREATE INDEX "check_ins_space_id_checked_out_at_idx" ON "check_ins"("space_id", "checked_out_at");

-- CreateIndex
CREATE INDEX "check_ins_space_id_checked_in_at_idx" ON "check_ins"("space_id", "checked_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_member_id_key" ON "check_ins"("member_id") WHERE ("checked_out_at" IS NULL);

-- CreateIndex
CREATE INDEX "announcements_space_id_idx" ON "announcements"("space_id");

-- CreateIndex
CREATE INDEX "data_reports_space_id_status_idx" ON "data_reports"("space_id", "status");

-- CreateIndex
CREATE INDEX "data_reports_user_id_idx" ON "data_reports"("user_id");

-- CreateIndex
CREATE INDEX "data_reports_status_idx" ON "data_reports"("status");

-- CreateIndex
CREATE INDEX "audit_logs_space_id_created_at_idx" ON "audit_logs"("space_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_managers" ADD CONSTRAINT "space_managers_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_managers" ADD CONSTRAINT "space_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_amenities" ADD CONSTRAINT "space_amenities_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_amenities" ADD CONSTRAINT "space_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_hours" ADD CONSTRAINT "space_hours_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_shifts" ADD CONSTRAINT "space_shifts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_prices" ADD CONSTRAINT "space_prices_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_prices" ADD CONSTRAINT "space_prices_shift_id_space_id_fkey" FOREIGN KEY ("shift_id", "space_id") REFERENCES "space_shifts"("id", "space_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_contacts" ADD CONSTRAINT "space_contacts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_photos" ADD CONSTRAINT "space_photos_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "space_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Raw SQL: CHECK constraints, which the Prisma schema cannot express ─────────────────────
-- Prisma does not compare CHECK constraints, so later migrations leave them alone.
-- src/db/schema.api.test.ts proves each one.

-- Phone numbers are stored in E.164 (data-model.md).
ALTER TABLE "users" ADD CONSTRAINT "users_phone_e164_check"
  CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "members" ADD CONSTRAINT "members_phone_e164_check"
  CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "space_contacts" ADD CONSTRAINT "space_contacts_phone_e164_check"
  CHECK ("type" NOT IN ('PHONE', 'WHATSAPP') OR "value" ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE "spaces" ADD CONSTRAINT "spaces_location_check"
  CHECK ("lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180);
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_capacity_check"
  CHECK ("capacity" IS NULL OR "capacity" > 0);
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_max_stay_minutes_check"
  CHECK ("max_stay_minutes" IS NULL OR "max_stay_minutes" > 0);

-- One opening range per day, in minutes after midnight; a closed day has no times. The IS NOT NULL
-- tests are needed: a comparison with NULL is NULL, which a CHECK accepts.
ALTER TABLE "space_hours" ADD CONSTRAINT "space_hours_day_of_week_check"
  CHECK ("day_of_week" BETWEEN 0 AND 6);
ALTER TABLE "space_hours" ADD CONSTRAINT "space_hours_range_check"
  CHECK (
    ("is_closed" AND "opens_minute" IS NULL AND "closes_minute" IS NULL)
    OR (NOT "is_closed" AND "opens_minute" IS NOT NULL AND "closes_minute" IS NOT NULL
        AND "opens_minute" >= 0 AND "opens_minute" < "closes_minute" AND "closes_minute" <= 1440)
  );

ALTER TABLE "space_shifts" ADD CONSTRAINT "space_shifts_range_check"
  CHECK ("starts_minute" >= 0 AND "starts_minute" < "ends_minute" AND "ends_minute" <= 1440);

ALTER TABLE "space_prices" ADD CONSTRAINT "space_prices_amount_check"
  CHECK ("amount_agorot" >= 0);

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_dates_check"
  CHECK ("ends_on" >= "starts_on");

-- A check-in is a member's or a daily visitor's, never both; it closes after it opens, and has a
-- check-out method exactly when it is closed.
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_member_or_visitor_check"
  CHECK (num_nonnulls("member_id", "visitor_name") = 1);
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_out_at_check"
  CHECK ("checked_out_at" IS NULL OR "checked_out_at" >= "checked_in_at");
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checkout_method_check"
  CHECK (("checked_out_at" IS NULL) = ("checkout_method" IS NULL));

ALTER TABLE "announcements" ADD CONSTRAINT "announcements_dates_check"
  CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at");
