-- CreateEnum
CREATE TYPE "PumpType" AS ENUM ('BABY_BUDDHA', 'MADELA_SYMPHONY', 'SPECTRA_S1', 'OTHER');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('STORED', 'USED');

-- CreateTable
CREATE TABLE "PumpingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "pumpType" "PumpType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usage" "UsageType" NOT NULL,
    "notes" TEXT,
    "entryTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PumpingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PumpingLog_userId_timestamp_idx" ON "PumpingLog"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "PumpingLog" ADD CONSTRAINT "PumpingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
