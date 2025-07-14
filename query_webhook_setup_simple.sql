-- Simplified Query for Current Webhook Setup
-- Run these queries one by one in your Supabase SQL Editor

-- 1. Check for webhook-related functions
SELECT 
    routine_name as function_name,
    routine_type
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
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 3. Check if http extension is enabled (needed for net.http_post)
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('http', 'net');

-- 4. Get the actual function definition for webhook functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname ILIKE '%webhook%' OR p.proname ILIKE '%lead%')
ORDER BY p.proname;

-- 5. List all functions in public schema
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name; 