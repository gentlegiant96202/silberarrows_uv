-- =====================================================
-- INVESTIGATE CAR DELETION TRIGGER
-- =====================================================
-- The trigger_sync_uv_catalog_inventory is suspicious for DELETE operations

-- =====================================================
-- 1. EXAMINE THE SYNC FUNCTION
-- =====================================================

-- First, let's find the function that gets triggered on car deletion
SELECT
    '=== SYNC FUNCTION DEFINITION ===' as section,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_uv_catalog_with_inventory';

-- =====================================================
-- 2. CHECK WHEN THIS FUNCTION WAS LAST CALLED
-- =====================================================

-- Look for recent calls to this function in pg_stat_statements
SELECT
    '=== RECENT CALLS TO SYNC FUNCTION ===' as section,
    query,
    calls,
    rows,
    'Check if this function was called during deletion' as analysis
FROM pg_stat_statements
WHERE query LIKE '%sync_uv_catalog_with_inventory%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK FOR LOGS IN UV_CATALOG TABLE
-- =====================================================

-- See if there are any recent changes or deletions in uv_catalog that might be related
SELECT
    '=== UV_CATALOG CHANGES ===' as section,
    id,
    car_id,
    title,
    make,
    model,
    status,
    created_at,
    updated_at
FROM uv_catalog
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
   OR title ILIKE '%023656%'
   OR title ILIKE '%EQS%'
ORDER BY updated_at DESC
LIMIT 20;

-- =====================================================
-- 4. CHECK FOR CAR DELETION PATTERNS
-- =====================================================

-- Look for the actual DELETE query that might have triggered this
SELECT
    '=== CAR DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Look for direct car deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."cars"%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 5. CHECK ACTIVE SESSIONS FOR CAR OPERATIONS
-- =====================================================

SELECT
    '=== ACTIVE CAR OPERATIONS ===' as section,
    pid,
    usename,
    client_addr,
    application_name,
    state,
    query_start,
    CASE
        WHEN query LIKE '%cars%' THEN '>>> CAR TABLE OPERATION <<<'
        WHEN query LIKE '%uv_catalog%' THEN '>>> UV CATALOG OPERATION <<<'
        WHEN query LIKE '%sync_uv_catalog%' THEN '>>> SYNC FUNCTION CALL <<<'
        ELSE ''
    END as operation_type,
    query
FROM pg_stat_activity
WHERE query LIKE '%cars%'
   OR query LIKE '%uv_catalog%'
   OR query LIKE '%sync_uv_catalog%'
ORDER BY query_start DESC;

-- =====================================================
-- 6. CHECK FOR AUDIT TRAIL
-- =====================================================

-- Look for any tables that might track changes
SELECT
    '=== POTENTIAL AUDIT TABLES ===' as section,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE (tablename LIKE '%audit%'
   OR tablename LIKE '%log%'
   OR tablename LIKE '%history%'
   OR tablename LIKE '%track%')
  AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 7. CHECK CAR TABLE STRUCTURE
-- =====================================================

-- See what columns exist in the cars table to understand the deletion
SELECT
    '=== CARS TABLE STRUCTURE ===' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cars'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 8. CHECK FOR STORED PROCEDURE CALLS
-- =====================================================

-- The trigger might call a stored procedure, let's look for those
SELECT
    '=== STORED PROCEDURE CALLS ===' as section,
    query,
    calls,
    rows,
    'Check for procedure calls that might handle deletion' as analysis
FROM pg_stat_statements
WHERE query LIKE '%CALL%'
  AND (query LIKE '%cars%' OR query LIKE '%delete%' OR query LIKE '%sync%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
CRITICAL FINDINGS:
==================

1. TRIGGER DISCOVERY:
   - trigger_sync_uv_catalog_inventory runs AFTER DELETE on cars table
   - This executes sync_uv_catalog_with_inventory() function
   - This is HIGHLY SUSPICIOUS for the car deletion

2. WHAT THIS MEANS:
   - When a car is deleted, this trigger automatically runs
   - The sync function likely cleans up related UV catalog entries
   - This explains why both the car and catalog entries disappeared

3. INVESTIGATION STEPS:
   - Find who called the DELETE operation that triggered this
   - Check the sync function for any logging or audit trails
   - Look for the actual DELETE query in pg_stat_statements
   - Check if the sync function logs what it does

4. RECOVERY POSSIBILITIES:
   - If the sync function logs deletions, we might find a record
   - Check if there are any backup/audit tables
   - The function might have created a log entry

NEXT STEPS:
1. Run this query to examine the sync function
2. Look for the actual DELETE operation in the results
3. Check if the sync function has any logging
4. Find the user who performed the deletion
*/

