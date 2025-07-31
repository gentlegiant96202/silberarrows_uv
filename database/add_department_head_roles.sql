-- Add Department Head Roles Migration (Fixed)
-- This script safely adds head roles for each department to the existing role system

BEGIN;

-- Step 1: Check existing roles in role_permissions table
-- (This is informational - run this first to see what exists)
-- SELECT DISTINCT role FROM role_permissions ORDER BY role;

-- Step 2: Safely update user_roles constraint first (this table likely has fewer conflicts)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role IN (
  'admin',
  'sales', 'sales_head',
  'marketing', 'marketing_head', 
  'service', 'service_head',
  'leasing', 'leasing_head',
  'accounts', 'accounts_head'
));

-- Step 3: Handle role_permissions table more carefully
-- First, let's see if there are any problematic roles
DO $$
DECLARE
    invalid_roles text;
BEGIN
    -- Check for roles that won't be allowed by new constraint
    SELECT string_agg(DISTINCT role, ', ') INTO invalid_roles
    FROM role_permissions 
    WHERE role NOT IN (
        'admin', 'sales', 'sales_head', 'marketing', 'marketing_head', 
        'service', 'service_head', 'leasing', 'leasing_head', 
        'accounts', 'accounts_head'
    );
    
    IF invalid_roles IS NOT NULL THEN
        RAISE NOTICE 'Found roles that need to be handled: %', invalid_roles;
        -- You can decide what to do with these - either update them or remove them
    ELSE
        RAISE NOTICE 'All existing roles are compatible with new constraint';
    END IF;
END $$;

-- Step 4: Only apply the constraint if there are no conflicts
-- Remove this comment and run this part only after handling any invalid roles reported above:

/*
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
*/

-- Step 5: Success message
SELECT 'Department head roles structure prepared. Check the notice above and then uncomment the final constraint if safe.' as status;

COMMIT;

-- Note: Admin can now assign head roles to users through the UnifiedRoleManager
-- Permissions for head roles can be configured later through the admin interface 