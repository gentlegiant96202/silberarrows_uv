-- Fix Sales Marketing Permissions
-- This script adds marketing ticket creation permissions for sales and sales_head roles
-- so they can submit marketing ticket requests

BEGIN;

-- Step 1: Check current marketing module permissions
SELECT 
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete,
    m.display_name as module_name
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing'
ORDER BY rp.role;

-- Step 2: Get marketing module ID
DO $$
DECLARE
    marketing_module_id UUID;
BEGIN
    SELECT id INTO marketing_module_id FROM modules WHERE name = 'marketing';
    
    IF marketing_module_id IS NULL THEN
        RAISE EXCEPTION 'Marketing module not found';
    END IF;
    
    RAISE NOTICE 'Marketing module ID: %', marketing_module_id;
    
    -- Step 3: Add/Update permissions for sales role
    -- Sales should be able to create marketing tickets (for requesting services)
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('sales', marketing_module_id, true, true, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
        can_view = true,
        can_create = true,  -- Allow ticket creation
        can_edit = false,   -- Cannot edit marketing content
        can_delete = false, -- Cannot delete marketing content
        updated_at = NOW();
    
    RAISE NOTICE 'Sales role: Marketing ticket creation permission granted';
    
    -- Step 4: Add/Update permissions for sales_head role
    -- Sales Head should have same permissions as sales + ability to view/manage team tickets
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('sales_head', marketing_module_id, true, true, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
        can_view = true,
        can_create = true,  -- Allow ticket creation
        can_edit = false,   -- Cannot edit marketing content (but can manage tickets)
        can_delete = false, -- Cannot delete marketing content
        updated_at = NOW();
    
    RAISE NOTICE 'Sales Head role: Marketing ticket creation permission granted';
    
    -- Step 5: Ensure other head roles also have appropriate permissions
    -- Marketing Head should have full access
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('marketing_head', marketing_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO UPDATE SET
        can_view = true,
        can_create = true,
        can_edit = true,
        can_delete = true,
        updated_at = NOW();
    
    RAISE NOTICE 'Marketing Head role: Full marketing access granted';
    
    -- Step 6: Service Head - should be able to create tickets for marketing requests
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('service_head', marketing_module_id, true, true, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
        can_view = true,
        can_create = true,  -- Allow ticket creation
        can_edit = false,
        can_delete = false,
        updated_at = NOW();
    
    RAISE NOTICE 'Service Head role: Marketing ticket creation permission granted';
    
    -- Step 7: Leasing Head - should be able to create tickets for marketing requests
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('leasing_head', marketing_module_id, true, true, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
        can_view = true,
        can_create = true,  -- Allow ticket creation
        can_edit = false,
        can_delete = false,
        updated_at = NOW();
    
    RAISE NOTICE 'Leasing Head role: Marketing ticket creation permission granted';
    
END $$;

-- Step 8: Verify the updated permissions
SELECT 
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete,
    m.display_name as module_name,
    rp.updated_at
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing'
ORDER BY rp.role;

-- Step 9: Show summary of changes
SELECT 
    'Permissions updated for marketing ticket creation' as status,
    'sales, sales_head, service_head, leasing_head can now create marketing tickets' as details;

COMMIT;

-- Note: After running this script, all department heads and sales staff
-- will be able to create marketing ticket requests through the dropdown 