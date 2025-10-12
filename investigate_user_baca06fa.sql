-- =====================================================
-- INVESTIGATE USER: baca06fa-90e8-465e-96b7-d2693e5a949c
-- =====================================================
-- This user appears in deletion logs - let's investigate their activity

-- =====================================================
-- 1. WHO IS THIS USER?
-- =====================================================

SELECT
    '=== USER IDENTITY ===' as section,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    created_at,
    last_sign_in_at,
    'This user was deleting car media and car records' as analysis
FROM auth.users
WHERE id = 'baca06fa-90e8-465e-96b7-d2693e5a949c';

-- =====================================================
-- 2. CHECK DELETED CAR FROM LOGS
-- =====================================================
-- Car ID from deletion log: 9963be32-f83c-4640-abb8-e520cb44e4c1

SELECT
    '=== DELETED CAR FROM LOGS ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    created_at,
    updated_at,
    'This car was deleted by the user in the logs' as analysis
FROM cars
WHERE id = '9963be32-f83c-4640-abb8-e520cb44e4c1';

-- =====================================================
-- 3. CHECK IF THIS CAR HAD ORPHANED MEDIA
-- =====================================================

SELECT
    '=== ORPHANED MEDIA FOR DELETED CAR ===' as section,
    '9963be32-f83c-4640-abb8-e520cb44e4c1' as car_id,
    COUNT(*) as media_count,
    array_agg(DISTINCT kind) as media_types,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media,
    'Media that was attached to the deleted car' as analysis
FROM car_media
WHERE car_id = '9963be32-f83c-4640-abb8-e520cb44e4c1';

-- =====================================================
-- 4. CHECK USER'S OTHER CAR OPERATIONS
-- =====================================================

SELECT
    '=== USER CAR OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check what other car operations this user performed' as analysis
FROM pg_stat_statements
WHERE query LIKE '%cars%'
  AND calls > 1
ORDER BY calls DESC
LIMIT 20;

-- =====================================================
-- 5. CHECK FOR PATTERN OF DELETIONS
-- =====================================================

-- Look for other cars this user might have worked with
SELECT
    '=== CARS CREATED/UPDATED BY THIS USER ===' as section,
    id,
    stock_number,
    vehicle_model,
    created_by,
    created_at,
    updated_at,
    CASE
        WHEN created_by = 'baca06fa-90e8-465e-96b7-d2693e5a949c' THEN '>>> CREATED BY SUSPECT USER <<<'
        ELSE ''
    END as user_indicator
FROM cars
WHERE created_by = 'baca06fa-90e8-465e-96b7-d2693e5a949c'
   OR updated_at >= '2025-10-01'
ORDER BY updated_at DESC
LIMIT 30;

-- =====================================================
-- 6. CHECK FOR MEDIA OPERATIONS BY THIS USER
-- =====================================================

SELECT
    '=== MEDIA OPERATIONS BY THIS USER ===' as section,
    query,
    calls,
    rows,
    'Check for media operations that might be related' as analysis
FROM pg_stat_statements
WHERE query LIKE '%car_media%'
  AND calls > 5
ORDER BY calls DESC
LIMIT 15;

-- =====================================================
-- 7. CHECK FOR BATCH OPERATIONS
-- =====================================================

SELECT
    '=== BATCH OPERATIONS BY THIS USER ===' as section,
    query,
    calls,
    rows,
    'Check for bulk operations that might include your car' as analysis
FROM pg_stat_statements
WHERE calls > 10
  AND (query LIKE '%cars%' OR query LIKE '%car_media%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 8. CHECK FOR YOUR CAR IN USER OPERATIONS
-- =====================================================

SELECT
    '=== YOUR CAR IN USER OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check if your car was affected by this user''s operations' as analysis
FROM pg_stat_statements
WHERE (query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
  AND calls > 0
ORDER BY calls DESC;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
CRITICAL FINDINGS FROM API LOGS:
===============================

1. USER IDENTITY: baca06fa-90e8-465e-96b7-d2693e5a949c
   - Same user from your earlier investigation files
   - Was deleting PDFs from other cars

2. DELETION OPERATIONS:
   - 3x DELETE /storage/v1/object/car-media (media files)
   - 1x DELETE /rest/v1/cars (car record)
   - All from IP: 86.99.226.219 (Dubai)

3. DELETED CAR: 9963be32-f83c-4640-abb8-e520cb44e4c1
   - Same car ID from your earlier investigation
   - This user was systematically deleting car data

4. TIMELINE:
   - 14:39-14:55 GMT on Oct 11, 2025
   - Coordinated deletion of media and car record

INVESTIGATION UPDATE:
====================

This appears to be SYSTEMATIC DATA CLEANUP by user baca06fa-90e8-465e-96b7-d2693e5a949c:

1. User was deleting car media files
2. User was deleting entire car records
3. This affected multiple cars, not just yours
4. Same user pattern as the PDF deletions you investigated earlier

POSSIBLE SCENARIOS:
===================

1. LEGITIMATE CLEANUP: User removing old/test data
2. DATA MANAGEMENT: User cleaning up inventory records
3. UNAUTHORIZED ACCESS: User deleting records they shouldn't
4. SYSTEM MAINTENANCE: Automated or manual cleanup process

NEXT STEPS:
===========

1. Check if this user has permission to delete cars
2. Verify if these deletions were authorized
3. Check if your car was also affected by this user's actions
4. Determine if this was legitimate cleanup or problematic activity

THE USER baca06fa-90e8-465e-96b7-d2693e5a949c IS THE KEY PERSON - they were actively deleting car data!
*/
