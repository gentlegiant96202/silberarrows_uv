-- WEBHOOK DIAGNOSTIC QUERIES
-- Copy and paste these queries one by one into your Supabase SQL Editor

-- 1. Check all webhook-related functions currently active
SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name ILIKE '%webhook%' OR routine_name ILIKE '%lead%' OR routine_name ILIKE '%queue%')
ORDER BY routine_name;

-- 2. Check all triggers on the leads table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 3. Check if required extensions are enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('http', 'net');

-- 4. Check if webhook_queue table exists
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'webhook_queue';

-- 5. If webhook_queue exists, check its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'webhook_queue'
ORDER BY ordinal_position;

-- 6. Check recent webhook queue entries (if table exists)
-- Run this separately if webhook_queue table exists:
-- SELECT id, event_type, processed, error_message, created_at 
-- FROM webhook_queue 
-- ORDER BY created_at DESC 
-- LIMIT 10;

-- 7. Get the actual function definitions for active webhook functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname ILIKE '%webhook%' OR p.proname ILIKE '%lead%' OR p.proname ILIKE '%queue%')
ORDER BY p.proname;

-- 8. Check if webhook_errors table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'webhook_errors';

-- 9. Check recent webhook errors (if table exists)
-- Run this separately if webhook_errors table exists:
-- SELECT id, raw_response, created_at 
-- FROM webhook_errors 
-- ORDER BY created_at DESC 
-- LIMIT 5; 