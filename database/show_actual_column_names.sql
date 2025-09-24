-- Show the ACTUAL column names in your database
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
ORDER BY ordinal_position;

-- Show one record with ALL field names
SELECT * FROM leasing_inventory WHERE stock_number = '199263' LIMIT 1;
