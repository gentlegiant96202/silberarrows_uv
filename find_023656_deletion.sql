-- =====================================================
-- FIND WHO DELETED EQS STOCK NUMBER 023656
-- =====================================================
-- This query searches for the DELETE operation in various ways

-- =====================================================
-- 1. SEARCH POSTGRESQL LOGS FOR DELETE OPERATIONS
-- =====================================================
-- Note: This requires log_statement to be enabled in PostgreSQL

-- First, let's check if we can access PostgreSQL logs
SELECT
    '=== CHECKING LOGGING CONFIGURATION ===' as section,
    name,
    setting,
    unit
FROM pg_settings
WHERE name LIKE '%log%'
ORDER BY name;

-- =====================================================
-- 2. SEARCH FOR DELETE OPERATIONS IN CURRENT SESSION
-- =====================================================
-- Check if there are any active sessions that might have performed the deletion

SELECT
    '=== ACTIVE SESSIONS ===' as section,
    pid,
    usename,
    client_addr,
    application_name,
    state,
    query_start,
    state_change,
    CASE
        WHEN state = 'active' AND query LIKE '%DELETE%' THEN '>>> ACTIVE DELETE QUERY <<<'
        ELSE ''
    END as delete_indicator
FROM pg_stat_activity
WHERE query LIKE '%DELETE%'
   OR query LIKE '%023656%'
   OR query ILIKE '%eqs%'
ORDER BY query_start DESC;

-- =====================================================
-- 3. SEARCH FOR THE CAR ID IN RELATED TABLES
-- =====================================================
-- Check if the car_id exists in any related tables that might have audit info

SELECT
    '=== CHECK CAR ID IN CAR_MEDIA ===' as section,
    car_id,
    COUNT(*) as media_count,
    array_agg(DISTINCT kind) as media_types
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY car_id;

-- Check UV catalog for the car
SELECT
    '=== CHECK CAR ID IN UV_CATALOG ===' as section,
    car_id,
    title,
    make,
    model,
    status,
    created_at,
    updated_at
FROM uv_catalog
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 4. CHECK FOR ANY AUDIT TABLES OR TRIGGERS
-- =====================================================
-- Look for any audit tables that might exist

SELECT
    '=== CHECK FOR AUDIT TABLES ===' as section,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename LIKE '%audit%'
   OR tablename LIKE '%log%'
   OR tablename LIKE '%history%'
ORDER BY tablename;

-- =====================================================
-- 5. SEARCH FOR ORPHANED RECORDS
-- =====================================================
-- Look for any records that reference the deleted car

-- Check car_media table
SELECT
    '=== ORPHANED RECORDS - car_media ===' as section,
    'car_media' as table_name,
    COUNT(*) as count
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'

UNION ALL

-- Check uv_catalog table
SELECT
    '=== ORPHANED RECORDS - uv_catalog ===' as section,
    'uv_catalog' as table_name,
    COUNT(*) as count
FROM uv_catalog
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'

UNION ALL

-- Check leads table
SELECT
    '=== ORPHANED RECORDS - leads ===' as section,
    'leads' as table_name,
    COUNT(*) as count
FROM leads
WHERE model_of_interest ILIKE '%023656%'
   OR notes::text ILIKE '%023656%';

-- =====================================================
-- 6. CHECK FOR RECENT DELETE OPERATIONS
-- =====================================================
-- Look at pg_stat_statements for recent DELETE operations (if available)

-- First check if pg_stat_statements is available
SELECT
    '=== CHECK PG_STAT_STATEMENTS AVAILABILITY ===' as section,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'pg_stat_statements'
        ) THEN 'pg_stat_statements is available'
        ELSE 'pg_stat_statements is NOT available'
    END as status;

-- Query pg_stat_statements if available (using only columns that exist)
SELECT
    '=== RECENT DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'total_time not available' as total_time_info
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 7. ENABLE LOGGING FOR FUTURE DELETIONS (RECOMMENDATION)
-- =====================================================

/*
TO PREVENT THIS IN THE FUTURE, RUN THESE COMMANDS:

-- Enable statement logging for DELETE operations
ALTER DATABASE postgres SET log_statement = 'ddl';

-- Or enable all statement logging (more verbose)
ALTER DATABASE postgres SET log_statement = 'all';

-- Enable logging of disconnections (to see user info)
ALTER DATABASE postgres SET log_disconnections = on;

-- Restart PostgreSQL or reload config for changes to take effect
SELECT pg_reload_conf();

NOTE: This requires superuser privileges and may impact performance.
*/

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
IF YOU FIND RESULTS:
1. Check active sessions for any ongoing DELETE operations
2. Look at orphaned records to confirm the car was deleted
3. Check audit tables if they exist

IF NO RESULTS FOUND:
1. The logs may not be configured to capture DELETE statements
2. Consider enabling PostgreSQL statement logging
3. Check application-level logs instead
4. The deletion might have happened before logging was enabled

NEXT STEPS:
1. Run this query in your Supabase SQL editor
2. Check if any active sessions show the DELETE operation
3. If you find the user, check their identity in auth.users table
4. Consider implementing proper audit triggers for future deletions
*/
