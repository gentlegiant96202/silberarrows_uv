-- Debug vehicle data fetching issue
-- Run this to see what's happening with vehicle data

-- Step 1: Check if customers have selected_vehicle_id
SELECT 
    id,
    customer_name,
    selected_vehicle_id,
    CASE 
        WHEN selected_vehicle_id IS NOT NULL THEN 'HAS VEHICLE ID'
        ELSE 'NO VEHICLE ID'
    END as has_vehicle
FROM leasing_customers 
WHERE lease_status = 'active_leases'
ORDER BY created_at DESC;

-- Step 2: Check what fields exist in leasing_inventory table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory'
ORDER BY ordinal_position;

-- Step 3: Check actual vehicle records and their data
SELECT 
    id,
    stock_number,
    make,
    COALESCE(vehicle_model, model) as model_field,
    COALESCE(model_year, year) as year_field,
    COALESCE(colour, color, exterior_color) as color_field,
    COALESCE(chassis_number, vin_number) as vin_field,
    COALESCE(plate_number, registration_number) as plate_field,
    COALESCE(current_mileage_km, mileage_km) as mileage_field
FROM leasing_inventory 
LIMIT 5;

-- Step 4: Check if there's a relationship between customers and vehicles
SELECT 
    c.customer_name,
    c.selected_vehicle_id,
    v.make,
    v.stock_number
FROM leasing_customers c
LEFT JOIN leasing_inventory v ON c.selected_vehicle_id = v.id
WHERE c.lease_status = 'active_leases'
LIMIT 5;

