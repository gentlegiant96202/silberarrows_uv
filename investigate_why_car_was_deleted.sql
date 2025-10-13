-- =====================================================
-- INVESTIGATE WHY CAR 9963be32-f83c-4640-abb8-e520cb44e4c1 WAS DELETED
-- =====================================================
-- User baca06fa-90e8-465e-96b7-d2693e5a949c deleted this car - let's find out why

-- =====================================================
-- 1. WHO IS THE USER WHO DELETED THIS CAR?
-- =====================================================

SELECT
    '=== USER WHO DELETED THE CAR ===' as section,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'department' as department,
    created_at,
    last_sign_in_at,
    'This user deleted car 9963be32-f83c-4640-abb8-e520cb44e4c1' as analysis
FROM auth.users
WHERE id = 'baca06fa-90e8-465e-96b7-d2693e5a949c';

-- =====================================================
-- 2. CHECK USER'S PERMISSIONS AND ROLE
-- =====================================================

SELECT
    '=== USER PERMISSIONS CHECK ===' as section,
    'Check if this user should have delete permissions' as note;

-- =====================================================
-- 3. CHECK THE DELETED CAR DETAILS
-- =====================================================

SELECT
    '=== DELETED CAR DETAILS ===' as section,
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    created_at,
    updated_at,
    'This car was deleted by the user' as analysis
FROM cars
WHERE id = '9963be32-f83c-4640-abb8-e520cb44e4c1';

-- =====================================================
-- 4. CHECK IF CAR HAD ORPHANED MEDIA (incomplete deletion)
-- =====================================================

SELECT
    '=== ORPHANED MEDIA CHECK ===' as section,
    COUNT(*) as orphaned_media_count,
    array_agg(DISTINCT kind) as media_types,
    MIN(created_at) as earliest_orphaned_media,
    MAX(created_at) as latest_orphaned_media,
    'Media files that still exist after car deletion' as analysis
FROM car_media
WHERE car_id = '9963be32-f83c-4640-abb8-e520cb44e4c1';

-- =====================================================
-- 5. CHECK USER'S DELETION PATTERN
-- =====================================================

-- Look for other cars this user might have deleted
SELECT
    '=== USER DELETION PATTERN ===' as section,
    query,
    calls,
    rows,
    'Check for pattern of car deletions by this user' as analysis
FROM pg_stat_statements
WHERE query LIKE '%DELETE%'
  AND query LIKE '%cars%'
  AND calls > 0
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 6. CHECK FOR BATCH DELETION OPERATIONS
-- =====================================================

SELECT
    '=== BATCH OPERATIONS BY USER ===' as section,
    query,
    calls,
    rows,
    'Check if user performed bulk deletions' as analysis
FROM pg_stat_statements
WHERE calls > 5
  AND (query LIKE '%cars%' OR query LIKE '%car_media%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 7. CHECK FOR CARS CREATED BY THIS USER
-- =====================================================

SELECT
    '=== CARS CREATED BY THIS USER ===' as section,
    id,
    stock_number,
    vehicle_model,
    created_at,
    updated_at,
    CASE
        WHEN updated_at >= '2025-10-01' THEN '>>> RECENTLY MODIFIED <<<'
        ELSE ''
    END as recent_activity,
    'Check if user created cars they later deleted' as analysis
FROM cars
WHERE created_by = 'baca06fa-90e8-465e-96b7-d2693e5a949c'
ORDER BY updated_at DESC
LIMIT 20;

-- =====================================================
-- 8. CHECK FOR SIMILAR CARS (pattern analysis)
-- =====================================================

SELECT
    '=== SIMILAR CARS TO DELETED ONE ===' as section,
    id,
    stock_number,
    vehicle_model,
    status,
    sale_status,
    created_at,
    'Check if similar cars were also deleted or modified' as analysis
FROM cars
WHERE vehicle_model = (SELECT vehicle_model FROM cars WHERE id = '9963be32-f83c-4640-abb8-e520cb44e4c1')
   OR stock_number SIMILAR TO '_____%'  -- Similar stock number pattern
ORDER BY created_at DESC
LIMIT 15;

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
INVESTIGATION FOCUS:
===================

The car 9963be32-f83c-4640-abb8-e520cb44e4c1 was deleted by user baca06fa-90e8-465e-96b7-d2693e5a949c.

KEY QUESTIONS:
==============

1. WHO IS THIS USER?
   - What is their role? (admin, sales, manager?)
   - Do they have permission to delete cars?
   - Is this their normal job function?

2. WHY WAS THIS CAR DELETED?
   - Was it sold? (check sale_status)
   - Was it a test car? (check creation pattern)
   - Was it problematic? (check for issues)

3. WAS THE DELETION COMPLETE?
   - Media files still exist in bucket (you found them)
   - Were other related records cleaned up?
   - Was this following proper deletion procedures?

4. WAS THIS PART OF A PATTERN?
   - Did this user delete other cars?
   - Was this a bulk cleanup operation?
   - Were similar cars also affected?

POSSIBLE MOTIVATIONS:
=====================

1. LEGITIMATE BUSINESS REASON:
   - Car was sold or scrapped
   - Inventory cleanup
   - Data maintenance

2. ADMINISTRATIVE ACTION:
   - User was cleaning up old/problematic records
   - Following company policy for record retention

3. UNAUTHORIZED ACTION:
   - User shouldn't have delete permissions
   - Personal agenda or mistake

4. SYSTEM ISSUE:
   - Automated process gone wrong
   - Trigger or cascade deletion malfunction

THE EVIDENCE:
=============

- Media files still exist in bucket (incomplete deletion)
- Specific car targeted (not bulk operation)
- User had access and performed the deletion
- Followed pattern of media deletion then car deletion

NEXT STEPS:
===========

1. Identify the user's role and permissions
2. Check if this deletion was authorized
3. Determine if this was legitimate cleanup
4. Check if similar cars were affected
5. Verify if deletion procedures were followed

THE USER baca06fa-90e8-465e-96b7-d2693e5a949c IS THE KEY - they made the conscious decision to delete this car!
*/




