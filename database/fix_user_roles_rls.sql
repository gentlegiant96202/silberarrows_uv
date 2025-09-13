-- Fix infinite recursion in user_roles RLS policies
-- This script addresses the circular dependency issue

BEGIN;

-- Temporarily disable RLS to fix policies
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_roles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_roles;

-- Create simple, non-recursive policies
-- Policy 1: Users can see their own role
CREATE POLICY "user_roles_select_own" ON user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy 2: Admins can see all roles (using direct user metadata check to avoid recursion)
CREATE POLICY "user_roles_select_admin" ON user_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 3: Admins can insert roles
CREATE POLICY "user_roles_insert_admin" ON user_roles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 4: Admins can update roles
CREATE POLICY "user_roles_update_admin" ON user_roles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy 5: Admins can delete roles
CREATE POLICY "user_roles_delete_admin" ON user_roles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Also fix any potential issues with modules and role_permissions tables
-- Ensure they have simple policies

-- Modules table - allow read for authenticated users, admin for modifications
DROP POLICY IF EXISTS "modules_select" ON modules;
DROP POLICY IF EXISTS "modules_admin" ON modules;

CREATE POLICY "modules_select" ON modules
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "modules_admin" ON modules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Role permissions table - similar approach
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_admin" ON role_permissions;

CREATE POLICY "role_permissions_select" ON role_permissions
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "role_permissions_admin" ON role_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

COMMIT; 