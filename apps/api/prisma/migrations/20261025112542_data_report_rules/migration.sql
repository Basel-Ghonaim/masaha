-- CreateEnum
CREATE TYPE "DataReportResolver" AS ENUM ('OWNER', 'ADMIN');

-- AlterTable
ALTER TABLE "data_reports" ADD COLUMN     "resolved_as" "DataReportResolver";

-- CreateIndex
CREATE UNIQUE INDEX "data_reports_open_key" ON "data_reports"("user_id", "space_id", "field") WHERE ("status" = 'OPEN');

-- A decision's fields come together, and only with a decision (docs/architecture/data-model.md › Constraints).
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_decision_check" CHECK (
  ("status" = 'OPEN') = ("resolved_at" IS NULL)
  AND ("resolved_at" IS NULL) = ("resolved_by_id" IS NULL)
  AND ("resolved_at" IS NULL) = ("resolved_as" IS NULL)
  AND ("status" <> 'OPEN' OR "resolution_note" IS NULL)
  AND ("resolution_note" IS NULL OR btrim("resolution_note") <> ''));
-- A dismissal carries its reply (decision 10); «أخرى» its message.
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_dismissal_note_check"
  CHECK ("status" <> 'DISMISSED' OR "resolution_note" IS NOT NULL);
ALTER TABLE "data_reports" ADD CONSTRAINT "data_reports_other_message_check"
  CHECK ("field" <> 'OTHER' OR ("message" IS NOT NULL AND btrim("message") <> ''));
