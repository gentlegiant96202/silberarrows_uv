-- FINAL WEBHOOK DIAGNOSTICS
-- Using correct column names from webhook_errors table

-- 1. Check recent webhook errors (using failed_at column)
SELECT 
    id, 
    raw_response->>'status' as http_status,
    raw_response->>'message' as error_message,
    raw_response as full_response,
    failed_at 
FROM webhook_errors 
ORDER BY failed_at DESC NULLS LAST
LIMIT 10;

-- 2. Count webhook errors by HTTP status
SELECT 
    raw_response->>'status' as http_status,
    COUNT(*) as error_count
FROM webhook_errors 
GROUP BY raw_response->>'status'
ORDER BY error_count DESC;

-- 3. Check if net extension is enabled (required for webhooks)
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'net';

-- 4. Check recent leads that should trigger webhooks
SELECT 
    id,
    full_name,
    phone_number,
    country_code,
    appointment_date,
    time_slot,
    inventory_car_id,
    status,
    created_at,
    updated_at
FROM leads 
WHERE appointment_date IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 5. Get the webhook function definition to see current logic
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook';

-- 6. Check webhook errors from last 24 hours (if any)
SELECT 
    id,
    raw_response->>'status' as status,
    raw_response->>'message' as message,
    failed_at
FROM webhook_errors 
WHERE failed_at > NOW() - INTERVAL '24 hours'
ORDER BY failed_at DESC; 