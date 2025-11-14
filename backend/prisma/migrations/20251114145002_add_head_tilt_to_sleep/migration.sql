-- CreateEnum
CREATE TYPE "HeadTilt" AS ENUM ('LEFT', 'RIGHT', 'STRAIGHT');

-- AlterTable
ALTER TABLE "SleepLog" ADD COLUMN     "headTilt" "HeadTilt";
