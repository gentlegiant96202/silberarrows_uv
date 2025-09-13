-- ================================
-- ADD SERVICE MODULE - RESTRICTED ACCESS
-- ================================
-- Only Service and Used Car (Sales) departments can access
-- Run this in Supabase Dashboard SQL Editor

BEGIN;

-- Add service module to modules table
INSERT INTO modules (name, display_name, description) VALUES
('service', 'Service & Warranty', 'Service department metrics, warranty tracking, and performance management')
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Set up RESTRICTED permissions for Service & Warranty module
-- ONLY Service and Sales departments have access
DO $$
DECLARE
  service_module_id UUID;
BEGIN
  -- Get the service module ID
  SELECT id INTO service_module_id FROM modules WHERE name = 'service';
  
  IF service_module_id IS NOT NULL THEN
    RAISE NOTICE 'Setting up restricted permissions for Service & Warranty module...';
    
    -- SERVICE DEPARTMENT: Full access to their own module
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('service', service_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = true, can_create = true, can_edit = true, can_delete = true,
      updated_at = NOW();
    RAISE NOTICE 'Service Department: Full access granted';
    
    -- SALES (USED CAR) DEPARTMENT: Full access
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('sales', service_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = true, can_create = true, can_edit = true, can_delete = true,
      updated_at = NOW();
    RAISE NOTICE 'Sales (Used Car) Department: Full access granted';
    
    -- ADMIN: Full access (for system administration)
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('admin', service_module_id, true, true, true, true)
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = true, can_create = true, can_edit = true, can_delete = true,
      updated_at = NOW();
    RAISE NOTICE 'Admin: Full access granted';
    
    -- MARKETING DEPARTMENT: NO ACCESS
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('marketing', service_module_id, false, false, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = false, can_create = false, can_edit = false, can_delete = false,
      updated_at = NOW();
    RAISE NOTICE 'Marketing Department: Access DENIED';
    
    -- LEASING DEPARTMENT: NO ACCESS
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES ('leasing', service_module_id, false, false, false, false)
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = false, can_create = false, can_edit = false, can_delete = false,
      updated_at = NOW();
    RAISE NOTICE 'Leasing Department: Access DENIED';
    
    RAISE NOTICE 'Service & Warranty module permissions configured successfully!';
    RAISE NOTICE 'ACCESS GRANTED TO: Service Department, Used Car Department (Sales), Admin';
    RAISE NOTICE 'ACCESS DENIED TO: Marketing Department, Leasing Department';
  ELSE
    RAISE EXCEPTION 'Failed to create service module';
  END IF;
END $$;

-- Verify the permissions were set correctly
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== SERVICE MODULE PERMISSIONS SUMMARY ===';
  FOR rec IN 
    SELECT rp.role, 
           CASE WHEN rp.can_view THEN 'YES' ELSE 'NO' END as view_access,
           CASE WHEN rp.can_create THEN 'YES' ELSE 'NO' END as create_access,
           CASE WHEN rp.can_edit THEN 'YES' ELSE 'NO' END as edit_access,
           CASE WHEN rp.can_delete THEN 'YES' ELSE 'NO' END as delete_access
    FROM role_permissions rp 
    JOIN modules m ON rp.module_id = m.id 
    WHERE m.name = 'service'
    ORDER BY 
      CASE rp.role 
        WHEN 'admin' THEN 1
        WHEN 'service' THEN 2  
        WHEN 'sales' THEN 3
        WHEN 'marketing' THEN 4
        WHEN 'leasing' THEN 5
        ELSE 6
      END
  LOOP
    RAISE NOTICE '% Department - View: %, Create: %, Edit: %, Delete: %', 
      UPPER(rec.role), rec.view_access, rec.create_access, rec.edit_access, rec.delete_access;
  END LOOP;
  RAISE NOTICE '==========================================';
END $$;

COMMIT;

-- Success message
SELECT 'Service & Warranty module has been successfully added with restricted access!' as result; 