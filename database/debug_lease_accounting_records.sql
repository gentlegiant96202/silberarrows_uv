-- Debug query to see what records are being created in lease_accounting
-- Run this to understand the duplicate records issue

-- Show all records for all leases (no specific lease ID needed)
-- This will show you all records and help identify duplicates
SELECT 
    id,
    lease_id,
    billing_period,
    charge_type,
    total_amount,
    comment,
    status,
    CASE 
        WHEN contract_data IS NOT NULL THEN 'CONTRACT DATA RECORD'
        ELSE 'REGULAR CHARGE'
    END as record_type,
    created_at
FROM lease_accounting 
ORDER BY lease_id, created_at DESC;

-- Show all records created in the last hour (to see recent duplicates)
SELECT 
    id,
    lease_id,
    charge_type,
    total_amount,
    comment,
    status,
    CASE 
        WHEN contract_data IS NOT NULL THEN 'CONTRACT DATA RECORD'
        ELSE 'REGULAR CHARGE'
    END as record_type,
    created_at
FROM lease_accounting 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Count records per lease to identify duplicates
SELECT 
    lease_id,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE contract_data IS NOT NULL) as contract_data_records,
    COUNT(*) FILTER (WHERE contract_data IS NULL) as charge_records
FROM lease_accounting 
GROUP BY lease_id
HAVING COUNT(*) > 1
ORDER BY total_records DESC;
