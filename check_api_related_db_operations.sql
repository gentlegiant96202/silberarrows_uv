-- =====================================================
-- CHECK API-RELATED DATABASE OPERATIONS
-- =====================================================
-- SQL queries to find API operations that affected your car

-- =====================================================
-- 1. CHECK FOR POSTGREST OPERATIONS (Supabase API)
-- =====================================================

SELECT
    '=== POSTGREST OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'PostgREST generates these queries for API calls' as analysis
FROM pg_stat_statements
WHERE query LIKE '%pgrst_source%'
  AND (query LIKE '%car_media%'
       OR query LIKE '%cars%'
       OR query LIKE '%19e93a06-d309-4e9d-9ba7-f0da0cb07c02%'
       OR query LIKE '%023656%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 2. CHECK FOR RLS (Row Level Security) OPERATIONS
-- =====================================================

SELECT
    '=== RLS SECURITY OPERATIONS ===' as section,
    query,
    calls,
    rows,
    'Check for security policy operations' as analysis
FROM pg_stat_statements
WHERE query LIKE '%rls%'
  AND (query LIKE '%car_media%' OR query LIKE '%cars%')
ORDER BY calls DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK FOR AUTHENTICATION LOGS
-- =====================================================

-- Check auth.users table for user activity
SELECT
    '=== USER ACTIVITY CHECK ===' as section,
    id,
    email,
    last_sign_in_at,
    'Check which users were active around the time' as analysis
FROM auth.users
WHERE last_sign_in_at >= '2025-10-01'
ORDER BY last_sign_in_at DESC
LIMIT 20;

-- =====================================================
-- 4. CHECK FOR SESSION ACTIVITY
-- =====================================================

SELECT
    '=== SESSION ACTIVITY ===' as section,
    user_id,
    created_at,
    ip,
    user_agent,
    'Check for user sessions that might have made API calls' as analysis
FROM auth.sessions
WHERE created_at >= '2025-10-01'
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- 5. CHECK FOR AUDIT TRAIL IF EXISTS
-- =====================================================

-- Check for any audit tables that might log API operations
SELECT
    '=== AUDIT TABLE CHECK ===' as section,
    'Run this to see if audit tables exist' as note;

-- =====================================================
-- WHERE TO FIND ACTUAL API LOGS
-- =====================================================

/*
API LOGS ARE NOT IN THE DATABASE - CHECK THESE LOCATIONS:

1. SUPABASE DASHBOARD:
   - Go to: https://app.supabase.com
   - Select your project
   - Navigate to: Logs → API
   - Filter by: DELETE operations, car_media, your car ID

2. APPLICATION LOGS:
   - In your project: /logs/ or server logs
   - Search for: "DELETE", "car_media", "023656"
   - Check: API endpoint logs, middleware logs

3. BROWSER NETWORK TAB:
   - Open browser DevTools → Network tab
   - Reproduce the issue (try to delete media)
   - Look for: API calls to your endpoints

4. SERVER LOGS:
   - Check your hosting platform logs
   - Look for: HTTP requests, API calls, errors

5. WEBHOOK/EXTERNAL SERVICE LOGS:
   - If you have webhooks for media operations
   - Check: Webhook delivery logs, external API logs

6. CDN/STORAGE LOGS:
   - If media files are stored externally
   - Check: File access logs, deletion logs

SQL QUERIES ABOVE WILL SHOW:
- PostgREST operations (API-generated queries)
- User authentication activity
- Session information
- Any database-level audit trails

For ACTUAL API logs, check your Supabase dashboard and application logs!
*/




