-- FIXED ENHANCED WEBHOOK QUERIES
-- Run these queries one by one in your Supabase SQL Editor

-- 1. First, check the actual structure of webhook_errors table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'webhook_errors'
ORDER BY ordinal_position;

-- 2. Check if the enhanced webhook function exists
SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'send_lead_webhook';

-- 3. Check active triggers on leads table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 4. Check recent webhook errors (simple version)
SELECT * FROM webhook_errors ORDER BY id DESC LIMIT 10;

-- 5. Check if net extension is enabled (required for webhooks)
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'net';

-- 6. Check recent leads with appointments
SELECT 
    id,
    full_name,
    phone_number,
    country_code,
    appointment_date,
    time_slot,
    inventory_car_id,
    status,
    updated_at
FROM leads 
WHERE appointment_date IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

-- 7. Get the actual webhook function definition (if it exists)
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook'; 