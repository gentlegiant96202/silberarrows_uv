-- Add Leasing Module to the System
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- Step 1: Add the leasing module
INSERT INTO modules (name, display_name, description, icon)
VALUES (
  'leasing',
  'Leasing Department',
  'Vehicle leasing and financing management',
  'handshake'
) ON CONFLICT (name) DO NOTHING;

-- Step 2: Add default permissions for all roles for the leasing module
-- Get the module ID first
DO $$
DECLARE
    leasing_module_id INTEGER;
BEGIN
    SELECT id INTO leasing_module_id FROM modules WHERE name = 'leasing';
    
    -- Admin: Full access
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('admin', leasing_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO NOTHING;
    
    -- Sales: View and create only
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('sales', leasing_module_id, true, true, false, false)
    ON CONFLICT (role, module_id) DO NOTHING;
    
    -- Marketing: View only (for lead referrals)
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('marketing', leasing_module_id, true, false, false, false)
    ON CONFLICT (role, module_id) DO NOTHING;
    
    -- Service: No access
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('service', leasing_module_id, false, false, false, false)
    ON CONFLICT (role, module_id) DO NOTHING;
    
    -- Leasing: Full access
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('leasing', leasing_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully added leasing module with permissions for all roles';
END $$;

-- Step 3: Verify the additions
SELECT 
    m.name as module_name,
    m.display_name,
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM modules m
LEFT JOIN role_permissions rp ON m.id = rp.module_id
WHERE m.name = 'leasing'
ORDER BY rp.role; 