-- =====================================================
-- CHECK YOUR CAR STATUS - WAS IT EVER DELETED?
-- =====================================================
-- The timeline shows 0 orphaned media, meaning no cars were deleted!

-- =====================================================
-- 1. CHECK IF YOUR CAR STILL EXISTS
-- =====================================================

SELECT
    '=== YOUR CAR STATUS ===' as section,
    id,
    stock_number,
    vehicle_model,
    status,
    sale_status,
    created_at,
    updated_at,
    'Car still exists!' as analysis
FROM cars
WHERE stock_number = '023656'
   OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 2. CHECK YOUR CAR'S MEDIA
-- =====================================================

SELECT
    '=== YOUR CAR MEDIA ===' as section,
    COUNT(*) as media_count,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media,
    COUNT(*) - COUNT(DISTINCT kind) as potential_duplicates,
    'Check if you have duplicate media entries' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 3. CHECK FOR DUPLICATES IN YOUR CAR
-- =====================================================

SELECT
    '=== YOUR CAR DUPLICATES ===' as section,
    kind,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as time_span_seconds
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY kind
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =====================================================
-- 4. CHECK MEDIA CREATION TIMELINE FOR YOUR CAR
-- =====================================================

SELECT
    '=== YOUR CAR MEDIA TIMELINE ===' as section,
    DATE(created_at) as creation_date,
    COUNT(*) as media_created_that_day,
    array_agg(DISTINCT kind ORDER BY kind) as media_types_created
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY DATE(created_at)
ORDER BY creation_date DESC;

-- =====================================================
-- 5. CHECK IF YOUR CAR WAS EVER ARCHIVED
-- =====================================================

SELECT
    '=== YOUR CAR ARCHIVE STATUS ===' as section,
    id,
    stock_number,
    archived_at,
    CASE
        WHEN archived_at IS NOT NULL THEN 'Car was archived (soft deleted)'
        ELSE 'Car was never archived'
    END as archive_status,
    'Check if soft delete was used instead of hard delete' as analysis
FROM cars
WHERE stock_number = '023656'
   OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 6. CHECK FOR ANY DELETION TRACES
-- =====================================================

-- Look for any operations that might have affected your car
SELECT
    '=== OPERATIONS AFFECTING YOUR CAR ===' as section,
    query,
    calls,
    rows,
    'Check for any operations on your car ID or stock number' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
  AND calls > 0
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
CRITICAL DISCOVERY!
===================

The timeline shows 0 orphaned media, which means:

1. NO CARS WERE DELETED: All media still has corresponding car records
2. YOUR CAR LIKELY STILL EXISTS: The "deletion" might have been something else
3. DUPLICATES WERE CREATED: But cars remained intact

POSSIBLE SCENARIOS:
===================

1. DUPLICATE MEDIA CLEANUP:
   - Duplicate media entries were created (explaining 571 operations)
   - Duplicates were cleaned up/removed
   - But the car record itself remained

2. SOFT DELETE WAS USED:
   - Car might have been "archived" instead of deleted
   - archived_at field would show this

3. PERMISSION/VISIBILITY CHANGE:
   - Car might still exist but be filtered out of your view
   - Or have different status/sale_status

4. YOUR CAR WASN'T AFFECTED:
   - The duplicate creation affected other cars
   - Your car remained untouched

WHAT TO CHECK:
==============

1. Does your car still exist in the database?
2. Does it have duplicate media entries?
3. Was it ever archived (soft deleted)?
4. Were there any operations specifically on your car?

THE KEY QUESTION:
================

If no cars were deleted (0 orphaned media), then:
- Was your car ever actually deleted?
- Or was the "571 operations" just duplicate media creation that got cleaned up?
- Is your car still there but with different status or permissions?

This completely changes the investigation from "who deleted my car" to "what happened to cause the duplicate media creation?"
*/




