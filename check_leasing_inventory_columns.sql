-- Check the actual column structure of leasing_inventory table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
ORDER BY ordinal_position;

-- Show a sample record to see what data we have
SELECT * FROM leasing_inventory LIMIT 1;
