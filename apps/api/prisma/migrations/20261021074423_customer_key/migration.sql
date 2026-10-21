-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "request_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "customers_space_id_request_id_key" ON "customers"("space_id", "request_id");
