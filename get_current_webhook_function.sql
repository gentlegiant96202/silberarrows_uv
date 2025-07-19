-- GET CURRENT WEBHOOK FUNCTION DEFINITION
-- Run this in Supabase SQL Editor to see exactly what your current webhook does

-- 1. Get the complete current function definition
SELECT pg_get_functiondef(p.oid) as current_webhook_function
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook';

-- 2. Also check what triggers are calling this function
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
AND action_statement LIKE '%send_lead_webhook%'
ORDER BY trigger_name; 