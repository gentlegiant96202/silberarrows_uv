-- =====================================================
-- CLEANUP ACTIVE LEASE SYSTEM
-- =====================================================
-- This script removes all active lease related database elements
-- Run this in Supabase Dashboard -> SQL Editor

-- =====================================================
-- 1. DROP ACTIVE LEASE TRANSACTION TABLES
-- =====================================================
-- Drop tables in correct order to avoid FK constraint issues

DROP TABLE IF EXISTS lease_payment_allocations CASCADE;
DROP TABLE IF EXISTS lease_payments CASCADE;
DROP TABLE IF EXISTS lease_transactions CASCADE;
DROP TABLE IF EXISTS lease_invoices CASCADE;

-- =====================================================
-- 2. DROP TRANSACTION RELATED ENUMS
-- =====================================================
DROP TYPE IF EXISTS lease_transaction_type CASCADE;
DROP TYPE IF EXISTS lease_transaction_status CASCADE;

-- =====================================================
-- 3. REMOVE ACTIVE_LEASES STATUS FROM ENUM
-- =====================================================
-- First, update any existing records to contracts_drafted
UPDATE leasing_customers 
SET lease_status = 'contracts_drafted' 
WHERE lease_status = 'active_leases';

-- Recreate the enum without active_leases
DROP TYPE IF EXISTS lease_status_enum CASCADE;

CREATE TYPE lease_status_enum AS ENUM (
    'prospects',
    'appointments',
    'contracts_drafted',
    'overdue_ending_soon',
    'closed_returned',
    'archived'
);

-- =====================================================
-- 4. UPDATE LEASING_CUSTOMERS TABLE
-- =====================================================
-- Add the enum constraint back to the table
ALTER TABLE leasing_customers 
ALTER COLUMN lease_status TYPE lease_status_enum 
USING lease_status::text::lease_status_enum;

-- =====================================================
-- 5. REMOVE ACTIVE LEASE RELATED COLUMNS (if any)
-- =====================================================
-- Remove any columns specifically for active lease management
-- (Currently none exist, but this is for future-proofing)

-- =====================================================
-- 6. UPDATE VEHICLE STATUS LOGIC
-- =====================================================
-- Update any vehicles that were marked as 'leased' to 'reserved'
-- since we're removing active lease tracking
UPDATE leasing_inventory 
SET status = 'reserved' 
WHERE status = 'leased';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
-- Check that cleanup was successful
SELECT 'Remaining active_leases records:' as check_type, COUNT(*) as count 
FROM leasing_customers 
WHERE lease_status = 'active_leases'
UNION ALL
SELECT 'Total leasing customers:' as check_type, COUNT(*) as count 
FROM leasing_customers
UNION ALL
SELECT 'Vehicles marked as leased:' as check_type, COUNT(*) as count 
FROM leasing_inventory 
WHERE status = 'leased';

-- Show current enum values
SELECT unnest(enum_range(NULL::lease_status_enum)) as available_statuses;

RAISE NOTICE 'Active lease system cleanup completed successfully!';


