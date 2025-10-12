-- =====================================================
-- INVESTIGATE BULK MEDIA DELETIONS (571 OPERATIONS)
-- =====================================================
-- This is suspicious - way more deletions than expected for one car

-- =====================================================
-- 1. ANALYZE THE CAR MEDIA DELETION PATTERN
-- =====================================================

-- Check orphaned media instead (since there's no deletion log table)
SELECT
    '=== ORPHANED MEDIA ANALYSIS ===' as section,
    COUNT(*) as total_orphaned_media,
    COUNT(DISTINCT car_id) as unique_cars_affected,
    MIN(cm.created_at) as first_media_created,
    MAX(cm.created_at) as last_media_created,
    'Media that exists but car was deleted' as analysis
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL
  AND cm.created_at >= '2025-10-01';

-- =====================================================
-- 2. FIND CARS WITH MOST DELETED MEDIA
-- =====================================================

SELECT
    '=== CARS WITH MOST DELETED MEDIA ===' as section,
    car_id,
    COUNT(*) as media_files_deleted,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    MIN(cm.created_at) as earliest_media,
    MAX(cm.created_at) as latest_media
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL
  AND cm.created_at >= '2025-10-01'
GROUP BY car_id
ORDER BY media_files_deleted DESC
LIMIT 20;

-- =====================================================
-- 3. CHECK FOR BULK DELETION PATTERNS
-- =====================================================

-- Look for the specific car_media deletion query pattern
SELECT
    '=== CAR MEDIA DELETION QUERY PATTERN ===' as section,
    query,
    calls,
    rows,
    'This matches the 571 operations you saw' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."car_media"%'
ORDER BY calls DESC
LIMIT 5;

-- =====================================================
-- 4. FIND WHO/WHAT TRIGGERED THESE DELETIONS
-- =====================================================

-- Look for operations that might have triggered the media deletions
SELECT
    '=== POTENTIAL TRIGGER OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Operations that might have caused media deletions' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%car_media%'
       OR query LIKE '%cars%'
       OR query LIKE '%UPDATE%'
       OR query LIKE '%DELETE%')
  AND calls > 10
ORDER BY calls DESC
LIMIT 15;

-- =====================================================
-- 5. CHECK FOR BATCH/CLEANUP OPERATIONS
-- =====================================================

-- Look for any scripts or batch operations that might delete media
SELECT
    '=== BATCH/CLEANUP OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Look for bulk operations or scripts' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%BULK%'
       OR query LIKE '%CLEANUP%'
       OR query LIKE '%DELETE%WHERE%'
       OR query LIKE '%DELETE%IN%')
  AND calls > 1
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 6. CHECK FOR USER ACTIVITY PATTERNS
-- =====================================================

-- Look for users who performed many operations around that time
SELECT
    '=== USER ACTIVITY PATTERNS ===' as section,
    'Check for users with high activity' as note;

-- This would need to be checked in application logs or auth tables
-- For now, let's see if we can find user patterns in the queries

-- =====================================================
-- 7. CHECK FOR AUTOMATED PROCESSES
-- =====================================================

-- Look for cron jobs, scheduled tasks, or automated processes
SELECT
    '=== AUTOMATED PROCESSES ===' as section,
    query,
    calls,
    rows,
    'Look for automated/scheduled operations' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%cron%'
       OR query LIKE '%schedule%'
       OR query LIKE '%auto%'
       OR application_name LIKE '%cron%'
       OR application_name LIKE '%schedule%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 8. CHECK FOR APPLICATION ERRORS
-- =====================================================

-- Look for error patterns that might indicate bugs causing repeated deletions
SELECT
    '=== ERROR/EXCEPTION PATTERNS ===' as section,
    query,
    calls,
    rows,
    'Look for error handling or retry logic' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%ERROR%'
       OR query LIKE '%EXCEPTION%'
       OR query LIKE '%RETRY%'
       OR query LIKE '%ROLLBACK%')
  AND calls > 1
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
CRITICAL DISCOVERY:
===================

You found 571 car_media deletions but only ~20 images per car.
This suggests:

1. MASS MEDIA DELETION: Someone deleted media from MANY cars, not just yours
2. BULK OPERATION: This was likely a systematic cleanup or bulk operation
3. POSSIBLE BUG: Could be a bug causing repeated deletions
4. MALICIOUS ACTIVITY: Could be intentional mass deletion

INVESTIGATION FOCUS:
===================

1. HOW MANY CARS AFFECTED?
   - The 571 operations suggest 28+ cars if each had ~20 images
   - Or 571+ cars if each had only 1-2 images

2. WHO DID THIS?
   - Look for the user/process that triggered this
   - Check for bulk operations or scripts
   - Look for automated processes

3. WAS THIS INTENTIONAL?
   - Check for cleanup scripts or maintenance operations
   - Look for error patterns suggesting bugs
   - Check for user activity spikes

4. WHAT TRIGGERED IT?
   - Look for the root cause (UPDATE, DELETE, or other operation)
   - Check for cascading deletions or triggers

NEXT STEPS:
===========

1. Run this query to understand the scope
2. Find which cars were most affected
3. Identify the user/process responsible
4. Determine if this was intentional cleanup, a bug, or malicious

The 571 operations suggest this was NOT just your car - this was a mass operation affecting many vehicles!
*/
