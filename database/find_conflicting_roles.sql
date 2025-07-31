-- Find Conflicting Roles in role_permissions table
-- This will show exactly which roles are causing the constraint violation

-- Show all current roles in role_permissions table
SELECT DISTINCT role, COUNT(*) as permission_count
FROM role_permissions 
GROUP BY role
ORDER BY role;

-- Show which roles would violate the new constraint
SELECT 
    'CONFLICTING ROLES:' as status,
    role,
    COUNT(*) as permission_count
FROM role_permissions 
WHERE role NOT IN (
    'admin', 'sales', 'sales_head', 'marketing', 'marketing_head', 
    'service', 'service_head', 'leasing', 'leasing_head', 
    'accounts', 'accounts_head'
)
GROUP BY role
ORDER BY role; 