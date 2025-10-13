-- =====================================================
-- CHECK ACTUAL CAR MEDIA STATE (FIXED)
-- =====================================================
-- Fixed for enum values in car_media table

-- =====================================================
-- 1. CHECK ENUM VALUES FIRST
-- =====================================================

SELECT
    '=== CHECK MEDIA_KIND_ENUM VALUES ===' as section,
    string_agg(enumlabel, ', ' ORDER BY enumsortorder) as valid_enum_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'media_kind_enum';

-- =====================================================
-- 2. BASIC CAR_MEDIA TABLE STATS
-- =====================================================

SELECT
    '=== CAR_MEDIA TABLE STATS ===' as section,
    COUNT(*) as total_media_records,
    COUNT(DISTINCT car_id) as unique_cars_with_media,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media,
    array_agg(DISTINCT kind ORDER BY kind) as media_types
FROM car_media;

-- =====================================================
-- 3. CHECK FOR ORPHANED MEDIA (cars that don't exist)
-- =====================================================

SELECT
    '=== ORPHANED MEDIA STATS ===' as section,
    COUNT(*) as total_orphaned_media,
    COUNT(DISTINCT car_id) as unique_orphaned_cars,
    array_agg(DISTINCT kind ORDER BY kind) as media_types,
    MIN(cm.created_at) as earliest_orphaned_media,
    MAX(cm.created_at) as latest_orphaned_media
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL;

-- =====================================================
-- 4. CHECK YOUR SPECIFIC CAR ID
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
-- 5. CHECK RECENT CAR_MEDIA ACTIVITY
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
-- 6. CHECK FOR BULK OPERATIONS IN CAR_MEDIA
-- =====================================================

-- Check if there are many records with the same created_at (bulk insert)
SELECT
    '=== MEDIA CREATED AT SAME TIME ===' as section,
    created_at,
    COUNT(*) as records_at_same_time,
    COUNT(DISTINCT car_id) as cars_affected,
    array_agg(DISTINCT kind ORDER BY kind) as media_types
FROM car_media
WHERE created_at >= '2025-10-01'
GROUP BY created_at
HAVING COUNT(*) > 5
ORDER BY records_at_same_time DESC
LIMIT 10;

-- =====================================================
-- 7. CHECK FOR DUPLICATE OPERATIONS
-- =====================================================

-- Look for the same car_id and kind combinations (might explain multiple operations)
SELECT
    '=== DUPLICATE CAR_ID+KIND COMBINATIONS ===' as section,
    car_id,
    kind,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM car_media
WHERE created_at >= '2025-10-01'
GROUP BY car_id, kind
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
UNDERSTANDING THE 571 OPERATIONS:

Now that we know the actual enum values, we can better understand:

1. ENUM VALUES: First section shows valid media types
2. ACTUAL COUNTS: Real numbers vs the 571 mentioned
3. DUPLICATE PATTERNS: Might explain multiple operations per file
4. BULK OPERATIONS: Large batches created at once

POSSIBLE EXPLANATIONS FOR 571 OPERATIONS:

1. BULK IMPORT: 571 files imported across multiple cars
2. DUPLICATE OPERATIONS: Same files processed multiple times
3. RETRY LOGIC: Failed operations retried multiple times
4. API CALLS: Each file upload counted as separate operation

WHAT TO LOOK FOR:

1. The valid enum values for media kinds
2. Actual vs expected numbers
3. Patterns that might explain the high operation count
4. Whether this was bulk import vs individual operations

THE KEY INSIGHT:

If you have ~20 images per car and multiple cars, the 571 operations might represent:
- 571 total media files across all cars
- Or 571 operations (including retries/failures) for fewer files
- Or a bulk import process that touched many files

This query will show us the REAL numbers and patterns!
*/




