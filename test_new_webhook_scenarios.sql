-- TEST NEW WEBHOOK SCENARIOS
-- Run these after updating the webhook function

-- 1. Verify the function was updated (should show webhook_version 2.2)
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'send_lead_webhook';

-- 2. Test data - Check recent leads with cars to see what would trigger
SELECT 
    id,
    full_name,
    inventory_car_id,
    appointment_date,
    time_slot,
    status,
    created_at,
    CASE 
        WHEN inventory_car_id IS NOT NULL AND appointment_date IS NULL THEN 'Would trigger: lead_created_with_vehicle'
        WHEN inventory_car_id IS NOT NULL AND appointment_date IS NOT NULL THEN 'Would trigger: appointment_created_with_vehicle'
        WHEN inventory_car_id IS NULL AND appointment_date IS NOT NULL THEN 'Would trigger: appointment_created_without_vehicle'
        ELSE 'No webhook trigger'
    END as webhook_scenario
FROM leads 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check for any webhook errors after the update
SELECT 
    id,
    raw_response->>'status' as http_status,
    failed_at
FROM webhook_errors 
ORDER BY failed_at DESC NULLS LAST
LIMIT 5; 