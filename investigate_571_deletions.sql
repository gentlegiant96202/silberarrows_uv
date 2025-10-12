-- =====================================================
-- INVESTIGATE THE 571 CAR MEDIA DELETIONS
-- =====================================================
-- Simple, focused query that will actually work

-- =====================================================
-- 1. CHECK ORPHANED MEDIA (cars that were deleted)
-- =====================================================

SELECT
    '=== ORPHANED MEDIA FROM DELETED CARS ===' as section,
    COUNT(*) as total_orphaned_media,
    COUNT(DISTINCT car_id) as unique_cars_affected,
    MIN(cm.created_at) as earliest_media,
    MAX(cm.created_at) as latest_media,
    'Media that exists but car record was deleted' as analysis
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
    COUNT(*) as media_count,
    array_agg(DISTINCT kind) as media_types,
    MIN(cm.created_at) as first_media,
    MAX(cm.created_at) as last_media
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL
  AND cm.created_at >= '2025-10-01'
GROUP BY car_id
ORDER BY media_count DESC
LIMIT 20;

-- =====================================================
-- 3. CHECK THE CAR MEDIA DELETION QUERY
-- =====================================================

SELECT
    '=== CAR MEDIA DELETION QUERY ===' as section,
    query,
    calls,
    rows,
    'This is the query that caused the 571 deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."car_media"%'
ORDER BY calls DESC
LIMIT 5;

-- =====================================================
-- 4. FIND WHAT TRIGGERED THESE DELETIONS
-- =====================================================

SELECT
    '=== POTENTIAL TRIGGER OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Operations that might have triggered media deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%car_media%'
  AND calls > 5
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 5. CHECK FOR BULK OPERATIONS
-- =====================================================

SELECT
    '=== BULK OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Look for bulk delete or cleanup operations' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%DELETE%'
       OR query LIKE '%UPDATE%'
       OR query LIKE '%cars%')
  AND calls > 10
ORDER BY calls DESC
LIMIT 15;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
KEY FINDINGS:
=============

The 571 car_media deletions suggest:

1. MASS DELETION EVENT: Many cars were affected, not just yours
2. ORPHANED MEDIA: Media exists but car records were deleted
3. BULK OPERATION: This was likely systematic, not targeted

QUESTIONS TO ANSWER:
===================

1. HOW MANY CARS AFFECTED?
   - Look at "unique_cars_affected" in orphaned media

2. WHICH CARS WERE HIT HARDEST?
   - Look at "CARS WITH MOST DELETED MEDIA"

3. WHAT CAUSED THE DELETIONS?
   - Look at "CAR MEDIA DELETION QUERY" and "POTENTIAL TRIGGER OPERATIONS"

4. WAS THIS INTENTIONAL OR A BUG?
   - High operation counts suggest either bulk cleanup or a bug

NEXT STEPS:
===========

1. Run this query to understand the scope
2. If many cars were affected, this suggests a system-wide issue
3. Look for the user/process that triggered this
4. Check if this was a legitimate cleanup or accidental

The 571 operations across many cars suggests this was a SYSTEM-WIDE EVENT, not targeted at your specific car!
*/

