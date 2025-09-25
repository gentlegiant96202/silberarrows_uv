-- =====================================================
-- COMPLETE LEASING MIGRATION FOR EXISTING DATABASES
-- =====================================================
-- This migration adds prospects status and contract fields to existing leasing_customers table

-- Step 1: Add 'prospects' to the existing lease_status_enum (safe to run multiple times)
ALTER TYPE lease_status_enum ADD VALUE IF NOT EXISTS 'prospects';

-- Step 2: Add missing contract-related fields (safe to run multiple times)
ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS selected_vehicle_id UUID,
ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS lease_term_months INTEGER,
ADD COLUMN IF NOT EXISTS lease_start_date DATE,
ADD COLUMN IF NOT EXISTS lease_end_date DATE,
ADD COLUMN IF NOT EXISTS lease_to_own_option BOOLEAN DEFAULT FALSE;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
ORDER BY enumsortorder;

-- Check new contract fields
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name IN ('selected_vehicle_id', 'monthly_payment', 'security_deposit', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'lease_to_own_option')
ORDER BY ordinal_position;

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
To run this migration:
1. Execute this SQL file in your Supabase dashboard
2. Both prospects enum and contract fields will be added
3. Existing data remains intact
4. Run the verification queries to confirm changes

If you get "type already exists" errors, you may need to:
1. Check what enum values already exist
2. Only add the specific missing values you need
3. Use the separate migration files for more granular control
*/

