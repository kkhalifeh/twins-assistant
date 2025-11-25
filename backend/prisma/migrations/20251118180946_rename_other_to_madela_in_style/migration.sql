-- AlterEnum
-- This migration renames the OTHER pump type to MADELA_IN_STYLE

-- Step 1: Add the new enum value
ALTER TYPE "PumpType" ADD VALUE IF NOT EXISTS 'MADELA_IN_STYLE';

-- Step 2: Update all existing records from OTHER to MADELA_IN_STYLE
-- Note: This will run in a separate transaction after the enum is committed
DO $$
BEGIN
  UPDATE "PumpingLog" SET "pumpType" = 'MADELA_IN_STYLE' WHERE "pumpType" = 'OTHER';
END $$;

-- Step 3: Remove the OLD enum value (this requires deleting from pg_enum)
DO $$
BEGIN
  DELETE FROM pg_enum WHERE enumlabel = 'OTHER' AND enumtypid = 'public."PumpType"'::regtype;
END $$;
