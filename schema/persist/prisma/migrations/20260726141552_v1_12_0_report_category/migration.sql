/*
  Warnings:

  - The values [HATE,SEXUAL,VIOLENCE,ILLEGAL] on the enum `ReportReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReportReason_new" AS ENUM ('HARASSMENT', 'INAPPROPRIATE', 'PRIVACY', 'SPAM', 'OTHER');
ALTER TABLE "Report" ALTER COLUMN "reason" TYPE "ReportReason_new" USING ("reason"::text::"ReportReason_new");
ALTER TYPE "ReportReason" RENAME TO "ReportReason_old";
ALTER TYPE "ReportReason_new" RENAME TO "ReportReason";
DROP TYPE "public"."ReportReason_old";
COMMIT;
