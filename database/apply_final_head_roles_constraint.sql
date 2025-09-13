-- Apply Final Department Head Roles Constraint
-- Run this after the diagnostic migration completed successfully

BEGIN;

-- Apply the final constraint to role_permissions table
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

-- Verify the constraints are in place
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%role_check%'
ORDER BY table_name, constraint_name;

-- Success message
SELECT 'Department head roles constraints successfully applied!' as status;

COMMIT; 