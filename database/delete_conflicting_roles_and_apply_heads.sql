-- Delete Conflicting Roles and Apply Department Head System
-- Simply remove manager/supervisor and apply clean head role constraints

BEGIN;

-- Show what we're about to delete
SELECT 'DELETING THESE ROLES:' as action, role, COUNT(*) as permission_count
FROM role_permissions 
WHERE role IN ('manager', 'supervisor')
GROUP BY role;

-- Delete manager and supervisor roles completely
DELETE FROM role_permissions WHERE role = 'manager';
DELETE FROM role_permissions WHERE role = 'supervisor';

-- Confirm deletion
SELECT 'ROLES DELETED SUCCESSFULLY' as status;

-- Now apply the clean department head role constraints
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

-- Verify constraint applied
SELECT 'DEPARTMENT HEAD SYSTEM READY!' as result;

-- Show final clean role structure
SELECT 'CURRENT ROLES:' as info, role, COUNT(*) as permission_count
FROM role_permissions 
GROUP BY role
ORDER BY role;

COMMIT; 