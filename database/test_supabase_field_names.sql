-- Test what field names Supabase actually returns
-- Run this in your Supabase SQL editor or psql

SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name IN (
    'vehicle_model', 'model_family', 
    'colour', 'interior_colour',
    'exterior_color', 'interior_color',
    'chassis_number', 'vin_number'
)
ORDER BY column_name;

-- Also check if there are similar column names
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND (
    column_name LIKE '%model%' OR
    column_name LIKE '%colour%' OR 
    column_name LIKE '%color%' OR
    column_name LIKE '%chassis%' OR
    column_name LIKE '%vin%'
)
ORDER BY column_name;
