-- Check the specific functions that might contain array_agg
-- Run these queries one by one in your Supabase SQL Editor

-- 1. Check the lead_funnel function (most likely culprit)
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

-- 4. Find any function that contains array_agg
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%array_agg%'
ORDER BY p.proname;

-- 5. If the error is happening during INSERT/UPDATE, let's test without any triggers
-- First, let's try a simple test insert to see if the error occurs
INSERT INTO leads (
    full_name,
    country_code,
    phone_number,
    status,
    model_of_interest,
    max_age,
    payment_type,
    appointment_date,
    time_slot
) VALUES (
    'Test Webhook User',
    '+971',
    '555999999',
    'new_customer',
    'Test Model',
    '2yrs',
    'cash',
    CURRENT_DATE + INTERVAL '1 day',
    '10:00'
);

-- 6. If the insert works, the error might be in a specific function call
-- Let's clean up the test data
DELETE FROM leads WHERE phone_number = '555999999'; 