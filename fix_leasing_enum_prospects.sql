-- =====================================================
-- FIX LEASING ENUM - ADD PROSPECTS VALUE
-- =====================================================
-- This fixes the 400 error when moving cards to prospects column

-- Step 1: Check current enum values
SELECT 'Current enum values:' as info;
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
ORDER BY enumsortorder;

-- Step 2: Add 'prospects' to the existing lease_status_enum (safe to run multiple times)
ALTER TYPE lease_status_enum ADD VALUE IF NOT EXISTS 'prospects';

-- Step 3: Verify prospects was added
SELECT 'After adding prospects:' as info;
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
ORDER BY enumsortorder;

-- Step 4: Check if prospects exists specifically
SELECT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
    AND enumlabel = 'prospects'
) as prospects_exists;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*
1. Copy this SQL and run it in your Supabase SQL Editor
2. This will add 'prospects' to your lease_status_enum
3. After running this, drag & drop should work properly
4. The 400 error should be resolved
*/
