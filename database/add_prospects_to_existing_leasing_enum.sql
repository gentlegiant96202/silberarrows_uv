-- =====================================================
-- ADD PROSPECTS TO EXISTING LEASING ENUM
-- =====================================================
-- For databases that already have leasing_customers table with lease_status_enum

-- Add 'prospects' to the existing lease_status_enum (safe to run multiple times)
ALTER TYPE lease_status_enum ADD VALUE IF NOT EXISTS 'prospects';

-- Update the default status to prospects (optional - only if you want to change existing behavior)
-- ALTER TABLE leasing_customers ALTER COLUMN lease_status SET DEFAULT 'prospects';

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
To run this migration on existing database:
1. Execute this SQL file in your Supabase dashboard
2. The 'prospects' value will be added to the existing enum
3. No data loss or table recreation needed

To check current enum values:
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
ORDER BY enumsortorder;
*/

