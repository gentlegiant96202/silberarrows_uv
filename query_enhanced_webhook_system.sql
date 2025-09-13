-- ENHANCED WEBHOOK SYSTEM DIAGNOSTIC QUERIES
-- Copy and paste these queries one by one into your Supabase SQL Editor

-- 1. Check if the enhanced webhook function exists
SELECT 
    routine_name as function_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'send_lead_webhook'
ORDER BY routine_name;

-- 2. Get the actual function definition for send_lead_webhook
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook';

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

-- 4. Check recent webhook errors (last 10)
SELECT 
    id, 
    raw_response->>'status' as http_status,
    raw_response->>'message' as error_message,
    raw_response as full_response,
    created_at 
FROM webhook_errors 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Count webhook errors by status code
SELECT 
    raw_response->>'status' as http_status,
    COUNT(*) as error_count
FROM webhook_errors 
GROUP BY raw_response->>'status'
ORDER BY error_count DESC;

-- 6. Check if net extension is enabled (required for webhooks)
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'net';

-- 7. Test webhook payload structure - check recent leads with inventory cars
SELECT 
    l.id,
    l.full_name,
    l.phone_number,
    l.country_code,
    l.appointment_date,
    l.time_slot,
    l.inventory_car_id,
    c.stock_number,
    c.vehicle_model,
    c.vehicle_details_pdf_url,
    l.created_at,
    l.updated_at
FROM leads l
LEFT JOIN cars c ON l.inventory_car_id = c.id
WHERE l.appointment_date IS NOT NULL
ORDER BY l.updated_at DESC
LIMIT 5;

-- 8. Check webhook errors from the last 24 hours
SELECT 
    id,
    raw_response->>'status' as status,
    raw_response->>'message' as message,
    created_at
FROM webhook_errors 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 9. Check if there are any leads that should have triggered webhooks recently
SELECT 
    id,
    full_name,
    status,
    appointment_date,
    time_slot,
    inventory_car_id,
    created_at,
    updated_at
FROM leads 
WHERE appointment_date IS NOT NULL
AND (created_at > NOW() - INTERVAL '24 hours' OR updated_at > NOW() - INTERVAL '24 hours')
ORDER BY updated_at DESC
LIMIT 10; 