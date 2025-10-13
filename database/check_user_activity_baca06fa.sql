-- =====================================================
-- CHECK ACTIVITY FOR USER: baca06fa-90e8-465e-96b7-d2693e5a949c
-- =====================================================
-- This user deleted PDFs from multiple cars on Oct 11, 2025
-- Let's see what cars they've been working with

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
    email_confirmed_at
FROM auth.users
WHERE id = 'baca06fa-90e8-465e-96b7-d2693e5a949c';


-- =====================================================
-- 2. CHECK CAR FROM FIRST STORAGE LOG
-- =====================================================
-- Car ID: 9963be32-f83c-4640-abb8-e520cb44e4c1
SELECT 
    '=== CAR 1 (from first log) ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    customer_name,
    created_at,
    updated_at
FROM cars
WHERE id = '9963be32-f83c-4640-abb8-e520cb44e4c1';


-- =====================================================
-- 3. CHECK CAR FROM SECOND STORAGE LOG
-- =====================================================
-- Car ID: 7e11784c-cb3d-47c7-be08-a76fdec648b6
SELECT 
    '=== CAR 2 (from second log) ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    customer_name,
    created_at,
    updated_at
FROM cars
WHERE id = '7e11784c-cb3d-47c7-be08-a76fdec648b6';


-- =====================================================
-- 4. CHECK YOUR EQS (for comparison)
-- =====================================================
-- Your EQS Car ID: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02
SELECT 
    '=== YOUR EQS 023656 ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    customer_name,
    created_at,
    updated_at
FROM cars
WHERE id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';


-- =====================================================
-- 5. ALL CARS MODIFIED/CREATED ON OCT 11, 2025
-- =====================================================
-- Show all cars this user might have worked with that day
SELECT 
    '=== ALL CARS ON OCT 11, 2025 ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    created_at,
    updated_at,
    CASE 
        WHEN id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02' THEN '>>> YOUR EQS <<<'
        WHEN id = '9963be32-f83c-4640-abb8-e520cb44e4c1' THEN 'PDF deleted (log 1)'
        WHEN id = '7e11784c-cb3d-47c7-be08-a76fdec648b6' THEN 'PDF deleted (log 2)'
        ELSE ''
    END as note
FROM cars
WHERE DATE(created_at) = '2025-10-11'
   OR DATE(updated_at) = '2025-10-11'
ORDER BY updated_at DESC;


-- =====================================================
-- 6. CHECK FOR DELETED CARS WITH ORPHANED MEDIA
-- =====================================================
-- Maybe one of these orphaned media entries is your deleted EQS?
SELECT 
    '=== ORPHANED MEDIA (DELETED CARS) ===' as section,
    cm.id,
    cm.car_id as deleted_car_id,
    cm.kind,
    cm.url,
    cm.filename,
    cm.created_at,
    CASE 
        WHEN cm.url ILIKE '%023656%' THEN '>>> MATCHES YOUR STOCK NUMBER <<<'
        WHEN cm.url ILIKE '%eqs%' THEN 'EQS related'
        ELSE ''
    END as match_status
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Orphaned (car was deleted)
ORDER BY cm.created_at DESC
LIMIT 50;


-- =====================================================
-- 7. SEARCH FOR ANY EQS DELETED RECENTLY
-- =====================================================
-- Look for orphaned EQS media created before Oct 11
SELECT 
    '=== EQS ORPHANED MEDIA ===' as section,
    cm.id,
    cm.car_id as deleted_eqs_car_id,
    cm.kind,
    cm.url,
    cm.filename,
    cm.created_at
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Car was deleted
  AND (
    cm.url ILIKE '%eqs%'
    OR cm.filename ILIKE '%eqs%'
  )
  AND cm.created_at < '2025-10-11 14:51:55'  -- Before you re-created it
ORDER BY cm.created_at DESC;


-- =====================================================
-- SUMMARY
-- =====================================================
/*
STORAGE LOGS YOU PROVIDED:
===========================
1. PDF deleted from car: 9963be32-f83c-4640-abb8-e520cb44e4c1
   - File: vehicle-details-1760193161550.pdf
   - Time: Oct 11, 2025 ~14:53 UTC
   
2. PDF deleted from car: 7e11784c-cb3d-47c7-be08-a76fdec648b6
   - File: vehicle-details-1760167910381.pdf
   - Time: Oct 11, 2025 ~15:08 UTC

Both by user: baca06fa-90e8-465e-96b7-d2693e5a949c
Both from IP: 86.99.226.219 (Dubai)

YOUR EQS 023656:
================
Car ID: 19e93a06-d309-4e9d-9ba7-f0da0cb07c02
Created: Oct 11, 2025 14:51:55 (re-created)

CONCLUSION:
===========
The storage logs show PDF deletions from OTHER cars.
To find your EQS deletion, you MUST check:

SUPABASE DASHBOARD → LOGS → POSTGRES LOGS
(NOT Storage API logs)

Search for: DELETE FROM cars
*/





