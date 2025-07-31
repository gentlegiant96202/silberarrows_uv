-- Fix Conflicting Roles: manager and supervisor
-- Choose ONE of the options below and uncomment it

BEGIN;

-- Show current conflicting roles and what modules they have access to
SELECT 
    'CONFLICTING ROLES DETAILS:' as info,
    rp.role,
    m.display_name as module_name,
    rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE rp.role IN ('manager', 'supervisor')
ORDER BY rp.role, m.display_name;

-- =================================================================
-- OPTION 1: MAP TO HEAD ROLES (Recommended)
-- =================================================================
/*
-- Map manager -> admin (full access)
UPDATE role_permissions SET role = 'admin' WHERE role = 'manager';

-- Map supervisor -> service_head (assuming it's service-related)
UPDATE role_permissions SET role = 'service_head' WHERE role = 'supervisor';
*/

-- =================================================================
-- OPTION 2: DELETE THE CONFLICTING ROLES
-- =================================================================
/*
-- Delete manager permissions
DELETE FROM role_permissions WHERE role = 'manager';

-- Delete supervisor permissions  
DELETE FROM role_permissions WHERE role = 'supervisor';
*/

-- =================================================================
-- OPTION 3: ADD THEM TO ALLOWED ROLES LIST
-- =================================================================
/*
-- This would modify the constraint to include manager and supervisor
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check 
CHECK (role IN (
  'admin', 'manager', 'supervisor',
  'sales', 'sales_head',
  'marketing', 'marketing_head', 
  'service', 'service_head',
  'leasing', 'leasing_head',
  'accounts', 'accounts_head'
));

-- Also update user_roles constraint to match
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role IN (
  'admin', 'manager', 'supervisor',
  'sales', 'sales_head',
  'marketing', 'marketing_head', 
  'service', 'service_head',
  'leasing', 'leasing_head',
  'accounts', 'accounts_head'
));
*/

-- =================================================================
-- AFTER CHOOSING AN OPTION, RUN THIS TO APPLY THE FINAL CONSTRAINT
-- =================================================================
/*
-- Only run this AFTER handling the conflicting roles above
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
SELECT 'SUCCESS: role_permissions constraint applied' as result;
*/

COMMIT; 