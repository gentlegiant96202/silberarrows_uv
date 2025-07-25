-- ================================
-- ROLE PERMISSIONS SYSTEM
-- ================================
-- Granular role-based permission system with admin-configurable access

-- Step 1: DROP constraint first, THEN migrate data, THEN add new constraint
-- Show current roles before migration
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Current roles in database:';
  FOR rec IN SELECT role, COUNT(*) as count FROM user_roles GROUP BY role LOOP
    RAISE NOTICE '  - %: % users', rec.role, rec.count;
  END LOOP;
END $$;

-- FIRST: Drop the existing constraint so we can modify data freely
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- NOW: Migrate existing 'user' role to 'sales' (constraint is gone, so this will work)
UPDATE user_roles 
SET role = 'sales', updated_at = NOW()
WHERE role = 'user';

-- Handle any other unknown roles (convert to 'sales' as default)
UPDATE user_roles 
SET role = 'sales', updated_at = NOW()
WHERE role NOT IN ('admin', 'sales', 'marketing', 'service', 'leasing');

-- Show roles after migration
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Roles after migration:';
  FOR rec IN SELECT role, COUNT(*) as count FROM user_roles GROUP BY role LOOP
    RAISE NOTICE '  - %: % users', rec.role, rec.count;
  END LOOP;
END $$;

-- FINALLY: Add the new constraint with all 5 roles
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing'));

-- Step 2: Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'uv_crm', 'inventory', 'marketing', 'workshop'
  display_name TEXT NOT NULL, -- 'UV CRM', 'Inventory Management', etc.
  description TEXT,
  icon TEXT, -- For UI display
  route TEXT, -- App route path
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL, -- 'sales', 'marketing', 'service', 'leasing', 'admin'
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE, -- Add new items
  can_edit BOOLEAN DEFAULT FALSE,   -- Edit existing items  
  can_delete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, module_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);

