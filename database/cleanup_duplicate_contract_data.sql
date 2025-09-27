-- Clean up duplicate contract data records
-- This will remove duplicate contract data records, keeping only the most recent one per lease

-- Step 1: Identify and delete duplicate contract data records
-- Keep only the most recent contract data record per lease
WITH duplicate_records AS (
    SELECT 
        id,
        lease_id,
        ROW_NUMBER() OVER (
            PARTITION BY lease_id 
            ORDER BY created_at DESC
        ) as row_num
    FROM lease_accounting
    WHERE contract_data IS NOT NULL
)
DELETE FROM lease_accounting 
WHERE id IN (
    SELECT id 
    FROM duplicate_records 
    WHERE row_num > 1
);

-- Step 2: Show remaining records after cleanup
SELECT 
    'Cleanup completed!' as message,
    COUNT(*) as remaining_contract_data_records
FROM lease_accounting 
WHERE contract_data IS NOT NULL;

-- Step 3: Show current state per lease
SELECT 
    lease_id,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE contract_data IS NOT NULL) as contract_data_records,
    COUNT(*) FILTER (WHERE contract_data IS NULL) as charge_records
FROM lease_accounting 
GROUP BY lease_id
ORDER BY lease_id;

