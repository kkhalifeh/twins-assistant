-- AlterTable
-- Change dateOfBirth from TIMESTAMP to DATE to prevent timezone conversion issues
ALTER TABLE "Child" ALTER COLUMN "dateOfBirth" SET DATA TYPE DATE;
