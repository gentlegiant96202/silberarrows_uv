-- Check User Roles Table Structure
-- Find out what columns actually exist

-- 1. Check the structure of user_roles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any other role-related tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%role%'
ORDER BY table_name;

-- 3. Check what the get_user_module_permissions function looks like
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%permission%'
ORDER BY routine_name;

-- 4. Sample data from user_roles to see the structure
SELECT * FROM user_roles LIMIT 5;

-- 5. Check current user's roles
SELECT * FROM user_roles WHERE user_id = auth.uid(); 