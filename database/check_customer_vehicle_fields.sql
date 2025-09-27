-- Simple check to see what vehicle fields exist in leasing_customers table

-- Step 1: Check what columns exist in leasing_customers table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leasing_customers'
AND column_name LIKE '%vehicle%'
ORDER BY column_name;

-- Step 2: Check actual data in active leases
SELECT 
    id,
    customer_name,
    vehicle_make,
    vehicle_model, 
    vehicle_year,
    selected_vehicle_id
FROM leasing_customers 
WHERE lease_status = 'active_leases'
LIMIT 3;

-- Step 3: Check if ANY customer has vehicle data
SELECT 
    COUNT(*) as total_customers,
    COUNT(vehicle_make) as has_vehicle_make,
    COUNT(vehicle_model) as has_vehicle_model,
    COUNT(vehicle_year) as has_vehicle_year,
    COUNT(selected_vehicle_id) as has_vehicle_id
FROM leasing_customers;

