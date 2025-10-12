-- =====================================================
-- CHECK ACTUAL CAR MEDIA STATE
-- =====================================================
-- Let's see what's really in the car_media table

-- =====================================================
-- 1. BASIC CAR_MEDIA TABLE STATS
-- =====================================================

SELECT
    '=== CAR_MEDIA TABLE STATS ===' as section,
    COUNT(*) as total_media_records,
    COUNT(DISTINCT car_id) as unique_cars_with_media,
    COUNT(CASE WHEN kind = 'image' THEN 1 END) as image_records,
    COUNT(CASE WHEN kind = 'document' THEN 1 END) as document_records,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media
FROM car_media;

-- =====================================================
-- 2. CHECK FOR ORPHANED MEDIA (cars that don't exist)
-- =====================================================

SELECT
    '=== ORPHANED MEDIA STATS ===' as section,
    COUNT(*) as total_orphaned_media,
    COUNT(DISTINCT car_id) as unique_orphaned_cars,
    array_agg(DISTINCT kind ORDER BY kind) as media_types
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL;

-- =====================================================
-- 3. CHECK YOUR SPECIFIC CAR ID
-- =====================================================

SELECT
    '=== YOUR CAR MEDIA (19e93a06-d309-4e9d-9ba7-f0da0cb07c02) ===' as section,
    COUNT(*) as your_car_media_count,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 4. CHECK RECENT CAR_MEDIA ACTIVITY
-- =====================================================

SELECT
    '=== RECENT CAR_MEDIA ACTIVITY (LAST 7 DAYS) ===' as section,
    DATE(created_at) as activity_date,
    COUNT(*) as media_created,
    COUNT(DISTINCT car_id) as unique_cars,
    array_agg(DISTINCT kind ORDER BY kind) as media_types
FROM car_media
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- =====================================================
-- 5. CHECK FOR BULK OPERATIONS IN CAR_MEDIA
-- =====================================================

-- Look for patterns that might explain the 571 operations
SELECT
    '=== CAR_MEDIA BULK OPERATIONS ===' as section,
    'Check for bulk patterns in car_media table' as note;

-- Check if there are many records with the same created_at (bulk insert)
SELECT
    '=== MEDIA CREATED AT SAME TIME ===' as section,
    created_at,
    COUNT(*) as records_at_same_time,
    COUNT(DISTINCT car_id) as cars_affected
FROM car_media
WHERE created_at >= '2025-10-01'
GROUP BY created_at
HAVING COUNT(*) > 5
ORDER BY records_at_same_time DESC
LIMIT 10;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
UNDERSTANDING THE 571 OPERATIONS:

The fact that you're not seeing car_media DELETE operations in pg_stat_statements
but were told there were 571 operations suggests:

POSSIBLE EXPLANATIONS:
======================

1. OPERATIONS FROM DIFFERENT TIME PERIOD:
   - The 571 operations might be from before October 2025
   - Or from a different time range not captured in your query

2. OPERATIONS NOT CAPTURED IN PG_STAT_STATEMENTS:
   - Some operations might not be logged in pg_stat_statements
   - Could be from direct application calls or different query patterns

3. COUNTING ERROR:
   - The 571 might represent something else (retries, rollbacks, etc.)
   - Or it could be a misinterpretation of the logs

4. DIFFERENT OPERATION TYPE:
   - The operations might be UPDATE or INSERT, not DELETE
   - Or they might be from a different table

WHAT TO CHECK:
==============

1. ACTUAL MEDIA COUNT: How many media records actually exist?
2. ORPHANED MEDIA: How many cars were actually deleted?
3. TIMELINE: When did the media get created vs when cars were deleted?
4. BULK PATTERNS: Look for bulk operations or duplicate timestamps

THE KEY QUESTION:
================

If you only have ~20 images per car, but saw 571 operations:
- Were 571 individual media files deleted across many cars?
- Or was this 571 operations on the same few files?
- Or is this a counting/interpretation error?

Let's look at the ACTUAL DATA to understand what's really happening.
*/

