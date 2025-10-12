-- =====================================================
-- FIND DIRECT CAR DELETIONS
-- =====================================================
-- More specific search for car table deletions

-- =====================================================
-- 1. SEARCH FOR DIRECT CAR DELETIONS
-- =====================================================

SELECT
    '=== DIRECT CAR DELETIONS ===' as section,
    query,
    calls,
    rows,
    'Look for actual DELETE FROM cars queries' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."cars"%'
   OR query LIKE '%DELETE FROM cars%'
ORDER BY calls DESC
LIMIT 20;

-- =====================================================
-- 2. SEARCH FOR CAR ID SPECIFIC DELETIONS
-- =====================================================

SELECT
    '=== CAR ID SPECIFIC DELETIONS ===' as section,
    query,
    calls,
    rows,
    'Look for deletions referencing the car ID or stock number' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
  AND query LIKE '%DELETE%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK FOR CAR CREATOR PATTERN
-- =====================================================

-- Let's find users who create many cars (potential suspects)
SELECT
    '=== PROLIFIC CAR CREATORS ===' as section,
    created_by,
    COUNT(*) as cars_created,
    MIN(created_at) as first_car,
    MAX(created_at) as last_car,
    array_agg(DISTINCT stock_number ORDER BY stock_number) as stock_numbers
FROM cars
WHERE created_by IS NOT NULL
  AND created_at >= '2025-10-01'
GROUP BY created_by
HAVING COUNT(*) > 5
ORDER BY cars_created DESC;

-- =====================================================
-- 4. CHECK FOR CARS CREATED ON OCT 11, 2025
-- =====================================================

SELECT
    '=== CARS CREATED OCT 11, 2025 ===' as section,
    id,
    stock_number,
    vehicle_model,
    created_by,
    created_at,
    'This day your EQS was created' as note
FROM cars
WHERE DATE(created_at) = '2025-10-11'
ORDER BY created_at DESC;

-- =====================================================
-- 5. CHECK FOR ORPHANED CAR MEDIA
-- =====================================================

SELECT
    '=== ORPHANED CAR MEDIA ===' as section,
    car_id,
    COUNT(*) as media_count,
    array_agg(DISTINCT kind) as media_types,
    MIN(cm.created_at) as earliest_media,
    MAX(cm.created_at) as latest_media
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Media with no associated car (deleted cars)
  AND cm.created_at >= '2025-10-01'
GROUP BY car_id
ORDER BY media_count DESC
LIMIT 20;

-- =====================================================
-- 6. CHECK ACTIVE SESSIONS FOR CAR OPERATIONS
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
        WHEN query LIKE '%car_media%' THEN '>>> CAR MEDIA OPERATION <<<'
        WHEN query LIKE '%DELETE%' THEN '>>> DELETE OPERATION <<<'
        ELSE ''
    END as operation_type,
    CASE
        WHEN LENGTH(query) > 100 THEN LEFT(query, 100) || '...'
        ELSE query
    END as query_preview
FROM pg_stat_activity
WHERE (query LIKE '%cars%'
       OR query LIKE '%car_media%'
       OR query LIKE '%DELETE%')
  AND query IS NOT NULL
ORDER BY query_start DESC;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
LOOKING AT YOUR RESULTS:
========================

The previous results showed:
- 571 car_media deletions (someone systematically deleting car photos/documents)
- Many system cleanup operations (HTTP requests, sessions, etc.)
- Complex PostgREST queries (API-generated queries)

BUT NO DIRECT CAR DELETIONS WERE FOUND.

This suggests:
1. The car deletion might have happened through the API/application layer
2. The actual DELETE query might not be captured in pg_stat_statements
3. The deletion might have been done through a stored procedure or trigger

NEXT STEPS:
1. Run this more targeted query for direct car deletions
2. Look for the car creator in the "CARS CREATED OCT 11" section
3. Check if that creator user has a pattern of deletions
4. Look for orphaned car media that might be traces of deleted cars
5. Check active sessions for anyone currently working with car data

KEY QUESTIONS:
1. Who is the created_by user for cars created on Oct 11, 2025?
2. Does that user have a history of creating and deleting cars?
3. Are there other cars by the same creator that were also deleted?
4. Is there a pattern in the orphaned car media?
*/
