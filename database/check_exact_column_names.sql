-- Check exact column names in leasing_inventory table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name IN (
    'vehicle_model', 'model_family', 
    'colour', 'interior_colour', 
    'exterior_color', 'interior_color',
    'chassis_number'
)
ORDER BY column_name;

-- Show a sample record to see what data is actually stored
SELECT 
    stock_number,
    vehicle_model,
    model_family,
    colour,
    interior_colour,
    chassis_number,
    description
FROM leasing_inventory 
LIMIT 1;
