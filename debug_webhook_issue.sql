-- Debug Webhook Issue - Find the source of array_agg error
-- Run these queries one by one in your Supabase SQL Editor

-- 1. Check what triggers currently exist on the leads table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- 2. Check if there are any functions that might be using array_agg
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%array_agg%'
ORDER BY routine_name;

-- 3. Get the actual function definition for webhook-related functions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname ILIKE '%webhook%' OR p.proname ILIKE '%lead%')
ORDER BY p.proname;

-- 4. Check if the cars table exists (referenced in webhook function)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cars'
);

-- 5. Check the structure of the leads table to see what columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;

-- 6. Check if net extension is enabled for http_post
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'http';

-- 7. Drop any problematic triggers temporarily
DROP TRIGGER IF EXISTS trg_lead_webhook ON leads;
DROP TRIGGER IF EXISTS trg_leads_webhook ON leads;

-- 8. Check if the error persists after dropping triggers
-- Try inserting a test lead to see if the error still occurs
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
    'Test User',
    '+971',
    '555000000',
    'new_customer',
    'Test Model',
    '2yrs',
    'cash',
    CURRENT_DATE + INTERVAL '1 day',
    '10:00'
);

-- 9. Clean up test data
DELETE FROM leads WHERE phone_number = '555000000';

-- 10. List all functions to see what might be causing issues
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name; 