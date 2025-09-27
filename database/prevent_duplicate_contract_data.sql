-- Prevent duplicate contract data records
-- Add a unique constraint to ensure only one contract data record per lease

-- Add unique index for contract data records
-- This prevents multiple contract data records for the same lease
-- Using partial unique index since PostgreSQL doesn't support WHERE in UNIQUE constraints

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contract_data_per_lease 
ON lease_accounting (lease_id) 
WHERE contract_data IS NOT NULL;

SELECT 'Duplicate prevention constraint added!' as result;
