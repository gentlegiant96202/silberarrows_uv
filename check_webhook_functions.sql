-- Check specific webhook functions that might be causing the array_agg error
-- Run these queries in your Supabase SQL Editor

-- 1. Check the lead_funnel function (this might be using array_agg)
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'lead_funnel';

-- 2. Check the leads_webhook_trg function
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'leads_webhook_trg';

-- 3. Check the send_lead_webhook function
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook';

-- 4. Check what triggers are currently active on the leads table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 5. Check if any of these functions contain array_agg
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname IN ('lead_funnel', 'leads_webhook_trg', 'send_lead_webhook'))
AND pg_get_functiondef(p.oid) ILIKE '%array_agg%'
ORDER BY p.proname; 