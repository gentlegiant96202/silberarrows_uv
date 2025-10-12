-- =====================================================
-- FIND SPECIFIC CAR DELETION - STOCK NUMBER 023656
-- =====================================================
-- More targeted search for the car deletion

-- =====================================================
-- 1. SEARCH FOR CAR TABLE DELETE OPERATIONS
-- =====================================================

SELECT
    '=== CAR TABLE DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check for cars table deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
  AND query LIKE '%cars%'
ORDER BY calls DESC
LIMIT 20;

-- =====================================================
-- 2. SEARCH FOR CAR ID SPECIFIC OPERATIONS
-- =====================================================

SELECT
    '=== CAR ID SPECIFIC OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check for car_id references' as analysis
FROM pg_stat_statements
WHERE query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
   OR query LIKE '%023656%'
ORDER BY calls DESC
LIMIT 20;

-- =====================================================
-- 3. CHECK FOR CAR MEDIA DELETIONS (from your results)
-- =====================================================

SELECT
    '=== CAR MEDIA DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'This matches what we saw in your results' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."car_media"%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 4. SEARCH FOR BULK DELETE OPERATIONS
-- =====================================================

SELECT
    '=== BULK DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check for bulk operations that might include cars' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
  AND (query LIKE '%cars%' OR query LIKE '%car_%')
ORDER BY calls DESC
LIMIT 15;

-- =====================================================
-- 5. CHECK FOR STORED PROCEDURE/FUNCTION CALLS
-- =====================================================

SELECT
    '=== FUNCTION CALLS THAT MIGHT DELETE ===' as section,
    query,
    calls,
    rows,
    'Check for function calls that might delete cars' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%CALL%' OR query LIKE '%SELECT%')
  AND (query LIKE '%delete%' OR query LIKE '%remove%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 6. SEARCH ACTIVE SESSIONS FOR CAR OPERATIONS
-- =====================================================

SELECT
    '=== ACTIVE SESSIONS WITH CAR OPERATIONS ===' as section,
    pid,
    usename,
    client_addr,
    application_name,
    state,
    query_start,
    state_change,
    CASE
        WHEN query LIKE '%cars%' THEN '>>> CAR OPERATION <<<'
        WHEN query LIKE '%023656%' THEN '>>> STOCK NUMBER 023656 <<<'
        WHEN query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%' THEN '>>> CAR ID FOUND <<<'
        ELSE ''
    END as relevance_indicator,
    CASE
        WHEN query LIKE '%DELETE%' THEN 'DELETE OPERATION'
        WHEN query LIKE '%UPDATE%' THEN 'UPDATE OPERATION'
        WHEN query LIKE '%INSERT%' THEN 'INSERT OPERATION'
        ELSE 'OTHER OPERATION'
    END as operation_type,
    query
FROM pg_stat_activity
WHERE query LIKE '%cars%'
   OR query LIKE '%023656%'
   OR query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
ORDER BY query_start DESC;

-- =====================================================
-- 7. CHECK FOR AUDIT LOGS OR TRIGGERS
-- =====================================================

SELECT
    '=== CHECK FOR AUDIT TABLES ===' as section,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE (tablename LIKE '%audit%'
   OR tablename LIKE '%log%'
   OR tablename LIKE '%history%')
  AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 8. LOOK FOR RECENT CAR CHANGES
-- =====================================================

-- Check if there are any triggers or functions that might log changes
SELECT
    '=== CHECK FOR CAR-RELATED TRIGGERS ===' as section,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'cars'
ORDER BY trigger_name;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
WHAT TO LOOK FOR:

1. CAR TABLE DELETE OPERATIONS:
   - Any queries that show "DELETE FROM cars"
   - These would be direct deletions of the car record

2. CAR ID SPECIFIC OPERATIONS:
   - Queries that reference the specific car ID: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02
   - Queries that reference stock number: 023656

3. CAR MEDIA DELETIONS:
   - These show someone was deleting media associated with cars
   - This might be part of cleaning up after car deletion

4. ACTIVE SESSIONS:
   - Look for any currently running queries that reference the car
   - Check the user (usename) who is running these queries

5. AUDIT TABLES:
   - If any exist, they might contain a record of the deletion

NEXT STEPS:
1. Look for the username associated with any relevant queries
2. Check if that user has permissions to delete cars
3. Look at the timing of operations to correlate with when the car disappeared
4. If you find the user, check auth.users table for their identity
*/

