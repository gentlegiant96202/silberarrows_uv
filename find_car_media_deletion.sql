-- =====================================================
-- FIND THE CAR_MEDIA DELETION QUERY (571 OPERATIONS)
-- =====================================================

-- =====================================================
-- 1. SEARCH FOR CAR_MEDIA DELETE OPERATIONS
-- =====================================================

SELECT
    '=== CAR_MEDIA DELETE OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'This should show the 571 car_media deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."car_media"%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 2. SEARCH FOR CAR_MEDIA OPERATIONS (BOTH DELETE AND UPDATE)
-- =====================================================

SELECT
    '=== ALL CAR_MEDIA OPERATIONS ===' as section,
    query,
    calls,
    rows,
    CASE
        WHEN query LIKE '%DELETE%' THEN 'DELETE OPERATION'
        WHEN query LIKE '%UPDATE%' THEN 'UPDATE OPERATION'
        WHEN query LIKE '%INSERT%' THEN 'INSERT OPERATION'
        ELSE 'OTHER OPERATION'
    END as operation_type
FROM pg_stat_statements
WHERE query LIKE '%car_media%'
ORDER BY calls DESC
LIMIT 15;

-- =====================================================
-- 3. CHECK FOR ORPHANED MEDIA TIMELINE
-- =====================================================

SELECT
    '=== ORPHANED MEDIA CREATED TIMELINE ===' as section,
    DATE(cm.created_at) as creation_date,
    COUNT(*) as media_created_that_day,
    COUNT(DISTINCT car_id) as unique_cars_affected
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Orphaned media
  AND cm.created_at >= '2025-10-01'
GROUP BY DATE(cm.created_at)
ORDER BY creation_date DESC;

-- =====================================================
-- 4. FIND CARS WITH MOST ORPHANED MEDIA
-- =====================================================

SELECT
    '=== CARS WITH MOST ORPHANED MEDIA ===' as section,
    car_id,
    COUNT(*) as orphaned_media_count,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    MIN(cm.created_at) as first_media_created,
    MAX(cm.created_at) as last_media_created
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL
  AND cm.created_at >= '2025-10-01'
GROUP BY car_id
ORDER BY orphaned_media_count DESC
LIMIT 20;

-- =====================================================
-- 5. CHECK FOR CAR DELETION TIMELINE
-- =====================================================

-- Since we can't find direct car deletions, let's see if we can infer from orphaned media patterns
SELECT
    '=== MEDIA CREATION VS CAR DELETION TIMELINE ===' as section,
    'Check if media was created recently but cars were deleted' as analysis;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
LOOKING FOR THE 571 CAR_MEDIA DELETIONS:

The query results you showed didn't include the car_media DELETE operation.
This suggests either:

1. The 571 operations were from a different query pattern
2. The query was filtered out or not captured properly
3. The deletions happened through a different mechanism

WHAT TO LOOK FOR IN THESE RESULTS:

1. CAR_MEDIA DELETE OPERATIONS:
   - Should show the actual DELETE query that ran 571 times
   - This will tell us exactly what was being deleted

2. ORPHANED MEDIA TIMELINE:
   - Shows when media was created vs when cars were deleted
   - Can help identify if this was a recent mass deletion

3. CARS WITH MOST ORPHANED MEDIA:
   - Shows which cars were most affected
   - Can help identify if this was targeted or random

4. OPERATION TYPES:
   - Shows if there were both UPDATE and DELETE operations on car_media
   - UPDATE operations might have been normal maintenance

THE KEY QUESTION:
================

Was the 571 operations:
- A legitimate bulk cleanup of old media?
- A bug causing repeated deletions?
- An attack or malicious operation?
- Normal API operations that got counted multiple times?

The answer lies in finding the exact DELETE query and understanding its purpose.
*/

