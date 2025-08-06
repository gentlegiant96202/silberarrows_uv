-- Debug Sales RLS Issue
-- Check user permissions and test policy conditions

-- 1. Check current user
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- 2. Check user's accounts module permissions
SELECT 
    user_id,
    module_name,
    can_view,
    can_edit,
    can_delete,
    created_at
FROM get_user_module_permissions(auth.uid(), 'accounts');

-- 3. Test if the policy condition passes
SELECT 
    'Policy condition test' as test_name,
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_edit = true
    ) as policy_passes;

-- 4. Check all user roles
SELECT 
    ur.user_id,
    ur.role_name,
    ur.module_name,
    ur.created_at
FROM user_roles ur
WHERE ur.user_id = auth.uid();

-- 5. Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'sales_daily_inputs';

-- 6. Check current policies on the table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'sales_daily_inputs'; 