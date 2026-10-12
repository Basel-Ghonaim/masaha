-- CreateTable
CREATE TABLE "space_own_amenities" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "space_own_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_own_amenities_space_id_name_ar_key" ON "space_own_amenities"("space_id", "name_ar");

-- AddForeignKey
ALTER TABLE "space_own_amenities" ADD CONSTRAINT "space_own_amenities_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
