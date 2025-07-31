-- Apply Role Mapping: manager → accounts_head, supervisor → accounts
-- Final step to resolve conflicts and apply head role constraints

BEGIN;

-- Show current conflicting roles before mapping
SELECT 'BEFORE MAPPING:' as status, role, COUNT(*) as permission_count
FROM role_permissions 
WHERE role IN ('manager', 'supervisor')
GROUP BY role;

-- Map manager (full access) to accounts_head
UPDATE role_permissions SET role = 'accounts_head' WHERE role = 'manager';

-- Map supervisor (limited access) to accounts  
UPDATE role_permissions SET role = 'accounts' WHERE role = 'supervisor';

-- Show roles after mapping
SELECT 'AFTER MAPPING:' as status, role, COUNT(*) as permission_count
FROM role_permissions 
WHERE role IN ('accounts_head', 'accounts')
GROUP BY role;

-- Now apply the final role_permissions constraint
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check 
CHECK (role IN (
  'admin',
  'sales', 'sales_head',
  'marketing', 'marketing_head', 
  'service', 'service_head',
  'leasing', 'leasing_head',
  'accounts', 'accounts_head'
));

-- Verify the constraint was applied successfully
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%role_check%'
ORDER BY table_name, constraint_name;

-- Final verification: show all allowed roles
SELECT 'SUCCESS: Department head roles system ready!' as result;
SELECT DISTINCT role, COUNT(*) as permission_count
FROM role_permissions 
GROUP BY role
ORDER BY role;

COMMIT; 