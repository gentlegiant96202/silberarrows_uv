-- Test script for enhanced webhook with simplified car details and formatted appointment date
-- Run this in Supabase SQL Editor AFTER running the enhanced_webhook_with_car_details.sql

-- First, let's check if we have any cars in inventory to test with
SELECT 
    id,
    stock_number,
    model_year,
    vehicle_model,
    status,
    sale_status
FROM cars 
WHERE status = 'inventory' AND sale_status = 'available'
LIMIT 3;

-- Check current webhook function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'send_lead_webhook';

-- Check current triggers on leads table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'leads'
ORDER BY trigger_name;

-- Create a test car if none exist (for testing purposes)
INSERT INTO cars (
    stock_number,
    model_year,
    vehicle_model,
    colour,
    interior_colour,
    chassis_number,
    advertised_price_aed,
    status,
    sale_status
) VALUES (
    'TEST01',
    2023,
    'MERCEDES-BENZ C-CLASS',
    'WHITE',
    'BLACK LEATHER',
    'WDD2050011A123456',
    185000,
    'inventory',
    'available'
) ON CONFLICT (stock_number) DO UPDATE SET
    model_year = EXCLUDED.model_year,
    vehicle_model = EXCLUDED.vehicle_model,
    updated_at = NOW();

-- Get the test car ID for our test
SELECT id, stock_number, vehicle_model FROM cars WHERE stock_number = 'TEST01' LIMIT 1;

-- Test the appointment date formatting
SELECT 
    CURRENT_DATE + INTERVAL '1 day' as raw_date,
    to_char(CURRENT_DATE + INTERVAL '1 day', 'DDth Mon YYYY') as formatted_date;

SELECT 
    '2025-01-24'::date as raw_date,
    to_char('2025-01-24'::date, 'DDth Mon YYYY') as formatted_date;

-- Test the make/model parsing logic directly
SELECT 
    'MERCEDES-BENZ C-CLASS' as full_model,
    CASE 
        WHEN 'MERCEDES-BENZ C-CLASS' ~ '^\S+(-\S+)?\s+' THEN
            trim(regexp_replace('MERCEDES-BENZ C-CLASS', '^(\S+(?:-\S+)?)\s+', ''))
        ELSE 'MERCEDES-BENZ C-CLASS'
    END as parsed_model_name;

SELECT 
    'BMW X5' as full_model,
    CASE 
        WHEN 'BMW X5' ~ '^\S+(-\S+)?\s+' THEN
            trim(regexp_replace('BMW X5', '^(\S+(?:-\S+)?)\s+', ''))
        ELSE 'BMW X5'
    END as parsed_model_name;

SELECT 
    'AUDI A4 QUATTRO' as full_model,
    CASE 
        WHEN 'AUDI A4 QUATTRO' ~ '^\S+(-\S+)?\s+' THEN
            trim(regexp_replace('AUDI A4 QUATTRO', '^(\S+(?:-\S+)?)\s+', ''))
        ELSE 'AUDI A4 QUATTRO'
    END as parsed_model_name;

-- Now create a test lead linked to this car
-- IMPORTANT: Replace 'TEST_CAR_ID_HERE' with the actual car ID from the query above
-- You can run this manually with the real car ID

/*
-- Example test lead creation (replace the UUID with actual car ID):

INSERT INTO leads (
    full_name,
    country_code,
    phone_number,
    status,
    model_of_interest,
    max_age,
    payment_type,
    monthly_budget,
    total_budget,
    appointment_date,
    time_slot,
    notes,
    inventory_car_id
) VALUES (
    'Test Customer Webhook Enhanced',
    '+971',
    '555987654',
    'new_customer',
    'C-CLASS',
    '2yrs',
    'monthly',
    3500,
    150000,
    '2025-01-24'::date,
    '14:30',
    'Testing enhanced webhook with simplified car details and formatted date',
    'REPLACE_WITH_ACTUAL_CAR_ID'
);

Expected webhook payload will include:
- appointment_date_formatted: "24th Jan 2025"
- car_details: {
    "stock_number": "TEST01",
    "model_year": 2023,
    "model_name": "C-CLASS"
  }
*/

-- Check webhook_errors table for any issues
SELECT COUNT(*) as error_count FROM public.webhook_errors WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Show recent webhook errors if any
SELECT 
    id,
    raw_response->>'status' as http_status,
    raw_response->>'body' as response_body,
    created_at
FROM public.webhook_errors 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- Clean up test data (optional)
-- DELETE FROM leads WHERE full_name LIKE 'Test Customer Webhook%' AND phone_number LIKE '555%';
-- DELETE FROM cars WHERE stock_number = 'TEST01'; 