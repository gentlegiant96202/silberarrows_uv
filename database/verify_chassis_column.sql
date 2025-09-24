-- Verify chassis_number column was added and has data
SELECT 
    stock_number,
    chassis_number,
    vehicle_model,
    model_family,
    colour,
    interior_colour,
    description
FROM leasing_inventory 
WHERE stock_number = '199263';

-- Also check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name = 'chassis_number';
