-- AlterEnum
-- Step 1: Add the new enum value
ALTER TYPE "PumpType" ADD VALUE 'MADELA_IN_STYLE';

-- Step 2: Update all existing records from OTHER to MADELA_IN_STYLE
UPDATE "PumpingLog" SET "pumpType" = 'MADELA_IN_STYLE' WHERE "pumpType" = 'OTHER';

-- Step 3: Remove the OLD enum value (this requires deleting from pg_enum)
DELETE FROM pg_enum WHERE enumlabel = 'OTHER' AND enumtypid = 'public."PumpType"'::regtype;
