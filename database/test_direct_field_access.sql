-- Test direct field access for the specific vehicle ID from the logs
-- ID: 015256a7-1a3e-492d-ad6c-2f438ae89b72

SELECT 
    id,
    stock_number,
    chassis_number,
    vehicle_model,
    model_family,
    colour,
    interior_colour,
    description,
    key_equipment
FROM leasing_inventory 
WHERE id = '015256a7-1a3e-492d-ad6c-2f438ae89b72';

-- Also check if there are any RLS policies affecting field access
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'leasing_inventory';
