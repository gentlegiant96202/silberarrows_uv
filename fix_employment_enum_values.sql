-- =====================================================
-- FIX EMPLOYMENT TYPE ENUM VALUES
-- =====================================================
-- This adds the missing enum values to employment_type_enum

-- First, check what values currently exist
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'employment_type_enum')
ORDER BY enumsortorder;

-- Add missing enum values (safe to run multiple times)
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'full_time';
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'part_time';
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'contract';
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'freelance';
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'self_employed';
ALTER TYPE employment_type_enum ADD VALUE IF NOT EXISTS 'unemployed';

-- Verify all values are now present
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'employment_type_enum')
ORDER BY enumsortorder;

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
This error occurs because the employment_type_enum was created but doesn't
have all the values that the frontend is trying to use.

The frontend uses these values:
- 'full_time'
- 'part_time' 
- 'contract'
- 'freelance'
- 'self_employed'
- 'unemployed'

After running this script, the contract modal should work properly.
*/

