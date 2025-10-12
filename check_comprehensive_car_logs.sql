-- =====================================================
-- CHECK COMPREHENSIVE CAR LOGS
-- =====================================================
-- Since pg_stat_statements didn't show your car operations,
-- let's check all possible log sources

-- =====================================================
-- 1. CHECK FOR AUDIT TABLES
-- =====================================================

SELECT
    '=== CHECK FOR AUDIT TABLES ===' as section,
    schemaname,
    tablename,
    tableowner,
    'Look for any audit or history tables' as analysis
FROM pg_tables
WHERE (tablename LIKE '%audit%'
   OR tablename LIKE '%log%'
   OR tablename LIKE '%history%'
   OR tablename LIKE '%track%')
  AND schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. CHECK FOR DATABASE TRIGGERS ON CAR TABLES
-- =====================================================

SELECT
    '=== DATABASE TRIGGERS ===' as section,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    'Check if there are triggers that might log car changes' as analysis
FROM information_schema.triggers
WHERE event_object_table IN ('cars', 'car_media')
ORDER BY trigger_name;

-- =====================================================
-- 3. CHECK CAR TABLE CHANGES VIA UPDATED_AT
-- =====================================================

SELECT
    '=== CAR TABLE CHANGES ===' as section,
    id,
    stock_number,
    updated_at,
    'Check when your car was last modified' as analysis
FROM cars
WHERE stock_number = '023656'
   OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02';

-- =====================================================
-- 4. CHECK FOR ARCHIVED CARS
-- =====================================================

SELECT
    '=== ARCHIVED CARS CHECK ===' as section,
    COUNT(*) as archived_cars,
    'Check if soft delete was used' as analysis
FROM cars
WHERE archived_at IS NOT NULL
  AND (stock_number = '023656'
       OR id = '19e93a06-d309-4e9d-9ba7-f0da0cb07c02');

-- =====================================================
-- 5. CHECK APPLICATION LOG FILES
-- =====================================================

SELECT
    '=== CHECK APPLICATION LOGS ===' as section,
    'Application logs might show media deletion operations' as recommendation;

-- =====================================================
-- 6. CHECK FOR BACKUP/RECOVERY DATA
-- =====================================================

SELECT
    '=== CHECK BACKUP DATA ===' as section,
    'Point-in-Time Recovery might show historical state' as recommendation;

-- =====================================================
-- 7. CHECK FOR API/WEBHOOK LOGS
-- =====================================================

SELECT
    '=== CHECK API LOGS ===' as section,
    'Webhook or API logs might show media operations' as recommendation;

-- =====================================================
-- ALTERNATIVE LOGGING APPROACHES
-- =====================================================

/*
SINCE PG_STAT_STATEMENTS DIDN'T CAPTURE YOUR CAR OPERATIONS:

1. APPLICATION LOGS:
   - Check your Next.js application logs
   - Look for API calls that delete car media
   - Check for user actions that might have removed media

2. SYSTEM LOGS:
   - Check server logs for your application
   - Look for database connection logs
   - Check for file system operations on media files

3. DATABASE LOGS (Advanced):
   - Enable PostgreSQL statement logging
   - Check PostgreSQL log files directly
   - Use pg_log or similar extensions

4. AUDIT TABLES:
   - If your application has audit triggers
   - Check for custom logging tables
   - Look for application-specific audit trails

5. POINT-IN-TIME RECOVERY:
   - If PITR is enabled, you can restore to before the deletion
   - Create a test database at different points in time
   - See when your car's media disappeared

RECOMMENDED NEXT STEPS:
=======================

1. CHECK APPLICATION LOGS:
   - Look in your project logs for media deletion operations
   - Search for API calls that might have removed car media

2. ENABLE STATEMENT LOGGING:
   - Temporarily enable PostgreSQL statement logging
   - This will capture ALL queries including media deletions

3. CHECK FILE SYSTEM:
   - Verify if media files still exist on disk
   - Check file modification times

4. CHECK API/WEBHOOK LOGS:
   - If you have webhooks or external integrations
   - Check if they logged the media operations

THE KEY INSIGHT:
================

The fact that pg_stat_statements didn't capture operations on your specific car suggests the deletion happened through:

- Application API calls (not direct SQL)
- Stored procedures or functions
- Triggers that don't log to pg_stat_statements
- External processes or scripts

Let's check these alternative log sources to find the real story!
*/

