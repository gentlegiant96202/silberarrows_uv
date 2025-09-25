-- Debug leasing_inventory table issues
-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'leasing_inventory'
);

-- Check table structure if it exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- Check if we have any data
SELECT COUNT(*) as total_records FROM leasing_inventory;

-- Check current user and role
SELECT current_user, session_user;
SELECT auth.uid(), auth.role();
