-- F-5a: refresh-token families and the rate-limit counters (docs/backend/security.md).

-- A session is a family of refresh tokens. A token issued before families existed starts its own.
ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" INTEGER;
UPDATE "refresh_tokens" SET "family_id" = "id";
ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);
