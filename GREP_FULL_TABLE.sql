-- Show the complete vehicle_reservations table structure and all data

-- 1. Show all columns in the table with details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations'
ORDER BY ordinal_position;

-- 2. Show ALL data in the table (every column, every row)
SELECT * FROM vehicle_reservations ORDER BY created_at;
