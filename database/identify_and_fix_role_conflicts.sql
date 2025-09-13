-- Identify and Fix Role Conflicts
-- Run this to see what roles are causing conflicts and fix them

BEGIN;

-- Step 1: Show current roles that will conflict with new constraint
SELECT 
    'CONFLICTING ROLES FOUND:' as notice,
    role,
    COUNT(*) as permission_count,
    string_agg(DISTINCT module_id::text, ', ') as modules
FROM role_permissions 
WHERE role NOT IN (
    'admin', 'sales', 'sales_head', 'marketing', 'marketing_head', 
    'service', 'service_head', 'leasing', 'leasing_head', 
    'accounts', 'accounts_head'
)
GROUP BY role
ORDER BY role;

-- Step 2: Show what the conflicting roles should be mapped to
-- This is a suggestion - you can modify as needed
WITH role_mapping AS (
    SELECT 
        role,
        CASE 
            WHEN role = 'workshop' THEN 'service'
            WHEN role = 'inventory' THEN 'sales'  
            WHEN role = 'finance' THEN 'accounts'
            WHEN role = 'hr' THEN 'admin'
            ELSE 'admin'  -- Default fallback
        END as suggested_new_role
    FROM role_permissions 
    WHERE role NOT IN (
        'admin', 'sales', 'sales_head', 'marketing', 'marketing_head', 
        'service', 'service_head', 'leasing', 'leasing_head', 
        'accounts', 'accounts_head'
    )
    GROUP BY role
)
SELECT 
    'SUGGESTED MAPPING:' as notice,
    role as old_role,
    suggested_new_role as new_role
FROM role_mapping
ORDER BY role;

-- Step 3: UNCOMMENT THE OPTION YOU WANT TO USE:

-- OPTION A: Delete conflicting role permissions (removes them completely)
-- DELETE FROM role_permissions 
-- WHERE role NOT IN (
--     'admin', 'sales', 'sales_head', 'marketing', 'marketing_head', 
--     'service', 'service_head', 'leasing', 'leasing_head', 
--     'accounts', 'accounts_head'
-- );

-- OPTION B: Update conflicting roles to valid ones (recommended)
-- UPDATE role_permissions SET role = 'service' WHERE role = 'workshop';
-- UPDATE role_permissions SET role = 'sales' WHERE role = 'inventory';
-- UPDATE role_permissions SET role = 'accounts' WHERE role = 'finance';
-- UPDATE role_permissions SET role = 'admin' WHERE role = 'hr';
-- -- Add more mappings as needed based on the results above

-- Step 4: After fixing conflicts, apply the constraint
-- (UNCOMMENT after running one of the options above)
-- ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
-- ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check 
-- CHECK (role IN (
--   'admin',
--   'sales', 'sales_head',
--   'marketing', 'marketing_head', 
--   'service', 'service_head',
--   'leasing', 'leasing_head',
--   'accounts', 'accounts_head'
-- ));

SELECT 'Run this script to see conflicts, then uncomment and run your chosen option' as instruction;

ROLLBACK;  -- Use ROLLBACK for now so you can see the results without changing anything 