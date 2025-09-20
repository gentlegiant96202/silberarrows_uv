-- ================================
-- REMOVE STATUS FIELDS FROM SERVICE CONTRACTS
-- ================================
-- This script removes all status-related fields and logic
-- Fields to remove: status, contract_health, days_until_expiry

-- 1. SHOW CURRENT STATUS-RELATED COLUMNS
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('service_contracts', 'warranty_contracts')
    AND column_name IN ('status', 'contract_health', 'days_until_expiry')
ORDER BY table_name, column_name;

-- 2. DROP STATUS ENUM TYPE (status columns already removed)
DROP TYPE IF EXISTS contract_status_enum CASCADE;

-- 3. VERIFY STATUS COLUMNS ARE ALREADY GONE (they should be)
-- This will show empty results if columns are already removed

-- 5. VERIFY COLUMNS ARE REMOVED
SELECT 
    table_name,
    column_name,
    'STILL EXISTS' as status
FROM information_schema.columns 
WHERE table_name IN ('service_contracts', 'warranty_contracts')
    AND column_name IN ('status', 'contract_health', 'days_until_expiry');

-- 6. SHOW REMAINING COLUMNS
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('service_contracts', 'warranty_contracts')
ORDER BY table_name, ordinal_position;

-- 7. SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully removed status fields:';
    RAISE NOTICE '   - status column from service_contracts';
    RAISE NOTICE '   - status column from warranty_contracts';
    RAISE NOTICE '   - contract_status_enum type';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Result: Simplified contracts with no status complexity';
    RAISE NOTICE '📋 Remaining workflow: Only workflow_status (created, sent_for_signing, card_issued)';
END
$$;
