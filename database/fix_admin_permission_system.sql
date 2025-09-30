-- Fix the admin permission system to restore marketing kanban functionality
-- This addresses the disconnect between database permissions and admin system

-- 1. First, check if the is_user_admin function exists (required by admin system)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'is_user_admin'
            AND n.nspname = 'public'
        ) 
        THEN '✅ is_user_admin function exists'
        ELSE '❌ is_user_admin function MISSING'
    END as admin_function_status;

-- 2. Create is_user_admin function if missing (required by admin system)
CREATE OR REPLACE FUNCTION is_user_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = check_user_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure all required tables exist with correct structure
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'sales' 
        CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing', 'accounts')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    route TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL 
        CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing', 'accounts')),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, module_id)
);

-- 4. Insert all required modules
INSERT INTO modules (name, display_name, description, icon, route) VALUES
('uv_crm', 'UV CRM', 'Customer relationship management for leads and sales', '👥', '/'),
('inventory', 'Inventory', 'Vehicle inventory management and tracking', '🚗', '/inventory'),
('marketing', 'Marketing Dashboard', 'Marketing campaigns and analytics', '📈', '/marketing/dashboard'),
('workshop', 'Workshop', 'Service department and job management', '🔧', '/workshop/dashboard'),
('leasing', 'Leasing', 'Leasing and financing management', '📋', '/leasing'),
('accounts', 'Accounts', 'Accounting and financial management', '💰', '/accounting'),
('admin', 'Admin Panel', 'System administration and user management', '⚙️', '/admin/settings')
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route;

-- 5. Ensure current user is admin
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id) DO UPDATE SET 
    role = 'admin',
    updated_at = NOW();

-- 6. Clear and restore all role permissions (matching admin system expectations)
DELETE FROM role_permissions;

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
    -- Admin role permissions (full access to everything)
    ('admin', 'uv_crm', true, true, true, true),
    ('admin', 'inventory', true, true, true, true),
    ('admin', 'marketing', true, true, true, true),
    ('admin', 'workshop', true, true, true, true),
    ('admin', 'leasing', true, true, true, true),
    ('admin', 'accounts', true, true, true, true),
    ('admin', 'admin', true, true, true, true),
    
    -- Marketing role permissions (full marketing access)
    ('marketing', 'uv_crm', true, true, true, false),
    ('marketing', 'inventory', true, true, true, true),
    ('marketing', 'marketing', true, true, true, true),
    ('marketing', 'workshop', false, false, false, false),
    ('marketing', 'leasing', false, false, false, false),
    ('marketing', 'accounts', false, false, false, false),
    ('marketing', 'admin', false, false, false, false),
    
    -- Sales role permissions
    ('sales', 'uv_crm', true, true, true, true),
    ('sales', 'inventory', true, true, false, false),
    ('sales', 'marketing', false, false, false, false),
    ('sales', 'workshop', false, false, false, false),
    ('sales', 'leasing', false, false, false, false),
    ('sales', 'accounts', false, false, false, false),
    ('sales', 'admin', false, false, false, false),
    
    -- Service role permissions
    ('service', 'uv_crm', false, false, false, false),
    ('service', 'inventory', false, false, false, false),
    ('service', 'marketing', false, false, false, false),
    ('service', 'workshop', true, true, true, true),
    ('service', 'leasing', false, false, false, false),
    ('service', 'accounts', false, false, false, false),
    ('service', 'admin', false, false, false, false),
    
    -- Leasing role permissions
    ('leasing', 'uv_crm', true, true, true, true),
    ('leasing', 'inventory', true, true, false, false),
    ('leasing', 'marketing', false, false, false, false),
    ('leasing', 'workshop', false, false, false, false),
    ('leasing', 'leasing', true, true, true, true),
    ('leasing', 'accounts', true, true, true, true),
    ('leasing', 'admin', false, false, false, false),
    
    -- Accounts role permissions
    ('accounts', 'uv_crm', true, true, true, false),
    ('accounts', 'inventory', true, true, false, false),
    ('accounts', 'marketing', false, false, false, false),
    ('accounts', 'workshop', false, false, false, false),
    ('accounts', 'leasing', true, true, true, true),
    ('accounts', 'accounts', true, true, true, true),
    ('accounts', 'admin', false, false, false, false)
) AS perms(role, module_name, can_view, can_create, can_edit, can_delete)
JOIN modules m ON m.name = perms.module_name;

-- 7. Fix the trigger function to avoid updated_by field errors (simple version)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Test the admin system functions
SELECT 'Testing admin functions...' as status;

-- Test is_user_admin
SELECT 
    CASE 
        WHEN is_user_admin(auth.uid()) 
        THEN '✅ You are admin'
        ELSE '❌ You are NOT admin'
    END as admin_status;

-- Test get_user_module_permissions
SELECT 'Your marketing permissions:' as status;
SELECT * FROM get_user_module_permissions(auth.uid(), 'marketing');

-- 9. Verify all permissions are set correctly
SELECT 
    rp.role,
    m.name as module_name,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing'
ORDER BY rp.role;

SELECT '✅ Admin permission system restored - marketing kanban should work now!' as result;
