-- AlterTable
ALTER TABLE "DiaperLog" ADD COLUMN     "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- AlterTable
ALTER TABLE "FeedingLog" ADD COLUMN     "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- AlterTable
ALTER TABLE "HealthLog" ADD COLUMN     "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- AlterTable
ALTER TABLE "SleepLog" ADD COLUMN     "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York';
