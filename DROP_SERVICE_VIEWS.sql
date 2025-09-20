-- ================================
-- DROP SERVICE CONTRACT VIEWS AND ACTIVITIES TABLE
-- ================================
-- This script removes:
-- 1. Views: active_service_contracts, active_warranty_contracts
-- 2. Table: contract_activities (audit log table)

-- IMPORTANT: This will delete the contract_activities table and ALL activity logs
-- Your contract data in service_contracts & warranty_contracts will be safe

-- 1. SHOW CURRENT OBJECTS (before dropping)
SELECT 
    schemaname,
    viewname as object_name,
    'VIEW' as object_type
FROM pg_views 
WHERE viewname IN ('active_service_contracts', 'active_warranty_contracts')
UNION ALL
SELECT 
    schemaname,
    tablename as object_name,
    'TABLE' as object_type
FROM pg_tables 
WHERE tablename = 'contract_activities'
ORDER BY object_type, object_name;

-- 2. DROP THE VIEWS (CASCADE to handle dependencies)
DROP VIEW IF EXISTS active_service_contracts CASCADE;
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;

-- 3. DROP THE CONTRACT ACTIVITIES TABLE
DROP TABLE IF EXISTS contract_activities CASCADE;

-- 4. VERIFY EVERYTHING IS DROPPED
SELECT 
    schemaname,
    viewname as object_name,
    'VIEW - STILL EXISTS' as status
FROM pg_views 
WHERE viewname IN ('active_service_contracts', 'active_warranty_contracts')
UNION ALL
SELECT 
    schemaname,
    tablename as object_name,
    'TABLE - STILL EXISTS' as status
FROM pg_tables 
WHERE tablename = 'contract_activities';

-- 5. SHOW REMAINING TABLES (your actual data)
SELECT 
    schemaname,
    tablename,
    'SAFE - CONTAINS YOUR DATA' as status
FROM pg_tables 
WHERE tablename IN ('service_contracts', 'warranty_contracts')
ORDER BY tablename;

-- 6. SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully dropped:';
    RAISE NOTICE '   - active_service_contracts (VIEW)';
    RAISE NOTICE '   - active_warranty_contracts (VIEW)';
    RAISE NOTICE '   - contract_activities (TABLE - audit logs deleted)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Your contract data is safe in:';
    RAISE NOTICE '   - service_contracts (all service contract data preserved)';
    RAISE NOTICE '   - warranty_contracts (all warranty contract data preserved)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 API Impact: Minimal - audit logging will be disabled';
    RAISE NOTICE '🎯 Result: Simplified database with only essential tables';
    RAISE NOTICE '⚠️  Note: Activity history has been permanently deleted';
END
$$;
