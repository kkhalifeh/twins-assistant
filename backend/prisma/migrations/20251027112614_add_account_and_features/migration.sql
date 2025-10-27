-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
-- Rename CAREGIVER to NANNY in UserRole enum
ALTER TYPE "UserRole" RENAME VALUE 'CAREGIVER' TO 'NANNY';

-- AlterTable
-- Add accountId to User table
ALTER TABLE "User" ADD COLUMN "accountId" TEXT;

-- AlterTable
-- Add imageUrl to DiaperLog table
ALTER TABLE "DiaperLog" ADD COLUMN "imageUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_ownerId_key" ON "Account"("ownerId");

-- CreateIndex
CREATE INDEX "User_accountId_idx" ON "User"("accountId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
