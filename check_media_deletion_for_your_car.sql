-- =====================================================
-- CHECK IF MEDIA WAS DELETED FROM YOUR CAR
-- =====================================================
-- Since your car exists, let's check its media history

-- =====================================================
-- 1. CURRENT MEDIA STATUS
-- =====================================================

SELECT
    '=== CURRENT MEDIA STATUS ===' as section,
    COUNT(*) as current_media_count,
    array_agg(DISTINCT kind ORDER BY kind) as current_media_types,
    MIN(created_at) as earliest_current_media,
    MAX(created_at) as latest_current_media,
    'Media currently attached to your car' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 2. CHECK FOR MEDIA DELETION OPERATIONS ON YOUR CAR
-- =====================================================

SELECT
    '=== MEDIA DELETION OPERATIONS FOR YOUR CAR ===' as section,
    query,
    calls,
    rows,
    'Look for DELETE operations that affected your car' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
  AND (query LIKE '%car_media%'
       OR query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK FOR MEDIA UPDATE OPERATIONS ON YOUR CAR
-- =====================================================

SELECT
    '=== MEDIA UPDATE OPERATIONS FOR YOUR CAR ===' as section,
    query,
    calls,
    rows,
    'Look for UPDATE operations that might have modified your car media' as analysis
FROM pg_stat_statements
WHERE query LIKE '%UPDATE%'
  AND (query LIKE '%car_media%'
       OR query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 4. CHECK MEDIA CREATION TIMELINE FOR YOUR CAR
-- =====================================================

SELECT
    '=== YOUR CAR MEDIA CREATION TIMELINE ===' as section,
    DATE(created_at) as creation_date,
    COUNT(*) as media_created_that_day,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    'Timeline of when media was added to your car' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- =====================================================
-- 5. CHECK FOR BATCH OPERATIONS AFFECTING YOUR CAR
-- =====================================================

SELECT
    '=== BATCH OPERATIONS ON YOUR CAR ===' as section,
    query,
    calls,
    rows,
    'Look for bulk operations that might have affected your car' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%car_media%'
       OR query LIKE '%cars%')
  AND calls > 5
  AND (query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 6. CHECK FOR DUPLICATE MEDIA IN YOUR CAR
-- =====================================================

SELECT
    '=== DUPLICATE MEDIA IN YOUR CAR ===' as section,
    kind,
    COUNT(*) as count,
    'Check if your car has multiple entries of same media type' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY kind
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- =====================================================
-- 7. CHECK CAR STATUS CHANGES
-- =====================================================

SELECT
    '=== YOUR CAR STATUS HISTORY ===' as section,
    'Check if your car status changed around the time of media operations' as note;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
WHAT TO LOOK FOR:

1. CURRENT MEDIA COUNT:
   - How many media files are currently attached to your car?
   - Compare this to your expected ~20 images

2. DELETION OPERATIONS:
   - Any DELETE queries that specifically mention your car ID or stock number
   - These would be direct evidence of media deletion

3. MEDIA TIMELINE:
   - When was media added to your car?
   - Look for patterns around the time of the 571 operations

4. DUPLICATE ENTRIES:
   - Does your car have multiple entries for the same media type?
   - This would confirm the duplicate creation pattern

5. BATCH OPERATIONS:
   - Any bulk operations that might have affected your car

POSSIBLE SCENARIOS:
===================

1. MEDIA WAS DELETED:
   - Current media count is lower than expected
   - DELETE operations found for your car
   - Timeline shows media removal

2. DUPLICATES WERE CLEANED UP:
   - Your car had duplicates that were removed
   - Current count reflects after cleanup
   - No direct deletion of car, just media cleanup

3. MEDIA WAS NEVER DELETED:
   - Current count matches your expectation
   - No deletion operations found
   - Your car was unaffected by the duplicate issue

4. PARTIAL MEDIA LOSS:
   - Some media deleted, some remains
   - Mixed pattern of operations

THE KEY EVIDENCE:
================

- If current media count is low but car exists = media was deleted from car
- If duplicates exist = your car was affected by duplicate creation
- If deletion operations reference your car = direct media deletion occurred
- If timeline shows gaps = media was removed at specific times

This will tell you EXACTLY what happened to the media on your car!
*/




