/*
  Warnings:

  - Added the required column `userId` to the `Child` table without a default value. This is not possible if the table is not empty.

*/
-- First, add the column as nullable
ALTER TABLE "Child" ADD COLUMN "userId" TEXT;

-- Assign existing children to the first user (original seeded user "Khaled")
UPDATE "Child" SET "userId" = (SELECT id FROM "User" WHERE email = 'khaled@example.com' LIMIT 1) WHERE "userId" IS NULL;

-- Now make the column required
ALTER TABLE "Child" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Child_userId_idx" ON "Child"("userId");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
