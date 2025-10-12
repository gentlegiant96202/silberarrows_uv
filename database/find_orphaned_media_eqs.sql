-- =====================================================
-- FIND ORPHANED MEDIA FOR DELETED EQS 023656
-- =====================================================
-- Current car UUID: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02 (re-created)
-- Looking for orphaned media from the ORIGINAL deleted car

-- =====================================================
-- 1. CHECK MEDIA FOR CURRENT CAR (should have media)
-- =====================================================
SELECT 
    '=== CURRENT CAR MEDIA ===' as section,
    id,
    car_id,
    kind,
    url,
    filename,
    is_primary,
    sort_order,
    created_at
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
ORDER BY created_at ASC;


-- =====================================================
-- 2. FIND ALL ORPHANED MEDIA (DELETED CARS)
-- =====================================================
-- This shows media from ALL deleted cars
SELECT 
    '=== ALL ORPHANED MEDIA ===' as section,
    cm.id,
    cm.car_id as deleted_car_uuid,
    cm.kind,
    cm.url,
    cm.filename,
    cm.is_primary,
    cm.created_at,
    CASE 
        WHEN cm.url ILIKE '%023656%' THEN '🎯 MATCHES STOCK 023656'
        WHEN cm.url ILIKE '%eqs%' THEN '⚡ EQS RELATED'
        ELSE ''
    END as relevance
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Car doesn't exist = was deleted
ORDER BY cm.created_at DESC;


-- =====================================================
-- 3. ORPHANED MEDIA CREATED BEFORE RE-CREATION
-- =====================================================
-- Focus on media created BEFORE Oct 11, 2025 14:51:55
-- (before you re-created the car)
SELECT 
    '=== ORPHANED MEDIA BEFORE RE-CREATION ===' as section,
    cm.id,
    cm.car_id as original_deleted_car_uuid,
    cm.kind,
    cm.url,
    cm.filename,
    cm.is_primary,
    cm.created_at,
    CASE 
        WHEN cm.url ILIKE '%023656%' THEN '🎯 YOUR STOCK NUMBER!'
        WHEN cm.url ILIKE '%eqs%' THEN '⚡ EQS'
        ELSE ''
    END as match_status
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Deleted car
  AND cm.created_at < '2025-10-11 14:51:55'  -- Before re-creation
ORDER BY cm.created_at DESC;


-- =====================================================
-- 4. SEARCH ORPHANED EQS MEDIA BY FILENAME/URL
-- =====================================================
SELECT 
    '=== EQS ORPHANED MEDIA (SMART SEARCH) ===' as section,
    cm.id,
    cm.car_id as deleted_car_uuid,
    cm.kind,
    cm.url,
    cm.filename,
    cm.created_at,
    '🎯 POTENTIAL MATCH' as note
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL
  AND (
    cm.url ILIKE '%eqs%'
    OR cm.url ILIKE '%023656%'
    OR cm.filename ILIKE '%eqs%'
    OR cm.filename ILIKE '%023656%'
  )
ORDER BY cm.created_at DESC;


-- =====================================================
-- 5. COUNT ORPHANED MEDIA BY CAR_ID
-- =====================================================
-- Shows which deleted cars have the most orphaned media
SELECT 
    '=== ORPHANED MEDIA COUNT BY CAR ===' as section,
    cm.car_id as deleted_car_uuid,
    COUNT(*) as media_count,
    MIN(cm.created_at) as first_upload,
    MAX(cm.created_at) as last_upload,
    STRING_AGG(DISTINCT cm.kind::text, ', ') as media_types
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Deleted cars only
GROUP BY cm.car_id
ORDER BY media_count DESC;


-- =====================================================
-- 6. DETAILED VIEW OF TOP ORPHANED CAR
-- =====================================================
-- Shows all media for the deleted car with most media
-- (likely your original EQS if it had photos)
WITH top_orphaned_car AS (
    SELECT cm.car_id, COUNT(*) as cnt
    FROM car_media cm
    LEFT JOIN cars c ON cm.car_id = c.id
    WHERE c.id IS NULL
    GROUP BY cm.car_id
    ORDER BY cnt DESC
    LIMIT 1
)
SELECT 
    '=== MEDIA FROM TOP ORPHANED CAR ===' as section,
    cm.id,
    cm.car_id as deleted_car_uuid,
    cm.kind,
    cm.url,
    cm.filename,
    cm.is_primary,
    cm.sort_order,
    cm.created_at
FROM car_media cm
WHERE cm.car_id = (SELECT car_id FROM top_orphaned_car)
ORDER BY cm.sort_order, cm.created_at;


-- =====================================================
-- 7. CHECK UV CATALOG FOR ORPHANED ENTRIES
-- =====================================================
-- Maybe the deleted car is still referenced in catalog
SELECT 
    '=== ORPHANED UV CATALOG ENTRIES ===' as section,
    uc.id,
    uc.car_id as deleted_car_uuid,
    uc.title,
    uc.make,
    uc.model,
    uc.year,
    uc.price_aed,
    uc.created_at,
    uc.updated_at
FROM uv_catalog uc
LEFT JOIN cars c ON uc.car_id = c.id
WHERE c.id IS NULL  -- Car deleted
  AND (
    uc.title ILIKE '%023656%'
    OR uc.model ILIKE '%eqs%'
  )
ORDER BY uc.updated_at DESC;


-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================
/*
WHAT TO LOOK FOR:
=================

QUERY 2 & 3 (Most Important):
- If you see media with car_id that's NOT 19e93a06-d309-4e9d-9ba7-f0da0cb07c02
- That car_id is your ORIGINAL DELETED EQS!
- Look for entries with "🎯 MATCHES STOCK 023656" or "⚡ EQS RELATED"

QUERY 5:
- Shows deleted_car_uuid with most media
- If one car has many photos, it's likely your deleted EQS

QUERY 6:
- Shows all media from the car with most orphaned files
- Check if these look like EQS photos

QUERY 7:
- UV catalog might still reference the deleted car
- Shows you the deleted car's details

NEXT STEPS:
===========
1. Look for any car_id that appears in these results
2. That UUID is your original deleted EQS
3. We can then search all tables for that UUID
4. Contact the user who was active around that time (baca06fa...)

NO RESULTS?
===========
If all queries return empty:
- The car and ALL its media were completely cleaned up
- Check with user baca06fa-90e8-465e-96b7-d2693e5a949c directly
- They likely know what happened
*/

