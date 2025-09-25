-- =====================================================
-- TEST APPOINTMENT TIME SAVING
-- =====================================================
-- This script tests if appointment_time field accepts the format we're sending

-- Step 1: Check current appointment times in the database
SELECT id, customer_name, appointment_date, appointment_time, lease_status
FROM leasing_customers 
WHERE appointment_time IS NOT NULL
LIMIT 5;

-- Step 2: Test inserting a time value directly
-- INSERT INTO leasing_customers (
--     customer_name, 
--     customer_phone, 
--     appointment_date, 
--     appointment_time, 
--     lease_status
-- ) VALUES (
--     'Test Customer', 
--     '+971501234567', 
--     CURRENT_DATE + INTERVAL '1 day', 
--     '14:30',  -- This is the format our frontend sends
--     'appointments'
-- );

-- Step 3: Check if the test record was inserted correctly
-- SELECT id, customer_name, appointment_date, appointment_time, lease_status
-- FROM leasing_customers 
-- WHERE customer_name = 'Test Customer';

-- Step 4: Check the data type of appointment_time column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leasing_customers' 
  AND column_name = 'appointment_time';

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*
1. Run the SELECT queries first to see current data
2. Uncomment and run the INSERT to test time format
3. Check if the time saves correctly
4. If it works, the issue is in the frontend
5. If it fails, there's a database constraint issue
*/
