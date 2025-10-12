-- =====================================================
-- FIND CAR CREATOR AND DELETION TRACE
-- =====================================================
-- Now that we know the car structure, let's trace the creator and deletion

-- =====================================================
-- 1. SEARCH FOR THE CAR ID IN ALL TABLES
-- =====================================================
-- The car ID was: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02
-- Let's search for any remaining references to this car

-- Search in car_media table (most likely place to find traces)
SELECT
    '=== CAR_MEDIA REFERENCES ===' as section,
    car_id,
    COUNT(*) as media_count,
    array_agg(DISTINCT kind) as media_types,
    MIN(created_at) as earliest_media,
    MAX(created_at) as latest_media
FROM car_media
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02'
GROUP BY car_id;

-- Search in uv_catalog table
SELECT
    '=== UV_CATALOG REFERENCES ===' as section,
    car_id,
    title,
    status,
    created_at,
    updated_at
FROM uv_catalog
WHERE car_id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- Search in leads table for any mentions
SELECT
    '=== LEADS REFERENCES ===' as section,
    id,
    full_name,
    phone_number,
    model_of_interest,
    notes,
    created_at,
    updated_at
FROM leads
WHERE model_of_interest ILIKE '%023656%'
   OR notes::text ILIKE '%023656%'
   OR model_of_interest ILIKE '%EQS%';

-- =====================================================
-- 2. SEARCH FOR CAR CREATOR (created_by field)
-- =====================================================
-- The created_by field would tell us who originally created the car
-- Car ID: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02

-- This query would have worked if the car still existed:
-- SELECT created_by FROM cars WHERE id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- Since it's deleted, let's look for other cars created by the same user
-- First, let's find all unique created_by values from existing cars
SELECT
    '=== FIND CREATED_BY VALUES ===' as section,
    created_by,
    COUNT(*) as cars_created,
    MIN(created_at) as first_car_created,
    MAX(created_at) as last_car_created
FROM cars
WHERE created_by IS NOT NULL
GROUP BY created_by
ORDER BY cars_created DESC;

-- =====================================================
-- 3. SEARCH FOR CARS CREATED AROUND THE SAME TIME
-- =====================================================
-- The car was created on Oct 11, 2025 14:51:55 (from your earlier investigation)
-- Let's find other cars created around that time

SELECT
    '=== CARS CREATED AROUND OCT 11, 2025 ===' as section,
    id,
    stock_number,
    vehicle_model,
    created_by,
    created_at,
    updated_at
FROM cars
WHERE DATE(created_at) = '2025-10-11'
ORDER BY created_at DESC;

-- =====================================================
-- 4. CHECK FOR AUDIT TRAIL OF CAR CREATION/DELETION
-- =====================================================

-- Look for any tables that might track car changes
SELECT
    '=== POTENTIAL CAR AUDIT TABLES ===' as section,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE (tablename LIKE '%car%'
   OR tablename LIKE '%audit%'
   OR tablename LIKE '%log%'
   OR tablename LIKE '%history%')
  AND schemaname = 'public'
ORDER BY tablename;

-- Check if there are any triggers that might log car changes
SELECT
    '=== CAR-RELATED TRIGGERS ===' as section,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'cars'
ORDER BY trigger_name;

-- =====================================================
-- 5. SEARCH FOR THE CREATOR USER IN AUTH TABLE
-- =====================================================
-- Let's find the user who might have created the car
-- We'll need to get the created_by UUID from the cars created around that time

-- First, let's see if we can find a pattern in created_by values
SELECT
    '=== CREATED_BY ANALYSIS ===' as section,
    created_by,
    COUNT(*) as count,
    array_agg(DISTINCT stock_number) as stock_numbers,
    array_agg(DISTINCT vehicle_model) as models
FROM cars
WHERE created_by IS NOT NULL
  AND created_at >= '2025-10-01'
  AND created_at <= '2025-10-31'
GROUP BY created_by
ORDER BY count DESC;

-- =====================================================
-- 6. CHECK FOR CAR DELETION IN POSTGRESQL LOGS
-- =====================================================

-- Look for DELETE operations that might have removed the car
SELECT
    '=== DELETE OPERATIONS ON CARS ===' as section,
    query,
    calls,
    rows,
    'Direct car deletions' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE FROM "public"."cars"%'
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 7. CHECK FOR BULK OPERATIONS
-- =====================================================

-- Look for any bulk operations that might have included this car
SELECT
    '=== BULK OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check for bulk delete operations' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
  AND (query LIKE '%cars%' OR query LIKE '%WHERE%')
  AND calls > 1
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
KEY INSIGHTS:
=============

1. CAR STRUCTURE:
   - created_by: Tracks who created the car (UUID)
   - stock_number: The field we know (023656)
   - archived_at: Suggests soft delete capability exists

2. INVESTIGATION STRATEGY:
   - Find the created_by user who originally created this car
   - That user might be the one who deleted it, or know who did
   - Look for other cars created by the same user around the same time
   - Check if there are audit trails that captured the created_by before deletion

3. TRACES TO LOOK FOR:
   - car_media entries that still reference the car ID
   - uv_catalog entries that weren't cleaned up
   - leads that mention the stock number
   - Other cars created by the same user

4. RECOVERY APPROACHES:
   - Find the created_by user ID from other cars created that day
   - Check auth.users table for that user's identity
   - Look for application logs that might show who deleted cars
   - Check if there are any backup systems or audit tables

NEXT STEPS:
1. Look for the created_by user who created cars on Oct 11, 2025
2. Check if that user has a pattern of creating/deleting cars
3. Find their identity in the auth.users table
4. Check application logs for deletion operations by that user
*/

