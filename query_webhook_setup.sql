-- Query Current Webhook Setup in Supabase Database
-- Run these queries in your Supabase SQL Editor to see what's currently configured

-- 1. Check for webhook-related functions
SELECT 
    routine_name as function_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name ILIKE '%webhook%' OR routine_name ILIKE '%lead%')
ORDER BY routine_name;

-- 2. Check for triggers on the leads table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement,
    action_condition,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 3. Check for any Supabase realtime webhooks (if using realtime)
SELECT * FROM supabase_realtime.webhooks 
WHERE table_name = 'leads' OR table_name IS NULL
ORDER BY created_at DESC;

-- 4. Check if net extension is enabled (needed for http_post)
SELECT * FROM pg_extension WHERE extname = 'http';

-- 5. Check current function definitions that might be sending webhooks
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (pg_get_functiondef(p.oid) ILIKE '%http_post%' OR pg_get_functiondef(p.oid) ILIKE '%webhook%')
ORDER BY p.proname;

-- 6. Check for any scheduled functions or cron jobs
SELECT * FROM cron.job WHERE command ILIKE '%lead%' OR command ILIKE '%webhook%';

-- 7. List all functions in public schema to see what exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name; 