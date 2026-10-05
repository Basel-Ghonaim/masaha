-- F-5b3c1: the recovery session, held by the server for a forgotten password (docs/backend/security.md).

-- CreateTable
CREATE TABLE "password_recoveries" (
    "id" SERIAL NOT NULL,
    "key_hash" TEXT NOT NULL,
    "user_id" INTEGER,
    "masked_email" TEXT NOT NULL,
    "email_digest" TEXT,
    "reset_token_id" INTEGER,
    "resends" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "password_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_recoveries_key_hash_key" ON "password_recoveries"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_recoveries_reset_token_id_key" ON "password_recoveries"("reset_token_id");

-- CreateIndex
CREATE INDEX "password_recoveries_user_id_idx" ON "password_recoveries"("user_id");

-- AddForeignKey
ALTER TABLE "password_recoveries" ADD CONSTRAINT "password_recoveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_recoveries" ADD CONSTRAINT "password_recoveries_reset_token_id_fkey" FOREIGN KEY ("reset_token_id") REFERENCES "password_reset_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
