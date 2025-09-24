
-- Debug why fields are not showing in frontend
-- Check what data is actually in the database

SELECT 
    stock_number,
    chassis_number,
    vehicle_model,
    model_family,
    colour,
    interior_colour,
    description,
    key_equipment
FROM leasing_inventory 
WHERE stock_number IN ('199263', '270808')
ORDER BY stock_number;