-- Enable RLS on new tables
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules (readable by all authenticated users)
CREATE POLICY "Authenticated users can view modules" ON modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for role_permissions
CREATE POLICY "Users can view own role permissions" ON role_permissions
  FOR SELECT USING (
    role = (
      SELECT COALESCE(ur.role, 'sales') 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all role permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
  );

-- Step 4: Insert default modules
INSERT INTO modules (name, display_name, description, icon, route) VALUES
('uv_crm', 'UV CRM', 'Customer relationship management for leads and sales', '👥', '/'),
('inventory', 'Inventory', 'Vehicle inventory management and tracking', '🚗', '/inventory'),
('marketing', 'Marketing Dashboard', 'Marketing campaigns and analytics', '📈', '/marketing/dashboard'),
('workshop', 'Workshop', 'Service department and job management', '🔧', '/workshop/dashboard'),
('admin', 'Admin Panel', 'System administration and user management', '⚙️', '/admin/settings')
ON CONFLICT (name) DO NOTHING;

-- Step 5: Set up default role permissions based on your requirements
WITH module_ids AS (
  SELECT name, id FROM modules
)
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  perms.role,
  m.id,
  perms.can_view,
  perms.can_create,
  perms.can_edit,
  perms.can_delete
FROM (
  VALUES 
  -- Sales role permissions
  ('sales', 'uv_crm', true, true, true, true),
  ('sales', 'inventory', true, true, false, false), -- Can view and add cars only
  ('sales', 'marketing', false, false, false, false),
  ('sales', 'workshop', false, false, false, false),
  ('sales', 'admin', false, false, false, false),
  
  -- Marketing role permissions  
  ('marketing', 'uv_crm', true, true, true, false), -- Can view, create, edit leads (no delete)
  ('marketing', 'inventory', true, true, true, true), -- Full inventory access
  ('marketing', 'marketing', true, true, true, true), -- Full marketing access
  ('marketing', 'workshop', false, false, false, false),
  ('marketing', 'admin', false, false, false, false),
  
  -- Service role permissions
  ('service', 'uv_crm', false, false, false, false),
  ('service', 'inventory', false, false, false, false),
  ('service', 'marketing', false, false, false, false),
  ('service', 'workshop', true, true, true, true), -- Full workshop access
  ('service', 'admin', false, false, false, false),
  
  -- Leasing role permissions
  ('leasing', 'uv_crm', true, true, true, true), -- Full CRM access for leasing deals
  ('leasing', 'inventory', true, true, false, false), -- Can view and add cars, similar to sales
  ('leasing', 'marketing', false, false, false, false),
  ('leasing', 'workshop', false, false, false, false),
  ('leasing', 'admin', false, false, false, false),
  
  -- Admin role permissions (full access to everything)
  ('admin', 'uv_crm', true, true, true, true),
  ('admin', 'inventory', true, true, true, true),
  ('admin', 'marketing', true, true, true, true),
  ('admin', 'workshop', true, true, true, true),
  ('admin', 'admin', true, true, true, true)
) AS perms(role, module_name, can_view, can_create, can_edit, can_delete)
JOIN module_ids m ON m.name = perms.module_name
ON CONFLICT (role, module_id) DO NOTHING;

-- Step 6: Data migration already completed in Step 1 above

-- Step 7: Create admin functions for managing permissions
CREATE OR REPLACE FUNCTION get_role_permissions(target_role TEXT DEFAULT NULL)
RETURNS TABLE(
  role TEXT,
  module_name TEXT,
  module_display_name TEXT,
  module_description TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) SECURITY DEFINER AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    rp.role,
    m.name,
    m.display_name,
    m.description,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
  FROM role_permissions rp
  JOIN modules m ON rp.module_id = m.id
  WHERE target_role IS NULL OR rp.role = target_role
  ORDER BY rp.role, m.display_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_role_permissions(
  target_role TEXT,
  module_name TEXT,
  new_can_view BOOLEAN,
  new_can_create BOOLEAN,
  new_can_edit BOOLEAN,
  new_can_delete BOOLEAN
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
DECLARE
  target_module_id UUID;
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Get module ID
  SELECT id INTO target_module_id FROM modules WHERE name = module_name;
  IF target_module_id IS NULL THEN
    RAISE EXCEPTION 'Module not found: %', module_name;
  END IF;
  
  -- Update or insert permissions
  INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
  VALUES (target_role, target_module_id, new_can_view, new_can_create, new_can_edit, new_can_delete)
  ON CONFLICT (role, module_id)
  DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create function to get user permissions by module
CREATE OR REPLACE FUNCTION get_user_module_permissions(
  check_user_id UUID,
  module_name TEXT
)
RETURNS TABLE(
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) SECURITY DEFINER AS $$
DECLARE
  user_role TEXT;
  module_id UUID;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM user_roles WHERE user_id = check_user_id;
  IF user_role IS NULL THEN
    user_role := 'sales'; -- Default role
  END IF;
  
  -- Get module ID
  SELECT id INTO module_id FROM modules WHERE name = module_name;
  IF module_id IS NULL THEN
    -- Return no permissions if module doesn't exist
    RETURN QUERY SELECT false, false, false, false;
    RETURN;
  END IF;
  
  -- Return permissions
  RETURN QUERY
  SELECT 
    COALESCE(rp.can_view, false),
    COALESCE(rp.can_create, false),
    COALESCE(rp.can_edit, false),
    COALESCE(rp.can_delete, false)
  FROM role_permissions rp
  WHERE rp.role = user_role AND rp.module_id = module_id;
  
  -- If no permissions found, return all false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_modules_updated_at ON modules;
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- VERIFICATION QUERIES
-- ================================
-- Run these to verify the setup

-- Check modules
-- SELECT * FROM modules ORDER BY display_name;

-- Check role permissions  
-- SELECT * FROM get_role_permissions() ORDER BY role, module_display_name;

-- Check specific user permissions
-- SELECT * FROM get_user_module_permissions('YOUR_USER_ID', 'inventory'); 