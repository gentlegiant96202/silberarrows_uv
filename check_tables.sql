-- Check what tables exist in the database related to calls
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%call%' OR table_name LIKE '%log%')
ORDER BY table_name;

-- Check all tables if no call tables found
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- If call_logs table exists, check its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'call_logs'
ORDER BY ordinal_position;

-- If call_management table exists, check its structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'call_management'
ORDER BY ordinal_position;

-- Check if there are any existing records
SELECT 'call_logs' as table_name, count(*) as record_count 
FROM call_logs
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs')
UNION ALL
SELECT 'call_management' as table_name, count(*) as record_count 
FROM call_management
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_management'); 