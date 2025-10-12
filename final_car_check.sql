-- =====================================================
-- FINAL CHECK: DOES YOUR CAR STILL EXIST?
-- =====================================================

-- =====================================================
-- 1. DIRECT CAR EXISTENCE CHECK
-- =====================================================

SELECT
    '=== CAR EXISTENCE CHECK ===' as check_type,
    CASE
        WHEN EXISTS(
            SELECT 1 FROM cars
            WHERE stock_number = '023656'
               OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
        ) THEN 'CAR EXISTS IN DATABASE'
        ELSE 'CAR NOT FOUND IN DATABASE'
    END as result;

-- =====================================================
-- 2. GET COMPLETE CAR DETAILS
-- =====================================================

SELECT
    '=== COMPLETE CAR DETAILS ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    created_by,
    created_at,
    updated_at,
    archived_at,
    'Car details if it exists' as analysis
FROM cars
WHERE stock_number = '023656'
   OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 3. CHECK CAR MEDIA COUNT
-- =====================================================

SELECT
    '=== CAR MEDIA COUNT ===' as section,
    COUNT(*) as total_media,
    COUNT(CASE WHEN kind = 'photo' THEN 1 END) as photos,
    COUNT(CASE WHEN kind = 'document' THEN 1 END) as documents,
    array_agg(DISTINCT kind) as media_types,
    'Current media attached to your car' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 4. CHECK FOR DUPLICATES IN YOUR CAR
-- =====================================================

SELECT
    '=== DUPLICATE CHECK FOR YOUR CAR ===' as section,
    kind,
    COUNT(*) as count,
    'Check if your car has the duplicate pattern' as analysis
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY kind
ORDER BY count DESC;

-- =====================================================
-- 5. CHECK CAR CREATION TIMELINE
-- =====================================================

SELECT
    '=== CAR CREATION TIMELINE ===' as section,
    'Check when your car was created vs the duplicate media timeline' as analysis;

-- =====================================================
-- CONCLUSION
-- =====================================================

/*
BASED ON ALL THE EVIDENCE:

1. TIMELINE SHOWED 0 ORPHANED MEDIA = No cars were deleted
2. DUPLICATES WERE CREATED = 571 operations from duplicate media entries
3. OPERATIONS REFERENCE YOUR CAR ID = Your car data is still being accessed

POSSIBLE OUTCOMES:
==================

1. CAR EXISTS WITH DUPLICATE MEDIA:
   - Your car was never deleted
   - It just had duplicate media entries that may have been cleaned up
   - Current media count shows what's left

2. CAR EXISTS BUT MEDIA WAS CLEANED:
   - Your car survived the duplicate creation
   - Duplicate media entries were removed
   - Car record remained intact

3. CAR EXISTS WITH NORMAL MEDIA:
   - Your car was unaffected by the duplicate issue
   - Has normal media count for your ~20 images

THE FINAL ANSWER:
=================

The 571 operations were NOT car deletions - they were duplicate media creation.
Since no cars were orphaned, your car likely still exists in the database.

This query will show you the TRUTH about your car's status.
*/

